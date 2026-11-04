import React, { useEffect, useRef, useState } from 'react';
import { analyzeWriting, applySuggestion, applySuggestions, canApply, MIN_CHARS } from './writingAI';

// AI writing assistant. Same props and the same place in the page as the old offline panel, so
// Summary.jsx, ExperienceField.jsx, EducationField.jsx and AdditionalSections.jsx keep working.
//
//   <SpellCheckPanel text={value} onChange={setValue} field="summary" jobTitle="Site Manager" />
//
//   field     'summary' | 'experience' | 'education' | 'other'  (tells the AI what it is reading)
//   jobTitle  optional; lets the AI judge wording against the role
//
// A moment after the last keystroke the text is sent to POST /api/writing/analyze (Groq, through
// the FastAPI backend, see writingAI.js). The AI returns:
//   - suggestions: spelling and grammar fixes, stronger wording, impact and ATS advice, each with a
//                  one-tap "Apply" when it comes with replacement text
//   - improved:    the whole text rewritten with every worthwhile edit applied ("Use this version")
//
// The panel can be hidden: tapping its header collapses it to a single line that still shows how
// many items need a look. That choice is remembered and shared by every panel on the page.

const OPEN_KEY = 'resumeBuilder:writingAssistantOpen'; // same key as before, so the saved choice carries over
const TYPING_PAUSE_MS = 1400; // review this long after the last keystroke
const MAX_LISTED = 4; // cards shown before "Show more"

const KIND = {
  spelling: { label: 'Spelling', group: 'fix', dot: 'bg-red-500', mark: 'bg-red-100 text-red-800' },
  grammar: { label: 'Grammar', group: 'fix', dot: 'bg-amber-500', mark: 'bg-amber-100 text-amber-900' },
  wording: { label: 'Wording', group: 'wording', dot: 'bg-blue-500', mark: 'bg-blue-100 text-blue-800' },
  structure: { label: 'Structure', group: 'wording', dot: 'bg-slate-500', mark: 'bg-slate-200 text-slate-800' },
  impact: { label: 'Impact', group: 'impact', dot: 'bg-emerald-500', mark: 'bg-emerald-100 text-emerald-800' },
  ats: { label: 'ATS', group: 'impact', dot: 'bg-violet-500', mark: 'bg-violet-100 text-violet-800' },
};
const GROUPS = [
  ['all', 'All'],
  ['fix', 'Fixes'],
  ['wording', 'Wording'],
  ['impact', 'Impact'],
];

const ERROR_TEXT = {
  busy: 'That was a lot of reviews in a minute. Give it a moment, then try again.',
  timeout: 'The AI took too long to answer. The server may be waking up, so try again in a few seconds.',
  offline: 'Couldn’t reach the AI service. Check your connection and try again.',
  unavailable: 'AI review is unavailable right now. You can keep writing and try again later.',
};

/* -------------------------------------------------------------------------- */
/*                     Hide / show, shared by every panel                      */
/* -------------------------------------------------------------------------- */

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

// A tiny shared store, so hiding one panel hides them all straight away.
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

const openStore = createStore(readOpen(), saveOpen);

const useStore = (store) => {
  const [value, setValue] = useState(() => store.get());
  useEffect(() => {
    setValue(store.get());
    return store.subscribe(setValue);
  }, [store]);
  return value;
};

let panelCount = 0;

/* -------------------------------------------------------------------------- */
/*                                 Small pieces                               */
/* -------------------------------------------------------------------------- */

const FOCUS = 'focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d9856b]';
const TEXT_LINK = `text-[#a8553d] hover:text-[#8f4631] underline underline-offset-2 ${FOCUS}`;
// 36px tall on phones so a thumb can hit it; compact again from the sm breakpoint up.
const PRIMARY_BUTTON = `min-h-[36px] sm:min-h-[28px] px-3 text-xs font-semibold rounded bg-[#d9856b] text-white hover:bg-[#c97558] active:bg-[#bd6b4f] transition-colors ${FOCUS}`;

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

const Spinner = () => (
  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const Sparkle = () => (
  <svg className="w-3.5 h-3.5 text-[#d9856b]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2zm7 11l.9 2.6 2.6.9-2.6.9L19 20l-.9-2.6-2.6-.9 2.6-.9L19 13z" />
  </svg>
);

const Skeleton = () => (
  <div className="px-3 py-3 flex flex-col gap-3 animate-pulse" aria-hidden="true">
    {[0, 1, 2].map((i) => (
      <div key={i} className="flex flex-col gap-2">
        <div className="h-3 w-1/3 rounded bg-slate-200" />
        <div className="h-3 w-5/6 rounded bg-slate-100" />
        <div className="h-8 w-full rounded bg-slate-100" />
      </div>
    ))}
  </div>
);

const dismissKey = (s) => `${s.kind}|${s.title}|${s.original}|${s.replacement}`;

const SuggestionCard = ({ s, onApply, onDismiss }) => {
  const meta = KIND[s.kind] || KIND.wording;
  const editable = typeof s.replacement === 'string';
  return (
    <li className="px-3 py-3 flex flex-col gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`h-2 w-2 rounded-full shrink-0 ${meta.dot}`} aria-hidden="true" />
        <span className="text-sm font-semibold text-slate-800 truncate">{s.title}</span>
        <span className="text-xs text-slate-500 shrink-0">{meta.label}</span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={`Dismiss: ${s.title}`}
          className={`ml-auto shrink-0 -my-1.5 -mr-2 min-h-[36px] px-2 text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2 ${FOCUS}`}
        >
          Dismiss
        </button>
      </div>
      {s.reason && <p className="text-xs leading-relaxed text-slate-500">{s.reason}</p>}
      {s.original && (
        <div className="text-xs leading-relaxed bg-slate-50 rounded px-2 py-1.5 break-words">
          {editable ? (
            <>
              <p className="text-slate-500 line-through decoration-red-300">{s.original}</p>
              <p className="mt-1 text-slate-800">
                <mark className={`rounded px-0.5 ${meta.mark}`}>{s.replacement}</mark>
              </p>
            </>
          ) : (
            <p className="text-slate-600">
              <mark className={`rounded px-0.5 ${meta.mark}`}>{s.original}</mark>
            </p>
          )}
        </div>
      )}
      {editable && (
        <div>
          <button type="button" onClick={onApply} className={PRIMARY_BUTTON}>
            Apply
          </button>
        </div>
      )}
    </li>
  );
};

/* -------------------------------------------------------------------------- */
/*                                   Panel                                    */
/* -------------------------------------------------------------------------- */

const SpellCheckPanel = ({ text, onChange, field = 'other', jobTitle = '' }) => {
  const value = typeof text === 'string' ? text : '';
  const open = useStore(openStore);
  const [state, setState] = useState({ status: 'idle', result: null, error: null });
  const [dismissed, setDismissed] = useState(() => new Set());
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(false);
  const [recheck, setRecheck] = useState(0);
  const analyzedRef = useRef(null); // the exact text the current result was made for
  const abortRef = useRef(null);
  const immediateRef = useRef(false); // true right after "Check again": no typing pause
  const bodyId = useRef(null);
  if (bodyId.current === null) {
    panelCount += 1;
    bodyId.current = `writing-assistant-${panelCount}`;
  }

  // Review the text a moment after the last keystroke. Typing again cancels a review in flight.
  useEffect(() => {
    if (value.trim().length < MIN_CHARS) {
      analyzedRef.current = null;
      setState((s) => (s.status === 'idle' && !s.result && !s.error ? s : { status: 'idle', result: null, error: null }));
      return undefined;
    }
    if (analyzedRef.current === value) {
      // Nothing new to review (e.g. a suggestion was just applied). Clear a stale "reviewing" state.
      setState((s) => (s.status === 'loading' ? { ...s, status: s.result ? 'ready' : 'idle' } : s));
      return undefined;
    }

    const delay = immediateRef.current ? 0 : TYPING_PAUSE_MS;
    const timer = setTimeout(() => {
      immediateRef.current = false;
      const controller = new AbortController();
      abortRef.current = controller;
      setState((s) => ({ ...s, status: 'loading', error: null }));
      analyzeWriting({ text: value, field, jobTitle, signal: controller.signal })
        .then((result) => {
          analyzedRef.current = value;
          setDismissed(new Set());
          setExpanded(false);
          setFilter('all');
          setState({ status: 'ready', result: { ...result, forText: value }, error: null });
        })
        .catch((err) => {
          if (err && err.name === 'AbortError') return; // the text changed again: a newer review follows
          setState((s) => ({ status: 'error', result: s.result, error: err }));
        });
    }, delay);

    return () => {
      clearTimeout(timer);
      if (abortRef.current) abortRef.current.abort();
    };
    // field and jobTitle are read when the review starts; changing them alone does not re-run it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, recheck]);

  const checkAgain = () => {
    analyzedRef.current = null;
    immediateRef.current = true;
    setRecheck((n) => n + 1);
  };

  const toggleOpen = () => openStore.set(!openStore.get());

  const dismiss = (s) => setDismissed((prev) => new Set(prev).add(dismissKey(s)));

  const apply = (s) => {
    const next = applySuggestion(value, s);
    if (next === null || !onChange) return;
    analyzedRef.current = next; // the remaining suggestions still describe this text: no new review
    dismiss(s);
    onChange(next);
  };

  const applyAll = (edits) => {
    if (!onChange || edits.length === 0) return;
    const next = applySuggestions(value, edits);
    analyzedRef.current = next;
    setDismissed((prev) => {
      const all = new Set(prev);
      edits.forEach((s) => all.add(dismissKey(s)));
      return all;
    });
    onChange(next);
  };

  const takeImproved = (improved) => {
    if (!onChange) return;
    // analyzedRef is left alone on purpose: the rewrite gets its own quick review afterwards.
    onChange(improved);
  };

  const result = state.result;
  const hasText = value.trim().length >= MIN_CHARS;
  const loading = state.status === 'loading';

  // A suggestion is hidden once its text has been changed by hand, so the list always matches the box.
  const items = (result ? result.suggestions : []).filter((s) => {
    if (dismissed.has(dismissKey(s))) return false;
    if (typeof s.replacement === 'string') return canApply(value, s);
    return !s.original || value.includes(s.original);
  });
  const edits = items.filter((s) => typeof s.replacement === 'string');

  const counts = { all: items.length, fix: 0, wording: 0, impact: 0 };
  items.forEach((s) => {
    const group = (KIND[s.kind] || KIND.wording).group;
    counts[group] += 1;
  });
  const shownGroups = GROUPS.filter(([id]) => id === 'all' || counts[id] > 0);
  const visible = filter === 'all' ? items : items.filter((s) => (KIND[s.kind] || KIND.wording).group === filter);
  const listed = expanded ? visible : visible.slice(0, MAX_LISTED);

  const improved = result && result.improved && result.forText === value && result.improved.trim() !== value.trim() ? result.improved : null;

  let message = null;
  if (!hasText) message = 'Write a sentence or two and the AI will review it, with fixes, stronger wording and ATS tips.';
  else if (state.status === 'ready' && items.length === 0 && !improved) message = 'No issues found. Nicely written.';

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
        <Sparkle />
        <span className="truncate text-xs font-semibold text-slate-700 uppercase tracking-wide">Writing assistant</span>
        {/* Phones get icons only (a count badge, a tick, a spinner, a chevron); the words come back from the sm
            breakpoint up and stay in the page for screen readers. */}
        <span aria-live="polite" className="shrink-0">
          {loading && (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap">
              <Spinner />
              <span className="sr-only sm:not-sr-only">Reviewing…</span>
            </span>
          )}
          {!loading && items.length > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 whitespace-nowrap">
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#d9856b]/15 text-[#8f4631] text-[11px] font-bold">
                {items.length}
              </span>
              <span className="sr-only sm:not-sr-only">to review</span>
            </span>
          )}
          {!loading && items.length === 0 && state.status === 'ready' && hasText && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 whitespace-nowrap">
              <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
              <span className="sr-only sm:not-sr-only">No issues</span>
            </span>
          )}
          {!loading && state.status === 'error' && (
            <span className="text-xs text-amber-700 whitespace-nowrap">
              <span className="sr-only sm:not-sr-only">Unavailable</span>
              <span className="sm:hidden" aria-hidden="true">!</span>
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
          {message && <p className="px-3 py-2.5 text-xs text-slate-500">{message}</p>}

          {hasText && loading && !result && <Skeleton />}

          {state.status === 'error' && (
            <div className="px-3 py-3 flex flex-col gap-2 border-b border-slate-100">
              <p className="text-xs leading-relaxed text-amber-700">
                {ERROR_TEXT[state.error && state.error.code] || ERROR_TEXT.unavailable}
              </p>
              <div>
                <button type="button" onClick={checkAgain} className={PRIMARY_BUTTON}>
                  Try again
                </button>
              </div>
            </div>
          )}

          {improved && (
            <div className="px-3 py-3 bg-[#d9856b]/5 border-b border-[#d9856b]/20 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-800">
                  Polished version <span className="text-xs font-normal text-slate-500">(AI rewrite)</span>
                </p>
                <button type="button" onClick={() => takeImproved(improved)} className={PRIMARY_BUTTON}>
                  Use this version
                </button>
              </div>
              <p className="text-sm leading-snug text-slate-700 whitespace-pre-wrap break-words bg-white border border-[#d9856b]/25 rounded-md px-3 py-2.5">
                {improved}
              </p>
            </div>
          )}

          {items.length > 0 && (
            <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
              {shownGroups.length > 2 && (
                <div
                  role="tablist"
                  aria-label="Filter suggestions"
                  className="px-3 pt-2.5 pb-1 flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {shownGroups.map(([id, label]) => {
                    const active = filter === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => {
                          setFilter(id);
                          setExpanded(false);
                        }}
                        className={`shrink-0 min-h-[32px] px-3 text-xs rounded-full border transition-colors ${FOCUS} ${active
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                      >
                        {label}
                        <span className="ml-1 opacity-70">{counts[id]}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {edits.length > 1 && (
                <div className="px-3 pt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                  <span>{edits.length} edits ready</span>
                  <button
                    type="button"
                    onClick={() => applyAll(edits)}
                    className={`-my-1.5 -mr-2 min-h-[36px] px-2 font-semibold ${TEXT_LINK}`}
                  >
                    Apply all
                  </button>
                </div>
              )}

              <ul className="divide-y divide-slate-100">
                {listed.map((s) => (
                  <SuggestionCard key={dismissKey(s)} s={s} onApply={() => apply(s)} onDismiss={() => dismiss(s)} />
                ))}
              </ul>

              {visible.length > MAX_LISTED && (
                <div className="px-3 py-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setExpanded((isOpen) => !isOpen)}
                    className={`min-h-[36px] text-xs font-semibold ${TEXT_LINK}`}
                  >
                    {expanded ? 'Show fewer' : `Show ${visible.length - MAX_LISTED} more`}
                  </button>
                </div>
              )}
            </div>
          )}

          {hasText && state.status !== 'error' && (
            <div className="px-3 py-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <p className="text-[11px] leading-snug text-slate-400">AI can make mistakes. Check names, dates and numbers before applying.</p>
              <button
                type="button"
                onClick={checkAgain}
                disabled={loading}
                className={`-my-1 min-h-[32px] text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2 disabled:opacity-50 disabled:no-underline ${FOCUS}`}
              >
                Check again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SpellCheckPanel;
