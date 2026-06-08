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
    <div className="w-full max-w-3xl mx-auto font-sans animate-fade-in pb-10">
      <div className="mb-10">
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Professional References</h2>
        <p className="text-slate-500 text-sm font-medium">Add professional contacts who can vouch for your work performance and character.</p>
      </div>

      <div className="space-y-6 mb-8">
        {references.map((ref, index) => (
          <div key={ref.id || index} className="group relative bg-white p-5 rounded-2xl border-2 border-slate-100 hover:border-orange-200 hover:shadow-lg hover:shadow-orange-100/50 transition-all duration-300">
            
            <button
              onClick={() => handleRemove(index)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
              title="Remove Reference"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase mb-1.5 block">Reference Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={ref.name}
                  onChange={(e) => handleUpdate(index, 'name', e.target.value)}
                  className="w-full bg-slate-50 border-0 text-slate-800 text-sm font-semibold rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-400 focus:bg-white outline-none transition-all"
                />
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase mb-1.5 block">Job Title / Role</label>
                <input
                  type="text"
                  placeholder="e.g. Engineering Manager"
                  value={ref.role}
                  onChange={(e) => handleUpdate(index, 'role', e.target.value)}
                  className="w-full bg-slate-50 border-0 text-slate-800 text-sm font-semibold rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-400 focus:bg-white outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase mb-1.5 block">Company</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Corp"
                  value={ref.company}
                  onChange={(e) => handleUpdate(index, 'company', e.target.value)}
                  className="w-full bg-slate-50 border-0 text-slate-800 text-sm font-semibold rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-400 focus:bg-white outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase mb-1.5 block">Contact Information</label>
                <input
                  type="text"
                  placeholder="e.g. email@example.com or +27..."
                  value={ref.contact}
                  onChange={(e) => handleUpdate(index, 'contact', e.target.value)}
                  className="w-full bg-slate-50 border-0 text-slate-800 text-sm font-semibold rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-400 focus:bg-white outline-none transition-all"
                />
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
        {isAddDisabled ? 'Complete the current reference to add another' : 'Add Reference'}
      </button>

      <div className="mt-12 border-t border-slate-100 pt-8 flex justify-between items-center">
        <button onClick={onPrev} className="px-6 py-3 border-2 border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> 
          Back
        </button>
        <button onClick={onNext} className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all flex items-center gap-2 text-sm">
          {nextLabel || "Finish Resume"} 
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </button>
      </div>
    </div>
  );
}