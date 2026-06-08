import React, { useState } from 'react';
import PersonalInfo from './Sections/PersonalInfo';
import ExperienceField from './Sections/ExperienceField';
import EducationField from './Sections/EducationField';
import SkillsField from './Sections/SkillsField';
import CertificatesField from './Sections/CertificatesField';
import ProjectsField from './Sections/ProjectsField';
import LanguagesField from './Sections/LanguagesField';
import HobbiesField from './Sections/HobbiesField';
import ReferencesField from './Sections/ReferencesField';

const SECTIONS_LIST = [
  { id: 1, title: 'Personal Information' },
  { id: 2, title: 'Experience' },
  { id: 3, title: 'Education' },
  { id: 4, title: 'Skills' },
  { id: 5, title: 'Certifications' },
  { id: 6, title: 'Projects' },
  { id: 7, title: 'Languages' },
  { id: 8, title: 'Hobbies' },
  { id: 9, title: 'References' },
];

export default function ResumeForm({ data, setData, onExport, onPreview }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Magic Router: If they finished the whole form, any "Next" button returns them to the modal.
  const handleNext = () => {
    if (currentStep === 9 || hasCompleted) {
      setHasCompleted(true);
      setShowModal(true);
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const jumpToSection = (stepId) => {
    setCurrentStep(stepId);
    setShowModal(false); // Close modal and show the requested form step
  };

  const nextBtnLabel = hasCompleted ? "Finish Editing" : "Next";

  return (
    <div className="p-4 sm:p-8 lg:p-12 h-full flex flex-col relative">
      
      {/* PROGRESS INDICATOR */}
      <div className="flex items-center gap-2 mb-6 sm:mb-10 sticky top-0 bg-white z-10 py-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((step) => (
          <div 
            key={step} 
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${currentStep >= step ? 'bg-orange-500' : 'bg-slate-200'}`}
          ></div>
        ))}
      </div>

      {/* DYNAMIC CONTENT ROUTER */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar pb-10">
        {currentStep === 1 && <PersonalInfo data={data} setData={setData} onNext={handleNext} nextLabel={nextBtnLabel} />}
        {currentStep === 2 && <ExperienceField data={data} setData={setData} onNext={handleNext} onPrev={() => setCurrentStep(1)} nextLabel={nextBtnLabel} />}
        {currentStep === 3 && <EducationField data={data} setData={setData} onNext={handleNext} onPrev={() => setCurrentStep(2)} nextLabel={nextBtnLabel} />}
        {currentStep === 4 && <SkillsField data={data} setData={setData} onNext={handleNext} onPrev={() => setCurrentStep(3)} nextLabel={nextBtnLabel} />}
        {currentStep === 5 && <CertificatesField data={data} setData={setData} onNext={handleNext} onPrev={() => setCurrentStep(4)} nextLabel={nextBtnLabel} />}
        {currentStep === 6 && <ProjectsField data={data} setData={setData} onNext={handleNext} onPrev={() => setCurrentStep(5)} nextLabel={nextBtnLabel} />}
        {currentStep === 7 && <LanguagesField data={data} setData={setData} onNext={handleNext} onPrev={() => setCurrentStep(6)} nextLabel={nextBtnLabel} />}
        {currentStep === 8 && <HobbiesField data={data} setData={setData} onNext={handleNext} onPrev={() => setCurrentStep(7)} nextLabel={nextBtnLabel} />}
        {currentStep === 9 && <ReferencesField data={data} setData={setData} onNext={handleNext} onPrev={() => setCurrentStep(8)} nextLabel={hasCompleted ? "Finish Editing" : "Finish Resume"} />}
      </div>

      {/* =========================================================
          PREMIUM SUCCESS & EDITING MODAL
          ========================================================= */}
      {showModal && (
        <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-slate-900 p-8 text-center relative shrink-0">
              <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h2 className="text-2xl font-extrabold text-white mb-2 tracking-tight">Your Resume is Ready!</h2>
              <p className="text-slate-400 text-sm font-medium">You've unlocked all sections. What's your next move?</p>
            </div>
            
            {/* Primary Actions */}
            <div className="p-6 flex flex-col sm:flex-row gap-4 shrink-0 border-b border-slate-100">
               <button onClick={onPreview} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 py-3.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                 <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                 Review Full A4
               </button>
               <button onClick={onExport} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-orange-500/30">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                 Download PDF
               </button>
            </div>

            {/* Quick Section Jump List */}
            <div className="p-6 overflow-y-auto custom-scrollbar bg-slate-50">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-4">Edit a Specific Section</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SECTIONS_LIST.map(sec => (
                  <button 
                    key={sec.id}
                    onClick={() => jumpToSection(sec.id)}
                    className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-slate-200 hover:border-orange-400 hover:bg-orange-50 hover:shadow-md text-left transition-all group"
                  >
                    <span className="text-sm font-bold text-slate-700 group-hover:text-orange-600">{sec.title}</span>
                    <svg className="w-4 h-4 text-slate-300 group-hover:text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}