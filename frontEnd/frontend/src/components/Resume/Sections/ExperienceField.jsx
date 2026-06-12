import React, { useState, useRef } from 'react';
import useResumeSuggestions from '../../../hooks/useResumeSuggestions';

// Premium Standardized InputField
const InputField = ({ label, placeholder, value, onChange, onBlur, type = "text" }) => (
  <div className="flex flex-col group w-full">
    <label className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-0.5 transition-colors group-focus-within:text-orange-500">
      {label}
    </label>
    <div className="relative w-full">
      <input 
        type={type}
        placeholder={placeholder} 
        value={value || ''} 
        onChange={onChange}
        onBlur={onBlur}
        className="w-full bg-slate-50/60 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none shadow-sm transition-all placeholder:text-slate-400 font-medium" 
      />
    </div>
  </div>
);

export default function ExperienceField({ data, setData, onNext, onPrev, nextLabel }) {
  const { suggestions, isSuggesting } = useResumeSuggestions(data);
  const [clickedSuggestions, setClickedSuggestions] = useState([]);
  
  const [titleSuggestionsMap, setTitleSuggestionsMap] = useState({});
  const titleTimeoutRefs = useRef({});

  const experiences = data.experience === undefined || data.experience.length === 0
    ? [{ id: Date.now(), company: '', role: '', startDate: '', endDate: '', isCurrent: false, achievements: [''] }]
    : data.experience;

  const updateExperience = (index, field, value) => {
    const newExp = experiences.map((exp, i) => {
      if (i === index) {
        const updatedExp = { ...exp, [field]: value };
        if (field === 'isCurrent' && value === true) updatedExp.endDate = '';
        return updatedExp;
      }
      return exp;
    });
    setData((prev) => ({ ...prev, experience: newExp }));
  };

  const handleRoleChange = (index, value) => {
    updateExperience(index, 'role', value);

    if (titleTimeoutRefs.current[index]) clearTimeout(titleTimeoutRefs.current[index]);

    if (value.trim().length < 2) {
      setTitleSuggestionsMap((prev) => ({ ...prev, [index]: [] }));
      return;
    }

    titleTimeoutRefs.current[index] = setTimeout(async () => {
      try {
        const query = value.toLowerCase().trim();
        const cacheKey = `esco_job_titles_${query}`;
        
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          setTitleSuggestionsMap((prev) => ({ ...prev, [index]: JSON.parse(cachedData) }));
          return;
        }

        const searchUrl = `https://ec.europa.eu/esco/api/search?text=${encodeURIComponent(value)}&type=occupation&language=en&limit=8`;
        const res = await fetch(searchUrl);
        const searchData = await res.json();
        
        if (searchData?._embedded?.results) {
          const titles = searchData._embedded.results.map((r) => r.title);
          const uniqueTitles = [...new Set(titles)].slice(0, 5);
          
          localStorage.setItem(cacheKey, JSON.stringify(uniqueTitles));
          setTitleSuggestionsMap((prev) => ({ ...prev, [index]: uniqueTitles }));
        }
      } catch (e) {
        console.error("Failed to fetch job titles", e);
      }
    }, 250);
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

  const addAchievement = (index) => {
    const newExp = experiences.map((exp, i) => {
      if (i === index) return { ...exp, achievements: [...(exp.achievements || []), ''] };
      return exp;
    });
    setData((prev) => ({ ...prev, experience: newExp }));
  };

  const removeAchievement = (expIndex, achIndex) => {
    const newExp = experiences.map((exp, i) => {
      if (i === expIndex) {
        const newAchievements = exp.achievements.filter((_, j) => j !== achIndex);
        return { ...exp, achievements: newAchievements.length > 0 ? newAchievements : [''] };
      }
      return exp;
    });
    setData((prev) => ({ ...prev, experience: newExp }));
  };

  const handleAddSuggestedAchievement = (expIndex, text) => {
    const newExp = experiences.map((exp, i) => {
      if (i === expIndex) {
        const currentAchievements = [...(exp.achievements || [])];
        if (currentAchievements.length > 0 && currentAchievements[currentAchievements.length - 1].trim() === '') {
          currentAchievements[currentAchievements.length - 1] = text;
        } else {
          currentAchievements.push(text);
        }
        return { ...exp, achievements: currentAchievements };
      }
      return exp;
    });
    setData((prev) => ({ ...prev, experience: newExp }));
    setClickedSuggestions((prev) => [...prev, text]);
  };

  const addExperience = () => {
    setData((prev) => ({ ...prev, experience: [...experiences, { id: Date.now(), company: '', role: '', startDate: '', endDate: '', isCurrent: false, achievements: [''] }] }));
  };

  const removeExperience = (index) => {
    const newExp = experiences.filter((_, i) => i !== index);
    setData((prev) => ({ ...prev, experience: newExp.length > 0 ? newExp : [{ id: Date.now(), company: '', role: '', startDate: '', endDate: '', isCurrent: false, achievements: [''] }] }));
  };

  return (
    <>
      {/* =======================================================================
        ADJUST HEIGHT HERE: Change h-[80vh] below to your preferred value
        =======================================================================
      */}
      <div className="w-full max-w-3xl mx-auto font-['Outfit',_sans-serif] animate-fade-in px-3 sm:px-6 h-[80vh] min-w-[320px] flex flex-col overflow-hidden bg-white selection:bg-orange-100 selection:text-orange-800">
        
        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto pr-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-4 pt-3">
          <div className="mb-4 sm:mb-6">
            <span className="inline-block text-orange-600 text-[9px] font-bold uppercase tracking-widest bg-orange-50 border border-orange-100 px-2.5 py-0.5 rounded-full mb-1.5">
              Section 2
            </span>
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
              Work Experience
            </h2>
            <p className="text-[11px] sm:text-sm text-slate-400 font-medium mt-0.5">
              List your professional experience starting with the most recent.
            </p>
          </div>

          <div className="space-y-5 sm:space-y-6">
            {experiences.map((exp, index) => {
              const roleAchievements = suggestions?.achievementsMap?.[exp.role] || [];
              const visibleSuggestions = roleAchievements.filter(
                (ach) => !clickedSuggestions.includes(ach)
              );

              const isAddAchievementDisabled = !exp.achievements || exp.achievements.length === 0 || exp.achievements[exp.achievements.length - 1].trim() === '';

              return (
                <div key={exp.id || index} className="p-3.5 sm:p-5 bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(148,163,184,0.12)] rounded-2xl relative group/card hover:border-slate-200 hover:shadow-[0_4px_24px_-2px_rgba(148,163,184,0.16)] transition-all duration-300">
                  
                  {/* Top Header Controls: Changes layout responsively with native bottom margin on mobile */}
                  <div className="flex justify-between items-center mb-3 sm:mb-0 sm:absolute sm:top-3.5 sm:right-3.5 w-full sm:w-auto">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider sm:hidden">
                      Position #{index + 1}
                    </span>
                    {experiences.length > 1 && (
                      <button 
                        onClick={() => removeExperience(index)} 
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-xl border border-transparent hover:border-red-100 shadow-sm sm:shadow-none transition-all duration-200 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider"
                        title="Remove Experience"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span className="sm:hidden pr-0.5">Delete Role</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 mb-4">
                    <div className="relative flex flex-col w-full">
                      <InputField 
                        label="Job Title" 
                        placeholder="e.g. Software Engineer" 
                        value={exp.role} 
                        onChange={(e) => handleRoleChange(index, e.target.value)} 
                        onBlur={() => {
                          setTimeout(() => setTitleSuggestionsMap(prev => ({...prev, [index]: []})), 150);
                        }}
                      />
                      
                      {titleSuggestionsMap[index] && titleSuggestionsMap[index].length > 0 && (
                        <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 bg-white border border-slate-200 shadow-xl rounded-xl max-h-40 overflow-y-auto overscroll-contain backdrop-blur-xl bg-white/95 py-1 animate-in fade-in slide-in-from-top-2 duration-150">
                          {titleSuggestionsMap[index].map((t, i) => (
                            <div 
                              key={i} 
                              onMouseDown={(e) => {
                                e.preventDefault(); 
                                updateExperience(index, 'role', t);
                                setTitleSuggestionsMap((prev) => ({ ...prev, [index]: [] }));
                              }}
                              className="px-3.5 py-2 text-xs text-slate-700 hover:bg-orange-50 hover:text-orange-700 cursor-pointer transition-colors font-medium"
                            >
                              {t}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <InputField label="Company" placeholder="e.g. Google" value={exp.company} onChange={(e) => updateExperience(index, 'company', e.target.value)} />
                    
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:col-span-2">
                      <InputField label="Start Date" placeholder="MM/YYYY" value={exp.startDate} onChange={(e) => updateExperience(index, 'startDate', e.target.value)} />
                      <div className="flex flex-col">
                        <InputField label="End Date" placeholder="MM/YYYY" value={exp.isCurrent ? 'Present' : exp.endDate} onChange={(e) => !exp.isCurrent && updateExperience(index, 'endDate', e.target.value)} />
                        <label className="flex items-center gap-2 mt-2 ml-0.5 cursor-pointer group/check w-max select-none">
                          <div className="relative flex items-center justify-center w-3.5 h-3.5">
                            <input type="checkbox" checked={exp.isCurrent} onChange={(e) => updateExperience(index, 'isCurrent', e.target.checked)} className="peer appearance-none w-3.5 h-3.5 border border-slate-300 rounded checked:bg-orange-500 checked:border-orange-500 transition-all cursor-pointer shadow-sm group-hover/check:border-orange-400" />
                            <svg className="absolute w-2.5 h-2.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" /></svg>
                          </div>
                          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 group-hover/check:text-slate-600 transition-colors uppercase tracking-wider">Presently Work Here</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* AI Suggestions Container */}
                  {visibleSuggestions.length > 0 && exp.role.trim().length > 2 && (
                    <div className="mb-4 bg-gradient-to-br from-slate-50 to-orange-50/30 border border-slate-100 rounded-xl p-3 shadow-inner">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="flex h-1.5 w-1.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500"></span>
                        </span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                          AI Smart Suggestions for {exp.role}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5 max-h-24 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
                        {visibleSuggestions.slice(0, 5).map((ach, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleAddSuggestedAchievement(index, ach)}
                            className="text-left px-2.5 py-1.5 bg-white hover:bg-orange-50/50 text-slate-600 hover:text-orange-700 text-[11px] rounded-lg border border-slate-200/60 hover:border-orange-200 shadow-sm transition-all duration-200 flex items-start gap-1.5 active:scale-[0.99]"
                          >
                            <span className="text-orange-500 font-bold shrink-0 text-xs leading-none">+</span>
                            <span className="line-clamp-2 leading-tight">{ach}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key Responsibilities & Achievements Textarea Container */}
                  <div className="space-y-2.5">
                    <label className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-0.5 block">
                      Key Responsibilities / Achievements
                    </label>
                    {exp.achievements?.map((ach, aIndex) => (
                      <div key={aIndex} className="flex gap-2 items-start">
                        <div className="flex-1 relative">
                          <div className="absolute left-3 top-3.5 w-1.5 h-1.5 rounded-full bg-orange-400/80 shadow-[0_0_8px_rgba(251,146,60,0.6)]"></div>
                          <textarea
                            rows="2"
                            placeholder="Describe your structural metrics, impact, or key projects..."
                            value={ach}
                            onChange={(e) => handleAchievementChange(index, aIndex, e.target.value)}
                            className="w-full bg-slate-50/60 border border-slate-200 text-slate-700 rounded-xl pl-7 pr-3 py-2 text-xs sm:text-sm focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none shadow-sm transition-all resize-none leading-relaxed font-medium placeholder:text-slate-400"
                          />
                        </div>
                        
                        {/* Premium, Always-Visible Micro Action Button */}
                        <button 
                          onClick={() => removeAchievement(index, aIndex)} 
                          className="text-slate-400 hover:text-red-500 hover:bg-red-50 self-start mt-1 p-2 rounded-xl border border-slate-100 hover:border-red-100 transition-all shadow-sm shrink-0" 
                          title="Remove bullet point"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    
                    <button 
                      onClick={() => addAchievement(index)} 
                      disabled={isAddAchievementDisabled}
                      className={`text-[10px] sm:text-xs font-bold flex items-center gap-1.5 ml-0.5 py-1 px-2.5 rounded-lg border transition-all w-max shadow-sm ${
                        isAddAchievementDisabled 
                          ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60' 
                          : 'text-orange-600 hover:text-orange-700 bg-orange-50/50 hover:bg-orange-50 border-orange-100/60 active:scale-[0.98]'
                      }`}
                    >
                      <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Bullet Point
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          
          <button 
            onClick={addExperience} 
            className="mt-4 w-full py-2.5 sm:py-3.5 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:text-orange-600 hover:border-orange-300 hover:bg-orange-50/30 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.995]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add Another Role
          </button>
        </div>

        {/* Fixed Bottom Action Navigation Bar */}
        <div className="border-t border-slate-100 pt-3 pb-4 flex justify-between items-center gap-3 bg-white shrink-0">
          <button 
            onClick={onPrev} 
            className="px-3.5 sm:px-5 py-2.5 border border-slate-200 text-slate-500 font-bold rounded-xl hover:border-slate-300 hover:text-slate-700 hover:bg-slate-50/80 transition-all flex items-center gap-1.5 text-xs sm:text-sm"
          >
            <svg className="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <button 
            onClick={onNext} 
            className="px-4 sm:px-7 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-[0_4px_14px_rgba(249,115,22,0.3)] hover:shadow-[0_6px_20px_rgba(249,115,22,0.4)] transition-all flex items-center gap-1.5 text-xs sm:text-sm tracking-wide active:scale-[0.98]"
          >
            {nextLabel || "Next: Education"}
          </button>
        </div>
      </div>
    </>
  );
}