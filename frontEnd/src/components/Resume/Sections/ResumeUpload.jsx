import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { parseResumeFile, ResumeParseError, ACCEPTED_EXTENSIONS } from '../../../utils/resumeParser';
import { usePremiumAccess, requestUpgrade, useSignedIn, requestSignIn } from '../../../hooks/premiumAccess';

/* -------------------------------------------------------------------------- */
/*  "Import resume" button for the builder sidebar.                           */
/*  Props: onImport(parsed), called with { personal, experiences,             */
/*  educations, skills, summary } once a file has been read.                  */
/*                                                                            */
/*  While a file is being read a dialog shows the progress, then a success    */
/*  note with what was found (or the problem, with a way to try again).       */
/*  On phones the dialog slides up as a bottom sheet.                         */
/*                                                                            */
/*  Importing is a Premium feature: without Premium the button is locked and  */
/*  opens the payment dialog instead of the file picker. Signed out, it says  */
/*  "Sign in" and opens the sign-in dialog.                                   */
/* -------------------------------------------------------------------------- */

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/70';
// Inside the white dialog the ring also gets a small gap, so it reads clearly against the button.
const dialogFocusRing = `${focusRing} focus-visible:ring-offset-2`;

// Reading a small file takes a blink. The loading dialog stays up at least this long so it never just flashes.
const MIN_LOADING_MS = 900;

const PRIMARY_BUTTON = `h-11 flex-1 rounded-xl bg-[#d9856b] px-5 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(217,133,107,0.95)] transition hover:bg-[#c97558] active:scale-[0.98] active:bg-[#bd6b4f] motion-reduce:transition-none motion-reduce:active:scale-100 ${dialogFocusRing}`;
const SECONDARY_BUTTON = `h-11 flex-1 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 ${dialogFocusRing}`;

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

const LockIcon = () => (
  <Svg>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Svg>
);

const DocIcon = ({ className = 'h-6 w-6' }) => (
  <Svg className={className}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M9 13h6M9 17h4" />
  </Svg>
);

const CheckMini = () => (
  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

const Spinner = () => (
  <svg className="h-4 w-4 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
    <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

/* ------------------------------ what was found ----------------------------- */

const hasText = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim() !== '';
  return typeof value === 'number';
};

const count = (list) => (Array.isArray(list) ? list.length : 0);

const NOTHING = { stats: [], flags: [] };

// Sections that show up as a big number in the success dialog, named like the steps of the builder.
const COUNTED_SECTIONS = [
  ['experiences', 'Work history'],
  ['educations', 'Education'],
  ['skills', 'Skills'],
  ['projects', 'Projects'],
  ['certificates', 'Certificates'],
  ['languages', 'Languages'],
];

// What the import actually filled in: `stats` are sections with a number of entries, `flags` are sections that are just filled or not.
const summarise = (parsed) => {
  const personal = parsed?.personal && typeof parsed.personal === 'object' ? parsed.personal : {};
  const flags = [];
  if (Object.values(personal).some(hasText)) flags.push('Personal details');
  if (hasText(parsed?.summary)) flags.push('Summary');
  if (hasText(parsed?.hobbies)) flags.push('Hobbies & interests');

  const stats = COUNTED_SECTIONS.map(([key, label]) => ({ key, label, count: count(parsed?.[key]) })).filter((item) => item.count > 0);
  return { stats, flags };
};

// Resolves after `ms`, or straight away if the import is cancelled in the meantime.
const wait = (ms, signal) =>
  new Promise((resolve) => {
    if (ms <= 0 || signal?.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true }
    );
  });

/* --------------------------------- dialog ---------------------------------- */

const DIALOG_CSS = `
@keyframes ru-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes ru-rise { from { opacity: 0; transform: translateY(12px) scale(.97); } to { opacity: 1; transform: none; } }
@keyframes ru-sheet { from { opacity: 0; transform: translateY(36px); } to { opacity: 1; transform: none; } }
@keyframes ru-badge { 0% { opacity: 0; transform: scale(.7); } 60% { opacity: 1; transform: scale(1.06); } 100% { opacity: 1; transform: scale(1); } }
@keyframes ru-draw { to { stroke-dashoffset: 0; } }
@keyframes ru-scan { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(30px); } }
@keyframes ru-tile { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes ru-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
.ru-overlay { animation: ru-fade .2s ease-out; }
.ru-card { animation: ru-sheet .32s cubic-bezier(.22, 1, .36, 1); }
@media (min-width: 640px) { .ru-card { animation-name: ru-rise; animation-duration: .26s; } }
.ru-badge { animation: ru-badge .45s cubic-bezier(.22, 1, .36, 1); }
.ru-check { stroke-dasharray: 24; stroke-dashoffset: 24; animation: ru-draw .38s ease-out .2s forwards; }
.ru-scan { animation: ru-scan 1.5s ease-in-out infinite; }
.ru-tile { animation: ru-tile .45s cubic-bezier(.22, 1, .36, 1) both; }
.ru-skeleton { background: linear-gradient(100deg, #f1f5f9 30%, #e6ebf1 50%, #f1f5f9 70%); background-size: 200% 100%; animation: ru-shimmer 1.6s linear infinite; }
@media (prefers-reduced-motion: reduce) {
  .ru-overlay, .ru-card, .ru-badge, .ru-scan, .ru-tile, .ru-skeleton { animation: none; }
  .ru-check { animation: none; stroke-dashoffset: 0; }
}
`;

const prefersReducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Counts up to `to` once, so the numbers in the success dialog feel like they were just tallied.
const CountUp = ({ to, delay = 0, duration = 700 }) => {
  const [value, setValue] = useState(() => (prefersReducedMotion() || to <= 1 ? to : 0));

  useEffect(() => {
    if (prefersReducedMotion() || to <= 1) {
      setValue(to);
      return undefined;
    }
    let frame = 0;
    const timer = setTimeout(() => {
      const startedAt = performance.now();
      const tick = (now) => {
        const progress = Math.min((now - startedAt) / duration, 1);
        setValue(Math.round(to * (1 - Math.pow(1 - progress, 3)))); // ease-out
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [to, delay, duration]);

  return <>{value}</>;
};

const StatTile = ({ stat, index }) => (
  <li
    className="ru-tile rounded-2xl bg-slate-50 px-3.5 py-3 ring-1 ring-inset ring-slate-200/70"
    style={{ animationDelay: `${160 + index * 70}ms` }}
  >
    <p className="text-[26px] font-semibold leading-none tracking-tight text-slate-900 tabular-nums" aria-hidden="true">
      <CountUp to={stat.count} delay={260 + index * 70} />
    </p>
    <p className="mt-1.5 text-xs font-medium leading-tight text-slate-500">
      <span className="sr-only">{stat.count} </span>
      {stat.label}
    </p>
  </li>
);

const SkeletonTiles = () => (
  <div className="grid grid-cols-3 gap-2" aria-hidden="true">
    {[0, 1, 2].map((i) => (
      <div key={i} className="ru-skeleton h-[4.75rem] rounded-2xl" style={{ animationDelay: `${i * 120}ms` }} />
    ))}
  </div>
);

// Keeps Tab inside the dialog while it is open.
const trapTab = (event) => {
  if (event.key !== 'Tab') return;
  const items = event.currentTarget.querySelectorAll('button:not([disabled])');
  if (items.length === 0) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};

const BADGE = 'ru-badge relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl ring-1 ring-inset';

const ImportDialog = ({ state, onCancel, onClose, onRetry, primaryRef }) => {
  const { phase, fileName, message, found = NOTHING } = state;
  const loading = phase === 'loading';
  const success = phase === 'success';
  const failed = phase === 'error';
  const nothingFound = found.stats.length === 0 && found.flags.length === 0;

  const title = loading ? 'Importing your resume' : success ? 'Resume imported' : "We couldn't import that file";
  const text = loading ? 'Reading your details. This only takes a moment.' : message;

  return createPortal(
    <div
      className="ru-overlay fixed inset-0 z-[130] flex items-end justify-center bg-slate-950/50 backdrop-blur-md sm:items-center sm:p-4"
      onClick={(event) => {
        event.stopPropagation(); // a portal still bubbles clicks to the sidebar around the button
        if (event.target === event.currentTarget && !loading) onClose();
      }}
    >
      <style>{DIALOG_CSS}</style>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="resume-import-title"
        aria-describedby="resume-import-text"
        onKeyDown={trapTab}
        className="ru-card w-full rounded-t-[28px] bg-white px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-left text-slate-900 shadow-[0_28px_70px_-12px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/5 sm:max-w-[26rem] sm:rounded-[28px] sm:p-7"
      >
        {loading && (
          <div className={`${BADGE} bg-[#d9856b]/10 text-[#d9856b] ring-[#d9856b]/20`} aria-hidden="true">
            <DocIcon className="h-7 w-7" />
            {/* a scan line sweeping over the page, as if the document is being read */}
            <span className="ru-scan absolute inset-x-3.5 top-3 h-0.5 rounded-full bg-[#d9856b] shadow-[0_0_10px_2px_rgba(217,133,107,0.55)] motion-reduce:hidden" />
          </div>
        )}

        {success && (
          <div className={`${BADGE} bg-emerald-50 text-emerald-600 ring-emerald-100`} aria-hidden="true">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path className="ru-check" d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </div>
        )}

        {failed && (
          <div className={`${BADGE} bg-rose-50 text-rose-500 ring-rose-100`} aria-hidden="true">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 7.5v5.5M12 16.6v.01" />
            </svg>
          </div>
        )}

        <div aria-live="polite" className="mt-5">
          <h2 id="resume-import-title" className="text-[22px] font-semibold leading-tight tracking-tight text-slate-900">
            {title}
          </h2>
          <p id="resume-import-text" className="mt-1.5 text-sm leading-relaxed text-slate-500">
            {text}
          </p>
        </div>

        {fileName && (
          <div className="mt-5 flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-inset ring-slate-200/70">
            <span className="text-slate-400">
              <DocIcon className="h-[18px] w-[18px]" />
            </span>
            <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-600" title={fileName}>
              {fileName}
            </p>
          </div>
        )}

        {loading && (
          <>
            <div className="mt-4">
              <SkeletonTiles />
            </div>
            <div className="mt-6 flex">
              <button ref={primaryRef} type="button" onClick={onCancel} className={SECONDARY_BUTTON}>
                Cancel
              </button>
            </div>
          </>
        )}

        {success && (
          <>
            {!nothingFound && (
              <div className="mt-4">
                {found.stats.length > 0 && (
                  <ul className="grid grid-cols-[repeat(auto-fit,minmax(5.5rem,1fr))] gap-2" aria-label="What was imported">
                    {found.stats.map((stat, index) => (
                      <StatTile key={stat.key} stat={stat} index={index} />
                    ))}
                  </ul>
                )}
                {found.flags.length > 0 && (
                  <ul className={`flex flex-wrap gap-x-5 gap-y-2 ${found.stats.length > 0 ? 'mt-4' : ''}`} aria-label="Also imported">
                    {found.flags.map((label, index) => (
                      <li
                        key={label}
                        className="ru-tile flex items-center gap-2 text-sm font-medium text-slate-700"
                        style={{ animationDelay: `${160 + (found.stats.length + index) * 70}ms` }}
                      >
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                          <CheckMini />
                        </span>
                        {label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="mt-6 flex">
              <button ref={primaryRef} type="button" onClick={onClose} className={PRIMARY_BUTTON}>
                Continue
              </button>
            </div>
          </>
        )}

        {failed && (
          <>
            {Array.isArray(ACCEPTED_EXTENSIONS) && ACCEPTED_EXTENSIONS.length > 0 && (
              <p className="mt-4 text-xs text-slate-400">Supported files: {ACCEPTED_EXTENSIONS.map((e) => e.toUpperCase()).join(', ')}</p>
            )}
            <div className="mt-6 flex gap-2.5">
              <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>
                Close
              </button>
              <button ref={primaryRef} type="button" onClick={onRetry} className={PRIMARY_BUTTON}>
                Try another file
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};

/* --------------------------------- button ---------------------------------- */

const ResumeUpload = ({ onImport }) => {
  const inputRef = useRef(null);
  const buttonRef = useRef(null);
  const primaryRef = useRef(null);
  const abortRef = useRef(null);
  // null = no dialog, otherwise { phase: 'loading' | 'success' | 'error', fileName, message, found: { stats, flags } }
  const [modal, setModal] = useState(null);
  const premium = usePremiumAccess();
  const locked = premium === false; // known to be without Premium (signed out counts as no Premium)
  const signedOut = useSignedIn() === false;

  // Cancel an in-flight request if the sidebar unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  const close = () => {
    setModal(null);
    // After the dialog is gone (the button is disabled while it is reading), put focus back where it came from.
    setTimeout(() => buttonRef.current?.focus(), 0);
  };

  const cancel = () => {
    abortRef.current?.abort();
    close();
  };

  const retry = () => {
    setModal(null);
    inputRef.current?.click();
  };

  // Each step of the dialog puts focus on its main button; Escape closes it (or cancels while reading).
  const phase = modal?.phase;
  useEffect(() => {
    if (!phase) return undefined;
    primaryRef.current?.focus();
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (phase === 'loading') cancel();
      else close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // lets the same file be chosen again
    if (!file || locked) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setModal({ phase: 'loading', fileName: file.name });
    const started = Date.now();

    try {
      const parsed = await parseResumeFile(file, controller.signal);
      await wait(MIN_LOADING_MS - (Date.now() - started), controller.signal);
      if (controller.signal.aborted) return; // cancelled: the dialog is already closed

      onImport?.(parsed);
      const source = parsed?.meta?.source;
      const basic = source === 'api' || source === 'merged';
      const why = basic && import.meta.env?.DEV && parsed.meta.localError ? ` (${parsed.meta.localError})` : '';
      setModal({
        phase: 'success',
        fileName: file.name,
        message: basic
          ? `Imported with the basic reader, so some sections may be missing. Please check them over.${why}`
          : 'Your details were added to the form. Please check them over.',
        found: summarise(parsed),
      });
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setModal({
        phase: 'error',
        fileName: file.name,
        message: err instanceof ResumeParseError ? err.message : 'Something went wrong while reading that file.',
        found: NOTHING,
      });
    }
  };

  const loading = phase === 'loading';

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
        ref={buttonRef}
        type="button"
        disabled={loading}
        aria-disabled={locked || undefined}
        title={locked ? (signedOut ? 'Sign in to import a resume' : 'Importing a resume is a Premium feature') : undefined}
        onClick={() => {
          if (!locked) inputRef.current?.click();
          else if (signedOut) requestSignIn();
          else requestUpgrade();
        }}
        className={`flex h-9 w-full items-center justify-center gap-2 rounded-full border text-[13px] font-medium transition-colors disabled:cursor-wait disabled:opacity-70 motion-reduce:transition-none ${
          locked
            ? 'border-[#d9856b]/30 bg-[#d9856b]/[0.08] text-slate-300 hover:bg-[#d9856b]/[0.14] hover:text-white'
            : 'border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.08] hover:text-white'
        } ${focusRing}`}
      >
        {loading ? <Spinner /> : locked ? <LockIcon /> : <UploadIcon />}
        {loading ? 'Importing…' : 'Import resume'}
        {locked && (
          <span className="rounded-full bg-[#d9856b]/20 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-[#f0b4a0]">
            {signedOut ? 'Sign in' : 'Premium'}
          </span>
        )}
      </button>

      {modal && <ImportDialog state={modal} onCancel={cancel} onClose={close} onRetry={retry} primaryRef={primaryRef} />}
    </div>
  );
};

export default ResumeUpload;
