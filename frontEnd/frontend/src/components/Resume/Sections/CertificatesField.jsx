import React from 'react';

const InputField = ({ label, placeholder, value, onChange, type = "text" }) => (
  <div className="flex flex-col group">
    <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">{label}</label>
    <input 
      type={type}
      placeholder={placeholder} 
      value={value || ''} 
      onChange={onChange} 
      className="w-full bg-slate-50/50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3.5 text-xs sm:text-sm focus:bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 outline-none shadow-sm transition-all" 
    />
  </div>
);

export default function CertificatesField({ data, setData, onPrev, onNext, nextLabel }) {
  const certificates = data.certificates?.length > 0 
    ? data.certificates 
    : [{ id: Date.now(), title: '', issuer: '', date: '', description: '' }];

  const handleUpdate = (index, field, value) => {
    const updated = [...certificates];
    updated[index][field] = value;
    setData(prev => ({ ...prev, certificates: updated }));
  };

  const handleAdd = () => {
    setData(prev => ({ ...prev, certificates: [...certificates, { id: Date.now(), title: '', issuer: '', date: '', description: '' }] }));
  };

  const handleRemove = (indexToRemove) => {
    setData(prev => ({ ...prev, certificates: certificates.filter((_, i) => i !== indexToRemove) }));
  };

  const isAddDisabled = certificates.length > 0 && (!certificates[certificates.length - 1].title.trim());

  return (
    <div className="w-full max-w-3xl mx-auto font-sans animate-fade-in pb-6 sm:pb-12">
      <div className="mb-6 sm:mb-10">
        <span className="text-orange-500 text-[10px] sm:text-xs font-bold uppercase tracking-widest bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100">Step 5 of 6</span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-4">Certifications</h2>
        <p className="text-slate-500 text-sm mt-1">Add relevant professional certifications or licenses.</p>
      </div>

      <div className="space-y-6">
        {certificates.map((cert, index) => (
          <div key={cert.id || index} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 md:p-8 relative group transition-all">
            <button onClick={() => handleRemove(index)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 p-2 rounded-xl transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-2">
              <InputField label="Certificate Title" placeholder="e.g. AWS Certified Solutions Architect" value={cert.title} onChange={(e) => handleUpdate(index, 'title', e.target.value)} />
              <InputField label="Issuing Organization" placeholder="e.g. Amazon Web Services" value={cert.issuer} onChange={(e) => handleUpdate(index, 'issuer', e.target.value)} />
              <div className="md:col-span-2">
                <InputField label="Date Issued" placeholder="Select Date" type="month" value={cert.date} onChange={(e) => handleUpdate(index, 'date', e.target.value)} />
              </div>
            </div>
            
            {/* NEW: Description Field */}
            <div className="flex flex-col group mt-4 sm:mt-6">
              <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                Description / Skills Gained (Optional)
              </label>
              <textarea
                rows="3"
                placeholder="Briefly describe what this certification covered..."
                value={cert.description || ''}
                onChange={(e) => handleUpdate(index, 'description', e.target.value)}
                className="w-full bg-slate-50/50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-3 sm:px-4 text-xs sm:text-sm focus:bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 outline-none shadow-sm transition-all resize-none"
              />
            </div>
          </div>
        ))}
      </div>

      <button onClick={handleAdd} disabled={isAddDisabled} className={`mt-6 w-full border-2 border-dashed rounded-2xl p-5 flex items-center justify-center gap-2 transition-all font-bold text-sm ${isAddDisabled ? 'border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed' : 'border-slate-300 text-slate-500 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50'}`}><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> {isAddDisabled ? 'Fill current details to add another' : 'Add Certificate'}</button>

      <div className="mt-12 border-t border-slate-100 pt-8 flex justify-between items-center">
        <button onClick={onPrev} className="px-6 py-3 border-2 border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> 
          Back
        </button>
     <button 
          onClick={onNext} 
          className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2 text-sm"
        >
          {nextLabel || "Next: Projects"}
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