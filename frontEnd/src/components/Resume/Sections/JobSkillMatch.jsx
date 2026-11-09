import React, { useEffect, useMemo, useRef, useState } from 'react';
import { suggestJobSkills } from './jobMatchAI';
import { hasJobTarget, norm, scoreResume } from './atsScore';
import { isSkillTerm } from './skillFilter';
import { usePremiumAccess, requestUpgrade, setPremiumAccess } from '../../../hooks/premiumAccess';

/*
  Skills for the advertised job, at the top of the Skills step.

    <JobSkillMatch data={resumeData} onAdd={(text) => ...} />

  The AI compares the job (its keywords and requirements, plus the O*NET skills for the occupation) with the
  person's own work history and sorts the skills into two groups:
    - "Your experience backs these": the history really shows them. Each comes with the line it is based on.
    - "The job also asks for these": nothing in the history shows them. The person adds one only if it is true.
  SKILLS ONLY: degrees, diplomas, certificates, licences and years of experience are never listed here (they
  belong under Education). Every skill answers a real item of the job, and the server drops "evidence" that is
  not in the person's own text (routers/job_match.py; skillFilter.js is the same rule on the device).
  A tap adds the skill to the resume and takes it out of the list.

  It runs once when the step opens (answers are kept, so coming back is instant) and again on "Check again".
  If the AI cannot be reached, the job's own keywords that are still missing from the resume are listed instead.
*/

const FOCUS = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/60';

const ERROR_TEXT = {
  busy: 'That was a lot of requests in a minute. Give it a moment, then try again.',
  timeout: 'The AI took too long to answer. The server may be waking up, so try again in a few seconds.',
  offline: 'Couldn’t reach the AI service. Check your connection and try again.',
  unavailable: 'The AI is unavailable right now. These are the job’s own keywords your resume is still missing.',
  signin: 'Your session has expired. Sign in again to use this.',
};

const Sparkle = () => (
  <svg className="h-4 w-4 shrink-0 text-[#b8573b]" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M10 1.5l1.7 4.8 4.8 1.7-4.8 1.7L10 14.5l-1.7-4.8L3.5 8l4.8-1.7L10 1.5zM15.5 13l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z" />
  </svg>
);

const Plus = () => (
  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
  </svg>
);

const Row = ({ skill, note, onAdd }) => (
  <li className="flex items-start gap-3 rounded-sm p-2 hover:bg-white/70">
    <button
      type="button"
      onClick={() => onAdd(skill)}
      aria-label={`Add ${skill}`}
      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-slate-200 bg-white text-slate-500 transition-colors hover:border-[#d9856b] hover:text-[#b8573b] ${FOCUS}`}
    >
      <Plus />
    </button>
    <span className="min-w-0">
      <span className="block text-sm font-medium text-slate-800">{skill}</span>
      {note && <span className="mt-0.5 block text-xs leading-snug text-slate-500">{note}</span>}
    </span>
  </li>
);

const JobSkillMatch = ({ data, onAdd }) => {
  const target = data ? data.jobTarget : null;
  const premium = usePremiumAccess();
  const [state, setState] = useState({ status: 'idle', supported: [], toConfirm: [], error: null });
  const [recheck, setRecheck] = useState(0);
  const abortRef = useRef(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  const active = hasJobTarget(target);
  const targetKey = active ? `${target.title}|${target.keywords.map((k) => k.term).join(',')}` : '';
  const locked = premium === false;

  // Run when the step opens (or the job changes), and again on "Check again". Not on every keystroke elsewhere.
  useEffect(() => {
    if (!active || locked) return undefined;
    const d = dataRef.current || {};
    const hasHistory = (Array.isArray(d.experiences) ? d.experiences : []).some((j) => j && String(j.achievements || '').trim().length >= 20)
      || String(d.summary || '').trim().length >= 20;
    if (!hasHistory) {
      setState({ status: 'ready', supported: [], toConfirm: [], error: null, noHistory: true });
      return undefined;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setState((s) => ({ ...s, status: 'loading', error: null, noHistory: false }));
    suggestJobSkills({ target, resumeData: d, signal: controller.signal })
      .then((result) => setState({ status: 'ready', supported: result.supported, toConfirm: result.toConfirm, error: null }))
      .catch((err) => {
        if (err && err.name === 'AbortError') return;
        if (err && err.code === 'premium') setPremiumAccess(false); // the server says no Premium: lock the panel
        setState((s) => ({ ...s, status: 'error', error: err }));
      });
    return () => controller.abort();
    // The job and the re-check button decide when to ask; the resume is read from the ref at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey, recheck, active, locked]);

  const have = useMemo(
    () => new Set((Array.isArray(data?.skills) ? data.skills : []).map((s) => norm(s && s.text)).filter(Boolean)),
    [data]
  );
  const notHave = (skill) => !have.has(norm(skill));

  // No AI answer: the job's own keywords the resume is still missing.
  const fallback = useMemo(() => {
    const result = scoreResume(target, data);
    return result
      ? result.keywords.missing.filter((k) => k.kind !== 'soft' && k.kind !== 'credential' && isSkillTerm(k.term) && notHave(k.term)).slice(0, 8).map((k) => k.term)
      : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, data, have]);

  if (!active) return null;

  if (locked) {
    return (
      <section className="mb-8 rounded-md border border-slate-200 bg-white px-4 py-4">
        <p className="text-sm text-slate-700">Skills matched to {target.title || 'your target job'} are a Premium feature.</p>
        <button
          type="button"
          onClick={requestUpgrade}
          className={`mt-3 rounded-full bg-[#d9856b] px-5 py-2 text-xs font-bold text-white ${FOCUS}`}
        >
          Upgrade to Premium
        </button>
      </section>
    );
  }

  const supported = state.supported.filter((s) => notHave(s.skill));
  const toConfirm = state.toConfirm.filter((s) => notHave(s.skill));
  const loading = state.status === 'loading';
  const failed = state.status === 'error';
  const showFallback = (failed || state.noHistory) && fallback.length > 0;
  const nothingLeft = state.status === 'ready' && !state.noHistory && supported.length === 0 && toConfirm.length === 0;

  return (
    <section aria-label="Skills matched to the job" aria-busy={loading} className="mb-8 rounded-md border border-[#d9856b]/30 bg-[#d9856b]/5">
      <header className="flex items-start gap-3 px-4 pt-4">
        <span className="mt-0.5"><Sparkle /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-slate-900">Matched to {target.title || 'your target job'}</h2>
          <p className="mt-0.5 text-xs leading-snug text-slate-600">What the job asks for, compared with your work history. Skills only: degrees and certificates go under Education.</p>
        </div>
        <button
          type="button"
          onClick={() => setRecheck((n) => n + 1)}
          disabled={loading}
          className={`shrink-0 rounded px-2 py-1 text-xs font-semibold text-[#b8573b] hover:bg-[#d9856b]/10 disabled:opacity-40 ${FOCUS}`}
        >
          Check again
        </button>
      </header>

      <div className="px-2 pb-3 pt-2">
        {loading && supported.length === 0 && toConfirm.length === 0 && (
          <div className="flex flex-col gap-2.5 px-2 py-2" aria-hidden="true">
            {[72, 56, 64].map((w) => (
              <span key={w} className="h-3.5 animate-pulse rounded bg-[#d9856b]/15 motion-reduce:animate-none" style={{ width: `${w}%` }} />
            ))}
          </div>
        )}

        {failed && (
          <p role="alert" className="mx-2 mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
            {ERROR_TEXT[state.error && state.error.code] || ERROR_TEXT.unavailable}
          </p>
        )}

        {state.noHistory && (
          <p className="mx-2 mb-1 text-xs leading-relaxed text-slate-600">
            Add your work history first and we’ll show which skills your experience backs. Until then, this is what the job asks for.
          </p>
        )}

        {supported.length > 0 && (
          <div className="mb-2">
            <p className="px-2 pb-1 pt-1 text-xs font-semibold text-slate-700">Your experience backs these</p>
            <ul>
              {supported.map((s) => (
                <Row key={s.skill} skill={s.skill} note={s.evidence ? `From your history: ${s.evidence}` : ''} onAdd={onAdd} />
              ))}
            </ul>
          </div>
        )}

        {toConfirm.length > 0 && (
          <div>
            <p className="px-2 pb-1 pt-1 text-xs font-semibold text-slate-700">The job also asks for these. Add only what’s true for you.</p>
            <ul>
              {toConfirm.map((s) => (
                <Row key={s.skill} skill={s.skill} note={s.reason || (s.jobItem ? `The job asks for: ${s.jobItem}` : '')} onAdd={onAdd} />
              ))}
            </ul>
          </div>
        )}

        {showFallback && (
          <ul>
            {fallback.map((term) => (
              <Row key={term} skill={term} note="Asked for in the job. Add it only if it’s true for you." onAdd={onAdd} />
            ))}
          </ul>
        )}

        {nothingLeft && <p className="px-2 py-1 text-xs text-slate-600">Your skills already cover what we found for this job.</p>}
      </div>
    </section>
  );
};

export default JobSkillMatch;
