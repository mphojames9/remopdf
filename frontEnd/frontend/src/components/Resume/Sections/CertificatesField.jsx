import React from 'react';

const InputField = ({ label, placeholder, value, onChange, type = "text" }) => (
  <div className="flex flex-col group">
    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-1">{label}</label>
    <input 
      type={type}
      placeholder={placeholder} 
      value={value || ''} 
      onChange={onChange} 
      className="w-full bg-slate-50/50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3.5 text-xs sm:text-sm focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none shadow-sm transition-all" 
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
    <div className="w-full max-w-3xl mx-auto font-sans animate-fade-in px-3 sm:px-6 max-h-[560px] h-full flex flex-col overflow-hidden bg-white">
      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-4 pt-2">
        <div className="mb-5 sm:mb-8">
          <span className="text-orange-500 text-[9px] xs:text-[10px] font-bold uppercase tracking-widest bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">Step 5 of 9</span>
          <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-3">Certifications</h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">Add relevant professional certifications or licenses.</p>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {certificates.map((cert, index) => (
            <div key={cert.id || index} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3.5 sm:p-6 md:p-8 relative group transition-all">
              <button onClick={() => handleRemove(index)} className="absolute top-3 right-3 text-slate-300 hover:text-red-500 p-1.5 rounded-xl transition-colors"><svg className="w-4 h-4 sm:w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-6 mt-4">
                <InputField label="Certificate Title" placeholder="e.g. AWS Certified Architect" value={cert.title} onChange={(e) => handleUpdate(index, 'title', e.target.value)} />
                <InputField label="Issuing Organization" placeholder="e.g. Amazon Web Services" value={cert.issuer} onChange={(e) => handleUpdate(index, 'issuer', e.target.value)} />
                <div className="md:col-span-2">
                  <InputField label="Date Issued" placeholder="Select Date" type="month" value={cert.date} onChange={(e) => handleUpdate(index, 'date', e.target.value)} />
                </div>
              </div>
              
              <div className="flex flex-col group mt-3.5 sm:mt-6">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-1">
                  Description / Skills Gained (Optional)
                </label>
                <textarea
                  rows="2"
                  placeholder="Briefly describe what this certification covered..."
                  value={cert.description || ''}
                  onChange={(e) => handleUpdate(index, 'description', e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 sm:px-4 text-xs sm:text-sm focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none shadow-sm transition-all resize-none"
                />
              </div>
            </div>
          ))}
        </div>

        <button onClick={handleAdd} disabled={isAddDisabled} className={`mt-4 w-full border-2 border-dashed rounded-2xl p-4 flex items-center justify-center gap-2 transition-all font-bold text-xs sm:text-sm ${isAddDisabled ? 'border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed' : 'border-slate-300 text-slate-500 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50/50'}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> {isAddDisabled ? 'Fill details to add another' : 'Add Certificate'}</button>
      </div>

      {/* Persistent Sticky Footer */}
      <div className="border-t border-slate-100 pt-3 pb-4 flex justify-between items-center gap-2 bg-white shrink-0">
        <button onClick={onPrev} className="px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-slate-200 text-slate-600 font-semibold rounded-xl hover:border-red-200 hover:text-red-600 hover:bg-red-50/50 transition-all flex items-center gap-1.5 text-xs sm:text-sm shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> 
          Back
        </button>
        <button onClick={onNext} className="px-5 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center gap-1.5 text-xs sm:text-sm tracking-wide">
          {nextLabel || "Next: Projects"}
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