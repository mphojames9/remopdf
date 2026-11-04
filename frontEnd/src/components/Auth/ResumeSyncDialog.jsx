import React, { useEffect, useRef } from 'react';

/* -------------------------------------------------------------------------- */
/*  Shown when someone signs in and this device holds a resume that is not in */
/*  their account. They add it to the account as a new resume, or discard it. */
/*  The resumes already saved in the account are never replaced.              */
/* -------------------------------------------------------------------------- */

const describe = (payload) => {
  const data = payload?.resumeData || {};
  const personal = data.personal || {};
  const name = [personal.firstName, personal.lastName].filter(Boolean).join(' ').trim() || 'Unnamed resume';
  const jobs = (data.experiences || []).filter((job) => (job.title || job.employer || '').trim()).length;
  const skills = (data.skills || []).length;
  const counts = [
    jobs ? `${jobs} ${jobs === 1 ? 'job' : 'jobs'}` : null,
    skills ? `${skills} ${skills === 1 ? 'skill' : 'skills'}` : null,
  ].filter(Boolean).join(' · ');
  return { name, profession: personal.profession || '', counts };
};

const Summary = ({ label, payload }) => {
  const { name, profession, counts } = describe(payload);
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">{name}</p>
      {(profession || counts) && (
        <p className="truncate text-xs text-slate-500">{[profession, counts].filter(Boolean).join(' · ')}</p>
      )}
    </div>
  );
};

// `conflict` is { device, busy?, error? }; onResolve receives 'add' or 'discard'.
export function ResumeSyncDialog({ conflict, onResolve }) {
  const primaryRef = useRef(null);

  useEffect(() => {
    if (conflict && primaryRef.current) primaryRef.current.focus();
  }, [conflict]);

  if (!conflict) return null;
  const busy = Boolean(conflict.busy);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/60 p-4 sm:items-center">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="resume-sync-title"
        aria-describedby="resume-sync-text"
        className="w-full max-w-md rounded-3xl bg-white p-5 sm:p-6"
      >
        <h2 id="resume-sync-title" className="text-base font-semibold text-slate-900">Add the resume from this device?</h2>
        <p id="resume-sync-text" className="mt-1 text-sm text-slate-600">
          You started a resume on this device before signing in. Add it to your account as a new resume, or
          discard it. The resumes already in your account stay as they are.
        </p>

        <div className="mt-4">
          <Summary label="On this device" payload={conflict.device} />
        </div>

        {conflict.error && (
          <p role="alert" className="mt-3 text-sm text-rose-600">{conflict.error}</p>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <button
            ref={primaryRef}
            type="button"
            disabled={busy}
            onClick={() => onResolve('add')}
            className="rounded-full bg-[#d9856b] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#c9765c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Adding…' : 'Add to my account'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onResolve('discard')}
            className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Discard it
          </button>
        </div>
      </div>
    </div>
  );
}

// Covers the builder while a resume is being fetched or swapped, so nothing can be typed that would
// be replaced a moment later.
export function ResumeLoadingOverlay() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-white/70 backdrop-blur-sm"
    >
      <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-[#d9856b]" aria-hidden="true" />
        Loading your resume…
      </div>
    </div>
  );
}

export default ResumeSyncDialog;
