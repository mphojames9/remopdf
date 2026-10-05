import React, { useEffect, useRef, useState } from 'react';
import { parseResumeFile, ResumeParseError, ACCEPTED_EXTENSIONS } from '../../../utils/resumeParser';

/* -------------------------------------------------------------------------- */
/*  "Import resume" button for the builder sidebar.                           */
/*  Props: onImport(parsed), called with { personal, experiences,             */
/*  educations, skills, summary } once a file has been read.                  */
/* -------------------------------------------------------------------------- */

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/70';

const Svg = ({ children, className = 'h-4 w-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const UploadIcon = () => (
  <Svg>
    <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
  </Svg>
);

const Spinner = () => (
  <svg className="h-4 w-4 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
    <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const ResumeUpload = ({ onImport }) => {
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const [status, setStatus] = useState({ kind: 'idle', message: '' });

  // Cancel an in-flight request if the sidebar unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  // The success note fades away on its own.
  useEffect(() => {
    if (status.kind !== 'success') return undefined;
    const timer = setTimeout(() => setStatus({ kind: 'idle', message: '' }), 7000);
    return () => clearTimeout(timer);
  }, [status.kind]);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // lets the same file be chosen again
    if (!file) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus({ kind: 'loading', message: 'Reading your resume…' });

    try {
      const parsed = await parseResumeFile(file, controller.signal);
      onImport?.(parsed);
      setStatus({ kind: 'success', message: 'Details added. Please check them over.' });
    } catch (err) {
      if (err?.name === 'AbortError') return;
      const message = err instanceof ResumeParseError ? err.message : 'Something went wrong while reading that file.';
      setStatus({ kind: 'error', message });
    }
  };

  const loading = status.kind === 'loading';

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS.map((e) => `.${e}`).join(',')}
        onChange={handleFile}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
      />
      <button
        type="button"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
        className={`flex h-9 w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.03] text-[13px] font-medium text-slate-200 transition-colors hover:bg-white/[0.08] hover:text-white disabled:cursor-wait disabled:opacity-70 motion-reduce:transition-none ${focusRing}`}
      >
        {loading ? <Spinner /> : <UploadIcon />}
        {loading ? 'Importing…' : 'Import resume'}
      </button>

      <p
        role={status.kind === 'error' ? 'alert' : 'status'}
        aria-live="polite"
        className={`px-2.5 text-[11px] leading-snug ${status.message ? 'mt-1.5' : ''} ${
          status.kind === 'error' ? 'text-rose-300' : status.kind === 'success' ? 'text-emerald-300' : 'text-slate-400'
        }`}
      >
        {status.message}
      </p>
    </div>
  );
};

export default ResumeUpload;
