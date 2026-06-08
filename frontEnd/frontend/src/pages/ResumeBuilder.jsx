import React, { useState, useEffect, useRef } from 'react';
import ResumeForm from '../components/Resume/ResumeForm';
import PaginatedPreview from '../components/Resume/PaginatedPreview';

export default function ResumeBuilder() {
  const [resumeData, setResumeData] = useState(() => {
    const savedData = localStorage.getItem('remo_premium_resume');
    return savedData ? JSON.parse(savedData) : { personalInfo: {}, experience: [], education: [], skills: [] };
  });

  const previewContainerRef = useRef(null);

  const handleExport = async () => {
    const htmlContent = previewContainerRef.current.innerHTML;
    const fullHtml = `
      <html>
        <head><script src="https://cdn.tailwindcss.com"></script></head>
        <body>${htmlContent}</body>
      </html>
    `;
    await fetch('http://localhost:8000/api/resume/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html_content: fullHtml })
    });
  };

  useEffect(() => {
    localStorage.setItem('remo_premium_resume', JSON.stringify(resumeData));
  }, [resumeData]);

  const [activeTemplate, setActiveTemplate] = useState('Professional Dark');
  const [showOverlay, setShowOverlay] = useState(false);

  // Scaling Logics
  const [scale, setScale] = useState(0.6);
  const [overlayScale, setOverlayScale] = useState(1);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width } = entry.contentRect;
        const availableWidth = width - 80; 
        setScale(Math.min(availableWidth / 794, 1));
      }
    });

    if (previewContainerRef.current) observer.observe(previewContainerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!showOverlay) return;
    const calculateOverlayScale = () => {
      const isMobile = window.innerWidth < 600;
      const availableWidth = window.innerWidth - (isMobile ? 32 : 80);
      setOverlayScale(Math.min(1, availableWidth / 794));
    };
    calculateOverlayScale();
    window.addEventListener('resize', calculateOverlayScale);
    return () => window.removeEventListener('resize', calculateOverlayScale);
  }, [showOverlay]);

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans overflow-hidden">
      
      {/* HEADER */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 z-20 shrink-0 shadow-sm">
        <div className="flex items-center gap-3 sm:gap-6">
          <a href="/" className="text-slate-800 font-extrabold text-lg sm:text-xl tracking-tight flex items-center gap-2">
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Remo<span className="text-orange-500">PDF</span>
          </a>
          <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
          <select 
            value={activeTemplate}
            onChange={(e) => setActiveTemplate(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold rounded-lg px-3 py-1.5 outline-none cursor-pointer hidden md:block"
          >
            <option value="Professional Dark">Professional Dark</option> 
            <option value="Modern Executive">Modern Executive</option>
          </select>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={() => setShowOverlay(true)} className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold lg:hidden">Preview</button>
          <button onClick={handleExport} className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-bold shadow-lg flex items-center gap-2">
            Export PDF
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        {/* LEFT PANE */}
        <div className="w-full lg:w-[55%] xl:w-[60%] bg-white border-r border-slate-200 overflow-y-auto z-10 shadow-lg custom-scrollbar">
          <ResumeForm data={resumeData} setData={setResumeData} />
        </div>

        {/* RIGHT PANE: NOW SCROLLABLE */}
        <div 
          ref={previewContainerRef}
          className="hidden lg:flex flex-1 flex-col items-center p-8 overflow-y-auto custom-scrollbar relative bg-slate-950 shadow-inner"
        >
          <div className="w-full max-w-[794px] flex justify-between items-center mb-8 z-10 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 px-5 py-3.5 rounded-2xl shadow-2xl shrink-0">
             <div className="flex items-center gap-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                <span className="text-xs font-bold text-slate-300 tracking-widest uppercase">Live A4 Canvas</span>
             </div>
             <button onClick={() => setShowOverlay(true)} className="flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-xl text-sm font-bold">
               Full Preview
             </button>
          </div>

          {/* This wrapper applies the scale but allows vertical height to flow naturally */}
          <div style={{ width: '794px', transform: `scale(${scale})`, transformOrigin: 'top center', paddingBottom: '100px' }}>
            <PaginatedPreview data={resumeData} template={activeTemplate} />
          </div>
        </div>
      </main>

      {/* OVERLAY */}
      {showOverlay && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/95 backdrop-blur-md custom-scrollbar">
          <button onClick={() => setShowOverlay(false)} className="fixed top-6 right-6 bg-white/10 text-white p-3 rounded-full z-[60]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="flex flex-col items-center py-16">
            <div style={{ width: '794px', transform: `scale(${overlayScale})`, transformOrigin: 'top center' }}>
              <PaginatedPreview data={resumeData} template={activeTemplate} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}