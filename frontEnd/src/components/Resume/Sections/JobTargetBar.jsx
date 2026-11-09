import React, { useMemo, useState } from 'react';
import { scoreResume, scoreLabel } from './atsScore';

/*
  The live ATS match, pinned above the form while a job target is set.

    <JobTargetBar target={resumeData.jobTarget} data={resumeData} onEdit={() => ...} />

  The score is counted on the device from the resume as it is right now (see atsScore.js), so it moves as the
  person types and never waits for the server. Collapsed it is one slim row; tapped it shows where the points
  come from and which of the job's keywords are still missing.
*/

const FOCUS = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/60';

const Ring = ({ score }) => {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  return (
    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center" role="img" aria-label={`ATS match ${score} out of 100`}>
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke="#d9856b"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
          className="transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none"
        />
      </svg>
      <span className="text-[13px] font-bold tabular-nums text-slate-900">{score}</span>
    </span>
  );
};

const Chevron = ({ open }) => (
  <svg className={`h-4 w-4 shrink-0 text-slate-400 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 8l5 5 5-5" />
  </svg>
);

const JobTargetBar = ({ target, data, onEdit }) => {
  const [open, setOpen] = useState(false);
  const result = useMemo(() => scoreResume(target, data), [target, data]);
  if (!result) return null;

  const total = target.keywords.length;
  const missing = result.keywords.missing;
  const heading = [target.title || 'Your target job', target.company].filter(Boolean).join(' at ');

  return (
    <section aria-label="Job target" className="sticky top-2 z-10 mb-6 rounded-md border border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="flex items-center gap-3 px-3.5 py-2.5 sm:px-4">
        <Ring score={result.score} />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`flex min-w-0 flex-1 items-center gap-2 rounded text-left ${FOCUS}`}
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-slate-900">{heading}</span>
            <span className="block truncate text-xs text-slate-500">
              {scoreLabel(result.score)}: {result.keywords.covered.length} of {total} keywords found
            </span>
          </span>
          <Chevron open={open} />
        </button>
        <button
          type="button"
          onClick={onEdit}
          className={`shrink-0 rounded px-2 py-1 text-xs font-semibold text-[#b8573b] hover:bg-[#d9856b]/10 ${FOCUS}`}
        >
          Edit job
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-100 px-3.5 pb-4 pt-3.5 sm:px-4">
          <ul className="grid gap-3.5 sm:grid-cols-2">
            {result.parts.map((part) => (
              <li key={part.id}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-semibold text-slate-800">{part.label}</span>
                  <span className="tabular-nums text-xs text-slate-500">
                    {Math.round(part.value * part.weight)} / {part.weight}
                  </span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#d9856b] transition-[width] duration-500 ease-out motion-reduce:transition-none"
                    style={{ width: `${Math.round(part.value * 100)}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs leading-snug text-slate-500">{part.hint}</p>
              </li>
            ))}
          </ul>

          <div className="mt-5">
            {missing.length > 0 ? (
              <>
                <p className="text-sm font-semibold text-slate-800">Still missing from your resume</p>
                <p className="mt-0.5 text-xs text-slate-500">Work them in only where they’re true for you.</p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {missing.slice(0, 14).map((kw) => (
                    <span
                      key={kw.term}
                      className={`rounded-full border px-2.5 py-1 text-xs ${
                        kw.must ? 'border-[#d9856b]/35 bg-[#d9856b]/10 text-[#7a3b28]' : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      {kw.term}
                    </span>
                  ))}
                  {missing.length > 14 && <span className="px-1 py-1 text-xs text-slate-400">+{missing.length - 14} more</span>}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-700">Every keyword from the job is on your resume.</p>
            )}
          </div>

          <p className="mt-5 text-xs leading-relaxed text-slate-400">
            Counted on your device as you type. Keywords are worth 70 points, the rest 10 each.
          </p>
        </div>
      )}
    </section>
  );
};

export default JobTargetBar;
