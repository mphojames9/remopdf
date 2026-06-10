import React, { useState, useEffect, useRef } from 'react';
import ResumeForm from '../components/Resume/ResumeForm';
import PaginatedPreview from '../components/Resume/PaginatedPreview';
import ResumePreview from '../components/Resume/ResumePreview';

// High-fidelity professional dummy data utilized exclusively for live layout thumbnail previews
const demoResumeData = {
  personalInfo: {
    fullName: "Alexander Reed",
    jobTitle: "Senior Cloud & DevOps Architect",
    email: "alexander.reed@example.com",
    phone: "+1 (555) 019-8273",
    location: "Seattle, WA",
    linkedin: "linkedin.com/in/alexreed",
    website: "alexreed.dev",
    summary: "Visionary Cloud Architect with 10+ years of enterprise engineering experience designing fault-tolerant cloud infrastructures. Proven track record of leading cross-functional engineering units to migrate complex monolith topologies to distributed AWS microservices, reducing infrastructure overhead by 35% while maintaining 99.99% system uptime availability."
  },
  experience: [
    {
      role: "Principal Infrastructure Engineer",
      company: "Nexus Digital Systems",
      startDate: "Jan 2021",
      endDate: "Present",
      isCurrent: true,
      achievements: [
        "Architected multi-region active-active cloud mesh systems utilizing Terraform Enterprise IaC profiles.",
        "Spearheaded containerization strategy using Kubernetes, accelerating rapid feature deployment workflows by 60%."
      ]
    },
    {
      role: "Senior Systems Specialist",
      company: "DataStream Analytics",
      startDate: "Mar 2016",
      endDate: "Dec 2020",
      isCurrent: false,
      achievements: [
        "Automated continuous integration structures reducing software regression cycles from days to minutes.",
        "Designed centralized high-throughput telemetry logging layers, shrinking incident recovery time vectors by 45%."
      ]
    }
  ],
  education: [
    {
      degree: "M.S. in Distributed Computer Science",
      school: "University of Washington",
      startDate: "2014",
      endDate: "2016",
      isCurrent: false
    }
  ],
  skills: [
    "AWS & Azure Architecture",
    "Kubernetes & Docker Systems",
    "Terraform & CloudFormation",
    "CI/CD Orchestration Pipelines",
    "Python, GoLang, Node.js",
    "Zero-Trust Cloud Compliance"
  ],
  certificates: [
    { title: "AWS Certified Solutions Architect – Professional", issuer: "Amazon Web Services", date: "2024" },
    { title: "Certified Kubernetes Administrator (CKA)", issuer: "CNCF", date: "2023" }
  ],
  languages: [
    { name: "English", proficiency: "Native" },
    { name: "Spanish", proficiency: "Professional Working" }
  ]
};


// ============================================================================
// DYNAMIC THUMBNAIL COMPONENT (Auto-Scales to 100% Container Fit)
// ============================================================================
const TemplateThumbnail = ({ tmpl, isActive, onSelect }) => {
  const containerRef = useRef(null);
  const [thumbScale, setThumbScale] = useState(0.25); // Safe initial baseline

  useEffect(() => {
    if (!containerRef.current) return;

    // Observer continuously calculates the perfect scale fraction to fit 794px inside the current fluid wrapper
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setThumbScale(entry.contentRect.width / 794);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`group relative flex flex-col bg-white border-2 ${isActive ? 'border-orange-500 shadow-md ring-4 ring-orange-500/5' : 'border-slate-200/70 hover:border-slate-400'} rounded-2xl p-4 transition-all duration-300`}>

      {/* 100% Fit Responsive Container */}
      <div
        ref={containerRef}
        className="w-full aspect-[1/1.4142] rounded-xl overflow-hidden relative shadow-inner bg-slate-50"
      >
        <div
          className="absolute top-0 left-0 origin-top-left pointer-events-none select-none bg-white"
          style={{
            width: '794px',
            height: '1122px',
            transform: `scale(${thumbScale})`,
          }}
        >
          {/* Note: Ensure demoResumeData is defined above this component in your file */}
          <ResumePreview data={demoResumeData} template={tmpl.id} />
        </div>

        {/* Interaction Mask Layer on Hover */}
        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center p-4 z-20">
          <button
            onClick={() => onSelect(tmpl.id)}
            className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold uppercase tracking-widest py-3 px-5 rounded-xl shadow-xl transition-transform transform translate-y-2 group-hover:translate-y-0 duration-200"
          >
            Activate Layout
          </button>
        </div>

        {/* Current Selection Status Badge */}
        {isActive && (
          <div className="absolute top-2.5 right-2.5 bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md shadow-md z-20">
            Active Layout
          </div>
        )}
      </div>

      {/* Metadata Presentation */}
      <div className="mt-4 flex flex-col flex-1">
        <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">{tmpl.name}</h4>
        <p className="text-[10px] text-orange-500 font-mono mt-0.5 uppercase tracking-wider font-bold">{tmpl.vibe}</p>
        <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed flex-1">{tmpl.description}</p>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN BUILDER ENGINE
// ============================================================================
export default function ResumeBuilder() {

  // Add these to your existing useState declarations at the top of ResumeBuilder
const [isExporting, setIsExporting] = useState(false);
const [toast, setToast] = useState({ show: false, type: '', message: '' });

// Helper function to trigger toasts
const showToast = (type, message) => {
  setToast({ show: true, type, message });
  setTimeout(() => setToast({ show: false, type: '', message: '' }), 4000);
};

  const [resumeData, setResumeData] = useState(() => {
    try {
      const savedData = localStorage.getItem('remo_premium_resume');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed && typeof parsed === 'object') {
          return {
            personalInfo: parsed.personalInfo || {},
            experience: parsed.experience || [],
            education: parsed.education || [],
            skills: parsed.skills || [],
            certificates: parsed.certificates || [],
            languages: parsed.languages || [],
            hobbies: parsed.hobbies || [],
            references: parsed.references || [],
            ...parsed
          };
        }
      }
    } catch (e) {
      console.warn("Corrupted data state trapped in local storage. Flushing and applying safe initialization structures.", e);
    }
    return {
      personalInfo: {}, experience: [], education: [], skills: [],
      certificates: [], languages: [], hobbies: [], references: []
    };
  });

const previewContainerRef = useRef(null);
  
  // 1. Initialize from local storage first, fallback to default
  const [activeTemplate, setActiveTemplate] = useState(() => {
    return localStorage.getItem('remo_premium_template') || 'Professional Dark';
  });
  
  const [showOverlay, setShowOverlay] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // 2. Instantly save to local storage whenever the template changes
  useEffect(() => {
    localStorage.setItem('remo_premium_template', activeTemplate);
  }, [activeTemplate]);

  const [scale, setScale] = useState(0.6);
  const [overlayScale, setOverlayScale] = useState(1);

const handleExport = async () => {
  setIsExporting(true);
  try {
    // 1. Target the NEW paginated container from PaginatedPreview.jsx
    const exportContainer = document.getElementById('premium-export-container');
    
    if (!exportContainer) {
      console.error("Could not find the paginated container to export!");
      return;
    }

    // 2. Extract the HTML containing your perfectly sliced A4 pages
    const rawHtml = exportContainer.innerHTML;

    // 3. Wrap it in a clean document with explicit page breaks
// 3. Wrap it in a clean document with explicit physical page dimensions
    const fullHtmlPayload = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @page { margin: 0; size: A4; }
          html, body { 
            margin: 0 !important; 
            padding: 0 !important; 
            background: white !important; 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
          }
          
          /* Force each chunk to act as a physical printed page */
          .export-page {
            box-shadow: none !important;
            border: none !important;
            outline: none !important;
            margin: 0 !important;
            border-radius: 0 !important; /* Removes any fractional corner rounding */
            page-break-after: always;
            
            /* THE 1PX GAP FIX: Override the inline 1122px with true physical A4 dimensions */
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            box-sizing: border-box !important;
          }
          
          /* Prevent a blank white page at the very end of the PDF */
          .export-page:last-child {
            page-break-after: auto;
          }
        </style>
      </head>
      <body>
        ${rawHtml}
      </body>
      </html>
    `;

    // 4. Send this cleanly packaged HTML string to your Synchronous backend
    const response = await fetch("http://localhost:8000/api/resume/download", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ html_content: fullHtmlPayload }),
    });

    if (!response.ok) {
      throw new Error("Backend failed to generate PDF");
    }

    // 5. Handle the binary stream and trigger the file download in the browser
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Mpho_James_Matli_Resume.pdf";
    document.body.appendChild(link);
    link.click();
    
    // 6. Clean up the URL object to free up memory
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);

  
  showToast('success', 'Resume generated successfully!');
  } catch (error) {
    console.error("Export error:", error);
    showToast('error', 'Failed to generate PDF. Please try again.');
  } finally {
    // Turn off the loading overlay whether it succeeds or fails
    setIsExporting(false); 
  }
};

  useEffect(() => {
    localStorage.setItem('remo_premium_resume', JSON.stringify(resumeData));
  }, [resumeData]);

  // Main canvas scaler
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

  // Fullscreen overlay scaler
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

  const templates = [
    {
      id: 'Professional Dark',
      name: 'Professional Dark',
      vibe: 'Authoritative / Asymmetric Executive',
      description: 'Features a solid corporate slate command column combined with an accent rule divider line and clean geometric grids.'
    },
    {
      id: 'Modern Executive',
      name: 'Modern Executive',
      vibe: 'Symmetric / Tech Leadership',
      description: 'Bold integrated top-header layout utilizing strict multi-stage cross-functional content segments and crisp modular grids.'
    },
    {
      id: 'Architect Resume',
      name: 'Architect Resume',
      vibe: 'Minimalist Luxury / Editorial Serif',
      description: 'An elegant layout using high-fidelity classical aesthetics, tailored borders, and refined text-tracking properties.'
    }
  ];

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans overflow-hidden">

      {/* HEADER */}
      <header class="h-16 lg:h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 flex items-center justify-between px-6 sm:px-8 z-40 shrink-0 sticky top-0 transition-all duration-300">

        <div class="flex items-center gap-4 sm:gap-8">
          <a href="/" class="text-slate-950 font-black text-xl sm:text-2xl tracking-tighter flex items-center gap-2.5 group">
            <div class="bg-gradient-to-tr from-orange-600 to-orange-400 text-white p-1.5 rounded-lg shadow-md shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-all duration-300">
              <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
              </svg>
            </div>
            Remo<span class="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-400">PDF</span>
          </a>

          <div class="h-8 w-px bg-slate-200/80 hidden md:block"></div>

          {/* Elevated Layout Trigger */}
          <button
            onClick={() => setShowTemplateModal(true)}
            className="group flex items-center gap-2.5 bg-white hover:bg-slate-50 ring-1 ring-slate-200 hover:ring-orange-200 text-slate-800 text-xs font-bold rounded-full px-5 py-2.5 shadow-sm transition-all duration-300 outline-none hidden md:flex"
          >
            <span className="text-slate-400 group-hover:text-slate-500 transition-colors"></span>
            <span className="text-orange-500 font-extrabold tracking-wide">{activeTemplate}</span>
            <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-orange-500 transition-colors ml-1 transform group-hover:translate-y-px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
        </div>

        <div class="flex items-center gap-3 sm:gap-4">
          <button
            onClick={handleExport}
            className="bg-gradient-to-b from-slate-800 to-slate-950 hover:from-slate-700 hover:to-slate-900 text-white px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold shadow-lg shadow-slate-900/20 ring-1 ring-slate-950/50 flex items-center gap-2 transition-all duration-300 transform hover:-translate-y-0.5"
          >
            Export Artifact
          </button>
        </div>

      </header>

      <main className="flex-1 flex overflow-hidden relative">
        {/* LEFT PANE */}
        <div className="w-full lg:w-[55%] xl:w-[60%] bg-white border-r border-slate-200 overflow-y-auto z-10 shadow-lg custom-scrollbar">
          <ResumeForm data={resumeData} setData={setResumeData} />
        </div>

        {/* RIGHT PANE */}
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

          <div style={{ width: '794px', transform: `scale(${scale})`, transformOrigin: 'top center', paddingBottom: '100px' }}>
            <PaginatedPreview data={resumeData} template={activeTemplate} />
          </div>
        </div>
      </main>

      {/* FULL SCREEN PREVIEW OVERLAY */}
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

      {/* PREMIUM VISUAL TEMPLATE SELECTOR MODAL */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 md:p-10 transition-all duration-300">
          <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col transform scale-100 transition-all">

            <div className="p-6 sm:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">Select Layout Architecture</h3>
                <p className="text-xs text-slate-500 mt-1">Switch core structures instantaneously. Your typed content stays safely compiled inside the builder forms.</p>
              </div>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 p-2.5 rounded-full transition-all outline-none"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 sm:p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/20 custom-scrollbar flex-1">
              {templates.map((tmpl) => (
                <TemplateThumbnail
                  key={tmpl.id}
                  tmpl={tmpl}
                  isActive={activeTemplate === tmpl.id}
                  onSelect={(id) => {
                    setActiveTemplate(id);
                    setShowTemplateModal(false);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
      <button
  onClick={() => setShowOverlay(true)}
  className="fixed bottom-3 right-6 z-[45] lg:hidden flex items-center gap-2.5 bg-gradient-to-tr from-emerald-600 to-emerald-400 hover:from-emerald-500 hover:to-emerald-400 text-white px-6 py-3.5 rounded-full text-sm font-extrabold tracking-wide shadow-xl shadow-emerald-500/30 ring-1 ring-white/20 transition-all duration-300 transform hover:-translate-y-1 focus:outline-none"
>
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
</button>

{/* ========================================================
        PREMIUM LOADING OVERLAY
        ========================================================
      */}
      {isExporting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white px-8 py-6 rounded-2xl shadow-2xl ring-1 ring-slate-900/5 flex flex-col items-center gap-4 transform animate-in fade-in zoom-in-95 duration-200">
            {/* Spinning Gradient Ring */}
            <div className="relative flex items-center justify-center w-12 h-12">
              <div className="absolute inset-0 rounded-full border-[3px] border-slate-100"></div>
              <div className="absolute inset-0 rounded-full border-[3px] border-emerald-500 border-t-transparent animate-spin"></div>
            </div>
            
            <div className="text-center">
              <h3 className="text-sm font-bold text-slate-800 tracking-wide">Compiling PDF</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">Applying high-res formatting...</p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
        PREMIUM TOAST NOTIFICATION
        ========================================================
      */}
      <div 
        className={`fixed bottom-6 right-6 z-[100] transition-all duration-400 transform ${
          toast.show 
            ? "translate-y-0 opacity-100 scale-100" 
            : "translate-y-10 opacity-0 scale-95 pointer-events-none"
        }`}
      >
        {toast.type === 'success' && (
          <div className="flex items-center gap-3 bg-slate-900 text-white px-5 py-4 rounded-xl shadow-2xl ring-1 ring-white/10">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold tracking-wide">Success</p>
              <p className="text-xs text-slate-300 font-medium">{toast.message}</p>
            </div>
          </div>
        )}

        {toast.type === 'error' && (
          <div className="flex items-center gap-3 bg-red-50 text-red-900 px-5 py-4 rounded-xl shadow-xl ring-1 ring-red-200">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold tracking-wide">Error</p>
              <p className="text-xs text-red-700 font-medium">{toast.message}</p>
            </div>
          </div>
        )}
      </div>
    </div>

    
  );
}