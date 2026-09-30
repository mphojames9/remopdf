import React from 'react';

// Skill levels. The chosen `value` is stored on each skill as `rating` (1-5);
// 0 / missing means "not chosen yet".
export const SKILL_LEVELS = [
  { value: 1, label: 'Novice' },
  { value: 2, label: 'Beginner' },
  { value: 3, label: 'Skillful' },
  { value: 4, label: 'Experienced' },
  { value: 5, label: 'Expert' },
];

export const getSkillLevelLabel = (rating) =>
  SKILL_LEVELS.find((level) => level.value === Number(rating))?.label || '';

const SkillsSection = ({ data, updateSkills, showSkillErrors = false }) => {
  if (!data) return null;
  const selectedSkills = data.skills;

  const predefinedSkills = [
    { id: 'p1', text: 'Friendly, positive attitude', expert: true },
    { id: 'p2', text: 'Teamwork and collaboration', expert: true },
    { id: 'p3', text: 'Problem-solving', expert: true }
  ];

  const hasLevel = (skill) => Number(skill.rating) >= 1;
  const isMissingLevel = (skill) => !!(skill.text && skill.text.trim()) && !hasLevel(skill);
  const missingCount = selectedSkills.filter(isMissingLevel).length;

  // New skills start without a level: the user has to choose one.
  const handleAddSkill = (text) => {
    updateSkills([...selectedSkills, { id: Date.now(), text, rating: 0 }]);
  };

  const handleAddEmptySkill = () => {
    updateSkills([...selectedSkills, { id: Date.now(), text: '', rating: 0 }]);
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
        Choose from our pre-written examples below or write your own, then pick your level for each one.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
        {/* Left Column: Predefined Skills */}
        <div className="flex flex-col gap-4">
          <div className="border border-slate-200 rounded-sm bg-white h-[320px] flex flex-col">
            <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Ready to use examples
              </span>
            </div>
            <div className="overflow-y-auto flex-1 p-2 flex flex-col gap-1">
              {predefinedSkills.map((skill) => (
                <div key={skill.id} className="flex items-center gap-3 p-2 rounded-sm hover:bg-slate-50 border border-transparent transition-colors group">
                  <button 
                    onClick={() => handleAddSkill(skill.text)}
                    className="w-6 h-6 rounded-sm bg-white border border-slate-200 text-slate-500 flex items-center justify-center shrink-0 group-hover:border-slate-400 group-hover:text-slate-800 transition-all focus:outline-none"
                    aria-label={`Add ${skill.text}`}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  <span className="text-sm text-slate-700">{skill.text}</span>
                </div>
              ))}
            </div>
          </div>
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

          <div className="flex flex-col gap-4">
            {selectedSkills.map((skill) => {
              const missing = isMissingLevel(skill);
              const label = getSkillLevelLabel(skill.rating);
              return (
                <div
                  key={skill.id}
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
                    <input
                      type="text"
                      value={skill.text}
                      onChange={(e) => handleUpdateSkillText(skill.id, e.target.value)}
                      placeholder="e.g. Project Management"
                      className={`w-full bg-white border text-slate-800 focus:border-slate-500 rounded-sm py-1.5 px-2.5 text-sm focus:outline-none transition-all ${
                        showSkillErrors && missing ? 'border-red-300' : 'border-slate-200'
                      }`}
                    />

                    <div className="flex items-center gap-3">
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
                        className={`text-xs font-medium ${
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