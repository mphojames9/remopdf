import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import navLogo from '../assets/logo1.webp';        // logo for the light navigation bar
import footerLogo from '../assets/logo.webp';  // logo for the dark footer

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

// --- Page content ----------------------------------------------------------
// The contents list drives the numbering, so adding, removing or moving an entry renumbers the
// sections and every “section N” reference on the page. Keep each id in sync with its <Sec id=...>.
//
// Keep this page true to the code. If a feature starts sending information somewhere new (a new
// AI provider, an analytics tool, another ad network), add it to “Who else handles your information”
// and change LAST_UPDATED before it ships.

const LAST_UPDATED = '14 November 2026';
const CONTACT_EMAIL = 'support@remopdf.site';
const DELETE_REQUEST = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Delete my RemoPDF account')}`;

const TOC = [
  { id: 'who', title: 'Who we are' },
  { id: 'collect', title: 'What we collect and why' },
  { id: 'files', title: 'Your files' },
  { id: 'accounts', title: 'Your account and saved resumes' },
  { id: 'payments', title: 'Payments' },
  { id: 'ai', title: 'AI features' },
  { id: 'sharing', title: 'Who else handles your information' },
  { id: 'ads', title: 'Ads and storage on your device' },
  { id: 'keep', title: 'How long we keep things' },
  { id: 'security', title: 'How we protect your information' },
  { id: 'rights', title: 'Your rights' },
  { id: 'children', title: 'Children' },
  { id: 'abroad', title: 'Information leaving South Africa' },
  { id: 'changes', title: 'Changes to this policy' },
  { id: 'contact', title: 'Contact and complaints' },
];

const SECTION_IDS = TOC.map((t) => t.id);
const num = (id) => TOC.findIndex((t) => t.id === id) + 1;

const LINK =
  'rounded font-semibold text-[#0e1726] underline decoration-[#d9856b] decoration-2 underline-offset-4 hover:decoration-[#0e1726] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0e1726]';

const scrollToId = (id) => {
  const el = document.getElementById(id);
  if (!el) return;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
};

const goTo = (e, id) => {
  e.preventDefault();
  scrollToId(id);
};

// A link to another section of this policy, numbered from the contents list.
function Ref({ id }) {
  return (
    <a href={`#${id}`} onClick={(e) => goTo(e, id)} className={LINK}>
      section {num(id)}
    </a>
  );
}

function Ext({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={LINK}>
      {children}
    </a>
  );
}

function Mail({ subject }) {
  const href = subject ? `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}` : `mailto:${CONTACT_EMAIL}`;
  return (
    <a href={href} className={LINK}>
      {CONTACT_EMAIL}
    </a>
  );
}

function Sec({ id, children }) {
  const title = TOC.find((t) => t.id === id)?.title;
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="max-w-[68ch] scroll-mt-28 border-t border-[#0e1726]/10 pt-10 first:border-t-0 first:pt-0">
      <h2 id={`${id}-title`} className="text-2xl font-semibold leading-snug tracking-tight text-[#0e1726]">
        {num(id)}. {title}
      </h2>
      <div className="mt-4 space-y-4 text-base leading-7 text-slate-700">{children}</div>
    </section>
  );
}

const Sub = ({ children }) => <h3 className="!mt-8 text-lg font-semibold text-[#0e1726]">{children}</h3>;
const Ul = ({ children }) => <ul className="list-disc space-y-2 pl-5 marker:text-[#d9856b]">{children}</ul>;

// One kind of information: what we take, why, and for how long.
function DataRow({ title, what, why, kept }) {
  const rows = [
    ['What', what],
    ['Why', why],
    ['Kept', kept],
  ];
  return (
    <div className="rounded-xl border border-[#0e1726]/10 bg-white p-5">
      <h3 className="text-base font-semibold text-[#0e1726]">{title}</h3>
      <dl className="mt-3 space-y-2.5 text-[15px] leading-relaxed">
        {rows.map(([label, text]) => (
          <div key={label} className="sm:grid sm:grid-cols-[4.5rem_1fr] sm:gap-4">
            <dt className="font-semibold text-slate-500">{label}</dt>
            <dd className="text-slate-700">{text}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// One outside company: what it does for us and what it receives.
function Provider({ name, href, job, gets }) {
  return (
    <li className="px-5 py-4 sm:grid sm:grid-cols-[9.5rem_1fr] sm:gap-6">
      <p className="text-base font-semibold text-[#0e1726]">
        {href ? (
          <Ext href={href}>{name}</Ext>
        ) : (
          name
        )}
      </p>
      <div className="mt-1 text-[15px] leading-relaxed text-slate-700 sm:mt-0">
        <p>{job}</p>
        <p className="mt-1 text-slate-500">Receives: {gets}</p>
      </div>
    </li>
  );
}

const GLANCE = [
  { term: 'Your files', detail: 'Sent to our servers to do the job you asked for, then deleted. We keep no copies and do not look through them.' },
  { term: 'Accounts', detail: 'Optional. Signing in with Google gives us your name and Gmail address. We never see your Google password.' },
  { term: 'Saved resumes', detail: 'If you save a resume to your account, we store it, photo included, until you delete it or close the account.' },
  { term: 'Payments', detail: 'Paystack takes your card details. They never reach us. We keep a record of each payment.' },
  { term: 'AI tools', detail: 'The text you are working on is sent to our AI provider, Groq, to get an answer. We do not save it.' },
  { term: 'Ads', detail: 'The website and the Android app show ads from outside companies, which may use cookies or device identifiers.' },
];

const RIGHTS = [
  { title: 'See it', text: 'Ask what we hold about you and get a copy.' },
  { title: 'Correct it', text: 'Ask us to fix anything wrong or out of date.' },
  { title: 'Delete it', text: 'Ask us to delete your account and saved resumes. We must keep the payment records the law requires.' },
  { title: 'Object', text: 'Ask us to stop using your information in a particular way.' },
  { title: 'Withdraw consent', text: 'Where we rely on your consent, take it back at any time.' },
  { title: 'Complain', text: 'Tell us, or the Information Regulator, if you think we got it wrong.' },
];

export default function Privacy() {
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const tocListRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (!isMobileMenuOpen) {
        setIsNavVisible(currentScrollY < lastScrollY || currentScrollY <= 50);
      }
      setLastScrollY(currentScrollY);

      // Contents list: the last section whose top has reached the upper part of the screen.
      let current = '';
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 150) current = id;
      }
      setActiveSection(current);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, isMobileMenuOpen]);

  // The contents list scrolls on its own when it is taller than the screen, so as you read down
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

  return (
    <div
      className="relative flex min-h-screen w-full min-w-[330px] flex-col overflow-x-clip bg-[#FAFAFA] antialiased selection:bg-[#d9856b]/30"
      style={{ fontFamily: "'Outfit', 'Metropolis', sans-serif" }}
    >
      {/* Navigation */}
      <nav
        className={`fixed top-0 z-50 flex w-full items-center justify-between border-b border-[#d9856b]/20 bg-[#fbf3f0]/80 px-4 py-3 shadow-[0_4px_30px_rgba(0,0,0,0.03)] backdrop-blur-2xl transition-all duration-500 ease-out lg:px-12 lg:py-4 ${
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
        <div className="absolute inset-0 touch-none bg-slate-900/15 backdrop-blur-sm transition-opacity duration-500" onClick={() => setIsMobileMenuOpen(false)} />
        <div
          className={`absolute right-0 top-0 flex h-full w-full max-w-[250px] flex-col justify-between border-l border-slate-200/60 bg-white/95 p-6 shadow-[-25px_0_50px_-15px_rgba(15,23,42,0.06)] backdrop-blur-3xl transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
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
        {/* Title and summary */}
        <header className="pt-28 lg:pt-36">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-[#0e1726] sm:text-5xl lg:text-[3.5rem]">Privacy policy</h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              What RemoPDF collects, why, who else sees it and what you can do about it. A short summary comes first, then the full policy.
            </p>
            <p className="mt-3 text-sm text-slate-500">Last updated {LAST_UPDATED}</p>

            <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <div className="rounded-2xl bg-[#fbf3f0] p-6 sm:p-8">
                <h2 className="text-xl font-semibold text-[#0e1726]">In short</h2>
                <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                  {GLANCE.map((g) => (
                    <div key={g.term}>
                      <dt className="text-base font-semibold text-[#0e1726]">{g.term}</dt>
                      <dd className="mt-1 text-[15px] leading-relaxed text-slate-700">{g.detail}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-6 text-sm text-slate-500">This summary is for convenience. The full policy below is what applies.</p>
              </div>

              <div className="flex flex-col rounded-2xl bg-[#0e1726] p-6 text-white sm:p-8">
                <h2 className="text-xl font-semibold">Want your information removed?</h2>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-300">
                  Email us from the Gmail address of your account and we will delete your account and saved resumes. You can also ask to see or correct what we hold.{' '}
                  <a
                    href="#rights"
                    onClick={(e) => goTo(e, 'rights')}
                    className="font-semibold text-white underline decoration-[#d9856b] decoration-2 underline-offset-4 hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                  >
                    Section {num('rights')}
                  </a>{' '}
                  explains how.
                </p>
                <a
                  href={DELETE_REQUEST}
                  className="mt-6 inline-flex items-center justify-center self-start rounded-lg bg-[#d9856b] px-5 py-3 text-[15px] font-bold text-[#0e1726] transition-colors hover:bg-[#e29a83] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                >
                  Email a deletion request
                </a>
                <p className="mt-auto pt-6 text-sm text-slate-400">The built-in resume list also lets you delete any saved resume yourself.</p>
              </div>
            </div>
          </div>
        </header>

        {/* Contents and full terms */}
        <div className="mx-auto max-w-7xl px-4 pb-20 pt-14 sm:px-6 lg:grid lg:grid-cols-[260px_1fr] lg:gap-16 lg:px-8 lg:pb-28 lg:pt-20">
          <style>{`
            /* Contents list scroll bar: slim, rounded, brand coral. */
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

          {/* Contents: collapsible on phones, sticky beside the text on larger screens */}
          <details className="group mb-10 rounded-xl border border-[#0e1726]/15 bg-white lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-base font-semibold text-[#0e1726] marker:content-none [&::-webkit-details-marker]:hidden">
              On this page
              <i className="fa-solid fa-chevron-down text-[11px] text-slate-400 transition-transform duration-200 group-open:rotate-180"></i>
            </summary>
            <nav aria-label="On this page" className="border-t border-[#0e1726]/10 px-4 py-3">
              <ol className="flex flex-col">
                {TOC.map((t, i) => (
                  <li key={t.id}>
                    <a
                      href={`#${t.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.currentTarget.closest('details')?.removeAttribute('open');
                        requestAnimationFrame(() => scrollToId(t.id));
                      }}
                      className="block py-2 text-[15px] text-slate-700"
                    >
                      {i + 1}. {t.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </details>

          <aside className="hidden lg:block">
            <nav aria-label="On this page" className="sticky top-28">
              <p className="mb-4 text-base font-semibold text-[#0e1726]">On this page</p>
              <ol ref={tocListRef} className="custom-scrollbar max-h-[calc(100vh-10rem)] overflow-y-auto border-l border-[#0e1726]/10 pr-2 text-[14px]">
                {TOC.map((t, i) => {
                  const active = activeSection === t.id;
                  return (
                    <li key={t.id}>
                      <a
                        href={`#${t.id}`}
                        onClick={(e) => goTo(e, t.id)}
                        aria-current={active ? 'true' : undefined}
                        className={`-ml-px block border-l-2 py-1.5 pl-4 leading-snug transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0e1726] ${
                          active ? 'border-[#d9856b] font-semibold text-[#0e1726]' : 'border-transparent text-slate-500 hover:text-[#0e1726]'
                        }`}
                      >
                        {i + 1}. {t.title}
                      </a>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </aside>

          <article className="min-w-0 space-y-10">
            <Sec id="who">
              <p>
                RemoPDF is a PDF editor and resume builder run from South Africa by its founder, Mpho James Matli. In this policy “we”, “us” and “our” mean RemoPDF. It covers
                the website at remopdf.site and the RemoPDF Android app.
              </p>
              <p>
                We decide why and how the personal information described here is used. Under South Africa’s Protection of Personal Information Act 4 of 2013 (POPIA), that makes
                us the “responsible party”. Our Information Officer is Mpho James Matli, who can be reached at <Mail />.
              </p>
              <p>
                This policy goes together with our <Link to="/terms-of-use" className={LINK}>Terms of use</Link>. If you do not agree with it, please stop using RemoPDF.
              </p>
            </Sec>

            <Sec id="collect">
              <p>We collect only what a feature needs. Here is every kind of information, in the order you are likely to meet it.</p>
              <div className="!mt-6 space-y-4">
                <DataRow
                  title="When you use a PDF tool"
                  what="The file you choose and the options you set. For a password-protected PDF, the password you type."
                  why="To do the job you asked for."
                  kept={<>Only while the job runs. See <Ref id="files" />.</>}
                />
                <DataRow
                  title="When you sign in"
                  what="The name and Gmail address on your Google account, and the time you last signed in."
                  why="To create your account, recognise you when you return and keep your saved resumes with you."
                  kept="Until your account is closed."
                />
                <DataRow
                  title="When you save a resume"
                  what="What you enter in the builder, such as your name, contact details, work history, education, skills and any photo you add, plus the template and the name you give the resume."
                  why="So you can open and edit it on any device you sign in on."
                  kept="Until you delete the resume or close your account."
                />
                <DataRow
                  title="When you buy a plan"
                  what="The plan, amount, currency, payment reference, status, dates and type of payment (for example card), plus the name and optional phone number you type at checkout."
                  why="To switch your plan on, deal with refunds and questions, prevent fraud and keep the accounting records we are required to keep."
                  kept="For as long as South African tax and accounting law requires, even after your account is closed."
                />
                <DataRow
                  title="When you use an AI feature"
                  what="The text you are working on, such as parts of your resume, a job advert or a job title. Your account number and plan are used to count how much AI you use each day."
                  why="To produce the answer you asked for and to apply your plan’s daily limit."
                  kept="We do not save the text once the answer is sent back. The daily count is held in memory and resets every day."
                />
                <DataRow
                  title="Whenever you use RemoPDF"
                  what="Ordinary server logs: the time, the page or tool requested, the result, the size of a file and your IP address, which shows roughly where you are. Logs do not contain what is inside your files or the text you type."
                  why="To keep the service running, find faults and block abuse."
                  kept="For a limited time, as set by our hosting provider."
                />
                <DataRow
                  title="When you write to us"
                  what="Your email address and your message."
                  why="To reply and help you."
                  kept="For as long as needed to deal with your request and any follow-up."
                />
              </div>
              <p>We do not sell personal information.</p>
            </Sec>

            <Sec id="files">
              <p>
                When you use a PDF tool, the file you choose is sent to our servers over an encrypted HTTPS connection, processed to produce the result you asked for, and sent
                back to your browser.
              </p>
              <Ul>
                <li><strong>Short-lived handling:</strong> the file is held in memory or in a private temporary folder while the job runs. Temporary files are deleted when it finishes.</li>
                <li><strong>No storage or backups:</strong> we do not keep copies, archives or backups of the files you upload, and we do not build profiles from them.</li>
                <li><strong>No looking:</strong> we do not read or inspect your files.</li>
                <li><strong>Passwords:</strong> a password you type to open, add or remove protection on a PDF is used for that job only and is not saved.</li>
              </Ul>
              <Sub>Conversions done by Adobe</Sub>
              <p>
                Conversions between PDF and Word, Excel or PowerPoint are carried out by Adobe PDF Services. For those, your file is sent to Adobe, and Adobe’s{' '}
                <Ext href="https://www.adobe.com/privacy/policy.html">privacy policy</Ext> applies. Our other tools run on our own servers.
              </p>
              <p>Please do not upload a file that holds information you do not want handled this way.</p>
            </Sec>

            <Sec id="accounts">
              <Ul>
                <li>
                  <strong>Google sign-in:</strong> you sign in with Google, using a Gmail address. Google handles the sign-in, through its Firebase Authentication service, and tells us the name and
                  Gmail address on your account. We never see or store your Google password.
                </li>
                <li><strong>Your account:</strong> the first time you sign in, we create a RemoPDF account from that name and address.</li>
                <li>
                  <strong>Staying signed in:</strong> your sign-in stays on the device until you sign out or it expires after 30 days. It is kept in your browser’s storage (see <Ref id="ads" />). On a shared
                  computer, sign out when you finish.
                </li>
                <li>
                  <strong>Saved resumes:</strong> a resume you save is stored in our database under your account, including any photo you add. It is shown back to you when you sign in and is not used for anything
                  else.
                </li>
                <li><strong>Deleting:</strong> you can delete a saved resume yourself from your resume list. To close your account, see <Ref id="rights" />.</li>
              </Ul>
              <Sub>Older accounts</Sub>
              <p>
                Accounts made before we switched to Google sign-in may still hold a mobile number typed at sign-up. It was never verified, and we do not use it to identify you. We will delete it if you ask.
              </p>
            </Sec>

            <Sec id="payments">
              <p>Plans are paid for through Paystack, and by no other method.</p>
              <Ul>
                <li>
                  <strong>Your card details</strong> are typed into Paystack’s secure payment window. They go to Paystack and never reach RemoPDF, so we cannot see or store them.
                </li>
                <li>
                  <strong>What we give Paystack:</strong> to start a payment, we pass on your Gmail address, the plan and amount, and the name and phone number you typed at checkout. Paystack’s{' '}
                  <Ext href="https://paystack.com/za/terms">terms and privacy policy</Ext> apply to what it does with them.
                </li>
                <li>
                  <strong>Confirming a payment:</strong> Paystack tells us whether the payment went through. We check this directly with Paystack, instead of taking the browser’s word for it, and then switch
                  your plan on.
                </li>
                <li><strong>Our record:</strong> we keep a record of each payment (see <Ref id="collect" /> and <Ref id="keep" />). We do not keep card numbers.</li>
              </Ul>
            </Sec>

            <Sec id="ai">
              <p>These features use artificial intelligence: summary suggestions, writing checks, job targeting and matching, and cover letters.</p>
              <Ul>
                <li>
                  <strong>What is sent:</strong> when you use one, the text you are working on is sent through our server to Groq, whose AI models write the answer. How Groq handles that text is set by Groq’s own
                  privacy policy.
                </li>
                <li><strong>Job adverts:</strong> if you give a job advert as a web address, our server fetches that public page to read it.</li>
                <li><strong>Job titles:</strong> titles and keywords you enter may be looked up in O*NET, a public database of occupations, to suggest skills and wording.</li>
                <li><strong>What we keep:</strong> nothing. We do not save the text once the answer has gone back to you.</li>
                <li><strong>No automated decisions:</strong> we do not use AI to make decisions about you. It only answers what you ask.</li>
              </Ul>
              <p>Do not enter information you do not want processed this way. AI answers can be wrong, so check them before you use them.</p>
            </Sec>

            <Sec id="sharing">
              <p>
                Other companies run parts of RemoPDF. We give each one only what its job needs. We do not sell personal information, and we do not give it to anyone for their own marketing.
              </p>
              <ul className="!mt-6 divide-y divide-[#0e1726]/10 rounded-xl border border-[#0e1726]/10 bg-white">
                <Provider
                  name="Google"
                  href="https://policies.google.com/privacy"
                  job="Sign-in with Google, the fonts used on our pages, and ads in the Android app (AdMob)."
                  gets={<>the details of your Google sign-in, your IP address when fonts load, and ad data (see <Ref id="ads" />).</>}
                />
                <Provider
                  name="Paystack"
                  href="https://paystack.com/za/terms"
                  job="Takes payment for plans."
                  gets="your Gmail address, the plan and amount, the name and phone number you typed at checkout, and your card details, which you type straight into its window."
                />
                <Provider
                  name="Adobe"
                  href="https://www.adobe.com/privacy/policy.html"
                  job="Converts files between PDF and Word, Excel or PowerPoint."
                  gets="the file being converted."
                />
                <Provider name="Groq" job="Writes the answers for our AI features." gets="the text you are working on." />
                <Provider name="O*NET" job="Public occupation data used for job title and skill suggestions." gets="job titles and keywords you search for." />
                <Provider name="Render" job="Runs our servers." gets="everything that passes through our servers while they work, as a host and not for its own use." />
                <Provider name="MongoDB" job="Hosts our database." gets="account details, saved resumes and payment records." />
                <Provider name="Ad networks" job="Show banner ads on the website." gets={<>your IP address and the page you are on, plus any cookies or identifiers they set (see <Ref id="ads" />).</>} />
              </ul>
              <p>We may also disclose information when the law requires it, or to protect you, other users or the service from fraud and abuse.</p>
            </Sec>

            <Sec id="ads">
              <Sub>Ads</Sub>
              <Ul>
                <li>
                  <strong>On the website,</strong> banner ads come from an outside ad network. Its ad code loads from the network’s own servers, which can see your IP address and the page you are on, and may set
                  cookies or use other identifiers to choose and measure ads.
                </li>
                <li>
                  <strong>In the Android app,</strong> ads come from Google AdMob, which may use your device’s advertising ID. You can reset that ID or turn off ad personalisation in your Android settings,
                  under Google and then Ads.
                </li>
                <li>
                  We do not control these companies, and their own policies apply. Google explains how it uses information from apps and sites that use its services at{' '}
                  <Ext href="https://policies.google.com/technologies/ads">policies.google.com/technologies/ads</Ext>. You can also block or delete cookies in your browser settings.
                </li>
              </Ul>
              <Sub>Storage on your device</Sub>
              <p>
                RemoPDF keeps a few things in your browser’s storage, not in tracking cookies: your sign-in, and the resume you are working on with its template, colour and progress, so nothing is lost if you refresh
                the page. Clearing your site data removes them, and signing out removes your sign-in.
              </p>
              <p>We do not run analytics or tracking tools of our own.</p>
            </Sec>

            <Sec id="keep">
              <ul className="divide-y divide-[#0e1726]/10 rounded-xl border border-[#0e1726]/10 bg-white">
                {[
                  ['Uploaded files', 'Only while the job runs, then deleted.'],
                  ['Your name and Gmail address', 'Until your account is closed.'],
                  ['Saved resumes', 'Until you delete them or your account is closed.'],
                  ['Payment records', 'As long as South African tax and accounting law requires, then deleted.'],
                  ['Text sent to the AI tools', 'Not kept by us.'],
                  ['Server logs', 'A limited time, set by our hosting provider.'],
                  ['Messages to us', 'As long as needed to help you and handle any follow-up.'],
                ].map(([what, how]) => (
                  <li key={what} className="px-5 py-3.5 text-[15px] sm:grid sm:grid-cols-[13rem_1fr] sm:gap-6">
                    <span className="font-semibold text-[#0e1726]">{what}</span>
                    <span className="mt-0.5 block text-slate-700 sm:mt-0">{how}</span>
                  </li>
                ))}
              </ul>
              <p>
                When you ask us to close your account, we delete it and your saved resumes within 30 days. The payment records the law requires us to keep stay. Copies in database backups, if there are any,
                disappear when those backups expire.
              </p>
            </Sec>

            <Sec id="security">
              <Ul>
                <li>Everything you send us travels over encrypted HTTPS connections.</li>
                <li>Sign-in is through Google, and only a verified Gmail address is accepted. Our server checks your Google sign-in itself before it opens an account.</li>
                <li>Your sign-in on a device is a signed token that expires after 30 days. Every request for a saved resume is checked against your account, so nobody else can open it by guessing an address.</li>
                <li>Card numbers never touch our servers, and we confirm payments with Paystack directly.</li>
                <li>We keep access to our servers and database restricted.</li>
              </Ul>
              <p>
                No service is completely secure. If something goes wrong that puts your information at risk, we will tell you and the Information Regulator, as POPIA requires.
              </p>
            </Sec>

            <Sec id="rights">
              <p>POPIA gives you rights over your personal information. You can ask us to:</p>
              <div className="!mt-6 grid gap-4 sm:grid-cols-2">
                {RIGHTS.map((r) => (
                  <div key={r.title} className="rounded-xl border border-[#0e1726]/10 bg-white p-5">
                    <h3 className="text-base font-semibold text-[#0e1726]">{r.title}</h3>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-slate-700">{r.text}</p>
                  </div>
                ))}
              </div>
              <Sub>How to ask</Sub>
              <Ul>
                <li>
                  Email <Mail /> from the Gmail address of your account. That is how we know the request is yours. We may ask a question or two to be sure.
                </li>
                <li>We reply within 30 days, and we do not charge a fee.</li>
                <li>
                  Closing your account ends any plan time left on it, as the <Link to="/terms-of-use" className={LINK}>Terms of use</Link> explain.
                </li>
                <li>You can already delete a saved resume yourself from your resume list, and sign out to remove your sign-in from a device.</li>
              </Ul>
            </Sec>

            <Sec id="children">
              <p>
                RemoPDF is not meant for children under 18, and we do not knowingly collect their personal information. If you are a parent or guardian and think a child has signed up, write to us and we
                will delete the account.
              </p>
            </Sec>

            <Sec id="abroad">
              <p>
                Several of the companies in <Ref id="sharing" />, including Google, Adobe, Groq, Render, our database host and the ad networks, process information in other countries. Some of those countries
                may not have privacy laws as strict as POPIA.
              </p>
              <p>
                We send information abroad only to run a feature you use, and the companies involved handle it under their own published privacy commitments and terms. By using those features you accept that
                your information will be sent to them.
              </p>
            </Sec>

            <Sec id="changes">
              <p>
                We may update this policy as RemoPDF changes. When we do, we change the “Last updated” date at the top of this page. For a change that matters, such as a new company handling your information, we
                will also show a notice on the website or in the app.
              </p>
            </Sec>

            <Sec id="contact">
              <p>Questions about this policy, or a request about your information? Write to us first and we will do our best to put it right.</p>
              <div className="rounded-xl bg-[#fbf3f0] p-6">
                <p className="text-sm font-semibold text-slate-600">Email</p>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="mt-1 inline-block rounded text-xl font-semibold text-[#0e1726] underline decoration-[#d9856b] decoration-2 underline-offset-4 hover:decoration-[#0e1726] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0e1726]"
                >
                  {CONTACT_EMAIL}
                </a>
                <p className="mt-3 text-[15px] text-slate-700">Information Officer: Mpho James Matli</p>
              </div>
              <Sub>Complaints</Sub>
              <p>
                If you think we have not handled your information properly, you can complain to South Africa’s Information Regulator at any time. Its website is{' '}
                <Ext href="https://inforegulator.org.za">inforegulator.org.za</Ext>. You can also email enquiries@inforegulator.org.za or call 0800 017 160 (toll-free).
              </p>
            </Sec>
          </article>
        </div>
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
