import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import logo1 from '../assets/logo1.png';

const BRAND = 'RemoPDF';

/* Routes where the editor needs the whole screen. Remove a path to show the nav there. */
const HIDE_ON = ['/workspace', '/resumebuilder'];

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */

const PATHS = {
  menu: ['M4 7h16M4 12h16M4 17h16'],
  close: ['M6 6l12 12M18 6 6 18'],
  chevron: ['m6 9 6 6 6-6'],
  edit: ['M4 20h4L19 9l-4-4L4 16v4Z', 'm13.5 6.5 4 4'],
  resume: ['M7 3h8l4 4v14H7z', 'M15 3v4h4', 'M10 12h6M10 16h6'],
  zip: ['M5 4h14v16H5z', 'M12 4v3m0 3v3m0 3v3', 'M10.5 7h3'],
  invoice: ['M6 3h12v18l-3-2-3 2-3-2-3 2z', 'M9 8h6M9 12h6'],
  arrow: ['M5 12h14', 'm13 6 6 6-6 6'],
};

function Icon({ name, className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Content: edit these to change the menu                             */
/* ------------------------------------------------------------------ */

const TOOLS = [
  { label: 'PDF editor', desc: 'Edit text, highlight, sign, split, lock and compress.', to: '/Workspace', icon: 'edit' },
  { label: 'Resume builder', desc: 'ATS-friendly resumes from a template.', to: '/ResumeBuilder', icon: 'resume' },
  { label: 'Zip tool', desc: 'Bundle or extract files in your browser.', to: '/ZipTool', icon: 'zip' },
  { label: 'Invoice builder', desc: 'Create a clean invoice and download it as a PDF.', to: '/InvoiceBuilder', icon: 'invoice' },
];

// Section links live on the home page. From any other page they go to "/#id" and scroll after navigating.
const LINKS = [
  { label: 'Templates', hash: 'templates' },
  { label: 'How it works', hash: 'how-it-works' },
  { label: 'FAQ', hash: 'faq' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/Contact' },
];

const SECTION_IDS = LINKS.filter((l) => l.hash).map((l) => l.hash);

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

// Scrolls to #hash after navigation. Home is lazy-loaded, so retry briefly until the section exists.
function useHashScroll() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) return undefined;
    const id = decodeURIComponent(hash.slice(1));
    let tries = 0;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = setInterval(() => {
      const el = document.getElementById(id);
      tries += 1;
      if (el) {
        el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
        clearInterval(timer);
      } else if (tries > 20) {
        clearInterval(timer);
      }
    }, 100);
    return () => clearInterval(timer);
  }, [pathname, hash]);
}

// Which home-page section is on screen, so its link can be highlighted.
function useSectionSpy(enabled) {
  const [active, setActive] = useState('');
  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === 'undefined') {
      setActive('');
      return undefined;
    }
    const seen = new Map();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => seen.set(e.target.id, e.isIntersecting));
        const current = SECTION_IDS.find((id) => seen.get(id));
        setActive(current || '');
      },
      { rootMargin: '-35% 0px -55% 0px' },
    );
    const attach = setInterval(() => {
      const els = SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean);
      if (els.length) {
        els.forEach((el) => io.observe(el));
        clearInterval(attach);
      }
    }, 300);
    return () => {
      clearInterval(attach);
      io.disconnect();
    };
  }, [enabled]);
  return active;
}

/* ------------------------------------------------------------------ */
/*  Pieces                                                             */
/* ------------------------------------------------------------------ */

const DESKTOP_ITEM = 'rounded-lg px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0e1726]';
const MOBILE_ITEM = 'flex items-center justify-between rounded-lg px-3 py-3 text-base font-medium transition-colors';

function SectionOrRouteLink({ link, onClick, mobile, activeHash, onHome }) {
  const base = mobile ? MOBILE_ITEM : DESKTOP_ITEM;
  const idle = 'text-slate-600 hover:bg-[#0e1726]/[0.04] hover:text-[#0e1726]';
  const on = 'bg-[#0e1726]/[0.06] text-[#0e1726]';

  if (link.to) {
    return (
      <NavLink to={link.to} onClick={onClick} className={({ isActive }) => `${base} ${isActive ? on : idle}`}>
        {link.label}
      </NavLink>
    );
  }
  const isActive = onHome && activeHash === link.hash;
  return (
    <Link to={{ pathname: '/', hash: `#${link.hash}` }} onClick={onClick} className={`${base} ${isActive ? on : idle}`}>
      {link.label}
    </Link>
  );
}

function ToolsMenu({ pathname }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const closeTimer = useRef(null);
  const anyActive = TOOLS.some((t) => pathname.toLowerCase() === t.to.toLowerCase());

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => wrap.current && !wrap.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Hover opens it for mouse users; touch and keyboard use the button.
  const enter = (e) => {
    if (e.pointerType !== 'mouse') return;
    clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const leave = (e) => {
    if (e.pointerType !== 'mouse') return;
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  };

  return (
    <div ref={wrap} className="relative" onPointerEnter={enter} onPointerLeave={leave}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className={`${DESKTOP_ITEM} inline-flex items-center gap-1.5 ${open || anyActive ? 'bg-[#0e1726]/[0.06] text-[#0e1726]' : 'text-slate-600 hover:bg-[#0e1726]/[0.04] hover:text-[#0e1726]'}`}
      >
        Tools
        <Icon name="chevron" className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <div
        className={`absolute left-1/2 top-full z-50 w-[26rem] -translate-x-1/2 pt-3 transition duration-200 ${open ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-1 opacity-0'}`}
      >
        <div className="rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-[#0e1726]/10">
          {TOOLS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              tabIndex={open ? 0 : -1}
              className={({ isActive }) =>
                `group flex items-start gap-3.5 rounded-xl p-3 transition-colors hover:bg-[#fafafb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0e1726] ${isActive ? 'bg-[#f3dbd1]/50' : ''}`
              }
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0e1726] text-[#d9856b] transition-transform duration-300 group-hover:scale-105">
                <Icon name={t.icon} />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-[0.95rem] font-bold text-[#0e1726]">{t.label}</span>
                <span className="mt-0.5 block text-sm leading-snug text-slate-600">{t.desc}</span>
              </span>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileMenu({ open, pathname, onClose, activeHash, onHome }) {
  const [toolsOpen, setToolsOpen] = useState(true);

  return (
    <div
      id="mobile-menu"
      className={`lg:hidden grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      aria-hidden={!open}
    >
      <div className="overflow-hidden">
        <nav aria-label="Mobile" className="max-h-[calc(100dvh-4.5rem)] overflow-y-auto border-t border-[#0e1726]/10 px-4 pb-6 pt-3 sm:px-6">
          <button
            type="button"
            tabIndex={open ? 0 : -1}
            aria-expanded={toolsOpen}
            onClick={() => setToolsOpen((v) => !v)}
            className={`${MOBILE_ITEM} w-full text-slate-600 hover:bg-[#0e1726]/[0.04]`}
          >
            Tools
            <Icon name="chevron" className={`h-4 w-4 transition-transform duration-200 ${toolsOpen ? 'rotate-180' : ''}`} />
          </button>
          {toolsOpen && (
            <ul className="mb-2 ml-2 space-y-1 border-l border-[#0e1726]/10 pl-3">
              {TOOLS.map((t) => (
                <li key={t.to}>
                  <NavLink
                    to={t.to}
                    tabIndex={open ? 0 : -1}
                    onClick={onClose}
                    className={({ isActive }) => `flex items-center gap-3 rounded-lg px-2.5 py-2.5 ${isActive ? 'bg-[#f3dbd1]/60' : 'hover:bg-[#0e1726]/[0.04]'}`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0e1726] text-[#d9856b]">
                      <Icon name={t.icon} className="h-[1.1rem] w-[1.1rem]" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[0.95rem] font-semibold text-[#0e1726]">{t.label}</span>
                      <span className="block text-xs leading-snug text-slate-500">{t.desc}</span>
                    </span>
                  </NavLink>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-1 flex flex-col gap-0.5">
            {LINKS.map((l) => (
              <SectionOrRouteLink key={l.label} link={l} mobile onClick={onClose} activeHash={activeHash} onHome={onHome} />
            ))}
          </div>

          <Link to="/Workspace" onClick={onClose} tabIndex={open ? 0 : -1} className="nav-cta mt-5 w-full">
            Open editor
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </nav>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Navbar                                                             */
/* ------------------------------------------------------------------ */

export default function Navbar() {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const onHome = pathname === '/';

  useHashScroll();
  const activeHash = useSectionSpy(onHome);
  const close = useCallback(() => setOpen(false), []);

  // Scroll state drives the glass background.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the drawer on navigation, Escape, or when the screen grows to desktop width.
  useEffect(() => close(), [pathname, close]);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && close();
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => mq.matches && close();
    window.addEventListener('keydown', onKey);
    mq.addEventListener('change', onChange);
    return () => {
      window.removeEventListener('keydown', onKey);
      mq.removeEventListener('change', onChange);
    };
  }, [close]);

  // Stop the page scrolling behind the open drawer.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (HIDE_ON.includes(pathname.toLowerCase())) return null;

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
        scrolled || open ? 'border-[#0e1726]/10 bg-[#fafafb]/90 backdrop-blur-xl' : 'border-transparent bg-[#fafafb]/60 backdrop-blur-md'
      }`}
    >
      <style>{`
        .nav-cta { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; border-radius: .625rem; background: #d9856b; color: #0e1726; padding: .7rem 1.25rem; font-size: .9375rem; font-weight: 600; line-height: 1.2; transition: background-color .2s, transform .15s; }
        .nav-cta:hover { background: #e29a83; }
        .nav-cta:active { transform: translateY(1px); }
        .nav-cta:focus-visible { outline: 2px solid #0e1726; outline-offset: 3px; }
        @media (prefers-reduced-motion: reduce) { #mobile-menu, .nav-cta { transition: none; } }
      `}</style>

      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" onClick={close} className="flex min-w-0 items-center rounded transition-opacity hover:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0e1726]">
          <img src={logo1} alt={BRAND} draggable={false} className="h-10 w-auto max-w-[60vw] select-none object-contain object-left" />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          <ToolsMenu pathname={pathname} />
          {LINKS.map((l) => (
            <SectionOrRouteLink key={l.label} link={l} activeHash={activeHash} onHome={onHome} />
          ))}
        </nav>

        <Link to="/Workspace" className="nav-cta hidden lg:inline-flex">
          Open editor
        </Link>

        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center justify-center rounded-[0.625rem] border border-[#cbd2dc] bg-white p-2.5 text-[#0e1726] transition-colors hover:border-[#0e1726] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0e1726] lg:hidden"
        >
          <Icon name={open ? 'close' : 'menu'} />
        </button>
      </div>

      <MobileMenu open={open} pathname={pathname} onClose={close} activeHash={activeHash} onHome={onHome} />
    </header>
  );
}
