import React, { useEffect, useRef, useState } from 'react';
import { buildJobTarget } from './jobMatchAI';
import { hasJobTarget, norm } from './atsScore';

/*
  "What are you applying for?" - the first thing a Premium person sees before they start writing.

    <JobTargetStudio
      open
      initial={resumeData.jobTarget}   a saved target (opens straight on its review) or nothing
      onSave={(target) => ...}         the person reviewed the keywords and chose "Start my resume"
      onSkip={() => ...}               "Skip for now" (only offered while there is no target yet)
      onClose={() => ...}              closes without changes (offered when a target already exists)
      onRemove={() => ...}             "Remove job target" (only when one exists)
    />

  Three steps, one question each:
    aim      a job link, the advert pasted, or just a job title
    reading  the server reads the advert, finds the keywords and matches the O*NET occupation
    review   the person sees what the job looks for, removes what does not matter, adds their own, and starts

  Nothing here grants Premium: the builder only opens this for Premium accounts and the server checks the
  AI pass on every request. The person's resume is never sent from this screen, only the job.
*/

const FONT = "'Outfit', ui-sans-serif, system-ui, sans-serif";

const MODES = [
  { id: 'link', label: 'Job link' },
  { id: 'text', label: 'Paste advert' },
  { id: 'title', label: 'Job title' },
];

const HELP = {
  link: 'Works with most job boards and company sites. If a site blocks us, paste the advert instead.',
  text: 'Paste the whole advert, requirements included.',
  title: 'No advert? We’ll use the standard skills and tools for that occupation, from O*NET.',
};

const PLACEHOLDER = {
  link: 'https://www.pnet.co.za/jobs/…',
  text: 'Paste the job advert here…',
  title: 'e.g. Financial Accountant',
};

const ERROR_TEXT = {
  signin: 'Your session has expired. Sign in again to continue.',
  premium: 'Tailoring your resume to a job is a Premium feature.',
  busy: 'That was a lot of requests in a minute. Give it a moment, then try again.',
  timeout: 'That took too long. The server may be waking up, so try again in a few seconds.',
  offline: 'Couldn’t reach the AI service. Check your connection and try again.',
  unavailable: 'Job analysis is unavailable right now. You can skip this and add a job later.',
};

const CSS = `
@keyframes jtSheet { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes jtChip { from { opacity: 0; transform: translateY(6px) scale(.98); } to { opacity: 1; transform: none; } }
@keyframes jtSpin { to { transform: rotate(360deg); } }
@keyframes jtSlide { 0% { transform: translateX(-100%); } 100% { transform: translateX(260%); } }
.jt-sheet { animation: jtSheet .26s ease-out both; }
.jt-chip { animation: jtChip .34s cubic-bezier(.22,.8,.28,1) both; animation-delay: calc(var(--i, 0) * 18ms); }
.jt-spin { animation: jtSpin .9s linear infinite; }
.jt-bar { animation: jtSlide 1.5s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .jt-sheet, .jt-chip, .jt-spin, .jt-bar { animation: none !important; }
}
`;

const FOCUS = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/60';

const Glyph = ({ className = 'h-6 w-6' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
  </svg>
);

const Cross = () => (
  <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" />
  </svg>
);

const sendable = (mode, raw) => {
  const value = raw.trim();
  if (mode === 'link') return value.length >= 6 && !/\s/.test(value) && value.includes('.');
  if (mode === 'text') return value.length >= 80;
  return value.length >= 2;
};

const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Someone pasted the advert into the link box: say so instead of just disabling the button.
const looksLikeAdvert = (raw) => raw.trim().length >= 80 && /\s/.test(raw.trim());

const stageText = (mode, seconds) => {
  if (seconds >= 20) return 'Still working. The server may be waking up, which can take up to a minute the first time.';
  if (mode === 'title') return seconds >= 4 ? 'Matching the O*NET occupation…' : 'Looking up the occupation…';
  if (seconds >= 11) return 'Matching the O*NET occupation…';
  if (seconds >= 4) return 'Finding the keywords an ATS looks for…';
  return 'Reading the advert…';
};

const JobTargetStudio = ({ open, initial = null, onSave, onSkip, onClose, onRemove }) => {
  const existing = hasJobTarget(initial) ? initial : null;
  const [phase, setPhase] = useState('aim'); // aim | reading | review
  const [mode, setMode] = useState('link');
  const [inputs, setInputs] = useState({ link: '', text: '', title: '' });
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState(null);
  const [notice, setNotice] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [newWord, setNewWord] = useState('');
  const abortRef = useRef(null);
  const inputRef = useRef(null);
  const returnFocusRef = useRef(null);

  // Opening: start fresh (or on the review of the saved target) and remember where focus was.
  useEffect(() => {
    if (!open) return undefined;
    returnFocusRef.current = typeof document !== 'undefined' ? document.activeElement : null;
    setError(null);
    setNotice(null);
    setNewWord('');
    setInputs({ link: '', text: '', title: '' });
    setMode('link');
    if (existing) {
      setDraft({ ...existing });
      setPhase('review');
    } else {
      setDraft(null);
      setPhase('aim');
    }
    return () => {
      if (abortRef.current) abortRef.current.abort();
      const back = returnFocusRef.current;
      if (back && typeof back.focus === 'function') back.focus();
    };
    // `existing` is read when the dialog opens; a save while it is open must not reset it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Focus the box when the first step shows.
  useEffect(() => {
    if (open && phase === 'aim') {
      const id = requestAnimationFrame(() => inputRef.current && inputRef.current.focus());
      return () => cancelAnimationFrame(id);
    }
    return undefined;
  }, [open, phase, mode]);

  // The wait counter, for the status line.
  useEffect(() => {
    if (phase !== 'reading') return undefined;
    setSeconds(0);
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  const dismiss = () => {
    if (abortRef.current) abortRef.current.abort();
    if (existing) onClose && onClose();
    else onSkip && onSkip();
  };

  // Escape leaves the same way the top-right button does.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') dismiss();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existing]);

  if (!open) return null;

  const value = inputs[mode];
  const canSend = sendable(mode, value);

  const analyse = async () => {
    if (!canSend) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setError(null);
    setPhase('reading');
    try {
      const field = mode === 'link' ? 'url' : mode === 'text' ? 'text' : 'title';
      const { target, notice: note } = await buildJobTarget({ [field]: value.trim(), signal: controller.signal });
      setDraft(target);
      setNotice(note);
      setPhase('review');
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      setError(err);
      setPhase('aim');
    }
  };

  const cancelReading = () => {
    if (abortRef.current) abortRef.current.abort();
    setPhase('aim');
  };

  const removeWord = (term) =>
    setDraft((d) => ({ ...d, keywords: d.keywords.filter((k) => k.term !== term) }));

  const addWord = () => {
    const term = newWord.trim().slice(0, 40);
    if (term.length < 2) return;
    setDraft((d) => {
      if (d.keywords.some((k) => norm(k.term) === norm(term)) || d.keywords.length >= 40) return d;
      return { ...d, keywords: [...d.keywords, { term, kind: 'skill', must: false, source: 'ad' }] };
    });
    setNewWord('');
  };

  const start = () => {
    if (!draft || draft.keywords.length === 0) return;
    onSave && onSave({ ...draft, title: (draft.title || '').trim().slice(0, 120) });
  };

  const fromOnet = Boolean(draft && draft.keywords.length > 0 && draft.keywords.every((k) => k.source === 'onet'));
  const must = draft ? draft.keywords.filter((k) => k.must) : [];
  const rest = draft ? draft.keywords.filter((k) => !k.must) : [];
  // A plain function, not a component: a component defined here would remount (and replay its entrance) on every keystroke.
  const renderChip = (kw, strong, index) => (
    <span
      key={kw.term}
      className={`jt-chip inline-flex items-center gap-1.5 rounded-full border py-1.5 pl-3.5 pr-2 text-sm ${
        strong ? 'border-[#d9856b]/35 bg-[#d9856b]/10 text-[#7a3b28]' : 'border-slate-200 bg-white text-slate-700'
      }`}
      style={{ '--i': index }}
    >
      {kw.term}
      <button
        type="button"
        onClick={() => removeWord(kw.term)}
        aria-label={`Remove ${kw.term}`}
        className={`flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-900/5 hover:text-slate-700 ${FOCUS}`}
      >
        <Cross />
      </button>
    </span>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-target-heading"
      className="jt-sheet fixed inset-0 z-[70] overflow-y-auto bg-[#fffcf6] text-slate-900 antialiased"
      style={{ fontFamily: FONT }}
    >
      <style>{CSS}</style>
      <div className="mx-auto flex min-h-full w-full max-w-[700px] flex-col px-5 pb-10 pt-5 sm:px-8 sm:pt-8">
        <div className="flex items-center justify-between">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d9856b]/12 text-[#b8573b]">
            <Glyph />
          </span>
          <button
            type="button"
            onClick={dismiss}
            className={`rounded-full px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-900/5 hover:text-slate-800 ${FOCUS}`}
          >
            {existing ? 'Close' : 'Skip for now'}
          </button>
        </div>

        {phase === 'aim' && (
          <main className="flex flex-1 flex-col justify-center py-10 sm:py-14">
            <h1 id="job-target-heading" className="text-[2.1rem] font-semibold leading-[1.05] tracking-tight sm:text-5xl">
              What are you applying for?
            </h1>
            <p className="mt-4 max-w-[48ch] text-base leading-relaxed text-slate-600">
              Give us the job. We’ll tailor your skills, achievements and summary to it, and score your resume against it while you write.
            </p>

            <div role="tablist" aria-label="How to describe the job" className="mt-10 flex gap-6 overflow-x-auto border-b border-slate-200">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={mode === m.id}
                  onClick={() => {
                    setMode(m.id);
                    setError(null);
                  }}
                  className={`-mb-px shrink-0 border-b-2 pb-3 text-sm font-semibold transition-colors ${FOCUS} ${
                    mode === m.id ? 'border-[#d9856b] text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="pt-5">
              {mode === 'text' ? (
                <textarea
                  ref={inputRef}
                  value={inputs.text}
                  onChange={(e) => setInputs((s) => ({ ...s, text: e.target.value }))}
                  rows={9}
                  maxLength={20000}
                  placeholder={PLACEHOLDER.text}
                  aria-label="Job advert"
                  className={`w-full resize-y rounded-md border border-slate-300 bg-white px-4 py-3.5 text-base leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-[#d9856b] ${FOCUS}`}
                />
              ) : (
                <input
                  ref={inputRef}
                  type={mode === 'link' ? 'url' : 'text'}
                  inputMode={mode === 'link' ? 'url' : 'text'}
                  autoComplete="off"
                  spellCheck={mode === 'title'}
                  value={inputs[mode]}
                  onChange={(e) => setInputs((s) => ({ ...s, [mode]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') analyse();
                  }}
                  maxLength={mode === 'link' ? 2000 : 120}
                  placeholder={PLACEHOLDER[mode]}
                  aria-label={mode === 'link' ? 'Link to the job advert' : 'Job title'}
                  className={`w-full rounded-md border border-slate-300 bg-white px-4 py-3.5 text-base text-slate-800 placeholder:text-slate-400 focus:border-[#d9856b] ${FOCUS}`}
                />
              )}

              {mode === 'link' && looksLikeAdvert(inputs.link) ? (
                <p className="mt-3 text-sm text-slate-600">
                  That looks like the advert itself.{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setInputs((s) => ({ ...s, text: s.link, link: '' }));
                      setMode('text');
                    }}
                    className={`font-semibold text-[#b8573b] underline underline-offset-2 ${FOCUS}`}
                  >
                    Use it as a pasted advert
                  </button>
                </p>
              ) : (
                <p className="mt-3 text-sm text-slate-500">{HELP[mode]}</p>
              )}

              {error && (
                <p role="alert" className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm leading-relaxed text-amber-900">
                  {ERROR_TEXT[error.code] || error.message || ERROR_TEXT.unavailable}
                </p>
              )}
            </div>

            <div className="mt-8">
              <button
                type="button"
                onClick={analyse}
                disabled={!canSend}
                className={`w-full rounded-full bg-[#d9856b] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#d9856b]/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#d9856b]/35 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none sm:w-auto ${FOCUS}`}
              >
                Analyse the job
              </button>
            </div>
          </main>
        )}

        {phase === 'reading' && (
          <main className="flex flex-1 flex-col items-center justify-center py-14 text-center" aria-live="polite">
            <span className="jt-spin block h-9 w-9 rounded-full border-2 border-[#d9856b]/25 border-t-[#d9856b]" aria-hidden="true" />
            <h1 id="job-target-heading" className="mt-7 text-2xl font-semibold tracking-tight sm:text-3xl">
              Reading the job
            </h1>
            <p className="mt-3 max-w-[40ch] text-base text-slate-600">{stageText(mode, seconds)}</p>
            <div className="relative mt-8 h-0.5 w-56 overflow-hidden bg-slate-200" aria-hidden="true">
              <span className="jt-bar absolute inset-y-0 left-0 w-1/3 bg-[#d9856b]" />
            </div>
            <button type="button" onClick={cancelReading} className={`mt-8 rounded-full px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 ${FOCUS}`}>
              Cancel
            </button>
          </main>
        )}

        {phase === 'review' && draft && (
          <main className="flex flex-1 flex-col py-8 sm:py-12">
            <p className="text-sm text-slate-500">
              {draft.source === 'title' ? 'Built from the job title' : draft.source === 'text' ? 'Read from the pasted advert' : 'Read from the advert'}
            </p>
            <h1 id="job-target-heading" className="sr-only">
              Review the job target
            </h1>
            <label className="mt-1 block">
              <span className="sr-only">Job title</span>
              <input
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                maxLength={120}
                className={`w-full border-b border-transparent bg-transparent pb-1 text-[1.9rem] font-semibold leading-tight tracking-tight placeholder:text-slate-300 hover:border-slate-200 focus:border-[#d9856b] sm:text-4xl focus:outline-none`}
              />
            </label>
            {draft.company && <p className="mt-1 text-lg text-slate-600">{draft.company}</p>}
            {draft.onet && (
              <p className="mt-3 text-sm text-slate-600">
                Matched to the O*NET occupation <span className="font-semibold text-slate-800">{draft.onet.title}</span>
                <span className="text-slate-400"> ({draft.onet.code})</span>
              </p>
            )}
            {notice && (
              <p role="status" className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm leading-relaxed text-amber-900">
                {notice}
              </p>
            )}

            <h2 className="mt-9 text-base font-semibold text-slate-900">What this job looks for</h2>
            <p className="mt-1 max-w-[52ch] text-sm leading-relaxed text-slate-500">
              {fromOnet
                ? 'These are the tools and skills most used in this occupation. Remove what doesn’t apply and add your own.'
                : 'These are the words an applicant tracking system scans for. Remove what doesn’t matter and add your own.'}
            </p>

            {must.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-sm font-medium text-slate-700">{fromOnet ? 'Most used' : 'Required'}</p>
                <div className="flex flex-wrap gap-2">
                  {must.map((kw, i) => renderChip(kw, true, i))}
                </div>
              </div>
            )}
            {rest.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-sm font-medium text-slate-700">{fromOnet ? 'Also common' : 'Also mentioned'}</p>
                <div className="flex flex-wrap gap-2">
                  {rest.map((kw, i) => renderChip(kw, false, must.length + i))}
                </div>
              </div>
            )}
            {draft.keywords.length === 0 && <p className="mt-5 text-sm text-amber-800">Add at least one keyword to start.</p>}

            <form
              className="mt-6 flex max-w-[420px] gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                addWord();
              }}
            >
              <input
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                maxLength={40}
                placeholder="Add a keyword"
                aria-label="Add a keyword"
                className={`min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-sm placeholder:text-slate-400 focus:border-[#d9856b] ${FOCUS}`}
              />
              <button
                type="submit"
                disabled={newWord.trim().length < 2}
                className={`shrink-0 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS}`}
              >
                Add
              </button>
            </form>

            {(draft.requirements.length > 0 || draft.duties.length > 0) && (
              <details className="mt-8 border-t border-slate-200 pt-4">
                <summary className={`cursor-pointer text-sm font-semibold text-slate-700 ${FOCUS}`}>
                  What the advert asks for ({count(draft.requirements.length, 'requirement', 'requirements')}, {count(draft.duties.length, 'duty', 'duties')})
                </summary>
                <div className="mt-3 grid gap-5 text-sm leading-relaxed text-slate-600 sm:grid-cols-2">
                  {draft.requirements.length > 0 && (
                    <div>
                      <p className="mb-1.5 font-semibold text-slate-800">Requirements</p>
                      <ul className="list-disc space-y-1 pl-5">
                        {draft.requirements.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {draft.duties.length > 0 && (
                    <div>
                      <p className="mb-1.5 font-semibold text-slate-800">Duties</p>
                      <ul className="list-disc space-y-1 pl-5">
                        {draft.duties.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="mt-10 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => {
                  setPhase('aim');
                  setError(null);
                }}
                className={`rounded-full border border-slate-300 px-7 py-3.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 ${FOCUS}`}
              >
                Use a different job
              </button>
              <button
                type="button"
                onClick={start}
                disabled={draft.keywords.length === 0}
                className={`rounded-full bg-[#d9856b] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#d9856b]/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#d9856b]/35 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none ${FOCUS}`}
              >
                {existing ? 'Save changes' : 'Start my resume'}
              </button>
              {existing && onRemove && (
                <button
                  type="button"
                  onClick={onRemove}
                  className={`rounded-full px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-red-600 sm:ml-auto ${FOCUS}`}
                >
                  Remove job target
                </button>
              )}
            </div>
          </main>
        )}
      </div>
    </div>
  );
};

export default JobTargetStudio;
