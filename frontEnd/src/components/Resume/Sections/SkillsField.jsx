import React, { useEffect, useRef, useState } from 'react';
import JobSkillMatch from './JobSkillMatch';
import { SkillIdeas } from './AIIdeas';

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
/*                                 Skill input                                */
/* -------------------------------------------------------------------------- */

// A plain text input. Skills are suggested by the AI panel on the left (components/Resume/Sections/AIIdeas.jsx), so
// there is no dropdown under the box any more.
const SkillInput = ({ value, onChange, placeholder, invalid }) => (
  <input
    type="text"
    autoComplete="off"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className={`w-full bg-white border text-slate-800 focus:border-slate-500 rounded-sm py-1.5 px-2.5 text-sm focus:outline-none transition-all ${
      invalid ? 'border-red-300' : 'border-slate-200'
    }`}
  />
);

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

  // A skill picked from the job-matched list: added straight away, and its row flashes like a suggestion that landed.
  const handleAddJobSkill = (text) => {
    if (skillsRef.current.some((skill) => (skill.text || '').trim().toLowerCase() === text.trim().toLowerCase())) return;
    const id = Date.now();
    updateSkillsRef.current([...skillsRef.current, { id, text, rating: DEFAULT_SKILL_RATING }]);
    setFreshId(id);
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

      <JobSkillMatch data={data} onAdd={handleAddJobSkill} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
        {/* Left Column: skills suggested by the AI from the qualification, the work history and the target job */}
        <div className="flex flex-col gap-4">
          <SkillIdeas data={data} selectedTexts={selectedTexts} onAdd={handleAddSkill} pending={pending} />
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
