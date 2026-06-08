import React from 'react';

export default function LanguagesField({ data, setData, onNext, onPrev, nextLabel }) {
  const languages = data.languages || [];

  const handleUpdate = (index, field, value) => {
    const updated = [...languages];
    updated[index][field] = value;
    setData(prev => ({ ...prev, languages: updated }));
  };

  const handleAdd = () => {
    setData(prev => ({ ...prev, languages: [...languages, { id: Date.now(), name: '', proficiency: 'Native / Bilingual' }] }));
  };

  const handleRemove = (indexToRemove) => {
    setData(prev => ({ ...prev, languages: languages.filter((_, i) => i !== indexToRemove) }));
  };

  const isAddDisabled = languages.length > 0 && !languages[languages.length - 1].name.trim();

  return (
    <div className="w-full max-w-3xl mx-auto font-sans animate-fade-in pb-10">
      <div className="mb-10">
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Languages</h2>
        <p className="text-slate-500 text-sm font-medium">Add the languages you speak and your proficiency level.</p>
      </div>

      <div className="space-y-4 mb-8">
        {languages.map((lang, index) => (
          <div key={lang.id || index} className="group flex flex-col sm:flex-row items-center gap-3 sm:gap-4 bg-white p-2 sm:p-3 rounded-2xl border-2 border-slate-100 hover:border-orange-200 hover:shadow-lg hover:shadow-orange-100/50 transition-all duration-300">
            <div className="flex-1 w-full relative">
              <input
                type="text"
                placeholder="e.g. English, French, Mandarin..."
                value={lang.name}
                onChange={(e) => handleUpdate(index, 'name', e.target.value)}
                className="w-full bg-slate-50 border-0 text-slate-800 text-sm font-semibold rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-orange-400 focus:bg-white outline-none transition-all placeholder:font-medium placeholder:text-slate-400"
              />
            </div>
            
            <div className="w-full sm:w-48 relative shrink-0">
               <select
                  value={lang.proficiency || 'Native / Bilingual'}
                  onChange={(e) => handleUpdate(index, 'proficiency', e.target.value)}
                  className="w-full bg-slate-50 border-0 text-slate-600 text-sm font-medium rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-orange-400 focus:bg-white outline-none transition-all appearance-none cursor-pointer"
               >
                  <option value="Native / Bilingual">Native / Bilingual</option>
                  <option value="Fluent">Fluent</option>
                  <option value="Proficient">Proficient</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Basic">Basic</option>
               </select>
               <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
               </div>
            </div>

            <button
              onClick={() => handleRemove(index)}
              className="w-full sm:w-auto px-4 py-3.5 sm:p-3.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center shrink-0"
              title="Remove Language"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={handleAdd}
        disabled={isAddDisabled}
        className={`w-full border-2 border-dashed rounded-2xl p-4 flex items-center justify-center gap-2 transition-all font-bold text-sm ${isAddDisabled ? 'border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed' : 'border-slate-300 text-slate-500 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50'}`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        {isAddDisabled ? 'Enter language to add another' : 'Add Language'}
      </button>

      <div className="mt-12 border-t border-slate-100 pt-8 flex justify-between items-center">
        <button onClick={onPrev} className="px-6 py-3 border-2 border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> 
          Back
        </button>
        <button onClick={onNext} className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all flex items-center gap-2 text-sm">
          {nextLabel || "Next: Hobbies"}
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