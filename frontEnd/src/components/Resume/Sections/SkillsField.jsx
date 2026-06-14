import React from 'react';
import useResumeSuggestions from '../../../hooks/useResumeSuggestions';

export default function SkillsField({ data, setData, onNext, onPrev, nextLabel }) {
  const { suggestions, isSuggesting } = useResumeSuggestions(data);

  const initializeSkills = () => {
    if (!data.skills || data.skills.length === 0) {
      return [{ id: Date.now(), name: '', level: 3 }];
    }
    return data.skills.map((skill, index) => {
      if (typeof skill === 'string') return { id: Date.now() + index, name: skill, level: 3 };
      return skill;
    });
  };

  const skills = initializeSkills();

  // Immutably update the specific skill text or proficiency
  const handleUpdate = (index, field, value) => {
    const updated = skills.map((skill, i) => 
      i === index ? { ...skill, [field]: value } : skill
    );
    setData(prev => ({ ...prev, skills: updated }));
  };

  const handleAdd = () => {
    setData(prev => ({ ...prev, skills: [...skills, { id: Date.now(), name: '', level: 3 }] }));
  };

  const handleRemove = (indexToRemove) => {
    setData(prev => {
      const filtered = skills.filter((_, i) => i !== indexToRemove);
      return { 
        ...prev, 
        skills: filtered.length > 0 ? filtered : [{ id: Date.now(), name: '', level: 3 }] 
      };
    });
  };

  // FIXED: Accesses freshest state snapshot & populates open blank inputs automatically
  const handleAddSuggestedSkill = (skillText) => {
    setData(prev => {
      const currentSkills = prev.skills || [];
      
      // Normalize any string-based values to objects
      const normalized = currentSkills.map((skill, index) => {
        if (typeof skill === 'string') return { id: Date.now() + index, name: skill, level: 3 };
        return skill;
      });

      // Prevent exact duplicate skills from being created
      if (normalized.some(s => s.name.trim().toLowerCase() === skillText.toLowerCase())) {
        return prev;
      }

      // Find if there is an empty row currently available to fill
      const emptyIndex = normalized.findIndex(s => !s.name.trim());

      if (emptyIndex !== -1) {
        // Fill the existing empty input field row
        const updated = normalized.map((s, i) => 
          i === emptyIndex ? { ...s, name: skillText } : s
        );
        return { ...prev, skills: updated };
      } else {
        // No empty row found, append a pristine new row to the end
        return { 
          ...prev, 
          skills: [...normalized, { id: Date.now(), name: skillText, level: 3 }] 
        };
      }
    });
  };

  const isAddDisabled = skills.length > 0 && !skills[skills.length - 1].name.trim();

  // Safe navigation fallback if suggestions endpoint hasn't fulfilled yet
  const availableSuggestions = suggestions?.skills
    ? suggestions.skills.filter(sug => !skills.some(skill => skill.name.toLowerCase() === sug.toLowerCase()))
    : [];

  return (
    <div className="w-full max-w-3xl mx-auto font-['Outfit',_sans-serif] animate-fade-in px-3 sm:px-6 h-[80vh] min-w-[320px] flex flex-col overflow-hidden bg-white selection:bg-orange-100 selection:text-orange-800">
      
      {/* Scrollable Form Content */}
      <div className="flex-1 overflow-y-auto pr-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-4 pt-3">
        <div className="mb-4 sm:mb-6">
          <span className="inline-block text-orange-600 text-[9px] font-bold uppercase tracking-widest bg-orange-50 border border-orange-100 px-2.5 py-0.5 rounded-full mb-1.5">
            Section 4
          </span>
          <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">Core Skills</h2>
          <p className="text-[11px] sm:text-sm text-slate-400 font-medium mt-0.5">Highlight your technical and soft skills.</p>
        </div>

        {/* AI Smart Suggestions */}
        {(isSuggesting || availableSuggestions.length > 0) && (
          <div className="mb-6 bg-gradient-to-br from-slate-50 to-orange-50/30 border border-slate-100 rounded-2xl p-4 shadow-inner">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-2 w-2 relative">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
              </span>
              <h3 className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">AI Recommended Skills</h3>
              {isSuggesting && <span className="text-[9px] text-slate-400 animate-pulse ml-1 tracking-wider">Analyzing...</span>}
            </div>
            
            <div className="flex flex-wrap gap-2">
              {availableSuggestions.slice(0, 15).map((skill, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleAddSuggestedSkill(skill)}
                  className="px-2.5 py-1.5 bg-white hover:bg-orange-50/50 text-slate-600 hover:text-orange-700 text-[11px] font-bold rounded-lg border border-slate-200/60 hover:border-orange-200 shadow-sm transition-all duration-200 flex items-center gap-1.5 active:scale-[0.99]"
                >
                  <span className="text-orange-500 font-black shrink-0 text-xs leading-none">+</span>
                  {skill}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3.5 sm:space-y-4">
          {skills.map((skill, index) => (
            <div key={skill.id} className="p-3.5 sm:p-5 bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(148,163,184,0.12)] rounded-2xl relative group/card hover:border-slate-200 hover:shadow-[0_4px_24px_-2px_rgba(148,163,184,0.16)] transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              
              <div className="flex-1 w-full">
                <label className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-0.5 block transition-colors group-focus-within:text-orange-500">
                  Skill
                </label>
                <input
                  type="text"
                  placeholder="e.g., React.js, Project Management"
                  value={skill.name}
                  onChange={(e) => handleUpdate(index, 'name', e.target.value)}
                  className="w-full bg-slate-50/60 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none shadow-sm transition-all placeholder:text-slate-400 font-medium"
                />
              </div>

              <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-4 sm:mt-6">
                <div className="flex flex-col flex-1 sm:flex-none">
                  <label className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-0.5 block transition-colors">
                    Proficiency
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={skill.level}
                    onChange={(e) => handleUpdate(index, 'level', parseInt(e.target.value))}
                    className="w-full sm:w-32 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                </div>
                
                <button 
                  type="button"
                  onClick={() => handleRemove(index)} 
                  className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 sm:p-2.5 rounded-xl border border-transparent hover:border-red-100 shadow-sm transition-all duration-200 flex items-center shrink-0 mt-3 sm:mt-5"
                  title="Remove Skill"
                >
                  <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        <button 
          type="button"
          onClick={handleAdd} 
          disabled={isAddDisabled} 
          className={`mt-4 w-full py-2.5 sm:py-3.5 border-2 border-dashed rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.995] ${isAddDisabled ? 'border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed opacity-70' : 'border-slate-200 text-slate-400 hover:text-orange-600 hover:border-orange-300 hover:bg-orange-50/30'}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg> 
          {isAddDisabled ? 'Enter a skill to add another' : 'Add Another Skill'}
        </button>
      </div>

      {/* Fixed Bottom Action Navigation Bar */}
      <div className="border-t border-slate-100 pt-3 pb-4 flex justify-between items-center gap-3 bg-white shrink-0">
        <button 
          type="button"
          onClick={onPrev} 
          className="px-3.5 sm:px-5 py-2.5 border border-slate-200 text-slate-500 font-bold rounded-xl hover:border-slate-300 hover:text-slate-700 hover:bg-slate-50/80 transition-all flex items-center gap-1.5 text-xs sm:text-sm"
        >
          <svg className="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <button 
          type="button"
          onClick={onNext} 
          className="px-4 sm:px-7 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-[0_4px_14px_rgba(249,115,22,0.3)] hover:shadow-[0_6px_20px_rgba(249,115,22,0.4)] transition-all flex items-center gap-1.5 text-xs sm:text-sm tracking-wide active:scale-[0.98]"
        >
          {nextLabel || "Next: Certificates"}
        </button>
      </div>
    </div>
  );
}