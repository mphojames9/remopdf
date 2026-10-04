import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/* Shared month + year picker (used by Work History, Education and Certificates). */

// Months are stored as two-digit strings ("01"–"12"), the same shape the old MM text boxes used.
const MONTHS = [
  ['01', 'Jan'], ['02', 'Feb'], ['03', 'Mar'], ['04', 'Apr'], ['05', 'May'], ['06', 'Jun'],
  ['07', 'Jul'], ['08', 'Aug'], ['09', 'Sep'], ['10', 'Oct'], ['11', 'Nov'], ['12', 'Dec'],
];

// Values saved before the picker existed may hold "3", "03" or "March"; map them onto an option.
const normalizeMonth = (value) => {
  const v = String(value || '').trim();
  if (!v) return '';
  const n = /^\d{1,2}$/.test(v)
    ? Number(v)
    : MONTHS.findIndex(([, name]) => name.toLowerCase() === v.slice(0, 3).toLowerCase()) + 1;
  return n >= 1 && n <= 12 ? String(n).padStart(2, '0') : '';
};

const MIN_YEAR = 1950; // earliest year the picker offers; the latest is the current year
const POPOVER_W = 280;
const GAP = 6; // space between the field and the popover
const EDGE = 8; // minimum distance from the screen edge

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

const FOCUS_RING = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300';

// A short entrance for the popover and a soft cross-fade when switching between months and years.
// Both switch off for people who prefer reduced motion.
const POPOVER_CSS = `
@keyframes mypIn { from { opacity: 0; transform: translateY(var(--myp-from, -6px)) scale(.97); } to { opacity: 1; transform: none; } }
@keyframes mypFade { from { opacity: 0; } to { opacity: 1; } }
.myp-pop { animation: mypIn 150ms cubic-bezier(.2, .8, .2, 1) both; }
.myp-fade { animation: mypFade 140ms ease-out both; }
@media (prefers-reduced-motion: reduce) { .myp-pop, .myp-fade { animation: none; } }
`;

const PickerNavButton = ({ label, onClick, disabled, children }) => (
  <button
    type="button"
    aria-label={label}
    onClick={onClick}
    disabled={disabled}
    className={`w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:text-slate-300 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors ${FOCUS_RING}`}
  >
    {children}
  </button>
);

const pickerCellClass = (selected, disabled) =>
  `relative h-11 rounded-lg text-[13px] font-medium transition-all duration-150 ${FOCUS_RING} ${
    disabled
      ? 'text-slate-300 cursor-not-allowed'
      : selected
      ? 'bg-gradient-to-b from-amber-400 to-amber-500 font-semibold text-white shadow-[0_8px_16px_-8px_rgba(245,158,11,0.9)] active:scale-95'
      : 'text-slate-700 hover:bg-slate-100 active:scale-95'
  }`;

// The small marker under "this month" / "this year".
const CurrentDot = ({ selected }) => (
  <span
    aria-hidden="true"
    className={`absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${selected ? 'bg-white/90' : 'bg-amber-500'}`}
  />
);

// One field for a month + year: a trigger showing "Mar 2021" that opens a small calendar popover with a
// year stepper and a month grid. Click the year to jump through years. Arrow keys move around
// the grid, Escape closes.
// The popover is portaled to <body> and positioned with fixed coordinates, so a card with
// overflow-hidden never clips it. It opens under the field (aligned to its left or right edge) and
// flips above when there is no room below.
const MonthYearPicker = ({
  label,
  month,
  year,
  onChange,
  align = 'left',
  disabled = false,
  disabledText = '',
  heightClass = 'h-[34px]', // matches the py-2 text inputs in Work History
}) => {
  const maxYear = new Date().getFullYear();
  const thisMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('months'); // 'months' | 'years'
  const [viewYear, setViewYear] = useState(maxYear);
  const [pos, setPos] = useState(null);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const popRef = useRef(null);
  const gridRef = useRef(null);

  const monthValue = normalizeMonth(month);
  const yearValue = String(year || '').trim();
  const monthName = (MONTHS.find(([v]) => v === monthValue) || [])[1];
  const display = [monthName, yearValue].filter(Boolean).join(' ');
  // While disabled the saved date is kept (just not shown), so unticking restores it.
  const shown = disabled && disabledText ? disabledText : display;

  const close = (returnFocus) => {
    setOpen(false);
    if (returnFocus && triggerRef.current) triggerRef.current.focus();
  };

  const toggle = () => {
    if (disabled) return undefined;
    if (open) return close(false);
    setViewYear(/^\d{4}$/.test(yearValue) ? clamp(Number(yearValue), MIN_YEAR, maxYear) : maxYear);
    setView('months');
    setPos(null);
    setOpen(true);
  };

  // Fixed coordinates under the field; flips above when the space below is too small.
  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (r.bottom < 0 || r.top > vh) { // the field scrolled out of view
      setOpen(false);
      return;
    }
    const width = Math.min(POPOVER_W, vw - EDGE * 2);
    const height = popRef.current ? popRef.current.offsetHeight : 320;
    const left = clamp(align === 'right' ? r.right - width : r.left, EDGE, vw - width - EDGE);
    const roomBelow = vh - r.bottom - GAP - EDGE;
    const roomAbove = r.top - GAP - EDGE;
    const above = roomBelow < height && roomAbove > roomBelow;
    const top = above ? Math.max(EDGE, r.top - GAP - height) : r.bottom + GAP;
    setPos((p) => (p && p.top === top && p.left === left && p.width === width && p.above === above ? p : { top, left, width, above }));
  }, [align]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place]);

  // Close when the user clicks or tabs away (the popover lives outside the root in the DOM, so check both).
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => {
      const inRoot = rootRef.current && rootRef.current.contains(e.target);
      const inPopover = popRef.current && popRef.current.contains(e.target);
      if (!inRoot && !inPopover) setOpen(false);
    };
    document.addEventListener('mousedown', away);
    document.addEventListener('focusin', away);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('focusin', away);
    };
  }, [open]);

  // Move focus into the grid when it opens or switches between months and years.
  useEffect(() => {
    if (!open || !gridRef.current) return;
    const target =
      gridRef.current.querySelector('[data-autofocus="true"]:not(:disabled)') ||
      gridRef.current.querySelector('button:not(:disabled)');
    if (target) target.focus({ preventScroll: true });
  }, [open, view]);

  // Key presses inside the portaled popover still bubble to the root through React's tree.
  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && open) {
      e.stopPropagation();
      close(true);
      return;
    }
    const cols = view === 'months' ? 3 : 4;
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[e.key];
    const grid = gridRef.current;
    if (step === undefined || !grid || !grid.contains(document.activeElement)) return;
    const cells = Array.from(grid.querySelectorAll('button'));
    const next = cells[cells.indexOf(document.activeElement) + step];
    if (next && !next.disabled) {
      e.preventDefault();
      next.focus();
    }
  };

  const pickMonth = (value) => {
    onChange({ month: value, year: String(viewYear) });
    close(true);
  };

  const pickYear = (y) => {
    setViewYear(y);
    setView('months');
  };

  const clear = () => {
    onChange({ month: '', year: '' });
    close(true);
  };

  // Year pages are 12 years long and end on the current year.
  const pageEnd = maxYear - Math.max(0, Math.floor((maxYear - viewYear) / 12)) * 12;
  const pageStart = pageEnd - 11;
  const pageYears = Array.from({ length: 12 }, (_, i) => pageStart + i);

  const prevDisabled = view === 'months' ? viewYear <= MIN_YEAR : pageStart <= MIN_YEAR;
  const nextDisabled = view === 'months' ? viewYear >= maxYear : pageEnd >= maxYear;
  const goPrev = () => setViewYear((v) => v - (view === 'months' ? 1 : 12));
  const goNext = () => setViewYear((v) => Math.min(v + (view === 'months' ? 1 : 12), maxYear));

  const popover = open && !disabled && (
    <div
      ref={popRef}
      role="dialog"
      aria-label={`Choose ${(label || 'date').toLowerCase()}`}
      className="myp-pop fixed z-[1000] overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_24px_48px_-12px_rgba(15,23,42,0.28),0_4px_10px_rgba(15,23,42,0.06)]"
      style={{
        top: pos ? pos.top : 0,
        left: pos ? pos.left : 0,
        width: pos ? pos.width : POPOVER_W,
        transformOrigin: `${pos && pos.above ? 'bottom' : 'top'} ${align === 'right' ? 'right' : 'left'}`,
        '--myp-from': pos && pos.above ? '6px' : '-6px',
      }}
    >
      <style>{POPOVER_CSS}</style>

      <div className="flex items-center justify-between px-3 pt-3">
        <PickerNavButton label={view === 'months' ? 'Previous year' : 'Earlier years'} onClick={goPrev} disabled={prevDisabled}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </PickerNavButton>

        {view === 'months' ? (
          <button
            type="button"
            onClick={() => setView('years')}
            aria-label={`${viewYear}, choose a different year`}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[15px] font-semibold tracking-tight text-slate-900 hover:bg-slate-100 transition-colors ${FOCUS_RING}`}
          >
            {viewYear}
            <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        ) : (
          <span className="px-2.5 py-1.5 text-[15px] font-semibold tracking-tight tabular-nums text-slate-900">
            {pageStart} – {pageEnd}
          </span>
        )}

        <PickerNavButton label={view === 'months' ? 'Next year' : 'Later years'} onClick={goNext} disabled={nextDisabled}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
          </svg>
        </PickerNavButton>
      </div>

      <div ref={gridRef} key={view} className={`myp-fade grid gap-1.5 p-3 ${view === 'months' ? 'grid-cols-3' : 'grid-cols-4'}`}>
        {view === 'months'
          ? MONTHS.map(([value, name]) => {
              const selected = value === monthValue && yearValue === String(viewYear);
              const current = value === thisMonth && viewYear === maxYear;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => pickMonth(value)}
                  aria-pressed={selected}
                  data-autofocus={selected}
                  className={pickerCellClass(selected, false)}
                >
                  {name}
                  {current && <CurrentDot selected={selected} />}
                </button>
              );
            })
          : pageYears.map((y) => {
              const isDisabled = y > maxYear || y < MIN_YEAR;
              const selected = String(y) === yearValue;
              return (
                <button
                  key={y}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => pickYear(y)}
                  aria-pressed={selected}
                  data-autofocus={y === viewYear}
                  className={`${pickerCellClass(selected, isDisabled)} tabular-nums`}
                >
                  {y}
                  {y === maxYear && !isDisabled && <CurrentDot selected={selected} />}
                </button>
              );
            })}
      </div>

      {display && (
        <div className="flex justify-end border-t border-slate-100 bg-slate-50/60 px-3 py-2">
          <button
            type="button"
            onClick={clear}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors ${FOCUS_RING}`}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div ref={rootRef} className="relative w-full" onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label}, ${shown || 'not set'}`}
        className={`group w-full ${heightClass} flex items-center gap-2 border rounded-sm pl-3 pr-2.5 text-xs text-left transition-all focus:outline-none ${
          disabled
            ? 'bg-slate-50 border-slate-200 cursor-not-allowed'
            : open
            ? 'bg-white border-amber-500 ring-2 ring-amber-100'
            : 'bg-white border-slate-200 hover:border-slate-300 focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-100'
        }`}
      >
        <svg
          className={`w-3.5 h-3.5 shrink-0 transition-colors ${
            disabled ? 'text-slate-300' : open ? 'text-amber-500' : 'text-slate-400 group-hover:text-amber-500'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" strokeWidth="1.8" />
          <path strokeLinecap="round" strokeWidth="1.8" d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
        <span className={`flex-1 truncate ${!disabled && display ? 'font-medium text-slate-900' : 'text-slate-400'}`}>
          {shown || 'Select date'}
        </span>
        <svg
          className={`w-3 h-3 shrink-0 transition-transform ${disabled ? 'text-slate-300' : 'text-slate-400'} ${
            open ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {popover ? createPortal(popover, document.body) : null}
    </div>
  );
};

export default MonthYearPicker;
