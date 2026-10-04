import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import emailjs from '@emailjs/browser';
import brandLogo from '../assets/logo.png'; // same logo the Home footer uses; adjust the path if needed

const EMAILJS_SERVICE_ID = 'service_a7c5ag9';
const EMAILJS_TEMPLATE_ID = 'template_5bc1mt5';
const EMAILJS_PUBLIC_KEY = 'drD2CBWiRuBzQGBEO';

const SUBJECT_OPTIONS = [
  "General Inquiry",
  "Technical Support",
  "Billing & Subscriptions",
  "Partnership Opportunities",
  "Feedback & Suggestions"
];

const NAV_LINKS = [
  { label: 'About Us', path: '/about' },
  { label: 'Trust Center', path: '/PrivacyPolicy' },
  { label: 'T&C', path: '/terms-of-use' }
];

// --- Footer ---------------------------------------------------------------
// Same look as the Home page footer (navy panel, folded corner, coral glow),
// written to stand on its own so Contact doesn't depend on Home's styles.
const BRAND = 'RemoPDF';
const FOOTER_BLURB = 'Edit, organize, convert and share PDFs, or build an ATS-friendly resume from a template.';

const FOOTER_COLS = [
  {
    title: 'Product',
    links: [
      { label: 'PDF editor', to: '/Workspace', kind: 'route' },
      { label: 'Resume builder', to: '/ResumeBuilder', kind: 'route' },
      { label: 'Templates', to: '/#templates', kind: 'route' },
    ],
  },
  {
    title: 'Learn',
    links: [
      { label: 'PDF editor', to: '/#tools', kind: 'page' },
      { label: 'ATS scan', to: '/#ats', kind: 'page' },
      { label: 'How it works', to: '/#how-it-works', kind: 'page' },
      { label: 'FAQ', to: '/#faq', kind: 'page' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'About us', to: '/about', kind: 'route' },
      { label: 'Email us', to: 'mailto:remopdf@outlook.com', kind: 'page' },
      { label: 'Privacy policy', to: '/PrivacyPolicy', kind: 'route' },
      { label: 'Terms of use', to: '/terms-of-use', kind: 'route' },
    ],
  },
];

const FOOTER_LINK =
  'inline-block rounded bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-0.5 text-[0.9375rem] text-slate-300 transition-[color,background-size] duration-300 hover:bg-[length:100%_1px] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white';

function FooterLink({ link }) {
  if (link.kind === 'route') {
    return (
      <Link to={link.to} className={FOOTER_LINK}>
        {link.label}
      </Link>
    );
  }
  // Plain anchors: they leave this page for a section of Home (/#faq) or open the mail app.
  return (
    <a href={link.to} className={FOOTER_LINK}>
      {link.label}
    </a>
  );
}

function SiteFooter() {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  const [launching, setLaunching] = useState(false);

  // Plays the entrance (corner unfolds, text rises) once the footer scrolls into view.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const toTop = () => {
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
    setLaunching(true);
    setTimeout(() => setLaunching(false), 850);
  };

  return (
    // The wrapper colour shows through the folded corner, so it matches the page background.
    <div ref={ref} className={`cf-wrap relative z-10 mt-auto w-full bg-[#FAFAFA] ${seen ? 'cf-in' : ''}`}>
      <style>{`
        @property --cf-fold { syntax: '<length>'; inherits: true; initial-value: 0px; }
        .cf-wrap { --cf-size: 3.5rem; --cf-fold: 0px; }
        @media (min-width: 1024px) { .cf-wrap { --cf-size: 5rem; } }
        .cf-wrap.cf-in { --cf-fold: var(--cf-size); }
        @media (hover: hover) { .cf-wrap.cf-in:has(.cf-hit:hover) { --cf-fold: calc(var(--cf-size) + 1.25rem); } }
        .cf-cut { clip-path: polygon(0 0, calc(100% - var(--cf-fold)) 0, 100% var(--cf-fold), 100% 100%, 0 100%); }
        .cf-flap { position: absolute; top: 0; right: 0; z-index: 10; width: var(--cf-fold); height: var(--cf-fold); background: linear-gradient(to bottom left, #3d5078, #1f2e49 65%); clip-path: polygon(0 0, 100% 100%, 0 100%); }
        .cf-word { display: inline-block; }
        @media (prefers-reduced-motion: no-preference) {
          .cf-wrap { transition: --cf-fold .9s cubic-bezier(.16,1,.3,1); }
          .cf-wrap:not(.cf-in) :is(.cf-rise, .cf-word) { opacity: 0; }
          .cf-in .cf-rise { animation: cf-rise .9s cubic-bezier(.16,1,.3,1) calc(var(--i, 0) * 90ms + 250ms) backwards; }
          @keyframes cf-rise { from { opacity: 0; translate: 0 24px; } }
          .cf-in .cf-word { animation: cf-word .9s cubic-bezier(.16,1,.3,1) calc(var(--i, 0) * 45ms + 450ms) backwards; }
          @keyframes cf-word { from { opacity: 0; translate: 0 .5em; filter: blur(8px); } }
          .cf-rule { transform: scaleX(0); transform-origin: left; }
          .cf-in .cf-rule { animation: cf-rule 1.3s cubic-bezier(.65,0,.35,1) .8s both; }
          @keyframes cf-rule { to { transform: scaleX(1); } }
          .cf-arrow { display: block; animation: cf-bob 2.4s ease-in-out infinite; }
          @keyframes cf-bob { 50% { translate: 0 -3px; } }
          .cf-launch { display: block; animation: cf-launch .8s cubic-bezier(.5,0,.2,1); }
          @keyframes cf-launch { 45% { translate: 0 -2rem; opacity: 0; } 46% { translate: 0 2rem; opacity: 0; } }
          .cf-blob-a { animation: cf-drift 14s ease-in-out infinite; }
          .cf-blob-b { animation: cf-drift 18s ease-in-out infinite reverse; }
          @keyframes cf-drift { 50% { transform: translate(40px, 30px) scale(1.12); } }
        }
      `}</style>

      <span aria-hidden="true" className="cf-hit absolute right-0 top-0 z-20 h-[6.5rem] w-[6.5rem]" />
      <footer className="cf-cut relative isolate overflow-hidden bg-[#0e1726] text-slate-300">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,#000,transparent_75%)]"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.08) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
        />
        <div aria-hidden="true" className="cf-blob-b pointer-events-none absolute -bottom-40 -left-32 h-[26rem] w-[26rem] rounded-full bg-[#d9856b]/15 blur-3xl" />
        <div aria-hidden="true" className="cf-blob-a pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-[#3d5078]/40 blur-3xl" />
        <div aria-hidden="true" className="cf-flap" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-8 pt-16 sm:px-6 sm:pt-20 lg:px-8">
          <div className="grid gap-14 lg:grid-cols-[1.3fr_2fr] lg:gap-20">
            <div className="max-w-sm">
              <Link
                to="/"
                style={{ '--i': 0 }}
                aria-label={BRAND}
                className="cf-rise group inline-flex items-center rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                <img
                  src={brandLogo}
                  alt={BRAND}
                  className="h-10 w-auto transition-transform duration-300 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
              </Link>
              <p className="mt-5 leading-relaxed text-slate-300">
                {FOOTER_BLURB.split(' ').map((w, i) => (
                  <span key={i}>
                    <span className="cf-word" style={{ '--i': i }}>{w}</span>{' '}
                  </span>
                ))}
              </p>
            </div>

            <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
              {FOOTER_COLS.map((col, ci) => (
                <div key={col.title}>
                  <h2 className="cf-rise text-base font-bold text-white" style={{ '--i': 1 + ci }}>{col.title}</h2>
                  <ul className="mt-4 space-y-3">
                    {col.links.map((link, li) => (
                      <li key={link.label} className="cf-rise" style={{ '--i': 2 + ci + li * 0.6 }}>
                        <FooterLink link={link} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>

          <span aria-hidden="true" className="cf-rule mt-16 block h-px bg-white/15" />
          <div className="cf-rise flex items-center justify-between gap-4 pt-6 text-sm text-slate-400" style={{ '--i': 7 }}>
            <p>© {new Date().getFullYear()} {BRAND}</p>
            <button
              type="button"
              onClick={toTop}
              className="group inline-flex items-center gap-3 rounded-full py-1 pl-2 text-slate-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Back to top
              <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/20 transition-colors group-hover:border-white/40 group-hover:bg-white/10">
                <span className={launching ? 'cf-launch' : 'cf-arrow'}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5"
                  >
                    <path d="M12 19V5" />
                    <path d="m6 11 6-6 6 6" />
                  </svg>
                </span>
              </span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Contact() {
  // --- Navigation States ---
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- Form States ---
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: SUBJECT_OPTIONS[0],
    message: ''
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null
  
  const dropdownRef = useRef(null);

  // --- Scroll Logic for Navbar ---
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (!isMobileMenuOpen) {
        setIsNavVisible(currentScrollY < lastScrollY || currentScrollY <= 50);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, isMobileMenuOpen]);

// Bulletproof mobile scroll lock
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'contain';
    } else {
      document.body.style.overflow = 'unset';
      document.body.style.overscrollBehavior = 'unset';
    }
    return () => { 
      document.body.style.overflow = 'unset'; 
      document.body.style.overscrollBehavior = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Handle clicking outside the custom form dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const selectSubject = (subject) => {
    setFormData(prev => ({ ...prev, subject }));
    setIsDropdownOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          from_name: formData.name,
          reply_to: formData.email,
          subject: formData.subject,
          message: formData.message,
        },
        EMAILJS_PUBLIC_KEY
      );
      setSubmitStatus('success');
      setFormData({ name: '', email: '', subject: SUBJECT_OPTIONS[0], message: '' });
    } catch (error) {
      console.error('EmailJS Error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="min-h-screen w-full flex flex-col bg-[#FAFAFA] overflow-hidden antialiased relative selection:bg-[#d9856b]/30"
      style={{ fontFamily: "'Outfit', 'Metropolis', sans-serif" }}
    >
      {/* --- Ambient Background Glows --- */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[120vw] lg:max-w-4xl h-[400px] lg:h-[500px] bg-[#d9856b]/10 rounded-full mix-blend-multiply filter blur-[100px] lg:blur-[140px] pointer-events-none animate-[pulse_6s_ease-in-out_infinite]"></div>
      <div className="absolute top-[30%] right-[-10%] w-64 lg:w-96 h-64 lg:h-96 bg-blue-400/10 rounded-full mix-blend-multiply filter blur-[90px] lg:blur-[120px] pointer-events-none animate-[pulse_8s_ease-in-out_infinite_alternate]"></div>

      {/* --- Premium Sticky Navigation --- */}
      <nav 
        className={`w-full flex justify-between items-center py-3 lg:py-4 px-4 lg:px-12 z-50 fixed top-0 transition-all duration-500 ease-out border-b border-slate-200/50 bg-white/70 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.03)] ${
          isNavVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="nav-logo shrink-0 relative z-50">
          <Link to="/" className="flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b] rounded-lg">
            <span className="font-black text-[1.25rem] text-slate-800 tracking-tight">
                Remo<span className="text-red-600">PDF</span>
              </span>
          </Link>
        </div>
  
        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-10">
          {NAV_LINKS.map((link, idx) => (
            <Link 
              key={idx}
              to={link.path} 
              className="text-[0.95rem] font-medium tracking-wide transition-colors duration-200 text-slate-500 hover:text-slate-900"
            >
              {link.label}
            </Link>
          ))}
        </div>
  
        <div className="flex items-center gap-4 shrink-0 relative z-50">
          
          {/* ULTRA PREMIUM Desktop Build Resume Button */}
          <Link 
            to="/resume-builder" 
            className="hidden lg:flex group relative items-center justify-center gap-2.5 px-6 py-2.5 rounded-full bg-[#d9856b] text-[#0e1726] text-[14px] font-bold tracking-wide shadow-[0_8px_20px_-6px_rgba(217,133,107,0.6)] hover:shadow-[0_12px_25px_-6px_rgba(217,133,107,0.8)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden isolate"
          >
            {/* Inverse gradient on hover */}
            <div className="absolute inset-0 z-[-1] bg-[#c9735a] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            {/* Skewed Shimmer Sweep */}
            <div className="absolute top-0 left-0 w-full h-full -translate-x-full group-hover:translate-x-[150%] bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 transition-transform duration-1000 ease-in-out z-[-1]" />
            {/* 3D Glass Highlight */}
            <div className="absolute inset-0 rounded-full border border-white/20 mix-blend-overlay"></div>
            
            <span className="relative z-10 drop-shadow-sm">Build Resume</span>
            <i className="fa-solid fa-wand-magic-sparkles text-[12px] relative z-10 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 drop-shadow-sm"></i>
          </Link>

          {/* Premium Mobile Hamburger Button */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden relative w-10 h-10 flex items-center justify-center bg-slate-50 border border-slate-200/60 backdrop-blur-md rounded-full shadow-sm hover:bg-slate-100/80 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            <div className="flex flex-col gap-[4.5px] items-center justify-center w-5">
              <span className={`h-[2px] bg-slate-800 rounded-full transition-all duration-300 origin-center ${isMobileMenuOpen ? 'w-5 translate-y-[6.5px] rotate-45 bg-slate-900' : 'w-5'}`} />
              <span className={`h-[2px] bg-slate-800 rounded-full transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0 scale-x-0' : 'w-5 opacity-100 scale-x-100'}`} />
              <span className={`h-[2px] bg-slate-800 rounded-full transition-all duration-300 origin-center ${isMobileMenuOpen ? 'w-5 -translate-y-[6.5px] -rotate-45 bg-slate-900' : 'w-5'}`} />
            </div>
          </button>
        </div>
      </nav>

      {/* --- Premium Mobile Menu Drawer Overlay --- */}
{/* Drawer Overlay for Mobile Interfaces */}
<div 
  className={`fixed inset-0 z-50 lg:hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
    isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
  }`}
>
  {/* Add touch-none here */}
  <div className="absolute inset-0 bg-slate-900/15 backdrop-blur-sm transition-opacity duration-500 touch-none" onClick={() => setIsMobileMenuOpen(false)} />
        <div 
          className="absolute inset-0 bg-slate-900/15 backdrop-blur-sm transition-opacity duration-500"
          onClick={() => setIsMobileMenuOpen(false)}
        />
        
        <div 
          className={`absolute top-0 right-0 w-full max-w-[250px] h-full bg-white/95 backdrop-blur-3xl shadow-[-25px_0_50px_-15px_rgba(15,23,42,0.06)] border-l border-slate-200/60 p-6 flex flex-col justify-between transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex flex-col pt-16">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400 mb-6 px-1">Navigation</p>
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((link, idx) => (
                <Link 
                  key={idx}
                  to={link.path} 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between text-[1.15rem] font-medium tracking-wide py-3.5 px-2 rounded-xl text-slate-800 hover:text-[#c4694e] hover:bg-slate-50/60 transition-all duration-200"
                >
                  <span>{link.label}</span>
                  <i className="fa-solid fa-chevron-right text-[10px] text-slate-300 mr-1"></i>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6 border-t border-slate-100 pt-6 mb-4">
            <div className="px-1">
              <h4 className="text-xs font-bold text-slate-900 mb-1">Create Professional Documents</h4>
              <p className="text-xs text-slate-400 leading-normal">Generate premium-vetted structural resumes instantly via RemoPDF utility engine.</p>
            </div>
            
            {/* ULTRA PREMIUM Mobile Build Resume Button */}
            <Link 
              to="/ResumeBuilder" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="group relative flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl bg-[#d9856b] text-[#0e1726] text-[15px] font-bold tracking-wide shadow-[0_8px_25px_-8px_rgba(217,133,107,0.7)] active:scale-[0.98] transition-all overflow-hidden isolate"
            >
              <div className="absolute inset-0 z-[-1] bg-[#c9735a] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-0 left-0 w-full h-full -translate-x-full group-hover:translate-x-[150%] bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 transition-transform duration-1000 ease-in-out z-[-1]" />
              <div className="absolute inset-0 rounded-2xl border border-white/20 mix-blend-overlay"></div>
              
              <span className="relative z-10 drop-shadow-sm">Build Resume</span>
              <i className="fa-solid fa-wand-magic-sparkles text-[13px] relative z-10 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 drop-shadow-sm"></i>
            </Link>
          </div>
        </div>
      </div>

      {/* --- Main Content Area --- */}
      <div className="max-w-7xl mx-auto w-full px-4 lg:px-8 relative z-10 flex flex-col lg:flex-row gap-12 lg:gap-24 items-center lg:items-start pt-32 lg:pt-44 pb-20">
        
        {/* Left Column: Header & Info */}
        <div className="w-full lg:w-5/12 flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center self-start gap-2 px-3 py-1.5 mb-6 text-[10px] lg:text-xs font-medium tracking-[0.2em] uppercase text-[#b85a40] bg-[#d9856b]/10 backdrop-blur-md border border-[#d9856b]/30 rounded-full shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d9856b] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#d9856b]"></span>
            </span>
            Get in touch
          </div>
          
          <h1 className="text-4xl lg:text-6xl font-light text-slate-900 tracking-tight mb-6 leading-[1.1]">
            Let's start a <br />
            <span className="font-normal text-[#d9856b]">conversation.</span>
          </h1>
          
          <p className="text-base lg:text-lg text-slate-500 font-normal leading-relaxed mb-12 max-w-md">
            Whether you have a question about our document utilities, pricing, or technical architecture, our team is ready to answer all your questions.
          </p>

          <div className="flex flex-col gap-8">
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
                <i className="fa-solid fa-envelope text-[#d9856b] text-lg"></i>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">Email Us directly</h3>
                <p className="text-sm text-slate-500">remopdf@outlook.com</p>
              </div>
            </div>
            
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
                <i className="fa-solid fa-location-dot text-[#d9856b] text-lg"></i>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">Global HQ</h3>
                <p className="text-sm text-slate-500">Cloud Infrastructure<br />Remote First</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: The Form */}
        <div className="w-full lg:w-7/12 max-w-2xl animate-in fade-in slide-in-from-bottom-12 duration-700 delay-150">
          <div className="bg-white/60 backdrop-blur-3xl border border-slate-200/60 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] rounded-[2rem] p-6 sm:p-10 relative overflow-hidden">
            
            {/* Form Success Overlay */}
            <div className={`absolute inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center transition-all duration-500 ${submitStatus === 'success' ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
              <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6 scale-in">
                <i className="fa-solid fa-check text-2xl"></i>
              </div>
              <h3 className="text-2xl font-medium text-slate-900 mb-2">Message Sent!</h3>
              <p className="text-slate-500 mb-8">Thank you for reaching out. Our team will get back to you within 24 hours.</p>
              <button 
                onClick={() => setSubmitStatus(null)}
                className="px-6 py-2.5 rounded-full bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors"
              >
                Send Another Message
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label htmlFor="name" className="text-[13px] font-semibold text-slate-700 ml-1">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    className="w-full px-5 py-3.5 bg-white/80 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#d9856b]/60 focus:ring-4 focus:ring-[#d9856b]/15 transition-all duration-300"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="email" className="text-[13px] font-semibold text-slate-700 ml-1">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="john@example.com"
                    className="w-full px-5 py-3.5 bg-white/80 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#d9856b]/60 focus:ring-4 focus:ring-[#d9856b]/15 transition-all duration-300"
                  />
                </div>
              </div>

              {/* Subject Dropdown */}
              <div className="flex flex-col gap-2 relative" ref={dropdownRef}>
                <label className="text-[13px] font-semibold text-slate-700 ml-1">Subject</label>
                <div 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`w-full px-5 py-3.5 bg-white/80 border rounded-2xl text-sm flex items-center justify-between cursor-pointer transition-all duration-300 select-none ${isDropdownOpen ? 'border-[#d9856b]/60 ring-4 ring-[#d9856b]/15 text-slate-900' : 'border-slate-200 text-slate-700 hover:border-slate-300'}`}
                >
                  <span>{formData.subject}</span>
                  <i className={`fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`}></i>
                </div>
                
                <div 
                  className={`absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-slate-100 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] z-20 overflow-hidden transition-all duration-300 origin-top ${isDropdownOpen ? 'opacity-100 scale-y-100 translate-y-0' : 'opacity-0 scale-y-95 -translate-y-2 pointer-events-none'}`}
                >
                  {SUBJECT_OPTIONS.map((option, idx) => (
                    <div 
                      key={idx}
                      onClick={() => selectSubject(option)}
                      className={`px-5 py-3.5 text-sm cursor-pointer transition-colors ${formData.subject === option ? 'bg-[#d9856b]/10 text-[#b85a40] font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="message" className="text-[13px] font-semibold text-slate-700 ml-1">Your Message</label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows="4"
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder="How can we help you today?"
                  className="w-full px-5 py-4 bg-white/80 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#d9856b]/60 focus:ring-4 focus:ring-[#d9856b]/15 transition-all duration-300 resize-none"
                ></textarea>
              </div>

              {submitStatus === 'error' && (
                <div className="text-red-500 text-sm flex items-center gap-2 bg-red-50 px-4 py-3 rounded-xl border border-red-100">
                  <i className="fa-solid fa-circle-exclamation"></i>
                  Something went wrong. Please try again later.
                </div>
              )}

              {/* ULTRA PREMIUM Send Form Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative flex items-center justify-center w-full mt-2 px-6 py-4 rounded-2xl bg-slate-900 text-white text-[15px] font-bold tracking-wide shadow-[0_10px_30px_-10px_rgba(15,23,42,0.8)] hover:shadow-[0_15px_40px_-10px_rgba(15,23,42,1)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 overflow-hidden isolate disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {/* Inverse dark gradient on hover */}
                <div className="absolute inset-0 z-[-1] bg-gradient-to-r from-slate-800 to-slate-950 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                {/* Bright Skewed Shimmer Sweep */}
                <div className="absolute top-0 left-0 w-full h-full -translate-x-full group-hover:translate-x-[150%] bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 transition-transform duration-1000 ease-in-out z-[-1]" />
                {/* 3D Glass Top Highlight */}
                <div className="absolute inset-0 rounded-2xl border-t border-white/10 mix-blend-overlay"></div>
                
                <span className="relative z-10 flex items-center gap-3 drop-shadow-sm">
                  {isSubmitting ? (
                    <>
                      <i className="fa-solid fa-circle-notch animate-spin"></i>
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Message
                      <i className="fa-solid fa-paper-plane text-[13px] relative z-10 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-1 drop-shadow-sm"></i>
                    </>
                  )}
                </span>
              </button>
              
            </form>
          </div>
        </div>
      </div>

      {/* --- Footer --- */}
      <SiteFooter />
    </div>
  );
}