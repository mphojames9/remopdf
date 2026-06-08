import React from 'react';

export default function SkillsField({ data, setData, onNext, onPrev, nextLabel }) {
  // Convert legacy string arrays to object format, or initialize empty
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
    <div className="w-full max-w-3xl mx-auto font-sans animate-fade-in pb-6 sm:pb-12">
      <div className="mb-6 sm:mb-10">
        <span className="text-orange-500 text-[10px] sm:text-xs font-bold uppercase tracking-widest bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100">Step 4 of 5</span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-4">Core Skills</h2>
        <p className="text-slate-500 text-sm mt-1">List your technical skills and rate your proficiency.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8">
        {skills.map((skill, index) => (
          <div key={skill.id || index} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 relative group hover:shadow-md transition-all">
            
            <button onClick={() => handleRemove(index)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 p-1.5 rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Skill Name</label>
            <input 
              type="text" 
              placeholder="e.g. React.js" 
              value={skill.name} 
              onChange={(e) => handleUpdate(index, 'name', e.target.value)} 
              className="w-full bg-slate-50/50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-sm focus:bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 outline-none shadow-sm mb-4" 
            />

            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Proficiency</label>
              <div className="flex gap-1.5 cursor-pointer">
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <div 
                    key={lvl} 
                    onClick={() => handleUpdate(index, 'level', lvl)}
                    className={`w-4 h-4 rounded-full transition-all duration-200 ${skill.level >= lvl ? 'bg-orange-500 shadow-sm shadow-orange-500/40' : 'bg-slate-200 hover:bg-slate-300'}`}
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
        className={`w-full border-2 border-dashed rounded-2xl p-4 flex items-center justify-center gap-2 transition-all font-bold text-sm ${isAddDisabled ? 'border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed' : 'border-slate-300 text-slate-500 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50'}`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        {isAddDisabled ? 'Enter skill to add another' : 'Add Skill'}
      </button>

      <div className="mt-12 border-t border-slate-100 pt-8 flex justify-between items-center">
        <button onClick={onPrev} className="px-6 py-3 border-2 border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> 
          Back
        </button>
       <button onClick={onNext} className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2 text-sm">
          {nextLabel || "Next: Certificates"}
          {nextLabel?.includes('Finish') ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
          )}
        </button>
      </div>
    </div>
  );
}