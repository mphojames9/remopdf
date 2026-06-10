import React from 'react';

const InputField = ({ label, placeholder, value, onChange, type = "text" }) => (
  <div className="flex flex-col group">
    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-0.5">{label}</label>
    <input 
      type={type}
      placeholder={placeholder} 
      value={value || ''} 
      onChange={onChange} 
      className="w-full bg-slate-50/50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-xs focus:bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-500/5 outline-none shadow-sm transition-all" 
    />
  </div>
);

export default function ProjectsField({ data, setData, onPrev, onNext, nextLabel }) {
  const projects = data.projects?.length > 0 
    ? data.projects 
    : [{ id: Date.now(), title: '', link: '', date: '', description: '' }];

  const handleUpdate = (index, field, value) => {
    const updated = [...projects];
    updated[index][field] = value;
    setData(prev => ({ ...prev, projects: updated }));
  };

  const handleAdd = () => {
    setData(prev => ({ ...prev, projects: [...projects, { id: Date.now(), title: '', link: '', date: '', description: '' }] }));
  };

  const handleRemove = (indexToRemove) => {
    setData(prev => ({ ...prev, projects: projects.filter((_, i) => i !== indexToRemove) }));
  };

  const isAddDisabled = projects.length > 0 && (!projects[projects.length - 1].title.trim());

  return (
    <div className="w-full max-w-3xl mx-auto font-sans animate-fade-in flex flex-col h-[540px] max-h-[560px] min-h-[400px] sm:h-auto sm:max-h-none overflow-hidden bg-white rounded-2xl">
      <style>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Main Form Scrolling Area */}
      <div className="flex-1 overflow-y-auto scrollbar-none p-3 xs:p-4 sm:p-8 space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <span className="text-orange-500 text-[9px] xs:text-[10px] font-bold uppercase tracking-widest bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100">Step 6 of 9</span>
          <h2 className="text-xl xs:text-2xl font-extrabold text-slate-900 tracking-tight mt-2">Projects</h2>
          <p className="text-slate-500 text-[11px] mt-0.5 leading-tight">Highlight key personal or professional projects.</p>
        </div>

        <div className="space-y-4">
          {projects.map((proj, index) => (
            <div key={proj.id || index} className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 xs:p-4 relative group transition-all">
              <button onClick={() => handleRemove(index)} className="absolute top-3 right-3 text-slate-300 hover:text-red-500 p-1.5 rounded-lg transition-colors z-10"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                <InputField label="Project Name" placeholder="e.g. Dashboard" value={proj.title} onChange={(e) => handleUpdate(index, 'title', e.target.value)} />
                <InputField label="Project Link / GitHub" placeholder="e.g. github.com/..." value={proj.link} onChange={(e) => handleUpdate(index, 'link', e.target.value)} />
                <div className="sm:col-span-2">
                  <InputField label="Date / Duration" placeholder="e.g. Jan 2023 - Present" value={proj.date} onChange={(e) => handleUpdate(index, 'date', e.target.value)} />
                </div>
              </div>
              
              <div className="flex flex-col group mt-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 ml-0.5">
                  Description & Technologies
                </label>
                <textarea
                  rows="3"
                  placeholder="Describe the project and technologies used..."
                  value={proj.description || ''}
                  onChange={(e) => handleUpdate(index, 'description', e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 text-slate-800 rounded-xl p-2.5 text-xs focus:bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 outline-none shadow-sm transition-all resize-none"
                />
              </div>
            </div>
          ))}
        </div>

        <button onClick={handleAdd} disabled={isAddDisabled} className={`w-full border-2 border-dashed rounded-xl p-3 flex items-center justify-center gap-2 transition-all font-bold text-xs ${isAddDisabled ? 'border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed' : 'border-slate-300 text-slate-600 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50/50'}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> {isAddDisabled ? 'Fill current details to add another' : 'Add Project'}</button>
      </div>

      {/* Locked Bottom Layout Footer */}
      <div className="border-t border-slate-100 p-3 xs:p-4 bg-white flex justify-between items-center shrink-0 mt-auto shadow-inner">
        <button onClick={onPrev} className="px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:border-red-400 hover:text-red-500 transition-colors flex items-center gap-1.5 text-xs"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> Back</button>
        
        <button onClick={onNext} className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white px-5 py-2.5 rounded-xl font-extrabold shadow-md shadow-orange-500/20 transition-all duration-300 transform hover:-translate-y-0.5 flex items-center gap-1.5 text-xs tracking-wider uppercase">
          {nextLabel || "Next: Languages"}
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