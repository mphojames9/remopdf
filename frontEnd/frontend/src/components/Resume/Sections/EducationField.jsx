import React from 'react';

// Premium Input Field Component
const InputField = ({ label, placeholder, value, onChange }) => (
  <div className="flex flex-col group">
    <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
      {label}
    </label>
    <input 
      type="text"
      placeholder={placeholder} 
      value={value || ''} 
      onChange={onChange} 
      className="w-full bg-slate-50/50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3.5 text-xs sm:text-sm focus:bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 outline-none shadow-sm transition-all" 
    />
  </div>
);

export default function EducationField({ data, setData, onNext, onPrev, nextLabel }) {
  // Initialize with an empty block if no data exists
  const education = data.education?.length > 0 
    ? data.education 
    : [{ id: Date.now(), degree: '', school: '', startDate: '', endDate: '', isCurrent: false, description: '' }];

  const handleUpdate = (index, field, value) => {
    const updated = education.map((edu, i) => {
      if (i === index) {
        const newEdu = { ...edu, [field]: value };
        // Clear end date if they check "current student"
        if (field === 'isCurrent' && value === true) {
          newEdu.endDate = '';
        }
        return newEdu;
      }
      return edu;
    });
    setData(prev => ({ ...prev, education: updated }));
  };

  const handleAdd = () => {
    setData(prev => ({ 
      ...prev, 
      education: [
        ...(prev.education || []), 
        { id: Date.now(), degree: '', school: '', startDate: '', endDate: '', isCurrent: false, description: '' }
      ] 
    }));
  };

  const handleRemove = (indexToRemove) => {
    const updated = education.filter((_, i) => i !== indexToRemove);
    setData(prev => ({ ...prev, education: updated }));
  };

  // Validation: Disable Add button if the last entry is missing critical details
  const lastEdu = education[education.length - 1];
  const isAddDisabled = education.length > 0 && (!lastEdu?.degree?.trim() || !lastEdu?.school?.trim());

  return (
    <div className="w-full max-w-3xl mx-auto font-sans animate-fade-in pb-6 sm:pb-12">
      
      {/* Header Section */}
      <div className="mb-6 sm:mb-10">
        <span className="text-orange-500 text-[10px] sm:text-xs font-bold uppercase tracking-widest bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100">
          Step 3 of 4
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-4">
          Education Details
        </h2>
        <p className="text-slate-500 text-sm mt-1">Include your academic background, relevant coursework, and honors.</p>
      </div>

      <div className="space-y-8">
        {education.map((edu, index) => (
          <div key={edu.id || index} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 md:p-8 relative group transition-all hover:shadow-md">
            
            {/* Delete Button */}
            <button 
              onClick={() => handleRemove(index)} 
              className="absolute top-4 right-4 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all p-2 rounded-xl"
              title="Remove Education"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>

            {/* Row 1: Degree & School */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-2 mb-6">
              <InputField 
                label="Degree / Certificate" 
                placeholder="e.g. B.S. Computer Science" 
                value={edu.degree} 
                onChange={(e) => handleUpdate(index, 'degree', e.target.value)} 
              />
              <InputField 
                label="Institution" 
                placeholder="e.g. Stanford University" 
                value={edu.school} 
                onChange={(e) => handleUpdate(index, 'school', e.target.value)} 
              />
            </div>

            {/* Row 2: Premium Date Selectors */}
            <div className="bg-slate-50 p-4 rounded-xl mb-6 border border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Start Date</label>
                  <input
                    type="month"
                    value={edu.startDate || ''}
                    onChange={(e) => handleUpdate(index, 'startDate', e.target.value)}
                    className="w-full p-2.5 sm:p-3 bg-white border border-slate-200 rounded-xl focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 outline-none text-slate-700 text-xs sm:text-sm transition-all cursor-pointer shadow-sm"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1.5 px-1">
                    <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">End Date</label>
                    <label className="flex items-center gap-2 cursor-pointer group/check">
                      <div className="relative flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={edu.isCurrent || false}
                          onChange={(e) => handleUpdate(index, 'isCurrent', e.target.checked)}
                          className="peer appearance-none w-4 h-4 border-2 border-slate-300 rounded cursor-pointer checked:bg-orange-500 checked:border-orange-500 transition-all"
                        />
                        <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <span className="text-[10px] sm:text-xs font-semibold text-slate-600 group-hover/check:text-orange-600 transition-colors">I currently study here</span>
                    </label>
                  </div>
                  <input
                    type="month"
                    value={edu.endDate || ''}
                    disabled={edu.isCurrent}
                    onChange={(e) => handleUpdate(index, 'endDate', e.target.value)}
                    className={`w-full p-2.5 sm:p-3 border border-slate-200 rounded-xl outline-none text-xs sm:text-sm transition-all shadow-sm ${
                      edu.isCurrent 
                        ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400' 
                        : 'bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 text-slate-700 cursor-pointer'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Description / Honors */}
            <div className="flex flex-col group">
              <label className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                Description / Honors (Optional)
              </label>
              <textarea
                rows="3"
                placeholder="List relevant coursework, honors, GPA, or extracurricular activities..."
                value={edu.description || ''}
                onChange={(e) => handleUpdate(index, 'description', e.target.value)}
                className="w-full bg-slate-50/50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-3 sm:px-4 text-xs sm:text-sm focus:bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 outline-none shadow-sm transition-all resize-none"
              />
            </div>

          </div>
        ))}

        {/* Empty State Message */}
        {education.length === 0 && (
          <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <p className="text-slate-500 font-medium text-sm">No education listed.</p>
          </div>
        )}

        {/* Dynamic Add Button */}
        <button 
          onClick={handleAdd} 
          disabled={isAddDisabled}
          className={`w-full border-2 border-dashed rounded-2xl p-5 sm:p-6 flex flex-col items-center justify-center gap-2 transition-all font-bold text-xs sm:text-sm ${
            isAddDisabled 
              ? 'border-slate-200 text-slate-400 bg-slate-50/50 cursor-not-allowed opacity-80' 
              : 'border-slate-300 text-slate-500 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 cursor-pointer shadow-sm hover:shadow-md'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          {isAddDisabled ? 'Fill current details to add another' : 'Add Education'}
        </button>
      </div>

      {/* Navigation */}
      <div className="mt-8 sm:mt-12 border-t border-slate-100 pt-6 sm:pt-8 flex justify-between items-center">
        <button 
          onClick={onPrev} 
          className="px-5 sm:px-6 py-3 border-2 border-slate-200 text-slate-600 font-semibold rounded-xl hover:border-slate-300 hover:text-slate-800 hover:bg-slate-50 transition-all flex items-center gap-2 text-xs sm:text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>
        
        <button 
          onClick={onNext} 
          className="px-6 sm:px-8 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2 text-xs sm:text-sm"
        >
          {nextLabel || "Next: Skills"}
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