import React, { useRef, useState } from 'react';
import { extractTextFromFile, parseResumeText } from '../../../utils/resumeParser';

/**
 * "Import from an old resume" control for the sidebar.
 * Extracts text from an uploaded PDF / DOCX / TXT resume, runs a best-effort
 * parse, and hands the result up via onImport so the parent can merge it
 * into the shared resume data. Always let the person review what got filled
 * in - the parse is a heuristic, not a guarantee.
 */
export default function ResumeUpload({ onImport }) {
  const inputRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | reading | done | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('reading');
    setErrorMsg('');
    try {
      const text = await extractTextFromFile(file);
      const parsed = parseResumeText(text);
      onImport(parsed);
      setStatus('done');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Could not read that file.');
      setStatus('error');
    } finally {
      e.target.value = ''; // allow re-uploading the same file
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        onChange={handleFile}
        className="hidden"
      />
  <button
  type="button"
  onClick={() => inputRef.current?.click()}
  disabled={status === 'reading'}
  className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold text-white
    bg-gradient-to-b from-[#1e40af] to-[#1e3a8a]
    shadow-[0_4px_0_0_#0b1a4a,0_10px_18px_-6px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.22)]
    hover:brightness-110 hover:-translate-y-px
    active:translate-y-[3px] active:shadow-[0_1px_0_0_#0b1a4a,0_4px_8px_-4px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.15)]
    transition duration-150
    focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
    disabled:opacity-60 disabled:pointer-events-none"
>
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 16V4m0 0L7 9m5-5l5 5M5 20h14" />
  </svg>
  {status === 'reading' ? 'Reading resume…' : 'Import Resume'}
</button>
      {status === 'done' && (
        <p className="mt-2 text-[11px] text-amber-400 font-medium">Imported — please double-check the fields.</p>
      )}
      {status === 'error' && (
        <p className="mt-2 text-[11px] text-red-400 font-medium">{errorMsg}</p>
      )}
    </div>
  );
}
