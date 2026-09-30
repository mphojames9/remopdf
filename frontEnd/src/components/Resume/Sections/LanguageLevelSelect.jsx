import React from 'react';

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

/**
 * Optional level picker for one language row.
 *   value      - current level label; Fluent is shown when empty
 *   onChange   - called with the new level label
 *   showError  - show the "choose a level" message when nothing is selected
 */
export default function LanguageLevelSelect({ value, onChange, showError = false }) {
  const current = value && String(value).trim() ? String(value).trim() : DEFAULT_LANGUAGE_LEVEL;
  const currentRating = languageRating(current);
  const missing = showError && !(value && String(value).trim());

  return (
    <div className="pb-8 w-full" data-language-missing={missing ? 'true' : undefined}>
      <div role="radiogroup" aria-label="Language level" className="flex flex-wrap gap-2">
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