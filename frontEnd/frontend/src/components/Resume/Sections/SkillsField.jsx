import React from 'react';

export default function SkillsField({ data, setData, onNext, onPrev, nextLabel }) {
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

  const handleUpdate = (index, field, value) => {
    const updated = [...skills];
    updated[index][field] = value;
    setData(prev => ({ ...prev, skills: updated }));
  };

  const handleAdd = () => {
    setData(prev => ({ ...prev, skills: [...skills, { id: Date.now(), name: '', level: 3 }] }));
  };

  const handleRemove = (indexToRemove) => {
    setData(prev => ({ ...prev, skills: skills.filter((_, i) => i !== indexToRemove) }));
  };

  const isAddDisabled = skills.length > 0 && !skills[skills.length - 1].name.trim();

  return (
    <div className="w-full max-w-3xl mx-auto font-sans animate-fade-in flex flex-col h-[540px] max-h-[560px] min-h-[400px] sm:h-auto sm:max-h-none overflow-hidden bg-white rounded-2xl">
      <style>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Scrollable Core Body */}
      <div className="flex-1 overflow-y-auto scrollbar-none p-3 xs:p-4 sm:p-8 space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <span className="text-orange-500 text-[9px] xs:text-[10px] font-bold uppercase tracking-widest bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">Step 4 of 9</span>
          <h2 className="text-xl xs:text-2xl font-extrabold text-slate-900 tracking-tight mt-2">Core Skills</h2>
          <p className="text-slate-500 text-[11px] mt-0.5 leading-tight">List your technical skills and rate your proficiency.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {skills.map((skill, index) => (
            <div key={skill.id || index} className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 relative group transition-all">
              
              <button onClick={() => handleRemove(index)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 p-1 rounded-lg transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-0.5">Skill Name</label>
              <input 
                type="text" 
                placeholder="e.g. React.js" 
                value={skill.name} 
                onChange={(e) => handleUpdate(index, 'name', e.target.value)} 
                className="w-full bg-slate-50/50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 outline-none shadow-sm mb-3" 
              />

              <div className="flex items-center justify-between px-0.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Proficiency</label>
                <div className="flex gap-1.5 cursor-pointer">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <div 
                      key={lvl} 
                      onClick={() => handleUpdate(index, 'level', lvl)}
                      className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${skill.level >= lvl ? 'bg-orange-500 shadow-sm shadow-orange-500/40' : 'bg-slate-200 hover:bg-slate-300'}`}
                    ></div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={handleAdd} 
          disabled={isAddDisabled}
          className={`w-full border-2 border-dashed rounded-xl p-3 flex items-center justify-center gap-2 transition-all font-bold text-xs ${isAddDisabled ? 'border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed' : 'border-slate-300 text-slate-600 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50/50'}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          {isAddDisabled ? 'Enter skill to add another' : 'Add Skill'}
        </button>
      </div>

      {/* Fixed Bottom Layout Buttons */}
      <div className="border-t border-slate-100 p-3 xs:p-4 bg-white flex justify-between items-center shrink-0 mt-auto shadow-inner">
        <button onClick={onPrev} className="px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:border-red-400 hover:text-red-500 transition-colors flex items-center gap-1.5 text-xs">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> 
          Back
        </button>
        <button 
          onClick={onNext} 
          className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white px-5 py-2.5 rounded-xl font-extrabold shadow-md shadow-orange-500/20 transition-all duration-300 transform hover:-translate-y-0.5 flex items-center gap-1.5 text-xs tracking-wider uppercase"
        >
          {nextLabel || "Next: Certificates"}
          {nextLabel?.includes('Finish') ? (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
          )}
        </button>
      </div>
    </div>
  );
}