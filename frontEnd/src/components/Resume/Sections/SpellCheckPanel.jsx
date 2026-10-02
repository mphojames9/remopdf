import React, { useEffect, useRef, useState } from 'react';
import nspell from 'nspell';
import {
  findMisspellings,
  groupMisspellings,
  suggestionsFor,
  applySuggestion,
  matchCase,
  addTechVocabulary,
  buildCorrections,
  applyFixes,
} from './spellCheck';
import {
  findWritingIssues,
  withoutOverlaps,
  analyzeText,
  getTips,
  applyEdit,
  contextAround,
} from './grammarCheck';

// Live writing assistant: spelling, grammar, style and résumé tips, with a "Did you mean"
// correction for real mistakes. There is no "check" button: the text is re-read a moment after the
// last keystroke.
//
//   Spelling  nspell + the English Hunspell dictionary (words not in the dictionary)
//   Grammar   grammarCheck.js (a/an, agreement, could of, its/it's, capitals, spacing, punctuation...)
//   Style     wordy phrases, filler words, passive voice, long sentences, repetitive openings
//   Résumé    weak openers, clichés, hedging, "I", exclamation marks, plus a few tips
//
// The panel can be hidden: tapping its header collapses it to a single line that still shows how
// many items need a look. That choice, and the ignored words / dismissed tips, are remembered and
// shared by every panel on the page.
//
// Everything runs in the browser, so nothing is sent to a server and it works offline. Setup, once:
//
//   npm install nspell dictionary-en
//   mkdir -p public/dictionaries/en
//   cp node_modules/dictionary-en/index.aff node_modules/dictionary-en/index.dic public/dictionaries/en/
//
// For British spelling (programme, organisation) install dictionary-en-gb and copy its files instead.
// If the dictionary cannot be loaded, the grammar, style and résumé checks keep working.

const DICTIONARY_URL = '/dictionaries/en'; // folder that holds index.aff and index.dic
const IGNORED_KEY = 'resumeBuilder:ignoredWords';
const DISMISSED_KEY = 'resumeBuilder:dismissedTips';
const OPEN_KEY = 'resumeBuilder:writingAssistantOpen';
const TYPING_PAUSE_MS = 300; // re-check this long after the last keystroke
const SETTLE_MS = 1200; // after this long, a word at the very end counts as finished too
const MAX_LISTED = 4; // cards shown before "Show more"
const MAX_LOOKUPS = 12; // words that get suggestions looked up per check
const MAX_SENTENCES = 3; // "Did you mean" lines shown at once

const KIND = {
  spelling: { label: 'Spelling', dot: 'bg-red-500', mark: 'bg-red-100 text-red-800' },
  grammar: { label: 'Grammar', dot: 'bg-amber-500', mark: 'bg-amber-100 text-amber-900' },
  style: { label: 'Style', dot: 'bg-blue-500', mark: 'bg-blue-100 text-blue-800' },
  resume: { label: 'Résumé', dot: 'bg-emerald-500', mark: 'bg-emerald-100 text-emerald-800' },
};
const FILTERS = ['all', 'spelling', 'grammar', 'style', 'resume'];
const EMPTY = { spelling: [], writing: [], corrections: [], stats: null };

// Advice that takes up a lot of room for little gain is not shown: the "Long sentence" cards
// and the "reading level is dense" tip. The checks in grammarCheck.js still run; their results are
// just filtered out here, so the counts and the filter tabs agree with what is on screen.
const isHiddenIssue = (issue) => issue.title === 'Long sentence' || /long[-_ ]?sentence/i.test(issue.rule || '');
const isHiddenTip = (tip) => /reading level/i.test(tip);
const findShownIssues = (source, options) => findWritingIssues(source, options).filter((issue) => !isHiddenIssue(issue));

// The dictionary loads once and is shared by every panel.
let spellPromise = null;
const loadSpell = () => {
  if (!spellPromise) {
    const get = (file) => fetch(`${DICTIONARY_URL}/${file}`).then(async (res) => {
      const body = await res.text();
      // A dev server answers a missing file with the app's HTML page instead of an error.
      if (!res.ok || /^\s*<(!doctype|html)/i.test(body)) throw new Error(`Could not load ${file}`);
      return body;
    });
    spellPromise = Promise.all([get('index.aff'), get('index.dic')])
      .then(([aff, dic]) => addTechVocabulary(nspell(aff, dic)))
      .catch((err) => {
        spellPromise = null; // allow a retry on the next mount
        throw err;
      });
  }
  return spellPromise;
};

/* -------------------------------------------------------------------------- */
/*                     Preferences shared by every panel                      */
/* -------------------------------------------------------------------------- */

const readSet = (key) => {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) || '[]'));
  } catch {
    return new Set();
  }
};

const saveSet = (key, set) => {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    /* storage unavailable: the choice still holds for this session */
  }
};

const readOpen = () => {
  try {
    const saved = localStorage.getItem(OPEN_KEY);
    if (saved === '1') return true;
    if (saved === '0') return false;
  } catch {
    /* storage unavailable: fall through to the screen-size default */
  }
  // Nothing saved yet: open on larger screens, collapsed on phones so it does not crowd the form.
  try {
    return window.matchMedia('(min-width: 640px)').matches;
  } catch {
    return true;
  }
};

const saveOpen = (open) => {
  try {
    localStorage.setItem(OPEN_KEY, open ? '1' : '0');
  } catch {
    /* storage unavailable: the choice still holds for this session */
  }
};

// A tiny shared store, so a change made in one panel shows up in all the others straight away.
const createStore = (initial, persist) => {
  let value = initial;
  const listeners = new Set();
  return {
    get: () => value,
    set: (next) => {
      value = next;
      persist(next);
      listeners.forEach((listener) => listener(next));
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

const ignoredStore = createStore(readSet(IGNORED_KEY), (set) => saveSet(IGNORED_KEY, set));
const dismissedStore = createStore(readSet(DISMISSED_KEY), (set) => saveSet(DISMISSED_KEY, set));
const openStore = createStore(readOpen(), saveOpen);

const useStore = (store) => {
  const [value, setValue] = useState(() => store.get());
  useEffect(() => {
    setValue(store.get()); // picks up a change made between the first render and subscribing
    return store.subscribe(setValue);
  }, [store]);
  return value;
};

let panelCount = 0;

/* -------------------------------------------------------------------------- */
/*                                 Small pieces                               */
/* -------------------------------------------------------------------------- */

const Chevron = ({ open }) => (
  <svg
    className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
  </svg>
);

const FOCUS = 'focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d9856b]';
const TEXT_LINK = `text-[#a8553d] hover:text-[#8f4631] underline underline-offset-2 ${FOCUS}`;
// 36px tall on phones so a thumb can hit it; compact again from the sm breakpoint up.
const OPTION_BUTTON = `min-h-[36px] sm:min-h-[28px] px-3 sm:px-2.5 text-xs rounded border border-slate-200 bg-white text-slate-700 hover:border-[#d9856b] hover:bg-[#d9856b]/10 hover:text-[#8f4631] active:bg-[#d9856b]/10 transition-colors ${FOCUS}`;

const IssueCard = ({ kind, title, note, message, context, onDismiss, dismissLabel = 'Dismiss', children }) => {
  const meta = KIND[kind];
  return (
    <li className="px-3 py-3 flex flex-col gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`h-2 w-2 rounded-full shrink-0 ${meta.dot}`} aria-hidden="true" />
        <span className="text-sm font-semibold text-slate-800 truncate">{title}</span>
        {note && <span className="text-xs text-slate-500 shrink-0">{note}</span>}
        <button
          type="button"
          onClick={onDismiss}
          aria-label={`${dismissLabel}: ${title}`}
          className={`ml-auto shrink-0 -my-1.5 -mr-2 min-h-[36px] px-2 text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2 ${FOCUS}`}
        >
          {dismissLabel}
        </button>
      </div>
      {message && <p className="text-xs leading-relaxed text-slate-500">{message}</p>}
      <p className="text-xs leading-relaxed text-slate-600 bg-slate-50 rounded px-2 py-1.5 break-words">
        {context.before}
        <mark className={`rounded px-0.5 ${meta.mark}`}>{context.hit}</mark>
        {context.after}
      </p>
      {children}
    </li>
  );
};

/* -------------------------------------------------------------------------- */
/*                                   Panel                                    */
/* -------------------------------------------------------------------------- */

const SpellCheckPanel = ({ text, onChange }) => {
  const value = typeof text === 'string' ? text : '';
  const [spell, setSpell] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const ignored = useStore(ignoredStore);
  const dismissed = useStore(dismissedStore);
  const open = useStore(openStore);
  const [result, setResult] = useState(EMPTY);
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(false);
  const suggestionCache = useRef(new Map());
  const bodyId = useRef(null);
  if (bodyId.current === null) {
    panelCount += 1;
    bodyId.current = `writing-assistant-${panelCount}`;
  }

  useEffect(() => {
    let alive = true;
    loadSpell()
      .then((s) => alive && setSpell(s))
      .catch((err) => {
        // Developer hint only: people using the form just see a short, friendly notice.
        console.warn('[SpellCheckPanel] Spelling dictionary not loaded. Serve index.aff and index.dic from /dictionaries/en/.', err);
        if (alive) setLoadFailed(true);
      });
    return () => { alive = false; };
  }, []);

  // One pass over the text: spelling, grammar/style/résumé issues, and the "Did you mean" sentences.
  // Spelling hits that a grammar or style issue already covers are left out ("alot" -> "a lot").
  const analyze = (source, skipTrailing = false) => {
    const writing = findShownIssues(source, { dismissed, skipTrailing });
    const rawSpelling = spell ? findMisspellings(source, spell, { ignored, skipTrailing }) : [];
    const spelling = withoutOverlaps(rawSpelling, writing);
    const grouped = groupMisspellings(spelling);
    if (spell) grouped.slice(0, MAX_LOOKUPS).forEach((issue) => suggestionsFor(spell, issue, suggestionCache.current));

    // Only real mistakes (spelling and grammar) feed "Did you mean". Style advice is never auto-applied.
    const topEdit = new Map();
    const hits = [...spelling];
    writing.forEach((w) => {
      if (w.kind !== 'grammar' || w.edits.length === 0) return;
      const edit = w.edits[0];
      topEdit.set(w.id, edit.text);
      hits.push({ key: w.id, start: edit.start, end: edit.end, text: source.slice(edit.start, edit.end) });
    });
    hits.sort((a, b) => a.start - b.start);
    const top = (hit) => topEdit.get(hit.key) ?? suggestionCache.current.get(hit.key)?.[0];

    return {
      grouped,
      writing,
      corrections: buildCorrections(source, hits, top),
    };
  };

  // Re-check while typing: shortly after the last keystroke, then once more a little later so a
  // word at the very end of the text is caught too.
  useEffect(() => {
    if (!value.trim()) {
      setResult(EMPTY);
      return undefined;
    }
    const run = (skipTrailing) => {
      const { grouped, writing, corrections } = analyze(value, skipTrailing);
      setResult({
        spelling: grouped.map((issue) => ({
          ...issue,
          suggestions: suggestionCache.current.get(issue.key) || [],
          context: contextAround(value, issue.ranges[0].start, issue.ranges[0].end),
        })),
        writing,
        corrections,
        stats: analyzeText(value),
      });
    };
    const quick = setTimeout(() => run(true), TYPING_PAUSE_MS);
    const settled = setTimeout(() => run(false), SETTLE_MS);
    return () => {
      clearTimeout(quick);
      clearTimeout(settled);
    };
  }, [value, spell, ignored, dismissed]);

  // The list can be a moment behind the text, so everything is found again in the current text
  // before it is replaced.
  const applyWord = (issue, suggestion) => {
    if (!spell || !onChange) return;
    const ranges = findMisspellings(value, spell, { ignored }).filter((r) => r.key === issue.key);
    if (ranges.length > 0) onChange(applySuggestion(value, ranges, suggestion));
  };

  const applyWriting = (issue, edit) => {
    if (!onChange) return;
    const fresh = findShownIssues(value, { dismissed });
    const match = fresh.find((w) => w.rule === issue.rule && w.text === issue.text && w.start === issue.start)
      || fresh.find((w) => w.rule === issue.rule && w.text === issue.text);
    const chosen = match && (match.edits.find((e) => e.label === edit.label) || match.edits[0]);
    if (chosen) onChange(applyEdit(value, chosen));
  };

  const applySentence = (correction) => {
    if (!onChange) return;
    const match = analyze(value).corrections.find((c) => c.original === correction.original);
    if (match) onChange(applyFixes(value, match.fixes));
  };

  const applyAll = () => {
    if (!onChange) return;
    const fixes = analyze(value).corrections.flatMap((c) => c.fixes);
    if (fixes.length > 0) onChange(applyFixes(value, fixes));
  };

  const ignoreWord = (key) => ignoredStore.set(new Set(ignoredStore.get()).add(key));

  const dismissIssue = (issue) => dismissedStore.set(new Set(dismissedStore.get()).add(issue.dismissKey));

  const restoreAll = () => {
    ignoredStore.set(new Set());
    dismissedStore.set(new Set());
  };

  const toggleOpen = () => openStore.set(!openStore.get());

  // Spelling words and writing issues share one list, in the order they appear in the text.
  const items = [
    ...result.spelling.map((issue) => ({ kind: 'spelling', key: `s:${issue.key}`, start: issue.ranges[0].start, issue })),
    ...result.writing.map((issue) => ({ kind: issue.kind, key: `w:${issue.id}`, start: issue.start, issue })),
  ].sort((a, b) => a.start - b.start);

  const counts = { spelling: 0, grammar: 0, style: 0, resume: 0 };
  items.forEach((item) => { counts[item.kind] += 1; });
  const visible = filter === 'all' ? items : items.filter((item) => item.kind === filter);
  const listed = expanded ? visible : visible.slice(0, MAX_LISTED);
  const sentences = result.corrections.slice(0, MAX_SENTENCES);

  const stats = result.stats;
  const hasText = value.trim().length > 0;
  const tips = getTips(stats).filter((tip) => !isHiddenTip(tip));

  let notice = null;
  if (loadFailed) {
    notice = 'Spelling check is unavailable right now. Grammar, style and résumé checks are still running.';
  } else if (!spell) {
    notice = 'Loading the spelling dictionary…';
  }

  let message = null;
  if (!hasText) message = 'Spelling, grammar and style suggestions will show up here as you type.';
  else if (items.length === 0 && stats) message = 'No issues found. Nicely written.';

  return (
    <div role="region" aria-label="Writing assistant" className="border border-slate-200 rounded-md bg-white overflow-hidden">
      {/* The whole header is the hide/show button, so it is an easy target on a phone. */}
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        aria-controls={bodyId.current}
        className={`w-full min-h-[44px] px-3 py-2 flex items-center gap-2.5 text-left bg-slate-50 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#d9856b] ${open ? 'border-b border-slate-200' : ''}`}
      >
        <span className="truncate text-xs font-semibold text-slate-700 uppercase tracking-wide">Writing assistant</span>
        {/* Phones get icons only (a count badge, a tick, a chevron); the words come back from the sm breakpoint up.
            The words stay in the page for screen readers. */}
        <span aria-live="polite" className="shrink-0">
          {items.length > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 whitespace-nowrap">
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#d9856b]/15 text-[#8f4631] text-[11px] font-bold">
                {items.length}
              </span>
              <span className="sr-only sm:not-sr-only">to review</span>
            </span>
          )}
          {items.length === 0 && hasText && stats && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 whitespace-nowrap">
              <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
              <span className="sr-only sm:not-sr-only">No issues</span>
            </span>
          )}
        </span>
        <span className="ml-auto shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
          <span className="sr-only sm:not-sr-only">{open ? 'Hide' : 'Show'}</span>
          <Chevron open={open} />
        </span>
      </button>

      {open && (
        <div id={bodyId.current}>
          {notice && (
            <p className={`px-3 py-2.5 text-xs border-b border-slate-100 ${loadFailed ? 'text-amber-700' : 'text-slate-500'}`}>{notice}</p>
          )}

          {message && <p className="px-3 py-2.5 text-xs text-slate-500">{message}</p>}

          {sentences.length > 0 && (
            <div className="px-3 py-3 bg-[#d9856b]/5 border-b border-[#d9856b]/20 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-800">
                  Did you mean <span className="text-xs font-normal text-slate-500">(tap to apply)</span>
                </p>
                {result.corrections.length > 1 && (
                  <button
                    type="button"
                    onClick={applyAll}
                    className={`shrink-0 -my-1.5 -mr-2 min-h-[36px] px-2 text-xs font-semibold ${TEXT_LINK}`}
                  >
                    Fix all
                  </button>
                )}
              </div>
              {sentences.map((c) => (
                <button
                  key={c.original}
                  type="button"
                  onClick={() => applySentence(c)}
                  className={`text-left text-sm leading-snug text-slate-700 bg-white border border-[#d9856b]/25 rounded-md px-3 py-2.5 hover:border-[#d9856b] hover:bg-[#d9856b]/5 transition-colors ${FOCUS}`}
                >
                  {c.parts.map((p, i) => (p.changed
                    ? <strong key={i} className="font-semibold italic text-[#a8553d]">{p.text}</strong>
                    : <span key={i}>{p.text}</span>))}
                </button>
              ))}
              {result.corrections.length > sentences.length && (
                <p className="text-xs text-slate-500">
                  and {result.corrections.length - sentences.length} more {result.corrections.length - sentences.length === 1 ? 'sentence' : 'sentences'}
                </p>
              )}
            </div>
          )}

          {items.length > 0 && (
            <div
              role="tablist"
              aria-label="Filter suggestions"
              className="px-3 pt-2.5 pb-1 flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {FILTERS.map((id) => {
                const n = id === 'all' ? items.length : counts[id];
                if (id !== 'all' && n === 0) return null;
                const active = filter === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => { setFilter(id); setExpanded(false); }}
                    className={`shrink-0 min-h-[32px] px-3 text-xs rounded-full border transition-colors ${FOCUS} ${active
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                  >
                    {id === 'all' ? 'All' : KIND[id].label}
                    <span className="ml-1 opacity-70">{n}</span>
                  </button>
                );
              })}
            </div>
          )}

          {listed.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {listed.map(({ kind, key, issue }) => (kind === 'spelling' ? (
                <IssueCard
                  key={key}
                  kind="spelling"
                  title={issue.word}
                  note={issue.ranges.length > 1 ? `${issue.ranges.length} places` : null}
                  message={issue.fix ? 'A real word, but probably a slip here.' : null}
                  context={issue.context}
                  onDismiss={() => ignoreWord(issue.key)}
                  dismissLabel="Ignore"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    {issue.suggestions.length > 0 ? issue.suggestions.map((s) => (
                      <button key={s} type="button" onClick={() => applyWord(issue, s)} className={OPTION_BUTTON}>
                        {matchCase(issue.word, s)}
                      </button>
                    )) : <span className="text-xs text-slate-500">No suggestions</span>}
                  </div>
                </IssueCard>
              ) : (
                <IssueCard
                  key={key}
                  kind={kind}
                  title={issue.title}
                  message={issue.message}
                  context={issue.context}
                  onDismiss={() => dismissIssue(issue)}
                >
                  {issue.edits.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {issue.edits.map((edit) => (
                        <button key={edit.label} type="button" onClick={() => applyWriting(issue, edit)} className={OPTION_BUTTON}>
                          {edit.label}
                        </button>
                      ))}
                    </div>
                  )}
                </IssueCard>
              )))}
            </ul>
          )}

          {(visible.length > MAX_LISTED || ignored.size > 0 || dismissed.size > 0) && (
            <div className="px-3 py-1 text-xs text-slate-500 border-t border-slate-100 flex flex-wrap items-center justify-between gap-x-4">
              {visible.length > MAX_LISTED ? (
                <button
                  type="button"
                  onClick={() => setExpanded((isOpen) => !isOpen)}
                  className={`min-h-[36px] font-semibold ${TEXT_LINK}`}
                >
                  {expanded ? 'Show fewer' : `Show ${visible.length - MAX_LISTED} more`}
                </button>
              ) : <span />}
              {(ignored.size > 0 || dismissed.size > 0) && (
                <button type="button" onClick={restoreAll} className={`min-h-[36px] hover:text-slate-800 underline underline-offset-2 ${FOCUS}`}>
                  Bring back ignored items
                </button>
              )}
            </div>
          )}

          {/* Tips come last: fixes first. Phones get the top tip only. */}
          {tips.length > 0 && (
            <ul className="px-3 py-2.5 border-t border-slate-100 flex flex-col gap-1">
              {tips.map((tip, i) => (
                <li
                  key={tip}
                  className={`${i > 0 ? 'hidden sm:flex' : 'flex'} items-start gap-2 text-xs leading-relaxed text-slate-600`}
                >
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0" aria-hidden="true" />
                  {tip}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default SpellCheckPanel;
