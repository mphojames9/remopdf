import React from 'react';

export default function ExperienceField({ data, setData, onNext, onPrev, nextLabel }) {
  // 1. UPDATED: Differentiate between "first load" (undefined) and "user deleted everything" ([])
  const experiences = data.experience === undefined
    ? [
        {
          id: Date.now(),
          company: '',
          role: '',
          startDate: '',
          endDate: '',
          isCurrent: false,
          achievements: [''],
        },
      ]
    : data.experience;

  const updateExperience = (index, field, value) => {
    const newExp = experiences.map((exp, i) => {
      if (i === index) {
        const updatedExp = { ...exp, [field]: value };
        if (field === 'isCurrent' && value === true) {
          updatedExp.endDate = '';
        }
        return updatedExp;
      }
      return exp;
    });
    
    setData((prev) => ({ ...prev, experience: newExp }));
  };

  const handleAchievementChange = (expIndex, achIndex, value) => {
    const newExp = experiences.map((exp, i) => {
      if (i === expIndex) {
        const newAchievements = [...(exp.achievements || [''])];
        newAchievements[achIndex] = value;
        return { ...exp, achievements: newAchievements };
      }
      return exp;
    });

    setData((prev) => ({ ...prev, experience: newExp }));
  };

  const addAchievement = (expIndex) => {
    const newExp = experiences.map((exp, i) => {
      if (i === expIndex) {
        return { ...exp, achievements: [...(exp.achievements || []), ''] };
      }
      return exp;
    });

    setData((prev) => ({ ...prev, experience: newExp }));
  };

  const removeAchievement = (expIndex, achIndex) => {
    const newExp = experiences.map((exp, i) => {
      if (i === expIndex) {
        const newAchievements = exp.achievements.filter((_, aIndex) => aIndex !== achIndex);
        return { ...exp, achievements: newAchievements };
      }
      return exp;
    });

    setData((prev) => ({ ...prev, experience: newExp }));
  };

  const addExperience = () => {
    const newExp = [
      ...experiences,
      {
        id: Date.now(),
        company: '',
        role: '',
        startDate: '',
        endDate: '',
        isCurrent: false,
        achievements: [''],
      },
    ];
    setData((prev) => ({ ...prev, experience: newExp }));
  };

  const removeExperience = (indexToRemove) => {
    const newExp = experiences.filter((_, index) => index !== indexToRemove);
    setData((prev) => ({ ...prev, experience: newExp }));
  };

  // UPDATED: Safe check for empty states
  const lastExp = experiences[experiences.length - 1];
  const isAddDisabled = experiences.length > 0 && (!lastExp?.role?.trim() || !lastExp?.company?.trim());

  return (
    <div className="w-full max-w-3xl mx-auto p-6 font-sans">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Work Experience</h2>

      <div className="space-y-8">
        {experiences.map((exp, expIndex) => {
          
          // 2. NEW: Check if any achievement in this specific experience block is blank
          const currentAchievements = exp.achievements || [''];
          const isAddAchievementDisabled = currentAchievements.some(ach => !ach.trim());

          return (
            <div key={exp.id || expIndex} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative group transition-all hover:shadow-md">
              
              {/* UPDATED: Removed the experiences.length > 1 condition. You can now delete the last one. */}
              <button
                onClick={() => removeExperience(expIndex)}
                className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                title="Delete Experience"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>

              {/* Top row: Role & Company */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5 mt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Job Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Developer"
                    value={exp.role || ''}
                    onChange={(e) => updateExperience(expIndex, 'role', e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all pr-10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Company</label>
                  <input
                    type="text"
                    placeholder="e.g. Google"
                    value={exp.company || ''}
                    onChange={(e) => updateExperience(expIndex, 'company', e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all pr-10"
                  />
                </div>
              </div>

              {/* Premium Date Selectors */}
              <div className="bg-slate-50 p-4 rounded-xl mb-5 border border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Start Date</label>
                    <input
                      type="month"
                      value={exp.startDate || ''}
                      onChange={(e) => updateExperience(expIndex, 'startDate', e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none text-slate-700 transition-all cursor-pointer"
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">End Date</label>
                      <label className="flex items-center gap-2 cursor-pointer group/check">
                        <div className="relative flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={exp.isCurrent || false}
                            onChange={(e) => updateExperience(expIndex, 'isCurrent', e.target.checked)}
                            className="peer appearance-none w-4 h-4 border-2 border-slate-300 rounded cursor-pointer checked:bg-orange-500 checked:border-orange-500 transition-all"
                          />
                          <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <span className="text-xs font-semibold text-slate-600 group-hover/check:text-orange-600 transition-colors">I currently work here</span>
                      </label>
                    </div>
                    <input
                      type="month"
                      value={exp.endDate || ''}
                      disabled={exp.isCurrent}
                      onChange={(e) => updateExperience(expIndex, 'endDate', e.target.value)}
                      className={`w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all ${
                        exp.isCurrent ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400' : 'text-slate-700 cursor-pointer'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Achievements List */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Key Achievements / Responsibilities</label>
                <div className="space-y-3">
                  {currentAchievements.map((ach, achIndex) => (
                    <div key={achIndex} className="flex items-start gap-2 group/ach">
                      <div className="mt-4 w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0"></div>
                      <textarea
                        rows="2"
                        placeholder="Describe an achievement or responsibility..."
                        value={ach || ''}
                        onChange={(e) => handleAchievementChange(expIndex, achIndex, e.target.value)}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none text-sm text-slate-700 transition-all resize-none"
                      />
                      {currentAchievements.length > 1 && (
                        <button
                          onClick={() => removeAchievement(expIndex, achIndex)}
                          className="mt-2 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover/ach:opacity-100 focus:opacity-100 shrink-0"
                          title="Remove Achievement"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* UPDATED: Add Achievement button respects the validation check */}
                <button
                  onClick={() => addAchievement(expIndex)}
                  disabled={isAddAchievementDisabled}
                  className={`mt-4 flex items-center gap-1.5 text-sm font-semibold py-1.5 px-3 rounded-lg transition-all ${
                    isAddAchievementDisabled
                      ? 'text-slate-400 bg-slate-50 cursor-not-allowed opacity-80'
                      : 'text-orange-600 hover:text-orange-700 hover:bg-orange-50'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                  {isAddAchievementDisabled ? 'Fill current achievement to add another' : 'Add Achievement'}
                </button>
              </div>
            </div>
          );
        })}

        {/* Empty State Message (Only shows if they delete all experiences) */}
        {experiences.length === 0 && (
          <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <p className="text-slate-500 font-medium">No experience listed.</p>
          </div>
        )}
      </div>

      {/* Conditionally Disabled Add Button */}
      <button
        onClick={addExperience}
        disabled={isAddDisabled}
        className={`mt-6 w-full py-4 border-2 border-dashed rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-300 ${
          isAddDisabled 
            ? 'border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed opacity-70' 
            : 'border-slate-300 text-slate-500 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 cursor-pointer'
        }`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        {isAddDisabled ? 'Fill current experience to add another' : 'Add Another Experience'}
      </button>

      {/* Modern Red & Orange Navigation */}
      <div className="flex justify-between items-center mt-10 pt-6 border-t border-slate-200">
        <button
          onClick={onPrev}
          className="px-6 py-3 border-2 border-slate-200 text-slate-600 font-semibold rounded-xl hover:border-red-200 hover:text-red-600 hover:bg-red-50 transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>
        
        <button
          onClick={onNext}
          className="px-8 py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2"
        >
          {nextLabel || "Next: Education"}
          {nextLabel?.includes('Finish') ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          )}
        </button>
      </div>
    </div>
  );
}