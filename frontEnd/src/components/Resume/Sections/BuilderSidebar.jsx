import React, { useEffect, useRef, useState } from 'react';

/* -------------------------------------------------------------------------- */
/*  Resume builder sidebar.                                                   */
/*  Replaces the old inline sidebar + <Step> in ResumeBuilder.jsx.            */
/*                                                                            */
/*  Props                                                                     */
/*    steps              stepsConfig (id, label, description)                 */
/*    currentIndex       index of the active step                             */
/*    completedSteps     array of completed step indexes                      */
/*    progress           0-100                                                */
/*    onSelect(index)    optional. When given, finished steps and earlier     */
/*                       steps can be clicked to jump back to them            */
/*    onBack             click handler for the logo, which is the back        */
/*                       button. Without it the browser goes back one page    */
/*    onBuildCoverLetter click handler for the cover letter button            */
/*    importSlot         the existing <ResumeUpload onImport={...} />         */
/*    open / onClose     mobile drawer state                                  */
/* -------------------------------------------------------------------------- */

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/70';

const Svg = ({ children, className = 'h-4 w-4', strokeWidth = 1.8 }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const CheckIcon = () => (
  <Svg className="h-3.5 w-3.5" strokeWidth={2.5}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);

const CloseIcon = () => (
  <Svg className="h-5 w-5" strokeWidth={2}>
    <path d="M18 6L6 18M6 6l12 12" />
  </Svg>
);

const LetterIcon = () => (
  <Svg>
    <path d="M7 3h7l5 5v12a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zM14 3v5h5M9.5 13h5M9.5 16.5h5" />
  </Svg>
);

const ChevronLeftIcon = () => (
  <Svg className="h-4 w-4" strokeWidth={2.25}>
    <path d="M14.5 6l-6 6 6 6" />
  </Svg>
);

// Fallback mark, shown only if the logo image can't be found.
const LogoMark = () => (
  <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.08] text-white ring-1 ring-inset ring-white/10">
    <Svg className="h-[18px] w-[18px]">
      <path d="M7 3h7l5 5v12a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zM14 3v5h5" />
    </Svg>
  </span>
);

// The logo image (src/assets/logo.png) is picked up by its project path, so this works wherever
// this file lives. If the file is missing, LogoMark is shown instead of breaking the build.
const logoModules = import.meta.glob('/src/assets/logo.png', { eager: true, import: 'default' });
const LOGO_SRC = Object.values(logoModules)[0];

/* -------------------------------------------------------------------------- */
/*  Logo back button. Just the logo image, no tile and no text, sized by      */
/*  height so it keeps its own proportions and gets all the width it needs.   */
/*  The chevron shows it goes back and nudges left on hover.                  */
/* -------------------------------------------------------------------------- */

const BrandBackButton = ({ onBack }) => (
  <button
    type="button"
    onClick={() => (onBack ? onBack() : window.history.back())}
    aria-label="Go back"
    title="Go back"
    className={`group -ml-1 flex min-w-0 items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-opacity hover:opacity-85 motion-reduce:transition-none ${focusRing}`}
  >
    <span className="shrink-0 text-slate-400 transition duration-200 group-hover:-translate-x-0.5 group-hover:text-white motion-reduce:transform-none motion-reduce:transition-none">
      <ChevronLeftIcon />
    </span>
    {LOGO_SRC ? (
      <img src={LOGO_SRC} alt="" draggable={false} className="h-11 w-auto min-w-0 max-w-full select-none object-contain object-left" />
    ) : (
      <LogoMark />
    )}
  </button>
);

/* -------------------------------------------------------------------------- */
/*  Resume completeness: a ring gauge with a count-up and a status line.      */
/*  The ring and the number are driven by the same value, so they never       */
/*  drift apart. Reduced-motion users get the final value immediately.        */
/* -------------------------------------------------------------------------- */

const RING_SIZE = 44;
const RING_STROKE = 4;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const usePrefersReducedMotion = () => {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mql = window.matchMedia(query);
    const onChange = (e) => setReduced(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return reduced;
};

// Eases from wherever the number currently is to the new target, so an interrupted animation never jumps.
const useCountUp = (target, duration = 800) => {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(reduced ? target : 0);
  const shown = useRef(reduced ? target : 0);

  useEffect(() => {
    if (reduced) {
      shown.current = target;
      setDisplay(target);
      return undefined;
    }
    const from = shown.current;
    if (from === target) return undefined;
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(from + (target - from) * eased);
      shown.current = next;
      setDisplay(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, reduced, duration]);

  return display;
};

const completenessStatus = (value) => {
  if (value >= 100) return 'Your resume is complete';
  if (value >= 75) return 'Almost there';
  if (value >= 40) return 'Taking shape';
  if (value > 0) return 'Just getting started';
  return 'Add your details to begin';
};

const CompletenessCard = ({ progress }) => {
  const value = Math.max(0, Math.min(100, Math.round(Number(progress) || 0)));
  const display = useCountUp(value);
  const done = value >= 100 && display >= 100;

  return (
    <div className="flex items-center gap-3 px-2.5 py-1">
      <span
        role="progressbar"
        aria-label="Resume completeness"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={`${value}% complete`}
        className="relative grid shrink-0 place-items-center"
        style={{ width: RING_SIZE, height: RING_SIZE }}
      >
        <svg
          width={RING_SIZE}
          height={RING_SIZE}
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          className={`-rotate-90 transition-[filter] duration-500 motion-reduce:transition-none ${
            done ? '[filter:drop-shadow(0_0_6px_rgba(52,211,153,0.4))]' : ''
          }`}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="remo-completeness-ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f0cec4" />
              <stop offset="100%" stopColor="#d9856b" />
            </linearGradient>
          </defs>
          <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={RING_STROKE} />
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke={done ? '#34d399' : 'url(#remo-completeness-ring)'}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - display / 100)}
            opacity={display === 0 ? 0 : 1}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center">
          {done ? (
            <Svg className="h-5 w-5 text-emerald-300" strokeWidth={2.5}>
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </Svg>
          ) : (
            <span className="text-[12px] font-semibold tabular-nums leading-none text-white">
              {display}
              <span className="text-[8px] font-medium text-slate-400">%</span>
            </span>
          )}
        </span>
      </span>

      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium text-slate-100">Resume completeness</span>
        <span aria-live="polite" className="block truncate text-[11px] text-slate-400 [@media(max-height:700px)]:hidden">
          {completenessStatus(value)}
        </span>
      </span>
    </div>
  );
};

const StepRow = ({ step, index, active, completed, canVisit, onSelect }) => {
  const badge = active
    ? 'bg-[#d9856b] text-white'
    : completed
    ? 'bg-[#d9856b]/15 text-[#eba995]'
    : 'bg-white/[0.04] text-slate-500 ring-1 ring-inset ring-white/10';

  const labelTone = active ? 'text-white' : completed ? 'text-slate-200' : 'text-slate-300';
  const hintTone = active ? 'text-[#f0cec4]/80' : 'text-slate-400';

  const rowClass = `relative flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors motion-reduce:transition-none ${
    active ? 'bg-white/[0.07]' : ''
  }`;

  const content = (
    <>
      {active && <span aria-hidden="true" className="absolute bottom-2.5 left-0 top-2.5 w-[3px] rounded-r-full bg-[#d9856b]" />}
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-medium tabular-nums transition-colors motion-reduce:transition-none ${badge}`}>
        {completed && !active ? <CheckIcon /> : step.id}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[13px] font-medium ${labelTone}`}>{step.label}</span>
        {step.description && (
          <span title={step.description} className={`block truncate text-[11px] leading-tight [@media(max-height:700px)]:hidden ${hintTone}`}>
            {step.description}
          </span>
        )}
      </span>
    </>
  );

  if (!onSelect || !canVisit) return <div className={rowClass}>{content}</div>;

  return (
    <button type="button" onClick={() => onSelect(index)} className={`${rowClass} ${focusRing} ${active ? '' : 'hover:bg-white/[0.04]'}`}>
      {content}
    </button>
  );
};

const BuilderSidebar = ({ steps, currentIndex, completedSteps, progress, onSelect, onBack, onBuildCoverLetter, importSlot, open, onClose }) => {
  return (
    <aside
      aria-label="Resume builder"
      className={`fixed left-0 top-0 z-50 flex h-full w-[270px] max-w-[80vw] shrink-0 transform flex-col justify-between gap-4 overflow-y-auto border-r border-white/5 bg-slate-900 px-3 py-5 text-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden shadow-xl transition-transform duration-300 ease-in-out motion-reduce:transition-none lg:static lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div>
        <div className="mb-5 flex items-center justify-between gap-3 px-2.5">
          <BrandBackButton onBack={onBack} />
          <button type="button" onClick={onClose} aria-label="Close menu" className={`rounded-lg p-1 text-slate-400 transition-colors hover:text-white lg:hidden ${focusRing}`}>
            <CloseIcon />
          </button>
        </div>

        <nav aria-label="Resume steps">
          <ol className="space-y-0.5">
            {steps.map((step, index) => (
              <li key={step.id} aria-current={currentIndex === index ? 'step' : undefined}>
                <StepRow
                  step={step}
                  index={index}
                  active={currentIndex === index}
                  completed={completedSteps.includes(index)}
                  canVisit={index <= currentIndex || completedSteps.includes(index)}
                  onSelect={onSelect}
                />
              </li>
            ))}
          </ol>
        </nav>
      </div>

      <div className="space-y-2.5">
        <CompletenessCard progress={progress} />

        <button
          type="button"
          onClick={onBuildCoverLetter}
          className={`flex h-9 w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.03] text-[13px] font-medium text-slate-200 transition-colors hover:bg-white/[0.08] hover:text-white ${focusRing}`}
        >
          <LetterIcon />
          Build cover letter
        </button>

        {importSlot}

        <p className="px-2.5 pt-1 text-[10px] text-slate-500">© 2026, Works Limited. All rights reserved.</p>
      </div>
    </aside>
  );
};

export default BuilderSidebar;
