import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ResumePreview from '../Resume/ResumePreview';
import profileImgItem from '../../assets/profile.png';

const profileImg = profileImgItem;

const demoResumeData = {
  personalInfo: {
    fullName: "Alexander Reed",
    jobTitle: "Senior Cloud & DevOps Architect",
    email: "alexander.reed@example.com",
    phone: "+1 (555) 019-8273",
    location: "Seattle, WA",
    linkedin: "linkedin.com/in/alexreed",
    website: "alexreed.dev",
    profileImage: profileImg,
    image: profileImg, 
    avatar: profileImg,
    photo: profileImg,
    profilePic: profileImg,
    picture: profileImg,
    summary: "Visionary Cloud Architect with 10+ years of enterprise engineering experience..."
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
        "Spearheaded containerization strategy using Kubernetes, accelerating rapid feature deployment workflows by 60%"
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
        "Designed centralized high-throughput telemetry logging layers, shrinking incident recovery time vectors by 45%"
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

// USER-FRIENDLY TEXT OVERHAUL
const RE_TEMPLATES = [
  { 
    id: 'Professional Dark', 
    name: 'Professional Dark', 
    vibe: 'Classic & Professional', 
    description: 'A striking two-column layout perfect for highlighting key skills alongside your experience.' 
  },
  { 
    id: 'Modern Executive', 
    name: 'Modern Executive', 
    vibe: 'Modern & Clean', 
    description: 'A sleek, top-header design that cleanly organizes your career history and stands out to recruiters.' 
  },
  { 
    id: 'Architect Resume', 
    name: 'Architect Resume', 
    vibe: 'Elegant & Minimalist', 
    description: 'An editorial-style layout with refined typography and clean, spacious borders for a high-end look.' 
  }
];

const SliderCard = ({ tmpl, isActive, onSelect }) => {
  const containerRef = useRef(null);
  const [thumbScale, setThumbScale] = useState(0.22);

  // Preserve the robust scaling logic[cite: 2]
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setThumbScale(entry.contentRect.width / 794);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      onClick={() => onSelect(tmpl.id)}
      className={`flex-shrink-0 w-[220px] max-[340px]:w-[195px] sm:w-[320px] snap-start bg-gradient-to-b from-white to-slate-50/80 rounded-3xl p-3 sm:p-5 transition-all duration-500 group cursor-pointer flex flex-col justify-between select-none relative overflow-hidden ${
        isActive 
          ? 'border-2 border-orange-400 shadow-[0_16px_40px_-10px_rgba(249,115,22,0.25)] scale-[1.02] ring-4 ring-orange-500/10' 
          : 'border-2 border-slate-100 hover:border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1'
      }`}
    >
      <div>
        {/* THUMBNAIL CANVAS */}
        <div ref={containerRef} className="w-full aspect-[1/1.4142] bg-slate-100 rounded-xl overflow-hidden relative shadow-inner mb-4 ring-1 ring-slate-900/5">
          <div
            className="absolute top-0 left-0 origin-top-left pointer-events-none select-none bg-white transition-transform duration-700"
            style={{ width: '794px', height: '1122px', transform: `scale(${thumbScale})` }}
          >
            <ResumePreview data={demoResumeData} template={tmpl.id} />
          </div>
          
          {/* HOVER GLASS OVERLAY */}
          <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center z-20">
            <div className="bg-white text-slate-900 text-[10px] sm:text-xs font-black tracking-wide px-4 py-2 rounded-full shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 flex items-center gap-2">
              Preview Design
            </div>
          </div>

          {/* ACTIVE BADGE */}
          {isActive && (
            <div className="absolute top-2.5 right-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-lg z-20 flex items-center gap-1.5 animate-fade-in border border-white/20">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
              Selected
            </div>
          )}
        </div>

        {/* TYPOGRAPHY */}
        <div className="space-y-1.5 px-1">
          <h3 className={`text-sm sm:text-base font-black tracking-tight transition-colors truncate ${isActive ? 'text-slate-900' : 'text-slate-800'}`}>
            {tmpl.name}
          </h3>
          <p className="text-[9px] sm:text-[10px] text-orange-500 font-bold tracking-widest uppercase truncate">
            {tmpl.vibe}
          </p>
          <p className="text-xs text-slate-500 leading-relaxed mt-1 line-clamp-2 font-medium max-[340px]:hidden">
            {tmpl.description}
          </p>
        </div>
      </div>

      {/* ACTION BUTTON */}
      <div className="mt-5 pt-3 border-t border-slate-100 shrink-0">
        <div className={`w-full text-[10px] sm:text-xs font-bold tracking-wide py-2.5 sm:py-3 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 ${
          isActive 
            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20' 
            : 'bg-white border border-slate-200 text-slate-600 group-hover:bg-slate-50 group-hover:text-slate-900 group-hover:border-slate-300'
        }`}>
          {isActive ? 'Current Design' : 'Choose Design'}
          <svg className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default function TemplateSlider({ onSelect, activeTemplateId }) {
  const scrollContainerRef = useRef(null);
  const navigate = useNavigate();

  const handleScroll = (direction) => {
    if (scrollContainerRef.current) {
      const { scrollLeft, clientWidth } = scrollContainerRef.current;
      const scrollAmount = clientWidth * 0.8;
      scrollContainerRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const selectTemplate = (templateId) => {
    if (onSelect) {
      onSelect(templateId);
    } else {
      localStorage.setItem('remo_premium_template', templateId);
      navigate('/ResumeBuilder');
    }
  };

  return (
    <div className="w-full bg-white/80 backdrop-blur-xl border border-slate-200/60 py-6 px-4 sm:py-10 sm:px-8 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative">
      <style>{`
        .scrollbar-hidden::-webkit-scrollbar { display: none; }
        .scrollbar-hidden { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* HEADER SECTION */}
      <div className="flex flex-row items-center justify-between mb-6 max-[340px]:mb-4 gap-4 shrink-0 px-2">
        <div className="min-w-0 flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5">
            <span className="text-orange-600 text-[9px] font-black uppercase tracking-widest bg-orange-50 px-2.5 py-1 rounded-md border border-orange-100/80 shrink-0">
              Gallery
            </span>
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight truncate">
              Resume Templates
            </h2>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm font-medium truncate max-[540px]:hidden">
            Choose a professional layout to instantly style your resume.
          </p>
        </div>

        {/* NAVIGATION CONTROLS */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleScroll('left')}
            className="w-10 h-10 rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white text-slate-600 active:scale-90 flex items-center justify-center transition-all shadow-sm"
            aria-label="Slide left"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => handleScroll('right')}
            className="w-10 h-10 rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white text-slate-600 active:scale-90 flex items-center justify-center transition-all shadow-sm"
            aria-label="Slide right"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* TEMPLATE SLIDER */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 sm:gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hidden pb-4 pt-2 px-2"
      >
        {RE_TEMPLATES.map((tmpl) => (
          <SliderCard
            key={tmpl.id}
            tmpl={tmpl}
            isActive={activeTemplateId === tmpl.id}
            onSelect={selectTemplate}
          />
        ))}
      </div>
    </div>
  );
}