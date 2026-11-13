import React from 'react';

/* -------------------------------------------------------------------------- */
/*  Resume builder sidebar.                                                   */
/*  Replaces the old inline sidebar + <Step> in ResumeBuilder.jsx.            */
/*                                                                            */
/*  Props                                                                     */
/*    steps              stepsConfig (id, label, description)                 */
/*    currentIndex       index of the active step                             */
/*    completedSteps     array of step indexes the person has moved past      */
/*    filledSteps        optional. Step indexes that actually hold            */
/*                       information. A step only gets its tick when it is    */
/*                       both moved past and filled; a step that was skipped  */
/*                       with nothing entered keeps its number. Without this  */
/*                       prop every completed step is ticked, as before       */
/*    onSelect(index)    optional. When given, finished steps and earlier     */
/*                       steps can be clicked to jump back to them            */
/*    onBack             click handler for the logo, which is the back        */
/*                       button. Without it the browser goes back one page    */
/*    onBuildCoverLetter click handler for the cover letter button            */
/*    importSlot         the existing <ResumeUpload onImport={...} />         */
/*    mobileSlot         optional rows shown at the top of the drawer on      */
/*                       small screens only (hidden from lg up)              */
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

// The logo image (src/assets/logo.webp) is picked up by its project path, so this works wherever
// this file lives. If the file is missing, LogoMark is shown instead of breaking the build.
const logoModules = import.meta.glob('/src/assets/logo.webp', { eager: true, import: 'default' });
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

const StepRow = ({ step, index, active, completed, canVisit, onSelect }) => {
  // `completed` is the ticked state: moved past AND holding information.
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

const BuilderSidebar = ({ steps, currentIndex, completedSteps, filledSteps, onSelect, onBack, onBuildCoverLetter, importSlot, mobileSlot, open, onClose }) => {
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

        {mobileSlot && <div className="mb-4 space-y-0.5 border-b border-white/10 pb-4 lg:hidden">{mobileSlot}</div>}

        <nav aria-label="Resume steps">
          <ol className="space-y-0.5">
            {steps.map((step, index) => (
              <li key={step.id} aria-current={currentIndex === index ? 'step' : undefined}>
                <StepRow
                  step={step}
                  index={index}
                  active={currentIndex === index}
                  completed={completedSteps.includes(index) && (!filledSteps || filledSteps.includes(index))}
                  canVisit={index <= currentIndex || completedSteps.includes(index)}
                  onSelect={onSelect}
                />
              </li>
            ))}
          </ol>
        </nav>
      </div>

      <div className="space-y-2.5">
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
