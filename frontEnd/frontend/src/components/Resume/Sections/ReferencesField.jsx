import React from 'react';

export default function ReferencesField({ data, setData, onNext, onPrev, nextLabel }) {
  const references = data.references || [];

  const handleUpdate = (index, field, value) => {
    const updated = [...references];
    updated[index][field] = value;
    setData(prev => ({ ...prev, references: updated }));
  };

  const handleAdd = () => {
    setData(prev => ({
      ...prev,
      references: [...references, { id: Date.now(), name: '', role: '', company: '', contact: '' }]
    }));
  };

  const handleRemove = (indexToRemove) => {
    setData(prev => ({ ...prev, references: references.filter((_, i) => i !== indexToRemove) }));
  };

  const isAddDisabled = references.length > 0 && !references[references.length - 1].name.trim();

  return (
    <div className="w-full max-w-3xl mx-auto font-sans animate-fade-in flex flex-col h-[540px] max-h-[560px] min-h-[400px] sm:h-auto sm:max-h-none overflow-hidden bg-white rounded-2xl">
      <style>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Main Scrollable Body */}
      <div className="flex-1 overflow-y-auto scrollbar-none p-3 xs:p-4 sm:p-8 space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <span className="text-orange-500 text-[9px] xs:text-[10px] font-bold uppercase tracking-widest bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">Step 9 of 9</span>
          <h2 className="text-xl xs:text-2xl font-extrabold text-slate-900 tracking-tight mt-2"> Professional References</h2>
          <p className="text-slate-500 text-[11px] mt-0.5 leading-tight">Add professional contacts who can vouch for your work performance and character.</p>
        </div>

        <div className="space-y-4">
          {references.map((ref, index) => (
            <div key={ref.id || index} className="group relative bg-white p-3 xs:p-4 rounded-xl border border-slate-200 hover:border-orange-300 shadow-sm transition-all duration-200">
              
              <button
                onClick={() => handleRemove(index)}
                className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors z-10"
                title="Remove Reference"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Reference Name</label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={ref.name}
                    onChange={(e) => handleUpdate(index, 'name', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-orange-400 focus:bg-white outline-none transition-all"
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Job Title / Role</label>
                  <input
                    type="text"
                    placeholder="e.g. Engineering Manager"
                    value={ref.role}
                    onChange={(e) => handleUpdate(index, 'role', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-orange-400 focus:bg-white outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Company</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Corp"
                    value={ref.company}
                    onChange={(e) => handleUpdate(index, 'company', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-orange-400 focus:bg-white outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Contact Information</label>
                  <input
                    type="text"
                    placeholder="e.g. email@example.com"
                    value={ref.contact}
                    onChange={(e) => handleUpdate(index, 'contact', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-orange-400 focus:bg-white outline-none transition-all"
                  />
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
          {isAddDisabled ? 'Complete current reference to add another' : 'Add Reference'}
        </button>
      </div>

      {/* Pinned Bottom Action Buttons */}
      <div className="border-t border-slate-100 p-3 xs:p-4 bg-white flex justify-between items-center shrink-0 mt-auto shadow-inner">
        <button onClick={onPrev} className="px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:border-red-400 hover:text-red-500 transition-colors flex items-center gap-1.5 text-xs">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> 
          Back
        </button>
        <button 
          onClick={onNext} 
          className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white px-5 py-2.5 rounded-xl font-extrabold shadow-md shadow-orange-500/20 transition-all duration-300 transform hover:-translate-y-0.5 flex items-center gap-1.5 text-xs tracking-wider uppercase"
        >
          {nextLabel || "Done"} 
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </button>
      </div>
    </div>
  );
}