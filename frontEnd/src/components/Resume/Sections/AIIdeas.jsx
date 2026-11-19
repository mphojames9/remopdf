import React, { useEffect, useRef, useState } from 'react';
import { suggestSkillIdeas, suggestEducationIdeas, suggestAchievementIdeas, hasJobTarget } from './jobMatchAI';
import { hasAchievement } from './aiSuggestions';
import { usePremiumAccess, useSignedIn, requestUpgrade, requestSignIn, setPremiumAccess } from '../../../hooks/premiumAccess';

/*
  The AI ideas for three steps of the builder. They replace the O*NET suggestions there (O*NET is now only used for job
  titles). All of them are Premium: the free plan has no AI suggestions, so a free or signed-out person sees a short note
  and a button instead. Every request goes through jobMatchAI.js (the signed AI pass, one AI action each).

    <SkillIdeas data selectedTexts onAdd pending />      Skills step: skills from the qualification, the work history
                                                          and the job being targeted. Loads once when the step opens.
    <EducationIdeas entry resumeData onAdd />            Education step: lines for the Details box of one qualification.
    <AchievementIdeas job skills jobTarget onAdd pending />
                                                          Work history step: one achievement for the job title, in two
                                                          versions (with numbers, without), plus an ask box.

  Nothing is added to the resume until the person presses the add button. Skills the person's own words do not show are
  marked, and a figure the person never wrote is always a [placeholder] to fill in.
*/

const PRIMARY =
  'inline-flex items-center justify-center gap-1.5 min-h-[32px] px-3 rounded-sm bg-[#d9856b] text-white text-xs font-bold hover:bg-[#c97558] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/50';
const SECONDARY =
  'inline-flex items-center justify-center gap-1.5 min-h-[32px] px-3 rounded-sm border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:border-[#d9856b] hover:text-[#d9856b] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/50';

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
/*                                   Skills                                    */
/* -------------------------------------------------------------------------- */

const BASIS = {
  work: { label: 'From your work', tone: 'bg-emerald-50 text-emerald-800 border-emerald-100' },
  education: { label: 'From your education', tone: 'bg-sky-50 text-sky-800 border-sky-100' },
  job: { label: 'Job asks for it', tone: 'bg-amber-50 text-amber-800 border-amber-100' },
  role: { label: 'Common for your roles', tone: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export function SkillIdeas({ data, selectedTexts, onAdd, pending = [] }) {
  const lock = useLock();
  const [state, run] = useIdeaRequest();
  const [prompt, setPrompt] = useState('');
  const shownRef = useRef([]); // every skill shown so far, so "Show new ideas" brings others
  const startedRef = useRef(false);
  const target = data && data.jobTarget;
  const targeted = hasJobTarget(target);
  const loading = state.status === 'loading';

  const ask = (more) =>
    run(async (signal) => {
      const result = await suggestSkillIdeas({ resumeData: data, target, prompt, avoid: more ? shownRef.current : [], signal });
      const names = result.skills.map((s) => s.skill);
      shownRef.current = more ? [...shownRef.current, ...names].slice(-40) : names;
      return result;
    });

  // Opens with suggestions already there, like the list it replaces (one request; the same request again is free).
  useEffect(() => {
    if (lock || startedRef.current) return;
    startedRef.current = true;
    ask(false);
  }, [lock]); // eslint-disable-line react-hooks/exhaustive-deps

  if (lock) {
    return (
      <Locked
        lock={lock}
        title="AI skill suggestions"
        note="AI skill suggestions are part of Premium: skills drawn from your qualification, your work history and the job you are applying for. You can still type your own skills on the right."
        className="lg:h-[360px]"
      />
    );
  }

  const taken = new Set((selectedTexts || []).map((t) => String(t || '').trim().toLowerCase()));
  const skills = (state.data && state.data.skills) || [];
  const items = skills.filter((s) => pending.includes(s.skill) || !taken.has(s.skill.toLowerCase()));
  const needsHistory = Boolean(state.data && state.data.needsHistory);

  return (
    <div className="border border-slate-200 rounded-sm bg-white h-[360px] flex flex-col">
      <div className="p-3 border-b border-slate-100 bg-slate-50 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide inline-flex items-center gap-1.5">
            <span className="text-[#d9856b]">
              <SparkleIcon />
            </span>
            AI skill suggestions
          </span>
          {skills.length > 0 && (
            <button type="button" onClick={() => ask(true)} disabled={loading} className={SECONDARY}>
              Show new ideas
            </button>
          )}
        </div>
        <AskBox
          value={prompt}
          onChange={setPrompt}
          onSubmit={() => ask(false)}
          placeholder="Ask for something, e.g. technical skills"
          busy={loading}
          label="Suggest"
          ariaLabel="Tell the AI which skills you want"
        />
        <span className="text-[11px] text-slate-500">
          {targeted ? `Based on your education, work history and the job you target (${target.title || 'your target job'})` : 'Based on your education and work history'}
        </span>
      </div>

      <div className="overflow-y-auto flex-1 p-2 flex flex-col">
        {loading && items.length === 0 && <Skeleton rows={5} />}

        {state.status === 'error' && <ErrorLine error={state.error} />}

        {needsHistory && !loading && (
          <p className="p-2 text-xs text-slate-500">Add your work history or education first, and the AI will suggest skills from them. You can also type what you want in the box above.</p>
        )}

        {items.map((item) => {
          const sending = pending.includes(item.skill); // sliding into the list
          const basis = BASIS[item.basis] || BASIS.role;
          return (
            <div
              key={item.skill}
              className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${sending ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="mb-1 flex items-start gap-3 p-2 rounded-sm hover:bg-slate-50 border border-transparent transition-colors group" title={item.evidence || item.why || undefined}>
                  <button
                    type="button"
                    onClick={(e) => onAdd(item.skill, e.currentTarget.parentElement.querySelector('[data-skill-text]'))}
                    disabled={sending}
                    className={`mt-0.5 w-6 h-6 rounded-sm border flex items-center justify-center shrink-0 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${
                      sending ? 'bg-slate-700 border-slate-700 text-white cursor-default' : 'bg-white border-slate-200 text-slate-500 group-hover:border-slate-400 group-hover:text-slate-800'
                    }`}
                    aria-label={sending ? `Added ${item.skill}` : `Add ${item.skill}`}
                  >
                    <PlusIcon done={sending} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <span data-skill-text className="text-sm text-slate-700">
                      {item.skill}
                    </span>
                    <span className={`ml-2 inline-block align-middle rounded-full border px-1.5 py-px text-[10px] font-medium leading-4 ${basis.tone}`}>{basis.label}</span>
                    {item.why && <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{item.why}</p>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {!loading && state.status === 'ready' && !needsHistory && items.length === 0 && (
          <p className="p-2 text-xs text-slate-500">{skills.length > 0 ? 'You have added all of these. Tap “Show new ideas” for more.' : 'No suggestions this time. Try asking for something specific above.'}</p>
        )}

        {items.some((i) => i.confirm) && (
          <p className="mt-auto px-2 pt-2 text-[11px] leading-snug text-slate-500">Add “Job asks for it” and “Common for your roles” skills only if they are true for you.</p>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Education                                  */
/* -------------------------------------------------------------------------- */

export function EducationIdeas({ entry, resumeData, onAdd }) {
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

  const ideas = (state.data && state.data.ideas) || [];

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
          {ideas.map((text) => {
            const added = hasAchievement(entry.achievements, text);
            return (
              <li key={text} className={`flex items-start gap-2.5 transition-opacity ${loading ? 'opacity-60' : ''}`}>
                <button
                  type="button"
                  onClick={() => onAdd(text)}
                  disabled={added}
                  aria-label={added ? 'Added' : `Add: ${text}`}
                  className={`mt-0.5 w-6 h-6 shrink-0 rounded-sm border flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d9856b] ${
                    added ? 'bg-[#d9856b] border-[#d9856b] text-white cursor-default' : 'bg-white border-slate-200 text-slate-500 hover:border-[#d9856b] hover:text-[#d9856b]'
                  }`}
                >
                  <PlusIcon done={added} />
                </button>
                <span className="text-xs text-slate-700 leading-relaxed pt-1">{text}</span>
              </li>
            );
          })}
        </ul>
      )}
      {ideas.length > 0 && <p className="text-[11px] leading-snug text-slate-500">These are ideas for what a qualification like yours covers. Add only what you really studied.</p>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Achievements                                 */
/* -------------------------------------------------------------------------- */

const VersionCard = ({ kind, version, added, sending, onUse }) => {
  const textRef = useRef(null); // where the added line slides in from
  return (
  <div className="rounded-sm border border-slate-200 bg-white p-3">
    <div className="flex items-center justify-between gap-2">
      <span
        className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
          kind === 'numbers' ? 'bg-amber-50 text-amber-800 border-amber-100' : 'bg-slate-100 text-slate-600 border-slate-200'
        }`}
      >
        {kind === 'numbers' ? 'With numbers' : 'Without numbers'}
      </span>
      <button type="button" onClick={() => onUse(textRef.current)} disabled={added || sending} className={added || sending ? SECONDARY : PRIMARY}>
        {added || sending ? 'Added' : 'Use this version'}
      </button>
    </div>
    <p ref={textRef} data-idea-text className="mt-2 text-xs leading-relaxed text-slate-700">
      {withPlaceholders(version.text)}
    </p>
    {version.uses.length > 0 && (
      <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
        Matches the job:
        {version.uses.map((word) => (
          <span key={word} className="rounded-full border border-emerald-100 bg-emerald-50 px-1.5 py-px text-[10px] font-medium text-emerald-800">
            {word}
          </span>
        ))}
      </p>
    )}
  </div>
  );
};

export function AchievementIdeas({ job, skills = [], jobTarget, onAdd, pending = [] }) {
  const lock = useLock();
  const [state, run] = useIdeaRequest();
  const [prompt, setPrompt] = useState('');
  const shownRef = useRef([]); // the versions shown so far, so "Show new ideas" brings a different achievement
  const title = String(job.title || '').trim();
  const targeted = hasJobTarget(jobTarget);
  const loading = state.status === 'loading';

  const ask = (more) =>
    run(async (signal) => {
      const result = await suggestAchievementIdeas({ job, skills, target: jobTarget, prompt, avoid: more ? shownRef.current : [], signal });
      const texts = [result.withNumbers, result.withoutNumbers].filter(Boolean).map((v) => v.text);
      shownRef.current = more ? [...shownRef.current, ...texts].slice(-12) : texts;
      return result;
    });

  if (lock) {
    return (
      <Locked
        lock={lock}
        title="AI achievement ideas"
        note="AI achievement ideas are part of Premium: an achievement for your job title in two versions, one with numbers and one without, matched to the keywords of the job you target. Tell the AI what to improve and it rewrites it."
      />
    );
  }

  const data = state.data;
  const versions = data ? [data.withNumbers && { kind: 'numbers', version: data.withNumbers }, data.withoutNumbers && { kind: 'plain', version: data.withoutNumbers }].filter(Boolean) : [];
  const anyPlaceholder = versions.some((v) => /\[[^\]]+\]/.test(v.version.text));

  return (
    <div className="border border-slate-200 rounded-sm bg-slate-50/60 p-3 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
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
        {versions.length > 0 && (
          <button type="button" onClick={() => ask(true)} disabled={loading} className={`${SECONDARY} shrink-0`}>
            <SparkleIcon className="w-3 h-3" />
            Show new ideas
          </button>
        )}
      </div>

      <AskBox
        value={prompt}
        onChange={setPrompt}
        onSubmit={() => ask(false)}
        placeholder="Tell the AI what to improve or add, e.g. add numbers, focus on safety"
        disabled={!title}
        busy={loading}
        label={versions.length > 0 ? 'Update' : 'Suggest'}
        ariaLabel="Tell the AI what kind of achievement you want"
      />

      {loading && versions.length === 0 && <Skeleton rows={2} />}
      {state.status === 'error' && <ErrorLine error={state.error} />}

      {versions.length > 0 && (
        <div className={`flex flex-col gap-2 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {versions.map(({ kind, version }) => (
            <VersionCard
              key={kind}
              kind={kind}
              version={version}
              added={hasAchievement(job.achievements, version.text)}
              sending={pending.includes(version.text)}
              onUse={(el) => onAdd(version.text, el)}
            />
          ))}
          {versions.length === 1 && <p className="text-[11px] text-slate-500">Only one version could be written this time. Tap “Update” to try for both.</p>}
          <p className="text-[11px] leading-snug text-slate-500">
            {anyPlaceholder ? 'Replace each [X] with your real number before you download. ' : ''}Add only what you really did. Tell the AI your real figures in the box above and it will use them.
          </p>
        </div>
      )}
    </div>
  );
}
