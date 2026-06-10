import React from 'react';

export default function HobbiesField({ data, setData, onNext, onPrev, nextLabel }) {
  const hobbies = data.hobbies || [];

  const handleUpdate = (index, value) => {
    const updated = [...hobbies];
    updated[index] = value;
    setData(prev => ({ ...prev, hobbies: updated }));
  };

  const handleAdd = () => {
    setData(prev => ({ ...prev, hobbies: [...hobbies, ''] }));
  };

  const handleRemove = (indexToRemove) => {
    setData(prev => ({ ...prev, hobbies: hobbies.filter((_, i) => i !== indexToRemove) }));
  };

  const isAddDisabled = hobbies.length > 0 && !hobbies[hobbies.length - 1].trim();

  return (
    <div className="w-full max-w-3xl mx-auto font-sans animate-fade-in px-3 sm:px-6 max-h-[560px] h-full flex flex-col overflow-hidden bg-white">
      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-4 pt-2">
        <div className="mb-5 sm:mb-8">
          <span className="text-orange-500 text-[9px] xs:text-[10px] font-bold uppercase tracking-widest bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">Step 8 of 9</span>
          <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-1.5">Hobbies & Interests</h2>
          <p className="text-slate-500 text-xs sm:text-sm font-medium">Add personal interests or activities that showcase your personality outside of work.</p>
        </div>

        <div className="space-y-3 mb-6">
          {hobbies.map((hobby, index) => (
            <div key={index} className="group flex items-center gap-3 bg-white p-1.5 sm:p-2 rounded-2xl border-2 border-slate-100 hover:border-orange-200 hover:shadow-lg hover:shadow-orange-100/30 transition-all duration-300">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="e.g. Open Source, Chess, Photography..."
                  value={hobby}
                  onChange={(e) => handleUpdate(index, e.target.value)}
                  className="w-full bg-slate-50 border-0 text-slate-800 text-xs sm:text-sm font-semibold rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none transition-all placeholder:font-medium placeholder:text-slate-400"
                />
              </div>

              <button
                onClick={() => handleRemove(index)}
                className="px-3 py-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center shrink-0"
                title="Remove Hobby"
              >
                <svg className="w-4 h-4 sm:w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={handleAdd}
          disabled={isAddDisabled}
          className={`w-full border-2 border-dashed rounded-2xl p-3.5 flex items-center justify-center gap-2 transition-all font-bold text-xs sm:text-sm ${isAddDisabled ? 'border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed' : 'border-slate-300 text-slate-500 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50/50'}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          {isAddDisabled ? 'Enter hobby to add another' : 'Add Hobby'}
        </button>
      </div>

      {/* Persistent Sticky Footer */}
      <div className="border-t border-slate-100 pt-3 pb-4 flex justify-between items-center gap-2 bg-white shrink-0">
        <button onClick={onPrev} className="px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-slate-200 text-slate-600 font-semibold rounded-xl hover:border-red-200 hover:text-red-600 hover:bg-red-50/50 transition-all flex items-center gap-1.5 text-xs sm:text-sm shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> 
          Back
        </button>
        <button onClick={onNext} className="px-5 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center gap-1.5 text-xs sm:text-sm tracking-wide">
          {nextLabel || "Next: References"}
          {nextLabel?.includes('Finish') ? (
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          ) : (
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
          )}
        </button>
      </div>
    </div>
  );
}