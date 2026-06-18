import React, { useState, useEffect, useRef } from 'react';
import useResumeSuggestions from '../../../hooks/useResumeSuggestions';

// Premium Standardized InputField 
const InputField = ({ label, placeholder, value, onChange, onBlur, type = "text", disabled }) => {
  const [currentType, setCurrentType] = useState(type === 'date' && !value ? 'text' : type);

  return (
    <div className="flex flex-col group w-full">
      <label className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1.5 ml-0.5 transition-colors ${disabled ? 'text-slate-300' : 'text-slate-400 group-focus-within:text-orange-500'}`}>
        {label}
      </label>
      <div className="relative w-full">
        <input 
          type={currentType}
          placeholder={placeholder} 
          value={value || ''} 
          onChange={onChange}
          disabled={disabled}
          onFocus={(e) => {
            if (type === 'date' && !disabled) {
              setCurrentType('date');
              setTimeout(() => {
                if (e.target && e.target.showPicker) e.target.showPicker();
              }, 10);
            }
          }}
          onBlur={(e) => {
            if (type === 'date' && !value) setCurrentType('text'); 
            if (onBlur) onBlur(e);
          }}
          className={`w-full bg-slate-50/60 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none shadow-sm transition-all placeholder:text-slate-400 font-medium accent-orange-500 ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100/50' : ''}`} 
        />
      </div>
    </div>
  );
};

export default function ExperienceField({ data, setData, onNext, onPrev, nextLabel }) {
  const { suggestions, isSuggesting } = useResumeSuggestions(data);
  const [clickedSuggestions, setClickedSuggestions] = useState([]);
  
  const [titleSuggestionsMap, setTitleSuggestionsMap] = useState({});
  const titleTimeoutRefs = useRef({});

  // Drawer State
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(null);

  // Lock background scroll when the AI suggestion drawer is open
  useEffect(() => {
    if (activeSuggestionIndex !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [activeSuggestionIndex]);

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

  // Active Drawer Data
  const activeExp = activeSuggestionIndex !== null ? experiences[activeSuggestionIndex] : null;
  const activeRoleAchievements = activeExp ? (suggestions?.achievementsMap?.[activeExp.role] || []) : [];
  const activeVisibleSuggestions = activeRoleAchievements.filter(ach => !clickedSuggestions.includes(ach));

  return (
    <>
      <div className="w-full max-w-3xl mx-auto font-['Outfit',_sans-serif] animate-fade-in px-3 sm:px-6 h-[80vh] min-w-[320px] flex flex-col overflow-hidden bg-white selection:bg-orange-100 selection:text-orange-800 relative">
        
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
              const hasSuggestions = roleAchievements.length > 0 && exp.role.trim().length > 2;
              const isAddAchievementDisabled = !exp.achievements || exp.achievements.length === 0 || exp.achievements[exp.achievements.length - 1].trim() === '';

              return (
                <div key={exp.id || index} className="p-3.5 sm:p-5 bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(148,163,184,0.12)] rounded-2xl relative group/card hover:border-slate-200 hover:shadow-[0_4px_24px_-2px_rgba(148,163,184,0.16)] transition-all duration-300">
                  
                  {/* Top Header Controls */}
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 mb-5">
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
                        <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-40 bg-white border border-slate-200 shadow-xl rounded-xl max-h-40 overflow-y-auto overscroll-contain backdrop-blur-xl bg-white/95 py-1 animate-in fade-in slide-in-from-top-2 duration-150">
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
                      <InputField 
                        label="Start Date" 
                        type="date"
                        placeholder="MM/YYYY"
                        value={exp.startDate} 
                        onChange={(e) => updateExperience(index, 'startDate', e.target.value)} 
                      />
                      
                      <div className="flex flex-col">
                        <InputField 
                          label="End Date" 
                          type={exp.isCurrent ? 'text' : 'date'}
                          placeholder={exp.isCurrent ? 'Present' : 'MM/YYYY'}
                          value={exp.isCurrent ? 'Present' : exp.endDate} 
                          onChange={(e) => !exp.isCurrent && updateExperience(index, 'endDate', e.target.value)} 
                          disabled={exp.isCurrent}
                        />
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

                  {/* Key Responsibilities & Achievements Textarea Container */}
                  <div className="space-y-2.5">
                    {/* Header Row Container with dynamic, pulsing AI Suggestions action button */}
                    <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap ml-0.5 min-h-[26px]">
                      <label className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Key Responsibilities / Achievements
                      </label>
                      {hasSuggestions && (
                         <button 
                            onClick={() => setActiveSuggestionIndex(index)}
                            className="text-[9px] sm:text-[10px] font-extrabold flex items-center gap-1 py-0.5 px-2.5 rounded-full border border-indigo-200/80 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600 hover:from-indigo-100 hover:to-purple-100 shadow-[0_2px_8px_rgba(99,102,241,0.08)] transition-all shrink-0 animate-[pulse_2.5s_infinite_ease-in-out] group/sparkle active:scale-[0.96]"
                         >
                            <svg className="w-2.5 h-2.5 text-indigo-500 group-hover/sparkle:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                            AI Suggestions
                         </button>
                      )}
                    </div>

                    {exp.achievements?.map((ach, aIndex) => (
                      <div key={aIndex} className="flex gap-2 items-start">
                        <div className="flex-1 relative">
                          <div className="absolute left-3 top-[15px] w-1.5 h-1.5 rounded-full bg-orange-400/80 shadow-[0_0_8px_rgba(251,146,60,0.6)]"></div>
                          <textarea
                            rows="1"
                            placeholder="Describe your structural metrics, impact, or key projects..."
                            value={ach}
                            onInput={(e) => {
                              e.target.style.height = '42px';
                              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                            }}
                            onChange={(e) => handleAchievementChange(index, aIndex, e.target.value)}
                            className="w-full bg-slate-50/60 border border-slate-200 text-slate-700 rounded-xl pl-7 pr-3 py-2.5 h-[42px] min-h-[42px] text-xs sm:text-sm focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none shadow-sm transition-all resize-none leading-tight font-medium placeholder:text-slate-400 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                          />
                        </div>
                        
                        <button 
                          onClick={() => removeAchievement(index, aIndex)} 
                          className="text-slate-400 hover:text-red-500 hover:bg-red-50 self-start p-2.5 rounded-xl border border-slate-100 hover:border-red-100 transition-all shadow-sm shrink-0" 
                          title="Remove bullet point"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    
                    <div className="flex flex-wrap items-center gap-2.5 pt-1">
                      <button 
                        onClick={() => addAchievement(index)} 
                        disabled={isAddAchievementDisabled}
                        className={`text-[10px] sm:text-xs font-bold flex items-center gap-1.5 ml-0.5 py-1.5 px-3 rounded-lg border transition-all shadow-sm ${
                          isAddAchievementDisabled 
                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60' 
                            : 'text-orange-600 hover:text-orange-700 bg-orange-50/50 hover:bg-orange-50 border-orange-200/60 active:scale-[0.98]'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Bullet Point
                      </button>
                    </div>
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

        {/* --- PREMIUM AI SUGGESTIONS DRAWER (LEFT SLIDER) --- */}
        
        {/* Backdrop Overlay - Bumped z-index to 998 */}
        <div 
          className={`fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[998] transition-opacity duration-300 ${
            activeSuggestionIndex !== null ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setActiveSuggestionIndex(null)}
        />

        {/* Sliding Drawer Container - Bumped z-index to 999 */}
        <div 
          className={`fixed top-0 left-0 h-full w-[88vw] max-w-[340px] bg-white/95 backdrop-blur-2xl shadow-[24px_0_40px_rgba(0,0,0,0.08)] border-r border-slate-100 z-[999] transform transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) flex flex-col ${
            activeSuggestionIndex !== null ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Drawer Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100/60 bg-gradient-to-br from-indigo-50/40 to-white/50 flex justify-between items-start shrink-0">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                  Smart Assistant
                </span>
              </div>
              <h3 className="font-black text-slate-800 text-base sm:text-lg tracking-tight leading-tight">
                Recommended Bullets
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5 line-clamp-1">
                For {activeExp?.role || 'your selected role'}
              </p>
            </div>
            
            <button 
              onClick={() => setActiveSuggestionIndex(null)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Drawer Content / List of Suggestions */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
            {activeVisibleSuggestions.length === 0 ? (
               <div className="text-center py-10 px-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                     <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <p className="text-slate-500 text-xs font-medium">All suggestions have been added for this role.</p>
               </div>
            ) : (
              activeVisibleSuggestions.map((ach, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleAddSuggestedAchievement(activeSuggestionIndex, ach)}
                  className="w-full text-left p-3 bg-white hover:bg-indigo-50/30 text-slate-600 hover:text-indigo-800 text-[11px] sm:text-xs rounded-xl border border-slate-200/80 hover:border-indigo-200 shadow-sm transition-all duration-200 flex items-start gap-2.5 active:scale-[0.98] group/btn"
                >
                  <span className="flex-shrink-0 w-5 h-5 rounded-md bg-indigo-50 text-indigo-500 flex items-center justify-center font-bold group-hover/btn:bg-indigo-500 group-hover/btn:text-white transition-colors">
                    +
                  </span>
                  <span className="leading-relaxed mt-0.5">{ach}</span>
                </button>
              ))
            )}
          </div>
          
          {/* Drawer Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
             <button 
                onClick={() => setActiveSuggestionIndex(null)}
                className="w-full py-2.5 bg-white border border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
             >
                Done
             </button>
          </div>
        </div>

      </div>
    </>
  );
}