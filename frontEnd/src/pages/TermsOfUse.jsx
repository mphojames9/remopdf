import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import navLogo from '../assets/logo1.png';        // logo for the light navigation bar
import footerLogo from '../assets/logo.png';  // logo for the dark footer

const NAV_LINKS = [
  { label: 'About Us', path: '/about' },
  { label: 'Trust Center', path: '/PrivacyPolicy' },
  { label: 'Contact Support', path: '/contact' }
];

const PDF_EDITOR_ROUTE = '/Workspace';

const FOOTER_BLURB = 'Edit, organize, convert and share PDFs, or build an ATS-friendly resume from a template.';

// kind: 'route' = router link, 'anchor' = link to a section on the home page
const FOOTER_COLS = [
  {
    title: 'Product',
    links: [
      { label: 'PDF editor', to: PDF_EDITOR_ROUTE, kind: 'route' },
      { label: 'Resume builder', to: '/ResumeBuilder', kind: 'route' },
      { label: 'Templates', to: '/#templates', kind: 'anchor' },
    ],
  },
  {
    title: 'Learn',
    links: [
      { label: 'PDF editor', to: '/#tools', kind: 'anchor' },
      { label: 'ATS scan', to: '/#ats', kind: 'anchor' },
      { label: 'How it works', to: '/#how-it-works', kind: 'anchor' },
      { label: 'FAQ', to: '/#faq', kind: 'anchor' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'About us', to: '/about', kind: 'route' },
      { label: 'Contact us', to: '/contact', kind: 'route' },
      { label: 'Privacy policy', to: '/PrivacyPolicy', kind: 'route' },
      { label: 'Terms of use', to: '/terms-of-use', kind: 'route' },
    ],
  },
];

const FOOTER_LINK =
  'inline-block rounded bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-0.5 text-[0.9375rem] text-slate-300 transition-[color,background-size] duration-300 hover:bg-[length:100%_1px] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white';

function FooterLink({ link }) {
  if (link.kind === 'route')
    return <Link to={link.to} className={FOOTER_LINK}>{link.label}</Link>;
  return <a href={link.to} className={FOOTER_LINK}>{link.label}</a>;
}

// --- Animated footer ------------------------------------------------------
// The corner unfolds and the text rises in the first time the footer scrolls into
// view; the divider draws across, the arrow bobs, and the glows drift. All motion
// is switched off for people who prefer reduced motion.
function SiteFooter() {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  const [launching, setLaunching] = useState(false);

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
    // The coral wrapper shows through the folded corner so the band above seems to continue under it.
    <div ref={ref} className={`ft-wrap relative z-10 bg-[#d9856b] ${seen ? 'ft-in' : ''}`}>
      <style>{`
        @property --ft-fold { syntax: '<length>'; inherits: true; initial-value: 0px; }
        .ft-wrap { --ft-size: 3.5rem; --ft-fold: 0px; }
        @media (min-width: 1024px) { .ft-wrap { --ft-size: 5rem; } }
        .ft-wrap.ft-in { --ft-fold: var(--ft-size); }
        @media (hover: hover) { .ft-wrap.ft-in:has(.ft-hit:hover) { --ft-fold: calc(var(--ft-size) + 1.25rem); } }
        .ft-cut { clip-path: polygon(0 0, calc(100% - var(--ft-fold)) 0, 100% var(--ft-fold), 100% 100%, 0 100%); }
        .ft-flap { position: absolute; top: 0; right: 0; z-index: 10; width: var(--ft-fold); height: var(--ft-fold); background: linear-gradient(to bottom left, #3d5078, #1f2e49 65%); clip-path: polygon(0 0, 100% 100%, 0 100%); }
        .ft-word { display: inline-block; }
        @media (prefers-reduced-motion: no-preference) {
          .ft-wrap { transition: --ft-fold .9s cubic-bezier(.16,1,.3,1); }
          .ft-wrap:not(.ft-in) :is(.ft-rise, .ft-word) { opacity: 0; }
          .ft-in .ft-rise { animation: ft-rise .9s cubic-bezier(.16,1,.3,1) calc(var(--i, 0) * 90ms + 250ms) backwards; }
          @keyframes ft-rise { from { opacity: 0; translate: 0 24px; } }
          .ft-in .ft-word { animation: ft-word .9s cubic-bezier(.16,1,.3,1) calc(var(--i, 0) * 45ms + 450ms) backwards; }
          @keyframes ft-word { from { opacity: 0; translate: 0 .5em; filter: blur(8px); } }
          .ft-rule { transform: scaleX(0); transform-origin: left; }
          .ft-in .ft-rule { animation: ft-rule 1.3s cubic-bezier(.65,0,.35,1) .8s both; }
          @keyframes ft-rule { to { transform: scaleX(1); } }
          .ft-arrow { display: block; animation: ft-bob 2.4s ease-in-out infinite; }
          @keyframes ft-bob { 50% { translate: 0 -3px; } }
          .ft-launch { display: block; animation: ft-launch .8s cubic-bezier(.5,0,.2,1); }
          @keyframes ft-launch { 45% { translate: 0 -2rem; opacity: 0; } 46% { translate: 0 2rem; opacity: 0; } }
          .ft-blob-a { animation: ft-drift 14s ease-in-out infinite; }
          .ft-blob-b { animation: ft-drift 18s ease-in-out infinite reverse; }
          @keyframes ft-drift { 50% { transform: translate(40px, 30px) scale(1.12); } }
        }
      `}</style>

      <span aria-hidden="true" className="ft-hit absolute right-0 top-0 z-20 h-[6.5rem] w-[6.5rem]" />
      <footer className="ft-cut relative isolate overflow-hidden bg-[#0e1726] text-slate-300">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,#000,transparent_75%)]"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.08) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
        />
        <div aria-hidden="true" className="ft-blob-b pointer-events-none absolute -bottom-40 -left-32 h-[26rem] w-[26rem] rounded-full bg-[#d9856b]/15 blur-3xl" />
        <div aria-hidden="true" className="ft-blob-a pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-[#3d5078]/40 blur-3xl" />
        <div aria-hidden="true" className="ft-flap" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-8 pt-16 sm:px-6 sm:pt-20 lg:px-8">
          <div className="grid gap-14 lg:grid-cols-[1.3fr_2fr] lg:gap-20">
            <div className="max-w-sm">
              <Link
                to="/"
                style={{ '--i': 0 }}
                aria-label="RemoPDF home"
                className="ft-rise group inline-flex items-center rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                <img
                  src={footerLogo}
                  alt="RemoPDF"
                  draggable={false}
                  className="block h-10 w-auto transition-transform duration-300 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
              </Link>
              <p className="mt-5 leading-relaxed text-slate-300">
                {FOOTER_BLURB.split(' ').map((w, i) => (
                  <span key={i}>
                    <span className="ft-word" style={{ '--i': i }}>{w}</span>{' '}
                  </span>
                ))}
              </p>
            </div>

            <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
              {FOOTER_COLS.map((col, ci) => (
                <div key={col.title}>
                  <h2 className="ft-rise text-base font-bold text-white" style={{ '--i': 1 + ci }}>{col.title}</h2>
                  <ul className="mt-4 space-y-3">
                    {col.links.map((link, li) => (
                      <li key={link.label} className="ft-rise" style={{ '--i': 2 + ci + li * 0.6 }}>
                        <FooterLink link={link} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>

          <span aria-hidden="true" className="ft-rule mt-16 block h-px bg-white/15" />
          <div className="ft-rise flex items-center justify-between gap-4 pt-6 text-sm text-slate-400" style={{ '--i': 7 }}>
            <p>© {new Date().getFullYear()} RemoPDF</p>
            <button
              type="button"
              onClick={toTop}
              className="group inline-flex items-center gap-3 rounded-full py-1 pl-2 text-slate-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Back to top
              <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/20 transition-colors group-hover:border-white/40 group-hover:bg-white/10">
                <span className={launching ? 'ft-launch' : 'ft-arrow'}>
                  <i className="fa-solid fa-arrow-up text-xs transition-transform duration-200 group-hover:-translate-y-0.5"></i>
                </span>
              </span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Terms() {
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const tocListRef = useRef(null);

  // Scroll logic for navbar visibility
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (!isMobileMenuOpen) {
        setIsNavVisible(currentScrollY < lastScrollY || currentScrollY <= 50);
      }
      setLastScrollY(currentScrollY);

      // ScrollSpy logic for Table of Contents
      const sections = document.querySelectorAll('section[id]');
      let current = '';
      sections.forEach((section) => {
        const sectionTop = section.offsetTop;
        if (window.scrollY >= sectionTop - 150) {
          current = section.getAttribute('id');
        }
      });
      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, isMobileMenuOpen]);

  // The list scrolls on its own when it is taller than the screen, so as you read down
  // the page, scroll it just enough to keep the highlighted entry in view.
  useEffect(() => {
    const list = tocListRef.current;
    const active = list && list.querySelector('[aria-current="true"]');
    if (!list || !active) return;
    const l = list.getBoundingClientRect();
    const a = active.getBoundingClientRect();
    if (a.top < l.top) list.scrollTop -= l.top - a.top + 8;
    else if (a.bottom > l.bottom) list.scrollTop += a.bottom - l.bottom + 8;
  }, [activeSection]);

  // Mobile scroll lock
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

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const scrollToSection = (e, id) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const offset = 100;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div 
      className="min-h-screen w-full flex flex-col bg-[#FAFAFA] overflow-x-hidden antialiased relative selection:bg-[#d9856b]/30 min-w-[330px]"
      style={{ fontFamily: "'Outfit', 'Metropolis', sans-serif" }}
    >
      {/* Ambient Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[140vw] lg:max-w-7xl h-[600px] bg-gradient-to-b from-[#d9856b]/10 via-[#d9856b]/5 to-transparent rounded-full filter blur-[120px] lg:blur-[160px] pointer-events-none"></div>

      {/* Premium Sticky Navigation */}
      <nav 
        className={`w-full flex justify-between items-center py-3 lg:py-4 px-4 lg:px-12 z-50 fixed top-0 transition-all duration-500 ease-out border-b border-[#d9856b]/20 bg-[#fbf3f0]/80 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.03)] ${
          isNavVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="nav-logo shrink-0 relative z-50">
          <Link to="/" aria-label="RemoPDF home" className="flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b] rounded-lg">
            <img src={navLogo} alt="RemoPDF" draggable={false} className="h-8 lg:h-9 w-auto block" />
          </Link>
        </div>
  
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
          <Link 
            to="/ResumeBuilder" 
            className="hidden lg:flex group relative items-center justify-center gap-2.5 px-6 py-2.5 rounded-full bg-[#d9856b] text-[#0e1726] text-[14px] font-bold tracking-wide shadow-[0_8px_20px_-6px_rgba(217,133,107,0.6)] hover:shadow-[0_12px_25px_-6px_rgba(217,133,107,0.8)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden isolate"
          >
            <div className="absolute inset-0 z-[-1] bg-[#c9735a] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-0 left-0 w-full h-full -translate-x-full group-hover:translate-x-[150%] bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 transition-transform duration-1000 ease-in-out z-[-1]" />
            <div className="absolute inset-0 rounded-full border border-white/20 mix-blend-overlay"></div>
            <span className="relative z-10 drop-shadow-sm">Build Resume</span>
            <i className="fa-solid fa-wand-magic-sparkles text-[12px] relative z-10 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 drop-shadow-sm"></i>
          </Link>

          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden relative w-10 h-10 flex items-center justify-center bg-slate-50 border border-slate-200/60 backdrop-blur-md rounded-full shadow-sm hover:bg-slate-100/80 transition-colors"
          >
            <div className="flex flex-col gap-[4.5px] items-center justify-center w-5">
              <span className={`h-[2px] bg-slate-800 rounded-full transition-all duration-300 origin-center ${isMobileMenuOpen ? 'w-5 translate-y-[6.5px] rotate-45 bg-slate-900' : 'w-5'}`} />
              <span className={`h-[2px] bg-slate-800 rounded-full transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0 scale-x-0' : 'w-5 opacity-100 scale-x-100'}`} />
              <span className={`h-[2px] bg-slate-800 rounded-full transition-all duration-300 origin-center ${isMobileMenuOpen ? 'w-5 -translate-y-[6.5px] -rotate-45 bg-slate-900' : 'w-5'}`} />
            </div>
          </button>
        </div>
      </nav>

      {/* Drawer Overlay for Mobile Interfaces */}
      <div 
        className={`fixed inset-0 z-50 lg:hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 bg-slate-900/15 backdrop-blur-sm transition-opacity duration-500 touch-none" onClick={() => setIsMobileMenuOpen(false)} />
        <div className={`absolute top-0 right-0 w-full max-w-[250px] h-full bg-white/95 backdrop-blur-3xl shadow-[-25px_0_50px_-15px_rgba(15,23,42,0.06)] border-l border-slate-200/60 p-6 flex flex-col justify-between transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex flex-col pt-16">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400 mb-6 px-1">Navigation</p>
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((link, idx) => (
                <Link key={idx} to={link.path} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-between text-[1.15rem] font-medium tracking-wide py-3.5 px-2 rounded-xl text-slate-800 hover:text-[#c4694e] hover:bg-slate-50/60 transition-all duration-200">
                  <span>{link.label}</span>
                  <i className="fa-solid fa-chevron-right text-[10px] text-slate-300 mr-1"></i>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Legal Content Container */}
      <main className="max-w-7xl mx-auto w-full px-4 lg:px-8 relative z-10 pt-32 lg:pt-40 pb-24 flex-1 flex flex-col lg:flex-row gap-12 items-start">
        
        {/* Sticky Table of Contents (Desktop Only) */}
        <aside className="hidden lg:block w-[280px] shrink-0 sticky top-32">
          <style>{`
            /* Table-of-contents scroll bar: slim, rounded, brand coral. */
            .custom-scrollbar { scrollbar-width: thin; scrollbar-color: rgba(217,133,107,.55) transparent; }
            @supports selector(::-webkit-scrollbar) {
              .custom-scrollbar { scrollbar-width: auto; scrollbar-color: auto; }
              .custom-scrollbar::-webkit-scrollbar { width: 10px; }
              .custom-scrollbar::-webkit-scrollbar-track { margin: 2px 0; border-radius: 999px; background: rgba(15,23,42,.04); }
              .custom-scrollbar::-webkit-scrollbar-thumb { border: 3px solid transparent; border-radius: 999px; background-color: rgba(217,133,107,.55); background-clip: padding-box; transition: background-color .2s; }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #d9856b; }
              .custom-scrollbar::-webkit-scrollbar-thumb:active { background-color: #c9735a; }
            }
          `}</style>
          <div className="bg-white/60 backdrop-blur-3xl border border-slate-200/60 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] rounded-[2rem] p-6">
            <h3 className="text-xs font-bold tracking-[0.15em] uppercase text-slate-900 mb-6">Table of Contents</h3>
            <div ref={tocListRef} className="flex flex-col gap-3 text-[13px] font-medium max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
              {[
                { id: 'binding-arbitration', title: 'Binding Arbitration' },
                { id: 'acceptance', title: '1. Acceptance of Terms' },
                { id: 'no-signup', title: '2. No Sign-up & Data Privacy' },
                { id: 'adobe-api', title: '3. Document Processing (Adobe API)' },
                { id: 'admob-ads', title: '4. Advertising & Google AdMob' },
                { id: 'use-limits', title: '5. Acceptable Use & Limits' },
                { id: 'intellectual-property', title: '6. Intellectual Property' },
                { id: 'warranties', title: '7. Disclaimer of Warranties' },
                { id: 'liability', title: '8. Limitation of Liability' },
                { id: 'indemnification', title: '9. Indemnification' },
                { id: 'international', title: '10. International Use' },
                { id: 'dispute', title: '11. Dispute Resolution' },
                { id: 'opt-out', title: '12. Opting Out' },
                { id: 'governing-law', title: '13. Governing Law' },
                { id: 'claims', title: '14. Limitation on Claims' },
                { id: 'misc', title: '15. Contact & Miscellaneous' }
              ].map((item) => (
                <a 
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => scrollToSection(e, item.id)}
                  aria-current={activeSection === item.id ? 'true' : undefined}
                  className={`block shrink-0 leading-snug transition-colors duration-200 ${activeSection === item.id ? 'text-[#b85a40] font-bold' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  {item.title}
                </a>
              ))}
            </div>
          </div>
        </aside>

        {/* Legal Document Text Area */}
        <article className="flex-1 w-full bg-white/60 backdrop-blur-3xl border border-slate-200/60 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] rounded-[2rem] p-6 sm:p-10 lg:p-14">
          
          <div className="mb-12 border-b border-slate-200 pb-8">
            <h1 className="text-3xl lg:text-5xl font-bold text-slate-900 tracking-tight mb-4">Terms and Conditions of Use</h1>
            <p className="text-sm text-slate-500 font-medium">Last updated: August 14, 2026</p>
          </div>

          <div className="prose prose-slate max-w-none text-[15px] leading-relaxed text-slate-600 space-y-10">

            <section id="binding-arbitration" className="scroll-mt-32">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <i className="fa-solid fa-gavel text-[#d9856b] text-lg"></i> Binding Arbitration & Dispute Resolution
              </h2>
              <p>
                Section 11 of these Terms governs how disputes between you and RemoPDF are resolved. In particular, it includes a binding arbitration agreement, which means:
              </p>
              <ul className="list-disc pl-5 space-y-2 marker:text-[#d9856b]">
                <li>You agree to resolve disputes with us through final and binding arbitration, rather than in court, except for certain limited exceptions.</li>
                <li>You waive your right to file a lawsuit or participate in a class action lawsuit against us.</li>
                <li>You may opt out of the arbitration agreement by following the process outlined in Section 12.</li>
              </ul>
              <p>
                Please read this section carefully, as it significantly affects your legal rights.
              </p>
            </section>

            <section id="acceptance" className="scroll-mt-32">
              <h2 className="text-xl font-bold text-slate-900 mb-4">1. Acceptance of Terms</h2>
              <p>
                The provisions of these Terms govern the relationship between you and RemoPDF (“we”, “us”, “our”, or the “Company”) regarding your access to and use of our web application, tools, and associated services (collectively, the “Service”).
              </p>
              <p>
                By accessing, browsing, or using any portion of the Service, you confirm that you have read, understood, and agreed to be legally bound by these Terms. If you do not agree with any part of these Terms, you must immediately discontinue using the Service.
              </p>
            </section>

            <section id="no-signup" className="scroll-mt-32">
              <h2 className="text-xl font-bold text-slate-900 mb-4">2. Zero Registration & Strict Privacy Guarantee</h2>
              <p>
                At RemoPDF, we prioritize user anonymity and seamless utility. 
              </p>
              <ul className="list-disc pl-5 space-y-2 marker:text-[#d9856b]">
                <li><strong>No Sign-ups Required:</strong> You do not need to create an account, register an email, or provide any personal identification credentials to access our tools.</li>
                <li><strong>Zero File Retention:</strong> We do not permanently store, archive, inspect, or build profiles from any files or documents you upload to the Service.</li>
                <li><strong>Transient Session Lifecycle:</strong> Uploaded documents exist only during the active rendering/conversion session and are purged immediately after processing.</li>
              </ul>
            </section>

            <section id="adobe-api" className="scroll-mt-32">
              <h2 className="text-xl font-bold text-slate-900 mb-4">3. Document Processing via Adobe API</h2>
              <p>
                RemoPDF leverages industry-grade document processing technology powered exclusively by the <strong>Adobe Services API</strong>.
              </p>
              <h3 className="text-lg font-bold text-slate-800 mt-6 mb-3">Security and Transmission</h3>
              <p>
                All file transfers between your browser and the processing engines are secured using end-to-end HTTPS/TLS encryption. We do not utilize secondary or untrusted third-party document processing vendors.
              </p>
              <h3 className="text-lg font-bold text-slate-800 mt-6 mb-3">Stateless Architecture</h3>
              <p>
                Document transformations performed via the Adobe API are strictly stateless. Once your PDF operations (such as conversion, compression, or editing) complete and the output file is delivered to your browser, all source and generated files are automatically deleted from temporary memory.
              </p>
            </section>

            <section id="admob-ads" className="scroll-mt-32">
              <h2 className="text-xl font-bold text-slate-900 mb-4">4. Advertising and Google AdMob Integration</h2>
              <p>
                To maintain RemoPDF as a completely free web service without charging subscriptions or fees, we partner with <strong>Google AdMob</strong> to display online advertisements.
              </p>
              <h3 className="text-lg font-bold text-slate-800 mt-6 mb-3">AdMob Data Collection</h3>
              <p>
                While RemoPDF itself collects no user data or documents, Google AdMob independently collects and processes telemetry and device identifiers (such as Advertising IDs, IP addresses, cookie data, and device information) to serve personalized or non-personalized advertisements, prevent fraud, and measure ad performance.
              </p>
              <h3 className="text-lg font-bold text-slate-800 mt-6 mb-3">Third-Party Privacy Information</h3>
              <p>
                We have no direct control over the data practices of Google AdMob. For detailed information regarding how Google AdMob collects and processes your data, please visit the official <a href="https://admob.google.com" target="_blank" rel="noopener noreferrer" className="text-[#b85a40] font-semibold hover:underline">Google AdMob Website</a> and read <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#b85a40] font-semibold hover:underline">Google's Privacy & Terms</a>.
              </p>
            </section>

            <section id="use-limits" className="scroll-mt-32">
              <h2 className="text-xl font-bold text-slate-900 mb-4">5. Acceptable Use and Technical Restrictions</h2>
              <p>By using RemoPDF, you agree to adhere to the following acceptable use standards:</p>
              <ul className="list-disc pl-5 space-y-2 marker:text-[#d9856b]">
                <li>You will not upload documents containing malicious code, viruses, trojans, or unauthorized scripts.</li>
                <li>You will not use automated scripts, bots, spiders, or scrapers to access or overload our infrastructure.</li>
                <li>You will not attempt to probe, bypass, or reverse-engineer the API endpoints or security features implemented by RemoPDF or the Adobe API.</li>
                <li>You confirm that you possess all legal rights, ownership, or licenses for any document you submit for processing.</li>
              </ul>
            </section>

            <section id="intellectual-property" className="scroll-mt-32">
              <h2 className="text-xl font-bold text-slate-900 mb-4">6. Intellectual Property Rights</h2>
              <h3 className="text-lg font-bold text-slate-800 mt-6 mb-3">Your Content</h3>
              <p>
                You retain 100% ownership of all intellectual property rights in the documents and files you upload to RemoPDF. We acquire no ownership, copyright, or moral rights over your Content.
              </p>
              <h3 className="text-lg font-bold text-slate-800 mt-6 mb-3">Service Intellectual Property</h3>
              <p>
                The RemoPDF trademark, logo, website design, UI layout, custom frontend codebase, and graphics are the exclusive property of RemoPDF. Adobe, Adobe API, and related logos are registered trademarks of Adobe Inc. Google and Google AdMob are registered trademarks of Google LLC.
              </p>
            </section>

            <section id="warranties" className="scroll-mt-32">
              <h2 className="text-xl font-bold text-slate-900 mb-4">7. Disclaimer of Warranties</h2>
              <p>
                The Service is provided on an <strong>"AS IS"</strong> and <strong>"AS AVAILABLE"</strong> basis without warranties of any kind, whether express, implied, or statutory. 
              </p>
              <p>
                Without limiting the foregoing, RemoPDF does not warrant that the document conversions will be error-free, uninterrupted, 100% accurate in formatting fidelity, or compatible with all operating systems or PDF viewers. You assume full responsibility for verifying converted document outputs.
              </p>
            </section>

            <section id="liability" className="scroll-mt-32">
              <h2 className="text-xl font-bold text-slate-900 mb-4">8. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by applicable law, RemoPDF and its operators, affiliates, licensors, or API providers shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of data, business disruption, or corrupted files arising from your use of or inability to use the Service.
              </p>
            </section>

            <section id="indemnification" className="scroll-mt-32">
              <h2 className="text-xl font-bold text-slate-900 mb-4">9. Indemnification</h2>
              <p>
                You agree to defend, indemnify, and hold harmless RemoPDF and its operators from and against any claims, liabilities, damages, losses, and expenses (including legal fees) arising out of or in any way connected with your violation of these Terms or your upload of unlawful or unauthorized document content.
              </p>
            </section>

            <section id="international" className="scroll-mt-32">
              <h2 className="text-xl font-bold text-slate-900 mb-4">10. International Use</h2>
              <p>
                We make no representation that the Service is compliant with the laws of every jurisdiction worldwide. If you access RemoPDF from outside your home country, you do so on your own initiative and are solely responsible for compliance with local data protection and usage laws.
              </p>
            </section>

            <section id="dispute" className="scroll-mt-32">
              <h2 className="text-xl font-bold text-slate-900 mb-4">11. Binding Arbitration & Informal Dispute Resolution</h2>
              <p>
                In the event of any concern or dispute arising out of these Terms or your use of the Service, you agree to first contact us informally to attempt to reach an amicable resolution.
              </p>
              <p>
                Formal claims must be initiated by providing a written notice detailing the issue to <a href="mailto:remopdf@outlook.com" className="text-[#b85a40] font-semibold hover:underline">remopdf@outlook.com</a>. Unresolved disputes shall be settled by binding individual arbitration rather than court proceedings, waiving any rights to participate in class action suits.
              </p>
            </section>

            <section id="opt-out" className="scroll-mt-32">
              <h2 className="text-xl font-bold text-slate-900 mb-4">12. Opting Out of Arbitration</h2>
              <p>
                You may opt out of the binding arbitration provision set forth in Section 11 by sending a written opt-out notice to <a href="mailto:remopdf@outlook.com" className="text-[#b85a40] font-semibold hover:underline">remopdf@outlook.com</a> within thirty (30) days of your first use of the Service.
              </p>
            </section>

            <section id="governing-law" className="scroll-mt-32">
              <h2 className="text-xl font-bold text-slate-900 mb-4">13. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance with applicable general laws, without giving effect to any principles of conflicts of law.
              </p>
            </section>

            <section id="claims" className="scroll-mt-32">
              <h2 className="text-xl font-bold text-slate-900 mb-4">14. Limitation on Claims Period</h2>
              <p>
                Any cause of action or claim you may have arising out of or relating to these Terms or the Service must be commenced within one (1) year after the cause of action accrues; otherwise, such cause of action or claim is permanently barred.
              </p>
            </section>

            <section id="misc" className="scroll-mt-32">
              <h2 className="text-xl font-bold text-slate-900 mb-4">15. Contact & Miscellaneous Provisions</h2>
              <p>
                If any provision of these Terms is deemed unlawful, void, or unenforceable, that provision shall be deemed severable and shall not affect the validity and enforceability of any remaining provisions.
              </p>
              
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mt-8">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3">Contact Support & Legal Enquiries</h3>
                <p className="mb-2">If you have any questions, feedback, or legal inquiries regarding these Terms and Conditions, please contact us directly at:</p>
                <a href="mailto:remopdf@outlook.com" className="text-lg font-bold text-[#b85a40] hover:text-[#9c4630] transition-colors">
                  remopdf@outlook.com
                </a>
              </div>
            </section>

          </div>
        </article>
      </main>

      {/* Call to action band (same as the home page) */}
      <section className="relative z-10 bg-gradient-to-br from-[#e9a38e] to-[#d9856b]">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-4 py-14 sm:px-6 sm:py-16 lg:flex-row lg:items-center lg:px-8">
          <h2 className="max-w-xl text-3xl font-bold leading-tight tracking-tight text-[#0e1726] [text-wrap:balance] sm:text-4xl">
            Your next PDF or resume is a few minutes away.
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to={PDF_EDITOR_ROUTE}
              className="inline-flex items-center justify-center rounded-lg bg-[#0e1726] px-6 py-3 text-[15px] font-bold text-white transition-colors hover:bg-[#1f2e49] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0e1726]"
            >
              Open PDF editor
            </Link>
            <Link
              to="/ResumeBuilder"
              className="inline-flex items-center justify-center rounded-lg border border-[#0e1726]/10 bg-white px-6 py-3 text-[15px] font-bold text-[#0e1726] transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0e1726]"
            >
              Build a resume
            </Link>
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <SiteFooter />
    </div>
  );
}