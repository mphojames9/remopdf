import React, { useEffect, useRef, useState } from 'react';

/* Shared month + year picker (used by Work History and Education). */

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

const PickerNavButton = ({ label, onClick, disabled, children }) => (
  <button
    type="button"
    aria-label={label}
    onClick={onClick}
    disabled={disabled}
    className="w-7 h-7 inline-flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:text-slate-300 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
  >
    {children}
  </button>
);

const pickerCellClass = (selected, disabled) =>
  `h-8 rounded-md text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
    disabled
      ? 'text-slate-300 cursor-not-allowed'
      : selected
      ? 'bg-amber-500 text-white'
      : 'text-slate-700 hover:bg-amber-50 hover:text-amber-700'
  }`;

// One field for a month + year: a trigger showing "Mar 2021" that opens a small popover with a
// year stepper and a month grid. Click the year to jump through years. Arrow keys move around
// the grid, Escape closes.
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
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('months'); // 'months' | 'years'
  const [viewYear, setViewYear] = useState(maxYear);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
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
    setViewYear(/^\d{4}$/.test(yearValue) ? Number(yearValue) : maxYear);
    setView('months');
    setOpen(true);
  };

  // Close when the user clicks or tabs away.
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
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
    if (target) target.focus();
  }, [open, view]);

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

      {open && !disabled && (
        <div
          role="dialog"
          aria-label={`Choose ${label.toLowerCase()}`}
          className={`absolute top-full mt-1.5 z-30 w-60 ${
            align === 'right' ? 'right-0' : 'left-0'
          } rounded-lg border border-slate-200 bg-white p-3 shadow-lg shadow-slate-900/10`}
        >
          <div className="flex items-center justify-between mb-2.5">
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
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                {viewYear}
                <svg className="w-2.5 h-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            ) : (
              <span className="text-xs font-bold text-slate-800">
                {pageStart}–{pageEnd}
              </span>
            )}

            <PickerNavButton label={view === 'months' ? 'Next year' : 'Later years'} onClick={goNext} disabled={nextDisabled}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </PickerNavButton>
          </div>

          <div ref={gridRef} className={`grid gap-1.5 ${view === 'months' ? 'grid-cols-3' : 'grid-cols-4'}`}>
            {view === 'months'
              ? MONTHS.map(([value, name]) => {
                  const selected = value === monthValue && yearValue === String(viewYear);
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
                    </button>
                  );
                })
              : pageYears.map((y) => {
                  const disabled = y > maxYear || y < MIN_YEAR;
                  return (
                    <button
                      key={y}
                      type="button"
                      disabled={disabled}
                      onClick={() => pickYear(y)}
                      aria-pressed={String(y) === yearValue}
                      data-autofocus={y === viewYear}
                      className={pickerCellClass(String(y) === yearValue, disabled)}
                    >
                      {y}
                    </button>
                  );
                })}
          </div>

          {display && (
            <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={clear}
                className="px-1 rounded-sm text-[11px] font-semibold text-slate-500 hover:text-red-500 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MonthYearPicker;
