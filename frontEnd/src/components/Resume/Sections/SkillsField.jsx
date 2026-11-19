import React, { useEffect, useRef, useState } from 'react';
import JobSkillMatch from './JobSkillMatch';

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
/*                        Flash of a newly added row                          */
/* -------------------------------------------------------------------------- */

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  const [freshId, setFreshId] = useState(null); // the skill row that just landed
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

  const hasLevel = (skill) => Number(skill.rating) >= 1;
  const isMissingLevel = (skill) => !!(skill.text && skill.text.trim()) && !hasLevel(skill);
  const missingCount = selectedSkills.filter(isMissingLevel).length;

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
        Type the skills you want to highlight, then choose your level for each one.
      </p>

      <JobSkillMatch data={data} onAdd={handleAddJobSkill} />

      <div className="max-w-[720px]">
        {/* Selected skills */}
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

          <div className="flex flex-col gap-4">
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
