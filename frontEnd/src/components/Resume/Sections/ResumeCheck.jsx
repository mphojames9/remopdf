import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { findProblems, fixAllSafe } from './resumeDoctor';

/*
  Resume check: tells the person what is wrong with their resume (a note imported as a job, the same job twice, dates the wrong
  way round, a mistyped email, a skills list pasted into one box...) and fixes it in one tap. The finding and the repairs are in
  resumeDoctor.js; this is the screen.

    <ResumeCheck data step onApply onGoToStep />

    data         the resume data
    step         the builder step that is open (0 Heading ... 4 Summary, 5 Finalize). On a step only that step's problems show;
                 on the last step (Finalize) all of them show, with a note when there are none.
    onApply(fn)  called with a function (data) => data; the page runs it on its latest data, so a fix is never applied to a
                 stale copy.
    onGoToStep   optional (stepIndex): lets a problem that has no automatic fix open the step where the person fixes it.

  Nothing changes until the person taps a fix. "Tidy up" runs only the safe fixes (spacing, capitals, exact repeats, a pasted
  skills list), which lose nothing. "Ignore" hides one problem for this session.
*/

const FINAL_STEP = 5;
const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/60';

// Ignored for this session, across steps (the banner is remounted on each step).
const ignored = new Set();

const Marker = ({ severity }) => (
  <span
    className={`mt-[7px] inline-block h-[7px] w-[7px] shrink-0 ${severity === 'high' ? 'bg-[#d9856b]' : 'border border-slate-400'}`}
    aria-hidden="true"
  />
);

const Chevron = ({ open }) => (
  <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

export default function ResumeCheck({ data, step, onApply, onGoToStep }) {
  const [, tick] = useState(0); // re-render after an ignore
  const [open, setOpen] = useState(null); // null = decide from what is found
  const [done, setDone] = useState('');
  const timer = useRef(null);

  const all = useMemo(() => findProblems(data), [data]);
  const shown = useMemo(
    () => all.filter((p) => !ignored.has(p.id) && (step === FINAL_STEP || p.step === step)),
    [all, step]
  );
  const safeCount = useMemo(() => (shown.some((p) => p.fixes.some((f) => f.safe)) ? fixAllSafe(data).applied : 0), [shown, data]);

  useEffect(() => () => clearTimeout(timer.current), []);
  const say = useCallback((message) => {
    setDone(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setDone(''), 4500);
  }, []);

  const apply = (fix) => {
    onApply(fix.apply);
    say(`Done: ${fix.label}`);
  };
  const tidy = () => {
    onApply((d) => fixAllSafe(d).data);
    say(`Tidied up ${safeCount} thing${safeCount === 1 ? '' : 's'}`);
  };
  const ignore = (id) => {
    ignored.add(id);
    tick((n) => n + 1);
  };

  if (shown.length === 0) {
    if (step !== FINAL_STEP && !done) return null;
    return (
      <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600" role="status">
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12.5l4.2 4.2L19 7" />
        </svg>
        {done || 'Resume check: nothing to fix.'}
      </div>
    );
  }

  const high = shown.some((p) => p.severity === 'high');
  const expanded = open === null ? high : open;
  const heading = step === FINAL_STEP ? 'in your resume' : 'on this step';

  return (
    <section
      className={`mb-4 overflow-hidden rounded-2xl border ${high ? 'border-[#e6b8a7] bg-[#fff6f2]' : 'border-slate-200 bg-white'}`}
      aria-label="Resume check"
    >
      <div className="flex items-center gap-2 pr-3">
        <button
          type="button"
          onClick={() => setOpen(!expanded)}
          aria-expanded={expanded}
          className={`flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-4 py-3.5 text-left ${FOCUS}`}
        >
          <Marker severity={high ? 'high' : 'low'} />
          <span className="min-w-0 flex-1 text-[14.5px] font-semibold leading-snug text-slate-900">
            {shown.length} problem{shown.length === 1 ? '' : 's'} {heading}
          </span>
          <Chevron open={expanded} />
        </button>
        {safeCount > 0 && (
          <button
            type="button"
            onClick={tidy}
            className={`shrink-0 rounded-[5px] bg-slate-900 px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-slate-700 ${FOCUS}`}
          >
            Tidy up ({safeCount})
          </button>
        )}
      </div>

      <p className="sr-only" role="status">{done}</p>
      {done && <p className="border-t border-[#f0d3c7] px-4 py-2 text-[13px] font-medium text-emerald-800" aria-hidden="true">{done}</p>}

      {expanded && (
        <ul className="divide-y divide-[#f0d3c7]/70 border-t border-[#f0d3c7]/70">
          {shown.map((p) => (
            <li key={p.id} className="flex gap-3 px-4 py-4">
              <Marker severity={p.severity} />
              <div className="min-w-0 flex-1">
                {step === FINAL_STEP && <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{p.where}</p>}
                <p className="break-words text-[14px] font-semibold leading-snug text-slate-900">{p.title}</p>
                <p className="mt-1 break-words text-[13px] leading-relaxed text-slate-600">{p.detail}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {p.fixes.map((fix, i) => (
                    <button
                      key={fix.id}
                      type="button"
                      onClick={() => apply(fix)}
                      className={`max-w-full rounded-[5px] px-3 py-2 text-left text-[13px] font-semibold leading-snug transition-colors ${FOCUS} ${
                        i === 0 ? 'bg-[#d9856b] text-white hover:bg-[#c9765c]' : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {fix.label}
                    </button>
                  ))}
                  {p.fixes.length === 0 && step === FINAL_STEP && onGoToStep && (
                    <button
                      type="button"
                      onClick={() => onGoToStep(p.step)}
                      className={`rounded-[5px] bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 ring-1 ring-slate-300 transition-colors hover:bg-slate-50 ${FOCUS}`}
                    >
                      Open {p.where.replace(' step', '')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => ignore(p.id)}
                    className={`rounded-[5px] px-2.5 py-2 text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-800 ${FOCUS}`}
                  >
                    Ignore
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
