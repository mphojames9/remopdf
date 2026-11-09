import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import profile from '../assets/profile.webp'
import navLogo from '../assets/logo1.webp';        // logo for the light navigation bar
import footerLogo from '../assets/logo.webp';  // logo for the dark footer

// Structural Core Constants
const NAV_LINKS = [
  { label: 'Privacy', path: '/PrivacyPolicy' },
  { label: 'T&C', path: '/terms-of-use' },
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

// --- Page content ----------------------------------------------------------
// Everything below is plain data so the wording can be changed without touching the layout.
// Statements about files, logs, AI and pricing follow what the backend and the Privacy page do today;
// if either changes, update the matching lines here.

const TEMPLATE_COUNT = 32;

const FACTS = [
  { term: 'Started', detail: '9 December 2025' },
  { term: 'Founder', detail: 'Mpho James Matli' },
  { term: 'Named after', detail: 'Remoratile Vanessa, the founder’s daughter' },
  { term: 'Resume templates', detail: `${TEMPLATE_COUNT}, all built to be read by an ATS` },
];

const TOOL_GROUPS = [
  {
    id: 'edit',
    tab: 'Edit and sign',
    title: 'Change a PDF without starting over',
    intro: 'Open a file in the editor, fix what is wrong, and download it again. Every page appears in a sidebar so you always know where you are.',
    links: [{ label: 'Open the PDF editor', to: PDF_EDITOR_ROUTE }],
    items: [
      { name: 'Edit text', detail: 'Click a line to fix it, or place new text anywhere on the page.' },
      { name: 'Highlight', detail: 'Mark the lines that matter before you share the file.' },
      { name: 'Sign', detail: 'Add your signature to a contract or a form.' },
      { name: 'Add images', detail: 'Place a logo, a stamp or a photo on the page.' },
      { name: 'Watermark and page numbers', detail: 'Finish the file, then download it.' },
    ],
  },
  {
    id: 'organize',
    tab: 'Organize',
    title: 'Put the pages in order',
    intro: 'Combine files, pull them apart, and rearrange pages with a preview of each one in front of you.',
    links: [{ label: 'Open the PDF editor', to: PDF_EDITOR_ROUTE }],
    items: [
      { name: 'Merge', detail: 'Combine several PDFs into one file.' },
      { name: 'Split', detail: 'Break a big file into smaller ones, ready to send on their own.' },
      { name: 'Add, remove and rotate pages', detail: 'Change the page order of a file, with every page shown before you commit.' },
    ],
  },
  {
    id: 'convert',
    tab: 'Convert',
    title: 'Move between file types',
    intro: 'Switch a document to the format the next person needs, and back again when it comes back edited.',
    links: [{ label: 'Open the PDF editor', to: PDF_EDITOR_ROUTE }],
    items: [
      { name: 'PDF to Word', detail: 'Turn a PDF into a document you can edit.' },
      { name: 'PDF to Excel', detail: 'Pull tables out of a PDF and into a spreadsheet.' },
      { name: 'PDF to PowerPoint', detail: 'Turn pages into slides you can change.' },
      { name: 'Word and Excel to PDF', detail: 'Make a finished file that looks the same on every screen.' },
      { name: 'Images and PDF', detail: 'Turn pictures into a PDF, or save each PDF page as an image.' },
    ],
  },
  {
    id: 'protect',
    tab: 'Compress and protect',
    title: 'Make files lighter and safer',
    intro: 'Shrink a file so it goes through email, and lock the ones that should only be opened by the right person.',
    links: [{ label: 'Open the PDF editor', to: PDF_EDITOR_ROUTE }],
    items: [
      { name: 'Compress', detail: 'Shrink heavy files so they are easy to email and upload.' },
      { name: 'Lock with a password', detail: 'Protect a PDF with AES-256 encryption.' },
      { name: 'Unlock', detail: 'Remove the password from a file when you know it.' },
      { name: 'Change a password', detail: 'Swap an old password for a new one.' },
    ],
  },
  {
    id: 'more',
    tab: 'Scan, zip and invoice',
    title: 'Small jobs that come up all the time',
    intro: 'Three extras for the things that do not fit anywhere else.',
    links: [
      { label: 'Open the ZIP tool', to: '/ZipTool' },
      { label: 'Open the invoice builder', to: '/InvoiceBuilder' },
    ],
    items: [
      { name: 'QR codes', detail: 'Scan a QR code, or make your own.' },
      { name: 'ZIP tool', detail: 'Bundle several files into one ZIP, in your browser.' },
      { name: 'Invoice builder', detail: 'Put together a clean invoice from a simple form.' },
    ],
  },
];

const RESUME_FEATURES = [
  { name: `${TEMPLATE_COUNT} templates`, detail: 'Change the colour, reorder sections and hide the ones you do not need.' },
  { name: 'Start from a resume you already have', detail: 'Upload a PDF or Word file and the form fills itself in, so you edit instead of retyping.' },
  { name: 'Spelling and grammar checks', detail: 'A misspelled skill can be skipped by a scan, so mistakes are flagged as you type.' },
  { name: 'Job title and achievement ideas', detail: 'Suggestions come from O*NET, a large occupational database, so you are not staring at a blank box.' },
  { name: 'Saved resumes', detail: 'Sign in to keep your resumes in your account and pick them up on another device.' },
  { name: 'Job target', detail: 'Add the job you are applying for to see which skills it asks for and which your resume already shows, with a summary written to fit.', premium: true },
  { name: 'Cover letter', detail: 'Write a cover letter from the details already in your resume.', premium: true },
];

const FILE_STEPS = [
  { title: 'You choose a file', detail: 'It travels to RemoPDF over HTTPS.' },
  { title: 'It is processed', detail: 'The work happens in memory or in a private temporary folder.' },
  { title: 'You get the result', detail: 'The finished file is sent back to your browser to download.' },
  { title: 'Temporary files go', detail: 'Conversions delete their temporary files when they finish. We keep no backups or copies.' },
];

const KEPT_NOTES = [
  {
    title: 'Ordinary server logs',
    detail: 'Timestamps, status codes, file sizes and a rough location help us find and fix errors. They never include the contents of your files or the text you type.',
  },
  {
    title: 'Your account, if you make one',
    detail: 'Signing in lets you save resumes and manage Premium. Saved resumes are stored with your account.',
  },
  {
    title: 'AI features',
    detail: 'The writing assistant, job target and cover letter tools send the text you are working on to an AI provider to produce suggestions. They run only when you use them.',
  },
  {
    title: 'Ads',
    detail: 'RemoPDF shows ads through Google AdSense to help cover server costs. AdSense uses cookies, and you can limit them in your browser or in your Google ad settings.',
  },
];

const PRINCIPLES = [
  { title: 'Say what happens to your files', detail: 'You should not have to guess. We write down how files are handled, and we update it when it changes.' },
  { title: 'Keep the tools plain', detail: 'Short names, few steps and no jargon. If a button needs an explanation, the button is wrong.' },
  { title: 'Make resumes that get read', detail: 'Clear headings and readable text, so a scan finds your experience before a person does.' },
  { title: 'Build it to last', detail: 'RemoPDF carries a family name. That is a good reason to make it dependable.' },
];

const FAQS = [
  {
    q: 'Is my file safe on RemoPDF?',
    a: 'Files are sent over HTTPS and processed in memory or in a private temporary folder. We keep no backups or archives of what you upload, and our logs never contain file contents. The section above and the privacy policy explain what we do keep.',
  },
  {
    q: 'What does ATS-friendly mean?',
    a: 'Many employers use an applicant tracking system (ATS) to scan resumes before a person reads them. Our templates use clear headings and readable text so those systems pick up your details in the right place.',
  },
  {
    q: 'Is RemoPDF free?',
    a: 'You can build and download a resume for free. Free downloads carry a small “Created with RemoPDF” note at the foot of each page. Premium removes the note and adds the AI tools: job target, cover letter and writing analysis. Ads help cover our server costs.',
  },
  {
    q: 'Why is it called RemoPDF?',
    a: 'It is named after Remoratile Vanessa, the founder’s daughter.',
  },
  {
    q: 'Who is behind RemoPDF?',
    a: 'RemoPDF was started on 9 December 2025 by Mpho James Matli, a backend software engineer who spent nine years in manufacturing management before building it.',
  },
  {
    q: 'How do I report a problem or ask for a feature?',
    a: 'Use the contact page. Tell us which tool you were using and what you expected to happen, and we will take it from there.',
  },
];

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

const SECTION = 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8';
const H2 = 'text-3xl font-semibold leading-tight tracking-tight text-[#0e1726] [text-wrap:balance] sm:text-4xl';
const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0e1726]';

const EDITOR_TOOLS = [
  { icon: 'fa-i-cursor', label: 'Text' },
  { icon: 'fa-highlighter', label: 'Highlight', active: true },
  { icon: 'fa-signature', label: 'Sign' },
  { icon: 'fa-image', label: 'Image' },
];

// The hero is drawn like a page open in the RemoPDF editor: the highlight tool is selected and the
// sentence that matters gets marked once, when the page loads. Decorative only, so hidden from screen readers.
function EditorPage() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div className="absolute inset-x-6 bottom-[-0.9rem] top-10 rotate-[3deg] rounded-xl bg-[#f3dbd1]" />
      <div className="relative -rotate-1 rounded-xl border border-[#0e1726]/10 bg-white shadow-[0_30px_60px_-30px_rgba(14,23,38,0.45)]">
        <div className="flex items-center gap-1.5 border-b border-[#0e1726]/10 px-3 py-2.5">
          {EDITOR_TOOLS.map((tool) => (
            <span
              key={tool.label}
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-[13px] ${
                tool.active ? 'bg-[#d9856b] text-[#0e1726]' : 'text-slate-500'
              }`}
            >
              <i className={`fa-solid ${tool.icon}`}></i>
            </span>
          ))}
          <span className="ml-auto text-xs text-slate-400">why-remopdf.pdf</span>
        </div>
        <div className="px-6 pb-8 pt-8 sm:px-10 sm:pb-10 sm:pt-10">
          <p className="text-xl font-semibold tracking-tight text-[#0e1726]">Why RemoPDF exists</p>
          <div className="mt-4 space-y-3 text-[15px] leading-7 text-slate-600">
            <p>Everyone ends up with a PDF they need to change, sign, shrink or send.</p>
            <p>
              Most tools ask for a desktop licence, or for an upload to a service you know little about. RemoPDF does the same jobs in
              your browser, with <span className="ab-mark">a plain account of what happens to your file.</span>
            </p>
          </div>
          <div className="mt-10 flex items-end justify-between gap-4 border-t border-dashed border-[#0e1726]/20 pt-4">
            <span className="ab-sign text-2xl text-[#1f2e49]">Mpho James Matli</span>
            <span className="text-xs text-slate-400">Founder, RemoPDF</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4 transition-transform duration-200 group-open:rotate-45" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export default function About() {
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

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

  // Mobile scroll lock while the menu is open
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

  const group = TOOL_GROUPS[activeTab];

  // Arrow keys, Home and End move between the tool tabs.
  const onTabKey = (e) => {
    const last = TOOL_GROUPS.length - 1;
    let next = null;
    if (e.key === 'ArrowRight') next = activeTab === last ? 0 : activeTab + 1;
    if (e.key === 'ArrowLeft') next = activeTab === 0 ? last : activeTab - 1;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = last;
    if (next === null) return;
    e.preventDefault();
    setActiveTab(next);
    document.getElementById(`tool-tab-${TOOL_GROUPS[next].id}`)?.focus();
  };

  return (
    <div
      className="relative flex min-h-screen w-full min-w-[330px] flex-col overflow-x-hidden bg-[#FAFAFA] antialiased selection:bg-[#d9856b]/30"
      style={{ fontFamily: "'Outfit', 'Metropolis', sans-serif" }}
    >
      <style>{`
        .ab-sign { font-family: 'Segoe Script', 'Snell Roundhand', 'Brush Script MT', cursive; }
        .ab-mark {
          background-image: linear-gradient(rgba(217, 133, 107, .4), rgba(217, 133, 107, .4));
          background-repeat: no-repeat;
          background-position: 0 90%;
          background-size: 100% .72em;
          -webkit-box-decoration-break: clone;
          box-decoration-break: clone;
        }
        @media (prefers-reduced-motion: no-preference) {
          .ab-mark { animation: ab-mark 1.2s cubic-bezier(.65, 0, .35, 1) .9s backwards; }
          @keyframes ab-mark { from { background-size: 0% .72em; } }
        }
      `}</style>

      {/* Navigation */}
      <nav
        className={`fixed top-0 z-50 flex w-full items-center justify-between border-b border-[#d9856b]/20 bg-[#fbf3f0]/80 px-4 py-3 shadow-[0_4px_30px_rgba(0,0,0,0.02)] backdrop-blur-2xl transition-all duration-500 ease-out lg:px-12 lg:py-4 ${
          isNavVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-full opacity-0'
        }`}
      >
        <div className="nav-logo relative z-50 shrink-0">
          <Link to="/" aria-label="RemoPDF home" className="flex items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]">
            <img src={navLogo} alt="RemoPDF" draggable={false} className="block h-8 w-auto lg:h-9" />
          </Link>
        </div>

        <div className="hidden items-center gap-10 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.path} to={link.path} className="text-[0.95rem] font-medium tracking-wide text-slate-500 transition-colors duration-200 hover:text-slate-900">
              {link.label}
            </Link>
          ))}
        </div>

        <div className="relative z-50 flex shrink-0 items-center gap-4">
          <Link
            to="/ResumeBuilder"
            className="group relative isolate hidden items-center justify-center gap-2.5 overflow-hidden rounded-full bg-[#d9856b] px-6 py-2.5 text-[14px] font-bold tracking-wide text-[#0e1726] shadow-[0_8px_20px_-6px_rgba(217,133,107,0.6)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_25px_-6px_rgba(217,133,107,0.8)] lg:flex"
          >
            <div className="absolute inset-0 z-[-1] bg-[#c9735a] opacity-0 transition-opacity duration-500 group-hover:opacity-100"></div>
            <div className="absolute left-0 top-0 z-[-1] h-full w-full -translate-x-full skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-1000 ease-in-out group-hover:translate-x-[150%]" />
            <span className="relative z-10">Build Resume</span>
            <i className="fa-solid fa-wand-magic-sparkles relative z-10 text-[12px] transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110"></i>
          </Link>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/60 bg-slate-50 shadow-sm backdrop-blur-md transition-colors hover:bg-slate-100/80 lg:hidden"
          >
            <div className="flex w-5 flex-col items-center justify-center gap-[4.5px]">
              <span className={`h-[2px] origin-center rounded-full bg-slate-800 transition-all duration-300 ${isMobileMenuOpen ? 'w-5 translate-y-[6.5px] rotate-45 bg-slate-900' : 'w-5'}`} />
              <span className={`h-[2px] rounded-full bg-slate-800 transition-all duration-300 ${isMobileMenuOpen ? 'scale-x-0 opacity-0' : 'w-5 scale-x-100 opacity-100'}`} />
              <span className={`h-[2px] origin-center rounded-full bg-slate-800 transition-all duration-300 ${isMobileMenuOpen ? 'w-5 -translate-y-[6.5px] -rotate-45 bg-slate-900' : 'w-5'}`} />
            </div>
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div
        className={`fixed inset-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] lg:hidden ${
          isMobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="absolute inset-0 bg-slate-900/15 backdrop-blur-sm transition-opacity duration-500" onClick={() => setIsMobileMenuOpen(false)} />
        <div
          className={`absolute right-0 top-0 flex h-full w-full max-w-[260px] flex-col justify-between border-l border-slate-200/60 bg-white/95 p-6 shadow-[-25px_0_50px_-15px_rgba(15,23,42,0.06)] backdrop-blur-3xl transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex flex-col pt-16">
            <p className="mb-6 px-1 text-sm font-semibold text-slate-500">Menu</p>
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between rounded-xl px-2 py-3.5 text-[1.15rem] font-medium tracking-wide text-slate-800 transition-all duration-200 hover:bg-slate-50/60 hover:text-[#c4694e]"
                >
                  <span>{link.label}</span>
                  <i className="fa-solid fa-chevron-right mr-1 text-[10px] text-slate-300"></i>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <main className="relative z-10 flex-1">
        {/* Hero */}
        <section className="pt-28 lg:pt-36">
          <div className={`${SECTION} grid items-center gap-14 pb-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-24`}>
            <div>
              <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-[#0e1726] [text-wrap:balance] sm:text-5xl lg:text-[3.5rem]">
                Paperwork tools that treat your files with care
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                RemoPDF is a set of browser tools for editing, converting and protecting PDFs, and for building resumes that applicant tracking
                systems can read. It was started on 9 December 2025 and is named after the founder’s daughter.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to={PDF_EDITOR_ROUTE}
                  className={`inline-flex items-center justify-center rounded-lg bg-[#0e1726] px-6 py-3 text-[15px] font-bold text-white transition-colors hover:bg-[#1f2e49] ${FOCUS}`}
                >
                  Open PDF editor
                </Link>
                <Link
                  to="/ResumeBuilder"
                  className={`inline-flex items-center justify-center rounded-lg border border-[#0e1726]/15 bg-white px-6 py-3 text-[15px] font-bold text-[#0e1726] transition-colors hover:bg-slate-100 ${FOCUS}`}
                >
                  Build a resume
                </Link>
              </div>
            </div>
            <EditorPage />
          </div>

          <div className={`${SECTION} pb-16 lg:pb-24`}>
            <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
              {FACTS.map((fact) => (
                <div key={fact.term} className="border-t border-[#0e1726]/20 pt-4">
                  <dt className="text-sm text-slate-500">{fact.term}</dt>
                  <dd className="mt-1 text-base font-semibold leading-snug text-[#0e1726]">{fact.detail}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Story */}
        <section id="story" aria-labelledby="story-title" className="border-t border-[#0e1726]/10 bg-white">
          <div className={`${SECTION} grid gap-10 py-16 lg:grid-cols-[1fr_1.7fr] lg:gap-20 lg:py-24`}>
            <h2 id="story-title" className={`${H2} lg:sticky lg:top-28 lg:self-start`}>
              Where RemoPDF comes from
            </h2>
            <div className="max-w-[62ch] space-y-6 text-[17px] leading-8 text-slate-700">
              <p>
                RemoPDF began on 9 December 2025 with a simple aim: bring powerful PDF tools together with real care for the privacy of the
                documents people put through them.
              </p>
              <p>
                Good PDF software is often an expensive desktop licence. Free online tools are quick, but they ask you to hand over a
                contract, an ID or a payslip to a service you know little about. RemoPDF is meant to be the third option: tools that work in
                your browser, and a plain account of what happens to your file.
              </p>

              <h3 className="pt-4 text-2xl font-semibold tracking-tight text-[#0e1726]">Why the name</h3>
              <p>
                RemoPDF is named after Remoratile Vanessa, the founder’s daughter. It is a reminder of the standard the product has to meet:
                reliable, honest with the people who use it, and built to last.
              </p>

              <h3 className="pt-4 text-2xl font-semibold tracking-tight text-[#0e1726]">Who is behind it</h3>
              <div className="flex flex-col gap-6 rounded-2xl bg-[#fbf3f0] p-6 sm:flex-row sm:p-8">
                <img
                  src={profile}
                  alt="Mpho James Matli"
                  className="h-32 w-32 shrink-0 rounded-2xl object-cover sm:h-36 sm:w-36"
                />
                <div>
                  <p className="text-xl font-semibold text-[#0e1726]">Mpho James Matli</p>
                  <p className="text-[15px] text-slate-500">Founder</p>
                  <p className="mt-3 text-base leading-7 text-slate-700">
                    Mpho spent nine years in manufacturing, moving from quality controller to senior manager, where checking the work before it
                    ships is part of the job. In 2024 he completed a software engineering qualification specialising in backend development.
                    RemoPDF is where the two meet.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Toolbox */}
        <section id="toolbox" aria-labelledby="toolbox-title" className="border-t border-[#0e1726]/10">
          <div className={`${SECTION} py-16 lg:py-24`}>
            <div className="max-w-2xl">
              <h2 id="toolbox-title" className={H2}>What you can do with it</h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-600">
                One place for the PDF jobs that come up most, and a few extras for everything around them.
              </p>
            </div>

            <div role="tablist" aria-label="Tool groups" className="-mx-4 mt-10 flex gap-1 overflow-x-auto border-b border-[#0e1726]/15 px-4 sm:mx-0 sm:px-0">
              {TOOL_GROUPS.map((g, idx) => {
                const selected = activeTab === idx;
                return (
                  <button
                    key={g.id}
                    id={`tool-tab-${g.id}`}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls="tool-panel"
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setActiveTab(idx)}
                    onKeyDown={onTabKey}
                    className={`relative shrink-0 whitespace-nowrap px-4 py-3 text-[15px] font-semibold transition-colors ${FOCUS} ${
                      selected ? 'text-[#0e1726]' : 'text-slate-500 hover:text-[#0e1726]'
                    }`}
                  >
                    {g.tab}
                    {selected && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[#d9856b]" />}
                  </button>
                );
              })}
            </div>

            <div id="tool-panel" role="tabpanel" aria-labelledby={`tool-tab-${group.id}`} className="grid gap-10 pt-10 lg:grid-cols-[1fr_1.7fr] lg:gap-20">
              <div>
                <h3 className="text-2xl font-semibold leading-snug tracking-tight text-[#0e1726]">{group.title}</h3>
                <p className="mt-3 max-w-md text-base leading-relaxed text-slate-600">{group.intro}</p>
                <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
                  {group.links.map((l) => (
                    <Link key={l.to + l.label} to={l.to} className={`inline-flex items-center gap-2 rounded text-[15px] font-bold text-[#0e1726] underline decoration-[#d9856b] decoration-2 underline-offset-4 hover:decoration-[#0e1726] ${FOCUS}`}>
                      {l.label}
                    </Link>
                  ))}
                </div>
              </div>
              <ul className="divide-y divide-[#0e1726]/10 border-y border-[#0e1726]/10">
                {group.items.map((item) => (
                  <li key={item.name} className="grid gap-1 py-4 sm:grid-cols-[14rem_1fr] sm:gap-6">
                    <span className="text-base font-semibold text-[#0e1726]">{item.name}</span>
                    <span className="text-[15px] leading-relaxed text-slate-600">{item.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Resume builder */}
        <section id="resume" aria-labelledby="resume-title" className="bg-[#0e1726] text-white">
          <div className={`${SECTION} grid gap-12 py-16 lg:grid-cols-[1fr_1.7fr] lg:gap-20 lg:py-24`}>
            <div className="lg:sticky lg:top-28 lg:self-start">
              <h2 id="resume-title" className="text-3xl font-semibold leading-tight tracking-tight [text-wrap:balance] sm:text-4xl">
                A resume builder that thinks about the scan
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-slate-300">
                Many employers run resumes through an applicant tracking system before a person reads them. Every template uses clear headings
                and plain, readable text, so your details land in the right place.
              </p>
              <Link
                to="/ResumeBuilder"
                className="mt-8 inline-flex items-center justify-center rounded-lg bg-[#d9856b] px-6 py-3 text-[15px] font-bold text-[#0e1726] transition-colors hover:bg-[#e9a38e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                Build a resume
              </Link>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-400">
                Free downloads carry a small “Created with RemoPDF” note at the foot of each page. Premium removes it.
              </p>
            </div>

            <ul className="divide-y divide-white/10 border-y border-white/10">
              {RESUME_FEATURES.map((f) => (
                <li key={f.name} className="py-5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 className="text-lg font-semibold text-white">{f.name}</h3>
                    {f.premium && (
                      <span className="rounded-full border border-[#d9856b]/60 px-2 py-0.5 text-xs font-semibold text-[#e9a38e]">Premium</span>
                    )}
                  </div>
                  <p className="mt-1.5 max-w-xl text-[15px] leading-relaxed text-slate-300">{f.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Privacy */}
        <section id="privacy" aria-labelledby="privacy-title">
          <div className={`${SECTION} py-16 lg:py-24`}>
            <div className="max-w-2xl">
              <h2 id="privacy-title" className={H2}>What happens to your files</h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-600">
                Documents are often private. This is the route a file takes through RemoPDF, and what we do keep.
              </p>
            </div>

            <ol className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {FILE_STEPS.map((s, i) => (
                <li key={s.title} className="border-t-2 border-[#0e1726] pt-5">
                  <span className="text-sm font-semibold tabular-nums text-[#b85a40]">{i + 1}</span>
                  <h3 className="mt-2 text-lg font-semibold text-[#0e1726]">{s.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{s.detail}</p>
                </li>
              ))}
            </ol>

            <h3 className="mt-16 text-2xl font-semibold tracking-tight text-[#0e1726]">What we do keep</h3>
            <dl className="mt-6 grid gap-x-12 gap-y-8 md:grid-cols-2">
              {KEPT_NOTES.map((n) => (
                <div key={n.title} className="border-t border-[#0e1726]/15 pt-4">
                  <dt className="text-base font-semibold text-[#0e1726]">{n.title}</dt>
                  <dd className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{n.detail}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-10 text-[15px] text-slate-600">
              The full detail is in the{' '}
              <Link to="/PrivacyPolicy" className={`rounded font-bold text-[#0e1726] underline decoration-[#d9856b] decoration-2 underline-offset-4 hover:decoration-[#0e1726] ${FOCUS}`}>
                privacy policy
              </Link>
              .
            </p>
          </div>
        </section>

        {/* Principles */}
        <section id="principles" aria-labelledby="principles-title" className="border-t border-[#0e1726]/10 bg-white">
          <div className={`${SECTION} py-16 lg:py-24`}>
            <h2 id="principles-title" className={`${H2} max-w-2xl`}>What we hold ourselves to</h2>
            <dl className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
              {PRINCIPLES.map((p) => (
                <div key={p.title} className="border-t border-[#0e1726]/20 pt-4">
                  <dt className="text-lg font-semibold leading-snug text-[#0e1726]">{p.title}</dt>
                  <dd className="mt-2 text-[15px] leading-relaxed text-slate-600">{p.detail}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" aria-labelledby="faq-title" className="border-t border-[#0e1726]/10">
          <div className={`${SECTION} grid gap-10 py-16 lg:grid-cols-[1fr_1.7fr] lg:gap-20 lg:py-24`}>
            <div className="lg:sticky lg:top-28 lg:self-start">
              <h2 id="faq-title" className={H2}>Questions people ask</h2>
              <p className="mt-4 max-w-sm text-base leading-relaxed text-slate-600">
                Something missing?{' '}
                <Link to="/contact" className={`rounded font-bold text-[#0e1726] underline decoration-[#d9856b] decoration-2 underline-offset-4 hover:decoration-[#0e1726] ${FOCUS}`}>
                  Contact us
                </Link>
                .
              </p>
            </div>
            <div className="divide-y divide-[#0e1726]/10 border-y border-[#0e1726]/10">
              {FAQS.map((faq) => (
                <details key={faq.q} className="group py-5">
                  <summary className={`flex cursor-pointer list-none items-center justify-between gap-4 rounded text-left text-lg font-semibold text-[#0e1726] marker:content-none [&::-webkit-details-marker]:hidden ${FOCUS}`}>
                    <span>{faq.q}</span>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#0e1726]/20 text-[#0e1726] transition-colors group-open:border-[#d9856b] group-open:bg-[#d9856b]">
                      <PlusIcon />
                    </span>
                  </summary>
                  <p className="mt-3 max-w-[62ch] text-base leading-7 text-slate-600">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
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

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}
