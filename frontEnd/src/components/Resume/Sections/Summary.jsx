import React, { useEffect, useRef, useState } from 'react';
import AchievementsField from './AchievementsField';
import SpellCheckPanel from './SpellCheckPanel';
import { writeSummary } from './jobMatchAI';
import { hasJobTarget } from './atsScore';
import { usePremiumAccess, useSignedIn, requestUpgrade, requestSignIn, setPremiumAccess } from '../../../hooks/premiumAccess';

/*
  Summary step.

  "Write my summary" (Premium) asks the AI to write the professional summary from the person's own work history
  and skills, shaped for the job target when there is one (routers/job_match.py, POST /api/jobmatch/summary).
  Nothing is put in the box until the person chooses "Use this summary", so a summary they already wrote is never
  replaced by surprise. The server drops any answer that holds a figure or a qualification the resume does not.
*/

const FOCUS = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/60';

const ERROR_TEXT = {
  busy: 'That was a lot of requests in a minute. Give it a moment, then try again.',
  timeout: 'The AI took too long to answer. The server may be waking up, so try again in a few seconds.',
  offline: 'Couldn’t reach the AI service. Check your connection and try again.',
  signin: 'Your session has expired. Sign in again to use this.',
  needhistory: 'Add your work history and skills first. The summary is written from them.',
  nodetails: 'A summary could not be written from this history. Add a little more detail to your work history and try again.',
  unavailable: 'The AI is unavailable right now. Please try again in a moment.',
};

const Sparkle = () => (
  <svg className="h-4 w-4 shrink-0 text-[#b8573b]" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M10 1.5l1.7 4.8 4.8 1.7-4.8 1.7L10 14.5l-1.7-4.8L3.5 8l4.8-1.7L10 1.5zM15.5 13l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z" />
  </svg>
);

const SummarySection = ({ data, updateSummary }) => {
  const premium = usePremiumAccess();
  const signedOut = useSignedIn() === false;
  const [state, setState] = useState({ status: 'idle', text: '', error: null });
  const abortRef = useRef(null);
  const variantRef = useRef(0);

  // Leaving the step cancels a request that is still running.
  useEffect(() => () => abortRef.current?.abort(), []);

  if (!data) return null;

  const loading = state.status === 'loading';
  const ready = state.status === 'ready';
  const failed = state.status === 'error';
  const tailored = hasJobTarget(data.jobTarget);
  const hasSummary = String(data.summary || '').trim().length > 0;

  const write = async (again = false) => {
    if (loading) return;
    if (signedOut) {
      requestSignIn();
      return;
    }
    if (premium === false) {
      requestUpgrade();
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    variantRef.current = again ? variantRef.current + 1 : 0;
    setState((s) => ({ ...s, status: 'loading', error: null }));
    try {
      const { summary } = await writeSummary({ target: data.jobTarget, resumeData: data, variant: variantRef.current, signal: controller.signal });
      if (controller.signal.aborted) return;
      setState({ status: 'ready', text: summary, error: null });
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      if (err && err.code === 'premium') setPremiumAccess(false); // the server says no Premium
      setState((s) => ({ ...s, status: 'error', error: err }));
    }
  };

  const useIt = () => {
    updateSummary(state.text);
    setState({ status: 'idle', text: '', error: null });
  };

  const dismiss = () => setState({ status: 'idle', text: '', error: null });

  return (
    <div className="max-w-[1000px] mx-auto pb-32">
      <h1 className="text-xl font-bold text-slate-800 mb-1">Briefly tell us about your background</h1>
      <p className="text-sm text-slate-500 mb-6">Write a few sentences about your experience and strengths.</p>

      {/* Auto-write: the summary, written from the work history and skills */}
      <section aria-label="Write my summary" aria-busy={loading} className="mb-6 rounded-md border border-[#d9856b]/30 bg-[#d9856b]/5 px-4 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="mt-0.5 self-start"><Sparkle /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-slate-900">Let us write it for you</h2>
            <p className="mt-0.5 text-xs leading-snug text-slate-600">
              {tailored
                ? `Written from your work history and skills, shaped for ${data.jobTarget.title || 'your target job'}.`
                : 'Written from your work history and skills.'}{' '}
              It only uses what your resume already says.
            </p>
          </div>
          <button
            type="button"
            onClick={() => write(ready)}
            disabled={loading}
            className={`shrink-0 rounded-full bg-[#d9856b] px-5 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60 ${FOCUS}`}
          >
            {loading ? 'Writing…' : ready ? 'Write another' : premium === false ? 'Write my summary (Premium)' : 'Write my summary'}
          </button>
        </div>

        {loading && (
          <div className="mt-3 flex flex-col gap-2.5" aria-hidden="true">
            {[96, 88, 64].map((w) => (
              <span key={w} className="h-3.5 animate-pulse rounded bg-[#d9856b]/15 motion-reduce:animate-none" style={{ width: `${w}%` }} />
            ))}
          </div>
        )}

        {failed && (
          <p role="alert" className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
            {ERROR_TEXT[state.error && state.error.code] || ERROR_TEXT.unavailable}
          </p>
        )}

        {ready && !loading && (
          <div className="mt-3 rounded-md border border-slate-200 bg-white px-4 py-3">
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-800">{state.text}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={useIt}
                className={`rounded-full bg-[#d9856b] px-4 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90 ${FOCUS}`}
              >
                Use this summary
              </button>
              <button
                type="button"
                onClick={dismiss}
                className={`rounded px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 ${FOCUS}`}
              >
                Dismiss
              </button>
              {hasSummary && <span className="text-xs text-slate-500">This replaces what is in the box below.</span>}
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
        {/* Spelling column: the live spelling and grammar check */}
        <div className="flex flex-col gap-4">
          <SpellCheckPanel
            text={data.summary}
            onChange={updateSummary}
            field="summary"
            jobTitle={data.experiences?.[0]?.title || ''}
            jobTarget={data.jobTarget}
          />
        </div>

        {/* Editor Column: bold, italic and bullets, with a live preview underneath */}
        <div className="flex flex-col gap-4">
          <AchievementsField
            id="summary-text"
            label="Summary"
            placeholder="Write your summary here..."
            rows={12}
            minHeightClass="min-h-[260px]"
            value={data.summary}
            onChange={updateSummary}
          />
        </div>
      </div>
    </div>
  );
};

export default SummarySection;
