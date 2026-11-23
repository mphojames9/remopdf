import React, { useEffect, useRef, useState } from 'react';
import { suggestEducationIdeas, suggestAchievementIdeas, hasJobTarget, shownIdeas } from './jobMatchAI';
import { sortIdeas } from './aiSuggestions';
import { stripLabel, dropRepeats } from './similarLines.js';
import { usePremiumAccess, useSignedIn, requestUpgrade, requestSignIn, setPremiumAccess } from '../../../hooks/premiumAccess';

/*
  The AI ideas for two steps of the builder. They replace the O*NET suggestions there (O*NET is now only used for job
  titles). Both are Premium: the free plan has no AI suggestions, so a free or signed-out person sees a short note and a
  button instead. Every request goes through jobMatchAI.js (the signed AI pass, one AI action each).

    <EducationIdeas entry resumeData onAdd />            Education step: lines for the Details box of one qualification.
                                                          Runs when the person presses the button.
    <AchievementIdeas job skills jobTarget onAdd pending />
                                                          Work history step: five or more different achievement ideas for
                                                          the job title, an ask box to steer them, and "Load more ideas".
                                                          They appear by themselves for the job that is open, as soon as it
                                                          has a title (see AUTO_IDEAS below).

  Showing the achievement ideas by themselves costs one AI action per job title (and per target job), so it is careful:
    - only for the job that is open (a closed job's panel is not mounted), once the title has stopped changing;
    - once per job + title + target: the ideas are kept (jobMatchAI.js shownIdeas), so closing and re-opening the job, or
      adding an idea to the achievements, never asks again;
    - only when Premium is known to be running, never for a free or signed-out person;
    - never again after a failure (quota, busy, offline): the error shows and the button tries again when the person asks.
  Set AUTO_IDEAS to false to go back to waiting for the button.

  Nothing is added to the resume until the person presses the add button. A figure the person never wrote is always a
  [placeholder] to fill in.

  The add button is a toggle. An idea that is in the text shows ticked, and pressing the tick takes its line out again.
  It stays ticked after the person replaces "[X]" with a number or edits the line a little, because it is matched by what
  it says and not by its exact characters (similarLines.js), so it can never be added a second time by mistake. An idea
  that says the same thing as a line already written, or as another idea in the list, is not shown at all: one point,
  once. Education ideas have no "Relevant coursework:" or "Focus areas:" label in front of them.
*/

const PRIMARY =
  'inline-flex items-center justify-center gap-1.5 min-h-[32px] px-3 rounded-sm bg-[#d9856b] text-white text-xs font-bold hover:bg-[#c97558] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/50';
const SECONDARY =
  'inline-flex items-center justify-center gap-1.5 min-h-[32px] px-3 rounded-sm border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:border-[#d9856b] hover:text-[#d9856b] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/50';

// Show the achievement ideas without waiting for the button, and how long the job title must stay unchanged first (so
// typing "Quality Control Officer" asks once, not once per pause).
const AUTO_IDEAS = true;
const AUTO_DELAY_MS = 1200;
const MAX_SHELF = 40;

const ERROR_TEXT = {
  signin: 'Sign in to get AI suggestions.',
  premium: 'AI suggestions are part of Premium.',
  quota: 'You have used today’s AI suggestions. They start again at midnight.',
  busy: 'Too many requests in a short time. Wait a moment and try again.',
  timeout: 'This took too long. The server may be waking up, so try again in a few seconds.',
  offline: 'Could not reach the AI service. Check your connection and try again.',
  unavailable: 'AI suggestions are unavailable right now. Please try again.',
};
const errorText = (err) => (err && (err.code === 'needtitle' || err.code === 'needdegree') && err.message ? err.message : ERROR_TEXT[err && err.code] || ERROR_TEXT.unavailable);

const SparkleIcon = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2zm7 11l.9 2.6 2.6.9-2.6.9L19 20l-.9-2.6-2.6-.9 2.6-.9L19 13z" />
  </svg>
);

const LockIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path strokeLinecap="round" d="M8 11V8a4 4 0 118 0v3" />
  </svg>
);

const PlusIcon = ({ done }) => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={done ? 'M5 13l4 4L19 7' : 'M12 5v14M5 12h14'} />
  </svg>
);

// The add button of an idea. Plus = add it, tick = it is in your text (press to take it out again).
const ToggleButton = ({ added, sending, label, onAdd, onRemove }) => (
  <button
    type="button"
    onClick={added ? onRemove : onAdd}
    disabled={sending && !added}
    aria-pressed={added}
    aria-label={added ? `Added. Press to remove: ${label}` : `Add: ${label}`}
    title={added ? 'Added. Press to remove it again.' : 'Add to your resume'}
    className={`mt-0.5 w-6 h-6 shrink-0 rounded-sm border flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d9856b] disabled:cursor-default ${
      added
        ? 'bg-[#d9856b] border-[#d9856b] text-white hover:bg-[#c97558]'
        : sending
          ? 'bg-[#d9856b] border-[#d9856b] text-white'
          : 'bg-white border-slate-200 text-slate-500 hover:border-[#d9856b] hover:text-[#d9856b]'
    }`}
  >
    <PlusIcon done={added || sending} />
  </button>
);

/* -------------------------------------------------------------------------- */
/*                                 Shared parts                                */
/* -------------------------------------------------------------------------- */

// One request at a time per panel; a newer one cancels the older. `run(call)` takes a function that receives the abort
// signal and returns the result; it answers null when the request failed, was cancelled, or the panel is gone.
function useIdeaRequest() {
  const [state, setState] = useState({ status: 'idle', data: null, error: null });
  const abortRef = useRef(null);
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const run = async (call) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState((s) => ({ status: 'loading', data: s.data, error: null }));
    try {
      const data = await call(controller.signal);
      if (!aliveRef.current || controller.signal.aborted) return null;
      setState({ status: 'ready', data, error: null });
      return data;
    } catch (err) {
      if (!aliveRef.current || (err && err.name === 'AbortError')) return null;
      if (err && err.code === 'premium') setPremiumAccess(false); // Premium is over: the page switches to the upgrade note
      setState((s) => ({ status: 'error', data: s.data, error: err }));
      return null;
    }
  };
  return [state, run];
}

// null = fine to ask; 'signin' | 'premium' = show the note instead. (Unknown Premium is tried: the server decides.)
function useLock() {
  const premium = usePremiumAccess();
  const signedOut = useSignedIn() === false;
  if (signedOut) return 'signin';
  return premium === false ? 'premium' : null;
}

const Locked = ({ title, note, lock, className = '' }) => (
  <div className={`border border-slate-200 rounded-sm bg-slate-50/60 p-3 ${className}`}>
    <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
      <span className="text-[#d9856b]">
        <SparkleIcon />
      </span>
      {title}
      <span className="text-[#8f4631] inline-flex items-center gap-1 font-medium">
        <LockIcon />
        <span className="text-[11px]">{lock === 'signin' ? 'Sign in' : 'Premium'}</span>
      </span>
    </p>
    <p className="mt-2 text-xs leading-relaxed text-slate-600">{note}</p>
    <div className="mt-3">
      <button type="button" onClick={lock === 'signin' ? requestSignIn : requestUpgrade} className={PRIMARY}>
        {lock === 'signin' ? 'Sign in' : 'Get Premium'}
      </button>
    </div>
  </div>
);

// The box where the person tells the AI what to improve or add. Enter sends it.
const AskBox = ({ value, onChange, onSubmit, placeholder, disabled, busy, label, ariaLabel }) => (
  <div className="flex items-stretch gap-2">
    <input
      type="text"
      value={value}
      maxLength={300}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (!disabled && !busy) onSubmit();
        }
      }}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className="min-w-0 flex-1 bg-white border border-slate-200 text-slate-800 focus:border-slate-500 rounded-sm py-1.5 px-2.5 text-xs focus:outline-none transition-all"
    />
    <button type="button" onClick={onSubmit} disabled={disabled || busy} className={`${PRIMARY} shrink-0`}>
      {busy ? 'Working...' : label}
    </button>
  </div>
);

const Skeleton = ({ rows = 3 }) => (
  <div className="flex flex-col gap-2 animate-pulse" aria-hidden="true">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-9 rounded-sm bg-slate-200/70" />
    ))}
  </div>
);

const ErrorLine = ({ error }) => (
  <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-sm px-2.5 py-2" role="alert">
    {errorText(error)}
  </p>
);

// "[X]" placeholders stand out, so a figure to fill in cannot be missed.
const withPlaceholders = (text) =>
  String(text)
    .split(/(\[[^\]\n]{1,24}\])/)
    .map((part, i) =>
      /^\[[^\]]+\]$/.test(part) ? (
        <mark key={i} className="rounded-[2px] bg-amber-100 px-0.5 text-amber-900">
          {part}
        </mark>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      )
    );

/* -------------------------------------------------------------------------- */
/*                                  Education                                  */
/* -------------------------------------------------------------------------- */

export function EducationIdeas({ entry, resumeData, onAdd, onRemove }) {
  const lock = useLock();
  const [state, run] = useIdeaRequest();
  const [prompt, setPrompt] = useState('');
  const shownRef = useRef([]);
  const target = resumeData && resumeData.jobTarget;
  const canAsk = Boolean(String(entry.degree || '').trim() || String(entry.field || '').trim());
  const loading = state.status === 'loading';

  const ask = (more) =>
    run(async (signal) => {
      const result = await suggestEducationIdeas({ entry, resumeData, target, prompt, avoid: more ? shownRef.current : [], signal });
      shownRef.current = more ? [...shownRef.current, ...result.ideas].slice(-40) : result.ideas;
      return result;
    });

  if (lock) {
    return (
      <Locked
        lock={lock}
        title="AI ideas for your study details"
        note="AI ideas are part of Premium: lines about what your field of study covers, ready to add to your Details."
      />
    );
  }

  // No label in front of a line, no line that repeats another or one already in the Details box.
  const rawIdeas = ((state.data && state.data.ideas) || []).map(stripLabel).filter(Boolean);
  const { shown, hidden } = sortIdeas(rawIdeas, entry.achievements);
  const ideas = shown;

  return (
    <div className="border border-slate-200 rounded-sm bg-white p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-slate-800 inline-flex items-center gap-1.5">
          <span className="text-[#d9856b]">
            <SparkleIcon />
          </span>
          AI ideas for your study details
        </p>
        {ideas.length > 0 && (
          <button type="button" onClick={() => ask(true)} disabled={loading} className={SECONDARY}>
            Show new ideas
          </button>
        )}
      </div>

      <AskBox
        value={prompt}
        onChange={setPrompt}
        onSubmit={() => ask(false)}
        placeholder="Optional: what to focus on, e.g. statistics and research"
        disabled={!canAsk}
        busy={loading}
        label={ideas.length > 0 ? 'Suggest again' : 'Suggest details'}
        ariaLabel="Tell the AI what to focus on"
      />
      {!canAsk && <p className="text-[11px] text-slate-500">Add your degree or field of study above to get ideas.</p>}

      {loading && ideas.length === 0 && <Skeleton rows={3} />}
      {state.status === 'error' && <ErrorLine error={state.error} />}

      {ideas.length > 0 && (
        <ul className="flex flex-col gap-2">
          {ideas.map(({ idea: text, added }) => (
            <li key={text} className={`flex items-start gap-2.5 transition-opacity ${loading ? 'opacity-60' : ''}`}>
              <ToggleButton added={added} label={text} onAdd={() => onAdd(text)} onRemove={() => onRemove && onRemove(text)} />
              <span className="text-xs text-slate-700 leading-relaxed pt-1">{text}</span>
            </li>
          ))}
        </ul>
      )}
      {ideas.length > 0 && <p className="text-[11px] leading-snug text-slate-500">These are ideas for what a qualification like yours covers. Add only what you really studied.</p>}
      {hidden > 0 && <p className="text-[11px] leading-snug text-slate-500">{hidden === 1 ? '1 idea is' : `${hidden} ideas are`} not shown because your details already say the same thing.</p>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Achievements                                 */
/* -------------------------------------------------------------------------- */

// One idea: the line, the job keywords it honestly contains, and a button to add it to the achievements above.
const IdeaRow = ({ idea, added, sending, onUse, onRemove }) => {
  const textRef = useRef(null); // where the added line slides in from
  return (
    <li className="flex items-start gap-3 rounded-sm border border-slate-200 bg-white p-3">
      <ToggleButton added={added} sending={sending} label={idea.text} onAdd={() => onUse(textRef.current)} onRemove={onRemove} />
      <div className="min-w-0 flex-1">
        <p ref={textRef} data-idea-text className="text-xs leading-relaxed text-slate-700">
          {withPlaceholders(idea.text)}
        </p>
        {idea.uses.length > 0 && (
          <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
            Matches the job:
            {idea.uses.map((word) => (
              <span key={word} className="rounded-full border border-emerald-100 bg-emerald-50 px-1.5 py-px text-[10px] font-medium text-emerald-800">
                {word}
              </span>
            ))}
          </p>
        )}
      </div>
    </li>
  );
};

export function AchievementIdeas({ job, skills = [], jobTarget, onAdd, onRemove, pending = [] }) {
  const lock = useLock();
  const premium = usePremiumAccess();
  const [state, run] = useIdeaRequest();
  const [prompt, setPrompt] = useState('');
  const ideasRef = useRef([]); // everything shown so far; "Load more ideas" adds to it
  const triedRef = useRef(new Set()); // keys already asked for automatically, so a failure is never retried in a loop
  const title = String(job.title || '').trim();
  const targeted = hasJobTarget(jobTarget);
  const loading = state.status === 'loading';

  // Which ideas belong to this job as it reads now: the same job, title and target job give the same ideas.
  const targetKey = targeted ? [jobTarget.title, ...(Array.isArray(jobTarget.keywords) ? jobTarget.keywords.map((k) => k && k.term) : [])].join('|') : '';
  const shelfKey = `${job.id}|${title.toLowerCase()}|${targetKey}`;

  const shelve = (ideas) => {
    shownIdeas.delete(shelfKey);
    shownIdeas.set(shelfKey, ideas);
    while (shownIdeas.size > MAX_SHELF) shownIdeas.delete(shownIdeas.keys().next().value);
  };

  // `more` = add different ideas to the list (what is shown is sent along so none comes back); otherwise start the list
  // again, which is what the ask box does ("add numbers", "focus on safety").
  const ask = (more) =>
    run(async (signal) => {
      const avoid = more ? ideasRef.current.map((i) => i.text) : [];
      const result = await suggestAchievementIdeas({ job, skills, target: jobTarget, prompt, avoid, signal });
      // An idea that says what another one already says, in other words, is dropped here, so one point is offered once.
      const fresh = dropRepeats(result.ideas, more ? ideasRef.current.map((i) => i.text) : [], (i) => i.text).kept;
      const merged = more ? [...ideasRef.current, ...fresh] : fresh;
      ideasRef.current = merged;
      shelve(merged);
      return { ideas: merged };
    });

  // The ideas show by themselves. Ideas already shown for this job come straight back (no AI action); otherwise one request
  // goes out once the title has stopped changing. A key that failed is not asked for again until the title or the target
  // job changes, or the person presses the button.
  const canAuto = AUTO_IDEAS && !lock && premium === true && title.length >= 3;
  useEffect(() => {
    if (!canAuto || triedRef.current.has(shelfKey)) return undefined;
    const kept = shownIdeas.get(shelfKey);
    if (kept) {
      triedRef.current.add(shelfKey);
      ideasRef.current = kept;
      run(async () => ({ ideas: kept }));
      return undefined;
    }
    const timer = setTimeout(() => {
      triedRef.current.add(shelfKey);
      ask(false);
    }, AUTO_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAuto, shelfKey]);

  if (lock) {
    return (
      <Locked
        lock={lock}
        title="AI achievement ideas"
        note="AI achievement ideas are part of Premium: several achievements for your job title, matched to the keywords of the job you target, with numbers where they fit. Tell the AI what to improve and it rewrites them."
      />
    );
  }

  const ideas = (state.data && state.data.ideas) || [];
  // What is shown: ideas already in the achievements stay (ticked), repeats of a line already written are left out.
  const { shown, hidden } = sortIdeas(ideas, job.achievements, (i) => i.text);
  const anyPlaceholder = shown.some(({ idea, added }) => !added && /\[[^\]]+\]/.test(idea.text));
  // About to load by itself (the title is in, the short wait is running): show the box as busy, not empty.
  const waiting = canAuto && state.status === 'idle' && ideas.length === 0 && !triedRef.current.has(shelfKey);
  const writing = ideas.length === 0 && (loading || waiting);

  return (
    <div className="border border-slate-200 rounded-sm bg-slate-50/60 p-3 flex flex-col gap-3">
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-800 inline-flex items-center gap-1.5">
          <span className="text-[#d9856b]">
            <SparkleIcon />
          </span>
          AI achievement ideas
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          {!title
            ? 'Add a job title to get ideas.'
            : targeted
              ? `Written for ${title}, matched to the job you target${jobTarget.title ? ` (${jobTarget.title})` : ''}.`
              : `Written for ${title}. Use “Target a job” (top bar) to match the keywords of the job you want.`}
        </p>
      </div>

      <AskBox
        value={prompt}
        onChange={setPrompt}
        onSubmit={() => ask(false)}
        placeholder="Tell the AI what to improve or add, e.g. add numbers, focus on safety"
        disabled={!title}
        busy={loading}
        label={ideas.length > 0 ? 'Update ideas' : 'Suggest ideas'}
        ariaLabel="Tell the AI what kind of achievement you want"
      />

      {writing && (
        <>
          <p className="text-[11px] text-slate-500" role="status">
            Writing ideas for {title || 'this job'}...
          </p>
          <Skeleton rows={4} />
        </>
      )}
      {state.status === 'error' && <ErrorLine error={state.error} />}

      {ideas.length > 0 && (
        <>
          <ul className={`flex flex-col gap-2 transition-opacity ${loading ? 'opacity-70' : ''}`}>
            {shown.map(({ idea, added }) => (
              <IdeaRow
                key={idea.text}
                idea={idea}
                added={added}
                sending={pending.includes(idea.text)}
                onUse={(el) => onAdd(idea.text, el)}
                onRemove={() => onRemove && onRemove(idea.text)}
              />
            ))}
          </ul>
          {hidden > 0 && (
            <p className="text-[11px] leading-snug text-slate-500">
              {hidden === 1 ? '1 idea is' : `${hidden} ideas are`} not shown because your achievements already say the same thing.
            </p>
          )}
          {loading && <Skeleton rows={2} />}
          <button type="button" onClick={() => ask(true)} disabled={loading} className={`${SECONDARY} w-full`}>
            <SparkleIcon className="w-3 h-3" />
            {loading ? 'Working...' : 'Load more ideas'}
          </button>
          <p className="text-[11px] leading-snug text-slate-500">
            {anyPlaceholder ? 'Replace each [X] with your real number before you download. ' : ''}Add only what you really did. Tell the AI your real figures in the box above and it will use them.
          </p>
        </>
      )}
    </div>
  );
}
