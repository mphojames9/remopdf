import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Ordered lowest to highest. The chosen label is stored in `language.level`.
export const LANGUAGE_LEVELS = ['Basic', 'Conversational', 'Advanced', 'Fluent', 'Native'];

// Every language starts on this level, and a language never stays without one.
export const DEFAULT_LANGUAGE_LEVEL = 'Fluent';

// Maps any saved level text to 1-5 bars. Matches the labels above plus common
// alternatives (Beginner, Intermediate, Proficient, Native speaker, B2, ...).
// Returns 0 only for text it does not recognise.
const RATING_RULES = [
  [/native|mother|bilingual|first language/i, 5],
  [/fluent|highly proficient|excellent|\bc2\b/i, 4],
  [/basic|beginner|elementary|novice|poor|\ba1\b|\ba2\b/i, 1],
  [/conversation|intermediate|limited|moderate|fair|\bb1\b/i, 2],
  [/advanced|proficient|professional|very good|good|working|business|\bb2\b|\bc1\b/i, 3],
];

export const languageRating = (level) => {
  if (typeof level === 'number') return level >= 1 && level <= 5 ? Math.round(level) : 0;
  const text = String(level || '').trim();
  if (!text) return 0;
  const rule = RATING_RULES.find(([pattern]) => pattern.test(text));
  return rule ? rule[1] : 0;
};

export const getLanguageLevelLabel = (rating) => LANGUAGE_LEVELS[rating - 1] || '';

// What to show for one language: the user's own level text (or Fluent when
// none is saved) plus its 1-5 bars.
export const languageLevelInfo = (language) => {
  const saved = language && language.level != null ? String(language.level).trim() : '';
  const label = saved || DEFAULT_LANGUAGE_LEVEL;
  return { label, rating: languageRating(label) };
};

/* -------------------------------------------------------------------------- */
/*                     Dropdown for small screens (below sm)                  */
/* -------------------------------------------------------------------------- */

// The list is drawn in <body>, positioned from the trigger, so a card with overflow-hidden
// around the form can never clip it.
const OPTION_HEIGHT = 44; // px, a comfortable thumb target
const LIST_HEIGHT = LANGUAGE_LEVELS.length * OPTION_HEIGHT + 10; // options + padding + border
const LIST_GAP = 6; // px between trigger and list

let dropdownCount = 0;

const isInside = (el, target) => !!el && target instanceof Node && el.contains(target);

// Signal-strength style bars: the higher the level, the more bars are filled.
const LevelBars = ({ rating }) => (
  <span className="inline-flex items-end gap-[2px] shrink-0" aria-hidden="true">
    {[1, 2, 3, 4, 5].map((n) => (
      <span
        key={n}
        style={{ height: 4 + n * 2 }}
        className={`w-[3px] rounded-full transition-colors ${n <= rating ? 'bg-[#d9856b]' : 'bg-slate-200'}`}
      />
    ))}
  </span>
);

const CheckIcon = () => (
  <svg className="w-3.5 h-3.5 text-[#d9856b]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
  </svg>
);

const ChevronIcon = ({ open }) => (
  <svg
    className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-150 ${open ? 'rotate-180 text-[#d9856b]' : ''}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
  </svg>
);

const LevelDropdown = ({ rating, missing, onChange }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null); // where the list sits; kept after closing so it can fade out
  const [active, setActive] = useState(0); // option under the keyboard or pointer
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const idRef = useRef(null);
  if (idRef.current === null) {
    dropdownCount += 1;
    idRef.current = `language-level-${dropdownCount}`;
  }
  const listId = idRef.current;
  const count = LANGUAGE_LEVELS.length;
  const label = getLanguageLevelLabel(rating);

  const openList = () => {
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const above = spaceBelow < LIST_HEIGHT + LIST_GAP + 8 && rect.top > spaceBelow;
    setPos({
      left: rect.left,
      width: rect.width,
      above,
      ...(above ? { bottom: window.innerHeight - rect.top + LIST_GAP } : { top: rect.bottom + LIST_GAP }),
    });
    setActive(rating > 0 ? rating - 1 : 0);
    setOpen(true);
  };

  const choose = (level) => {
    onChange(level);
    setOpen(false);
    if (triggerRef.current) triggerRef.current.focus();
  };

  // Close on an outside tap, on scrolling or resizing (the list is fixed, so it would drift).
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (isInside(triggerRef.current, e.target) || isInside(listRef.current, e.target)) return;
      setOpen(false);
    };
    const onMove = (e) => {
      if (isInside(listRef.current, e.target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open]);

  // Enter and Space press the button as usual (see onClick); the arrow keys move through the list.
  const onKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % count);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + count) % count);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(count - 1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  const onTriggerClick = (e) => {
    if (!open) openList();
    else if (e.detail === 0) choose(LANGUAGE_LEVELS[active]); // pressed from the keyboard
    else setOpen(false); // tapped while open
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-label="Language level"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-option-${active}` : undefined}
        onClick={onTriggerClick}
        onKeyDown={onKeyDown}
        className={`w-full min-h-[44px] flex items-center gap-3 pl-3.5 pr-3 bg-white border rounded-lg text-left shadow-sm transition-all focus:outline-none ${
          open
            ? 'border-[#d9856b] ring-4 ring-[#d9856b]/15'
            : missing
              ? 'border-red-300 focus-visible:ring-4 focus-visible:ring-red-100'
              : 'border-slate-200 hover:border-slate-300 focus-visible:border-[#d9856b] focus-visible:ring-4 focus-visible:ring-[#d9856b]/15'
        }`}
      >
        <span className={`flex-1 min-w-0 truncate text-xs font-semibold ${label ? 'text-slate-800' : 'text-slate-400'}`}>
          {label || 'Select a level'}
        </span>
        <LevelBars rating={rating} />
        <ChevronIcon open={open} />
      </button>

      {pos && createPortal(
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Language level"
          style={{ position: 'fixed', zIndex: 1000, left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom }}
          className={`p-1 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-900/10 transition duration-150 ease-out ${
            pos.above ? 'origin-bottom' : 'origin-top'
          } ${open ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible pointer-events-none'}`}
        >
          {LANGUAGE_LEVELS.map((level, i) => {
            const selected = rating === i + 1;
            return (
              <div
                key={level}
                id={`${listId}-option-${i}`}
                role="option"
                aria-selected={selected}
                // keep focus on the trigger so the keyboard keeps working
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(level)}
                style={{ minHeight: OPTION_HEIGHT }}
                className={`flex items-center gap-3 px-3 rounded-lg cursor-pointer text-xs transition-colors ${
                  selected
                    ? 'bg-[#d9856b]/10 text-[#8f4631] font-semibold'
                    : active === i
                      ? 'bg-slate-50 text-slate-900 font-medium'
                      : 'text-slate-700 font-medium'
                }`}
              >
                <span className="flex-1">{level}</span>
                <LevelBars rating={i + 1} />
                <span className="w-4 h-4 flex items-center justify-center shrink-0">{selected && <CheckIcon />}</span>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
};

/**
 * Optional level picker for one language row.
 *   value      - current level label; Fluent is shown when empty
 *   onChange   - called with the new level label
 *   showError  - show the "choose a level" message when nothing is selected
 *
 * Small screens get a dropdown; from the sm breakpoint up it is a row of buttons.
 */
export default function LanguageLevelSelect({ value, onChange, showError = false }) {
  const current = value && String(value).trim() ? String(value).trim() : DEFAULT_LANGUAGE_LEVEL;
  const currentRating = languageRating(current);
  const missing = showError && !(value && String(value).trim());

  return (
    <div className="pb-8 w-full" data-language-missing={missing ? 'true' : undefined}>
      <div className="sm:hidden">
        <LevelDropdown rating={currentRating} missing={missing} onChange={onChange} />
      </div>

      <div role="radiogroup" aria-label="Language level" className="hidden sm:flex flex-wrap gap-2">
        {LANGUAGE_LEVELS.map((level, i) => {
          const selected = currentRating === i + 1;
          return (
            <button
              key={level}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(level)}
              className={`min-h-[32px] px-3 py-1.5 rounded-sm border text-xs font-medium transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d9856b] ${
                selected
                  ? 'bg-[#d9856b] border-[#d9856b] text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-[#d9856b] hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {level}
            </button>
          );
        })}
      </div>
      {missing && <p className="mt-1.5 text-xs font-medium text-red-500">Choose a level for this language.</p>}
    </div>
  );
}
