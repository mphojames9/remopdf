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

const LAST_UPDATED = '9 November 2026';
const CONTACT_EMAIL = 'remopdf@outlook.com';

const TOC = [
  { id: 'acceptance', title: 'Acceptance of terms' },
  { id: 'files', title: 'Your files and your privacy' },
  { id: 'accounts', title: 'Accounts and saved resumes' },
  { id: 'premium', title: 'Free use, Premium and payments' },
  { id: 'services', title: 'Outside services we use' },
  { id: 'ai', title: 'AI-assisted features' },
  { id: 'resumes', title: 'Resumes and applicant tracking systems' },
  { id: 'ads', title: 'Advertising' },
  { id: 'use-limits', title: 'Acceptable use and limits' },
  { id: 'intellectual-property', title: 'Intellectual property' },
  { id: 'warranties', title: 'Disclaimer of warranties' },
  { id: 'liability', title: 'Limitation of liability' },
  { id: 'indemnification', title: 'Indemnification' },
  { id: 'international', title: 'International use' },
  { id: 'dispute', title: 'Dispute resolution and arbitration' },
  { id: 'opt-out', title: 'Opting out of arbitration' },
  { id: 'governing-law', title: 'Governing law' },
  { id: 'claims', title: 'Time limit on claims' },
  { id: 'changes', title: 'Changes to these terms' },
  { id: 'contact', title: 'Contact and general provisions' },
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

// A link to another section of these terms, numbered from the contents list.
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

const GLANCE = [
  { term: 'Your files', detail: 'They are processed to do the job you asked for, then removed. We keep no backups and we do not look through them.' },
  { term: 'Accounts', detail: 'Optional. You need one to save resumes and to buy Premium.' },
  { term: 'Cost', detail: 'Many tools are free and ads help pay for them. Premium is a paid upgrade, with the price and length of access shown before you pay.' },
  { term: 'AI and ATS', detail: 'AI suggestions can be wrong, and no resume can be guaranteed to pass an employer’s system. Check everything before you send it.' },
];

export default function Terms() {
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
            <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-[#0e1726] sm:text-5xl lg:text-[3.5rem]">Terms of use</h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              The rules for using RemoPDF. A short summary comes first, then the full terms.
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
                <p className="mt-6 text-sm text-slate-500">This summary is for convenience. The full terms below are what apply.</p>
              </div>

              <div className="rounded-2xl bg-[#0e1726] p-6 text-white sm:p-8">
                <h2 className="text-xl font-semibold">Please read this part</h2>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-300">
                  <a href="#dispute" onClick={(e) => goTo(e, 'dispute')} className="font-semibold text-white underline decoration-[#d9856b] decoration-2 underline-offset-4 hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                    Section {num('dispute')}
                  </a>{' '}
                  says how disputes with RemoPDF are settled. It includes a binding arbitration agreement, which means:
                </p>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-slate-300 marker:text-[#d9856b]">
                  <li>You agree to settle disputes with us through final and binding arbitration instead of in court, apart from certain limited exceptions.</li>
                  <li>You give up the right to file a lawsuit or join a class action against us.</li>
                  <li>
                    You can opt out within 30 days of first using the Service. See{' '}
                    <a href="#opt-out" onClick={(e) => goTo(e, 'opt-out')} className="font-semibold text-white underline decoration-[#d9856b] decoration-2 underline-offset-4 hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                      section {num('opt-out')}
                    </a>
                    .
                  </li>
                </ul>
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
            <Sec id="acceptance">
              <p>
                These Terms govern the relationship between you and RemoPDF (“we”, “us”, “our” or the “Company”) regarding your access to and use of our web
                application, tools and related services (together, the “Service”).
              </p>
              <p>
                By accessing, browsing or using any part of the Service, you confirm that you have read, understood and agreed to be legally bound by these Terms. If you
                do not agree with any part of them, you must stop using the Service.
              </p>
            </Sec>

            <Sec id="files">
              <p>
                When you use a PDF tool, the file you choose is sent to RemoPDF over an encrypted HTTPS connection, processed to produce the result you asked for, and sent
                back to your browser.
              </p>
              <Ul>
                <li><strong>No file storage:</strong> we do not permanently store, archive, inspect or build profiles from the files you upload.</li>
                <li><strong>Short-lived handling:</strong> files are held in memory or in a private temporary folder while a job runs, and temporary files are deleted when it finishes.</li>
                <li><strong>No backups:</strong> we keep no backups, shadow copies or archives of uploaded files.</li>
              </Ul>
              <Sub>Logs</Sub>
              <p>
                Like most services, our servers keep ordinary operational logs: timestamps, status codes, file sizes and an approximate location. They do not contain the
                contents of your files or the text you type.
              </p>
              <p>
                Some features rely on outside services, listed in <Ref id="services" />. How personal information is handled is explained in our{' '}
                <Link to="/PrivacyPolicy" className={LINK}>privacy policy</Link>.
              </p>
            </Sec>

            <Sec id="accounts">
              <p>You can use many tools without an account. Some features, such as saved resumes and Premium, need you to sign in.</p>
              <Ul>
                <li>You sign in with your Google account. We create a RemoPDF account for you the first time.</li>
                <li>Resumes you save are stored with your account so you can open them on another device.</li>
                <li>You are responsible for activity under your account and for keeping access to your Google account secure.</li>
                <li>We may suspend or close an account that breaks these Terms or is used to harm the Service or other people.</li>
                <li>
                  You can stop using RemoPDF at any time. To close your account or ask for your saved resumes to be deleted, write to{' '}
                  <a href={`mailto:${CONTACT_EMAIL}`} className={LINK}>{CONTACT_EMAIL}</a>.
                </li>
              </Ul>
            </Sec>

            <Sec id="premium">
              <p>
                Many tools can be used without paying, and you can build and download a resume for free. Free resume downloads carry a small “Created with RemoPDF” note at
                the foot of each page.
              </p>
              <p>
                Premium removes that note and unlocks the AI-assisted features described in <Ref id="ai" />. The plan name, price and length of access are shown at checkout
                before you pay, and Premium is tied to the account you buy it with.
              </p>
              <Sub>Payments</Sub>
              <p>
                Payments are processed by Paystack. You enter your card or bank details in Paystack’s secure window, and they do not reach RemoPDF. Paystack’s own terms and
                privacy policy apply to the payment. If a payment goes wrong or your access does not appear, contact us at{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className={LINK}>{CONTACT_EMAIL}</a> with the email address of your account.
              </p>
            </Sec>

            <Sec id="services">
              <p>RemoPDF uses other companies for parts of the Service. They handle data only for the feature described, under their own terms.</p>
              <Ul>
                <li>
                  <strong>Adobe PDF Services API:</strong> conversions between PDF and Word, Excel or PowerPoint are carried out by Adobe. Those files are sent to Adobe to be
                  converted, and Adobe’s <Ext href="https://www.adobe.com/privacy/policy.html">privacy policy</Ext> applies. Our other tools run on RemoPDF’s own servers.
                </li>
                <li><strong>Google:</strong> signing in with your Google account, and advertising (see <Ref id="ads" />).</li>
                <li><strong>Paystack:</strong> payments for Premium.</li>
                <li><strong>AI providers:</strong> the AI-assisted features, described in <Ref id="ai" />.</li>
                <li><strong>O*NET:</strong> job title and skill suggestions use occupational data from O*NET.</li>
              </Ul>
              <p>We choose these services with care, but we do not control their policies, which apply in addition to these Terms.</p>
            </Sec>

            <Sec id="ai">
              <p>
                The summary suggestions, writing analysis, job target and cover letter tools use artificial intelligence. When you use one, the text you are working on, such as
                your resume content or a job advert, is sent to an AI provider so it can produce a response. Do not include information you do not want processed this way.
              </p>
              <p>If you add a job advert by web address, our server fetches that public page to read it.</p>
              <p>
                AI output can be wrong, generic or out of date. You are responsible for checking it, for correcting anything untrue, and for what you send to an employer. We do
                not guarantee that AI output is accurate, original or right for your situation.
              </p>
            </Sec>

            <Sec id="resumes">
              <p>
                Our templates are designed with clear headings and readable text so that applicant tracking systems (ATS) can pick up your details. Every employer’s system is
                different, so we cannot promise that a resume will be read, ranked or shortlisted in any particular way, or that it will lead to an interview or a job.
              </p>
              <p>You are responsible for the accuracy and honesty of everything your resume says.</p>
            </Sec>

            <Sec id="ads">
              <p>
                To keep many tools free, RemoPDF shows advertisements served by Google advertising services (Google AdSense and Google AdMob). We do not share your documents
                with advertisers.
              </p>
              <Sub>What Google collects</Sub>
              <p>
                Google independently collects and processes device identifiers and similar data, such as advertising IDs, IP addresses, cookie data and device information, to
                serve personalised or non-personalised ads, prevent fraud and measure ad performance. You can limit personalised ads in your Google ad settings or your browser.
              </p>
              <p>
                We have no direct control over Google’s data practices. For details, see the{' '}
                <Ext href="https://admob.google.com">Google AdMob website</Ext> and <Ext href="https://policies.google.com/privacy">Google’s Privacy &amp; Terms</Ext>.
              </p>
            </Sec>

            <Sec id="use-limits">
              <p>By using RemoPDF, you agree that:</p>
              <Ul>
                <li>You will not upload documents containing malicious code, viruses, trojans or unauthorised scripts.</li>
                <li>You will not use bots, spiders, scrapers or other automated scripts to access or overload our infrastructure.</li>
                <li>You will not probe, bypass or reverse-engineer the API endpoints or security features of RemoPDF or of the services it relies on.</li>
                <li>You will not try to access another person’s account or saved resumes.</li>
                <li>You have all the legal rights, ownership or licences needed for any document or content you submit.</li>
                <li>You will use the Service only for lawful purposes.</li>
              </Ul>
              <p>Some tools have file-size or usage limits, and we may limit the rate of requests to keep the Service available for everyone.</p>
            </Sec>

            <Sec id="intellectual-property">
              <Sub>Your content</Sub>
              <p>
                You keep 100% ownership of the intellectual property rights in the documents, resumes and other content you upload or create with RemoPDF. We acquire no ownership,
                copyright or moral rights over your content. You give us only the limited permission needed to process it in order to provide the Service to you.
              </p>
              <Sub>The Service</Sub>
              <p>
                The RemoPDF name, logo, website design, interface layout, frontend code and graphics belong to RemoPDF. Adobe and related logos are registered trademarks of Adobe
                Inc. Google and Google AdMob are registered trademarks of Google LLC.
              </p>
              <p>
                This site incorporates information from O*NET Web Services by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). O*NET® is a
                trademark of USDOL/ETA.
              </p>
            </Sec>

            <Sec id="warranties">
              <p>
                The Service is provided on an <strong>“AS IS”</strong> and <strong>“AS AVAILABLE”</strong> basis, without warranties of any kind, whether express, implied or
                statutory.
              </p>
              <p>
                Without limiting that, RemoPDF does not warrant that conversions will be error-free, uninterrupted, 100% accurate in formatting, or compatible with every operating
                system or PDF viewer, or that AI-generated suggestions or ATS results will be accurate or suitable for any purpose. You are responsible for checking the files and
                text the Service produces.
              </p>
            </Sec>

            <Sec id="liability">
              <p>
                To the maximum extent permitted by applicable law, RemoPDF and its operators, affiliates, licensors or API providers shall not be liable for any indirect,
                incidental, special, consequential or punitive damages, including loss of data, business disruption or corrupted files, arising from your use of or inability to use
                the Service.
              </p>
            </Sec>

            <Sec id="indemnification">
              <p>
                You agree to defend, indemnify and hold harmless RemoPDF and its operators from and against any claims, liabilities, damages, losses and expenses (including legal
                fees) arising out of or connected with your violation of these Terms or your upload of unlawful or unauthorised content.
              </p>
            </Sec>

            <Sec id="international">
              <p>
                We make no representation that the Service complies with the laws of every country. If you use RemoPDF from outside your home country, you do so on your own
                initiative and are solely responsible for complying with local data protection and usage laws.
              </p>
            </Sec>

            <Sec id="dispute">
              <p>
                If you have a concern or dispute arising out of these Terms or your use of the Service, you agree to contact us first and try to reach an amicable resolution.
              </p>
              <p>
                Formal claims must be started by sending a written notice describing the issue to{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className={LINK}>{CONTACT_EMAIL}</a>. Disputes that remain unresolved will be settled by binding individual arbitration rather
                than court proceedings, and you waive any right to take part in a class action.
              </p>
            </Sec>

            <Sec id="opt-out">
              <p>
                You may opt out of the binding arbitration provision in <Ref id="dispute" /> by sending a written opt-out notice to{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className={LINK}>{CONTACT_EMAIL}</a> within thirty (30) days of your first use of the Service.
              </p>
            </Sec>

            <Sec id="governing-law">
              <p>
                These Terms are governed by and construed in accordance with applicable general laws, without giving effect to any principles of conflict of laws.
              </p>
            </Sec>

            <Sec id="claims">
              <p>
                Any cause of action or claim you may have arising out of or relating to these Terms or the Service must be started within one (1) year after the cause of action
                arises. Otherwise, that cause of action or claim is permanently barred.
              </p>
            </Sec>

            <Sec id="changes">
              <p>
                We may update these Terms as the Service changes. When we do, we change the “Last updated” date at the top of this page. If you keep using the Service after an
                update takes effect, you accept the updated Terms.
              </p>
            </Sec>

            <Sec id="contact">
              <p>
                If any provision of these Terms is found to be unlawful, void or unenforceable, that provision is severable and does not affect the validity and enforceability of
                the rest.
              </p>
              <div className="!mt-8 rounded-2xl bg-[#fbf3f0] p-6 sm:p-8">
                <h3 className="text-lg font-semibold text-[#0e1726]">Questions about these terms</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-700">
                  For questions, feedback or legal enquiries about these Terms, write to us at:
                </p>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="mt-3 inline-block rounded text-xl font-semibold text-[#0e1726] underline decoration-[#d9856b] decoration-2 underline-offset-4 hover:decoration-[#0e1726] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0e1726]"
                >
                  {CONTACT_EMAIL}
                </a>
              </div>
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
