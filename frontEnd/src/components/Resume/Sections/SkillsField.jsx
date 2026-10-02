import React, { useEffect, useMemo, useRef, useState } from 'react';
import { suggestSkills } from './datasetSuggestions';

// Skill levels. The chosen `value` is stored on each skill as `rating` (1-5);
// 0 / missing means "not chosen yet" (older saved skills). New skills start at Novice.
export const SKILL_LEVELS = [
  { value: 1, label: 'Novice' },
  { value: 2, label: 'Beginner' },
  { value: 3, label: 'Skillful' },
  { value: 4, label: 'Experienced' },
  { value: 5, label: 'Expert' },
];

// Level a new skill starts with: Novice.
export const DEFAULT_SKILL_RATING = SKILL_LEVELS[0].value;

export const getSkillLevelLabel = (rating) =>
  SKILL_LEVELS.find((level) => level.value === Number(rating))?.label || '';

/* -------------------------------------------------------------------------- */
/*                      "Slide into the list" animation                       */
/* -------------------------------------------------------------------------- */

const FLY_MS = 560;
const INPUT_INDENT = 36; // remove button (24px) + gap (12px) in front of each skill input
const INPUT_HEIGHT = 34; // the skill input: 20px text + 2 x 6px padding + borders
const ROW_HEIGHT = 56; // fallback height of one selected-skill row (input + level squares)
const ROW_GAP = 16; // gap between selected-skill rows

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Slides a copy of the picked skill from its row in the suggestions to the spot where its new row
// will appear in the selected skills, growing into the shape of the skill input on the way. The
// skill is added (onLand) just before the copy finishes fading, so the real row replaces it.
// `queued` is how many other skills are still on their way, so they land one under the other.
// The copy lives on <body>, so no panel can clip it. With reduced motion (or no Web Animations
// support) the skill is added straight away.
const flySkillToList = ({ text, sourceEl, listEl, queued, onLand }) => {
  if (!sourceEl || !listEl || !sourceEl.animate || prefersReducedMotion()) {
    onLand();
    return;
  }

  const from = sourceEl.getBoundingClientRect();
  const to = listEl.getBoundingClientRect();
  const look = window.getComputedStyle(sourceEl);
  const lastRow = listEl.lastElementChild;
  const rowStep = (lastRow ? lastRow.getBoundingClientRect().height : ROW_HEIGHT) + ROW_GAP;

  const startLeft = from.left - 8;
  const startTop = from.top - 4;
  const endLeft = to.left + INPUT_INDENT;
  const wantedTop = (lastRow ? to.bottom + ROW_GAP : to.top) + queued * rowStep;
  // Kept inside the viewport so it never flies off-screen (the page scrolls to the row afterwards).
  const endTop = Math.min(Math.max(wantedTop, 8), window.innerHeight - INPUT_HEIGHT - 8);
  const endWidth = Math.max(to.width - INPUT_INDENT, 120);

  const ghost = document.createElement('div');
  ghost.textContent = text;
  ghost.setAttribute('aria-hidden', 'true');
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${startLeft}px`,
    top: `${startTop}px`,
    width: `${from.width + 16}px`,
    boxSizing: 'border-box',
    padding: '3px 7px',
    border: '1px solid transparent',
    background: '#fff',
    color: '#334155',
    fontFamily: look.fontFamily,
    fontSize: look.fontSize,
    lineHeight: look.lineHeight,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    borderRadius: '2px',
    boxShadow: '0 0 0 1px #64748b, 0 8px 20px rgba(15, 23, 42, 0.16)',
    pointerEvents: 'none',
    zIndex: '9999',
    willChange: 'transform, opacity',
  });
  document.body.appendChild(ghost);

  let landed = false;
  const land = () => {
    if (landed) return;
    landed = true;
    onLand();
  };
  const timer = setTimeout(land, FLY_MS * 0.8);
  const finish = () => {
    clearTimeout(timer);
    ghost.remove();
    land();
  };

  const there = {
    transform: `translate(${endLeft - startLeft}px, ${endTop - startTop}px)`,
    width: `${endWidth}px`,
    padding: '6px 10px',
  };
  // Moves for the first 80% of the time (eased), then fades while the real row shows underneath.
  const anim = ghost.animate(
    [
      {
        transform: 'translate(0px, 0px)',
        width: `${from.width + 16}px`,
        padding: '3px 7px',
        opacity: 1,
        easing: 'cubic-bezier(0.22, 0.8, 0.28, 1)',
      },
      { ...there, opacity: 1, offset: 0.8 },
      { ...there, opacity: 0 },
    ],
    { duration: FLY_MS, easing: 'linear', fill: 'forwards' }
  );
  anim.onfinish = finish;
  anim.oncancel = finish;
};

// A short ring around the new skill's input, and a scroll to it if it landed off-screen.
const flashRow = (row) => {
  if (!row) return;
  const input = row.querySelector('input');
  if (input && input.animate) {
    input.animate(
      [{ boxShadow: '0 0 0 3px rgba(100, 116, 139, 0.45)' }, { boxShadow: '0 0 0 3px rgba(100, 116, 139, 0)' }],
      { duration: 800, easing: 'ease-out' }
    );
  }
  const r = row.getBoundingClientRect();
  if (r.top < 0 || r.bottom > window.innerHeight) {
    row.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
  }
};

/* -------------------------------------------------------------------------- */
/*                         Skill input with suggestions                       */
/* -------------------------------------------------------------------------- */

// Text input that suggests skills from the dataset while you type. With nothing typed it
// suggests skills for the job titles from the Work History step.
const SkillInput = ({ value, onChange, placeholder, invalid, exclude, jobTitles }) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef(null);
  const listId = useRef(`skill-suggestions-${Math.random().toString(36).slice(2, 7)}`).current;
  const excludeKey = exclude.join('|');
  const titlesKey = jobTitles.join('|');

  const { items, personalised } = useMemo(() => {
    if (!open) return { items: [], personalised: false };
    const typed = (value || '').trim().toLowerCase();
    const result = suggestSkills({ query: value, exclude, jobTitles, limit: 7 });
    return {
      items: result.suggestions.filter((s) => s.toLowerCase() !== typed).slice(0, 6),
      personalised: result.personalised,
    };
  }, [open, value, excludeKey, titlesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const showList = open && items.length > 0;
  const heading = (value || '').trim() ? 'Matching skills' : personalised ? 'Suggested for your job titles' : 'Popular skills';

  const pick = (text) => {
    onChange(text);
    setOpen(false);
    setActive(-1);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown' && items.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === 'ArrowUp' && items.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i < 0 ? items.length - 1 : (i - 1 + items.length) % items.length));
    } else if (e.key === 'Enter' && showList && active >= 0 && items[active]) {
      e.preventDefault();
      pick(items[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div
      ref={wrapRef}
      className="relative w-full"
      onBlur={(e) => {
        if (!wrapRef.current || !wrapRef.current.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <input
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-opt-${active}` : undefined}
        autoComplete="off"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setActive(-1);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full bg-white border text-slate-800 focus:border-slate-500 rounded-sm py-1.5 px-2.5 text-sm focus:outline-none transition-all ${
          invalid ? 'border-red-300' : 'border-slate-200'
        }`}
      />

      {showList && (
        <div
          id={listId}
          role="listbox"
          aria-label="Suggested skills"
          className="absolute left-0 right-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-sm max-h-56 overflow-y-auto"
        >
          <p className="px-2.5 py-1.5 text-[11px] font-medium text-slate-400 border-b border-slate-100">{heading}</p>
          {items.map((text, i) => (
            <button
              key={text}
              id={`${listId}-opt-${i}`}
              type="button"
              role="option"
              aria-selected={i === active}
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(text)}
              onMouseEnter={() => setActive(i)}
              className={`block w-full text-left px-2.5 py-1.5 text-sm transition-colors ${
                i === active ? 'bg-slate-50 text-slate-900 font-medium' : 'text-slate-700'
              }`}
            >
              {text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                             Suggested skills list                          */
/* -------------------------------------------------------------------------- */

// Left column: skills from the dataset for the user's job titles (or popular skills when there
// are none yet), with a search box. Skills already added drop out of the list.
const SuggestedSkills = ({ selectedTexts, jobTitles, onAdd, pending = [] }) => {
  const [search, setSearch] = useState('');
  const selectedKey = selectedTexts.join('|');
  const titlesKey = jobTitles.join('|');

  const { suggestions, personalised } = useMemo(
    () => suggestSkills({ query: search, exclude: selectedTexts, jobTitles, limit: 40 }),
    [search, selectedKey, titlesKey] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const searching = !!search.trim();
  const caption = searching ? 'Matching skills' : personalised ? 'Based on the job titles you added' : 'Popular skills';

  return (
    <div className="border border-slate-200 rounded-sm bg-white h-[360px] flex flex-col">
      <div className="p-3 border-b border-slate-100 bg-slate-50 flex flex-col gap-2">
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Suggested skills</span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search skills"
          aria-label="Search suggested skills"
          className="w-full bg-white border border-slate-200 text-slate-800 focus:border-slate-500 rounded-sm py-1.5 px-2.5 text-sm focus:outline-none transition-all"
        />
        <span className="text-[11px] text-slate-500">{caption}</span>
      </div>
      <div className="overflow-y-auto flex-1 p-2 flex flex-col">
        {/* Each row is a one-row grid that folds to 0 height when its skill is picked, so the skills
            below glide up. The spacing between rows (mb-1) lives inside the row so it folds too. */}
        {suggestions.map((text) => {
          const sending = pending.includes(text); // sliding into the list
          return (
            <div
              key={text}
              className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                sending ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
              }`}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="mb-1 flex items-center gap-3 p-2 rounded-sm hover:bg-slate-50 border border-transparent transition-colors group">
                  <button
                    type="button"
                    onClick={(e) => onAdd(text, e.currentTarget.parentElement.querySelector('[data-skill-text]'))}
                    disabled={sending}
                    className={`w-6 h-6 rounded-sm border flex items-center justify-center shrink-0 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${
                      sending
                        ? 'bg-slate-700 border-slate-700 text-white cursor-default'
                        : 'bg-white border-slate-200 text-slate-500 group-hover:border-slate-400 group-hover:text-slate-800'
                    }`}
                    aria-label={sending ? `Added ${text}` : `Add ${text}`}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d={sending ? 'M5 13l4 4L19 7' : 'M12 4v16m8-8H4'}
                      />
                    </svg>
                  </button>
                  <span data-skill-text className="text-sm text-slate-700">
                    {text}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {suggestions.length === 0 && (
          <p className="p-2 text-xs text-slate-500">
            {searching ? 'No matching skills. Type your own on the right.' : 'No more suggestions.'}
          </p>
        )}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                  Skills step                               */
/* -------------------------------------------------------------------------- */

const SkillsSection = ({ data, updateSkills, showSkillErrors = false }) => {
  const [pending, setPending] = useState([]); // suggested skills currently sliding into the list
  const [freshId, setFreshId] = useState(null); // the skill row that just landed
  const listRef = useRef(null);
  // Refs keep the landing step on the latest values, since it runs ~half a second after the click.
  const skillsRef = useRef([]);
  const updateSkillsRef = useRef(updateSkills);
  const skillsList = data ? data.skills : null;
  skillsRef.current = skillsList || [];
  updateSkillsRef.current = updateSkills;

  // Once the new row is on screen, flash its input.
  useEffect(() => {
    if (freshId === null) return;
    const row = document.getElementById(`skill-row-${freshId}`);
    if (!row) return;
    flashRow(row);
    setFreshId(null);
  }, [freshId, skillsList]);

  if (!data) return null;
  const selectedSkills = data.skills;
  const selectedTexts = selectedSkills.map((skill) => skill.text);

  // Job titles from the Work History step, most recent first. They drive the suggestions.
  const jobTitles = (Array.isArray(data.experiences) ? data.experiences : [])
    .map((job) => ((job && job.title) || '').trim())
    .filter(Boolean);

  const hasLevel = (skill) => Number(skill.rating) >= 1;
  const isMissingLevel = (skill) => !!(skill.text && skill.text.trim()) && !hasLevel(skill);
  const missingCount = selectedSkills.filter(isMissingLevel).length;

  // New skills start at the first level (Novice), which the user can change. A picked suggestion
  // slides over to the list first and is added when it lands.
  const handleAddSkill = (text, sourceEl) => {
    if (pending.includes(text)) return;
    setPending((p) => [...p, text]);
    flySkillToList({
      text,
      sourceEl,
      listEl: listRef.current,
      queued: pending.length,
      onLand: () => {
        const id = Date.now();
        updateSkillsRef.current([...skillsRef.current, { id, text, rating: DEFAULT_SKILL_RATING }]);
        setPending((p) => p.filter((t) => t !== text));
        setFreshId(id);
      },
    });
  };

  const handleAddEmptySkill = () => {
    updateSkills([...selectedSkills, { id: Date.now(), text: '', rating: DEFAULT_SKILL_RATING }]);
  };

  const handleRemoveSkill = (id) => {
    updateSkills(selectedSkills.filter(skill => skill.id !== id));
  };

  const handleUpdateSkillText = (id, newText) => {
    updateSkills(selectedSkills.map(skill => 
      skill.id === id ? { ...skill, text: newText } : skill
    ));
  };

  const handleUpdateSkillRating = (id, rating) => {
    updateSkills(selectedSkills.map(skill =>
      skill.id === id ? { ...skill, rating } : skill
    ));
  };

  return (
    <div className="max-w-[1000px] mx-auto w-full pb-32">
      <h1 className="text-2xl font-bold text-slate-800 leading-tight mb-1.5 tracking-tight">
        What skills would you like to highlight?
      </h1>
      <p className="text-sm text-slate-600 mb-6">
        Pick from the suggestions or start typing your own, then choose your level for each one.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
        {/* Left Column: Suggested skills from the dataset */}
        <div className="flex flex-col gap-4">
          <SuggestedSkills selectedTexts={selectedTexts} jobTitles={jobTitles} onAdd={handleAddSkill} pending={pending} />
        </div>

        {/* Right Column: Selected Skills */}
        <div className="flex flex-col gap-4 lg:pt-1">
          {showSkillErrors && missingCount > 0 ? (
            <p className="text-xs font-medium text-red-500 bg-red-50 p-2 rounded-sm border border-red-100" role="alert">
              Choose a level for {missingCount === 1 ? 'the skill' : `each of the ${missingCount} skills`} marked below to continue.
            </p>
          ) : (
            <p className="text-xs font-medium text-slate-500 pb-1">
              Rate each skill from Novice to Expert. The level is shown on your resume.
            </p>
          )}

          <div ref={listRef} className="flex flex-col gap-4">
            {selectedSkills.map((skill) => {
              const missing = isMissingLevel(skill);
              const label = getSkillLevelLabel(skill.rating);
              return (
                <div
                  key={skill.id}
                  id={`skill-row-${skill.id}`}
                  className="flex items-start gap-3"
                  data-skill-missing={missing ? 'true' : undefined}
                >
                  <button 
                    onClick={() => handleRemoveSkill(skill.id)}
                    aria-label="Remove skill"
                    className="mt-1 w-6 h-6 shrink-0 rounded-sm bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all focus:outline-none"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                    </svg>
                  </button>

                  <div className="w-full flex flex-col gap-1.5">
                    <SkillInput
                      value={skill.text}
                      onChange={(text) => handleUpdateSkillText(skill.id, text)}
                      placeholder="e.g. Project Management"
                      invalid={showSkillErrors && missing}
                      exclude={selectedSkills.filter((s) => s.id !== skill.id).map((s) => s.text)}
                      jobTitles={jobTitles}
                    />

                    <div className="flex items-center justify-between gap-3">
                      <div
                        role="radiogroup"
                        aria-label={`Level for ${skill.text || 'this skill'}`}
                        className="flex items-center gap-1.5"
                      >
                        {SKILL_LEVELS.map((level) => {
                          const filled = Number(skill.rating) >= level.value;
                          return (
                            <button
                              key={level.value}
                              type="button"
                              role="radio"
                              aria-checked={Number(skill.rating) === level.value}
                              aria-label={`${level.label} (${level.value} of ${SKILL_LEVELS.length})`}
                              title={level.label}
                              onClick={() => handleUpdateSkillRating(skill.id, level.value)}
                              className={`w-4 h-4 rounded-sm border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${
                                filled
                                  ? 'bg-slate-700 border-slate-700'
                                  : showSkillErrors && missing
                                    ? 'bg-white border-red-300 hover:border-slate-400'
                                    : 'bg-white border-slate-300 hover:border-slate-400'
                              }`}
                            />
                          );
                        })}
                      </div>
                      <span
                        className={`shrink-0 text-right text-xs font-medium ${
                          label ? 'text-slate-600' : showSkillErrors && missing ? 'text-red-500' : 'text-slate-400'
                        }`}
                      >
                        {label || (showSkillErrors && missing ? 'Level required' : 'Select a level')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="flex justify-start mt-2">
            <button 
              onClick={handleAddEmptySkill} 
              className="text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-sm px-3 py-1.5 bg-white transition-all focus:outline-none hover:bg-slate-50 flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Add one more
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillsSection;
