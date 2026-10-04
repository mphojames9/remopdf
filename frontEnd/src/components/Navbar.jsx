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
  menu: ['M4 8h16M4 16h16'],
  close: ['M6 6l12 12M18 6 6 18'],
  chevron: ['m6 9 6 6 6-6'],
  edit: ['M4 20h4L19 9l-4-4L4 16v4Z', 'm13.5 6.5 4 4'],
  resume: ['M7 3h8l4 4v14H7z', 'M15 3v4h4', 'M10 12h6M10 16h6'],
  zip: ['M5 4h14v16H5z', 'M12 4v3m0 3v3m0 3v3', 'M10.5 7h3'],
  invoice: ['M6 3h12v18l-3-2-3 2-3-2-3 2z', 'M9 8h6M9 12h6'],
  arrow: ['M5 12h14', 'm13 6 6 6-6 6'],
  upRight: ['M7 17 17 7', 'M8 7h9v9'],
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

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0e1726]';
const DESKTOP_ITEM = `relative rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${FOCUS}`;
const MOBILE_ITEM = `flex items-center justify-between rounded-2xl px-4 py-3 text-base font-medium transition-colors ${FOCUS}`;
// Desktop: the current page gets a soft fill and a small coral dot beneath it.
const DOT = 'after:absolute after:bottom-0.5 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-[#d9856b]';
const IDLE = 'text-slate-600 hover:bg-[#0e1726]/[0.05] hover:text-[#0e1726]';

function SectionOrRouteLink({ link, onClick, mobile, activeHash, onHome }) {
  const base = mobile ? MOBILE_ITEM : DESKTOP_ITEM;
  const on = mobile ? 'bg-[#0e1726]/[0.06] text-[#0e1726]' : `bg-[#0e1726]/[0.05] text-[#0e1726] ${DOT}`;

  if (link.to) {
    return (
      <NavLink to={link.to} onClick={onClick} className={({ isActive }) => `${base} ${isActive ? on : IDLE}`}>
        {link.label}
      </NavLink>
    );
  }
  const isActive = onHome && activeHash === link.hash;
  return (
    <Link to={{ pathname: '/', hash: `#${link.hash}` }} onClick={onClick} className={`${base} ${isActive ? on : IDLE}`}>
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
        className={`${DESKTOP_ITEM} inline-flex items-center gap-1.5 ${open || anyActive ? 'bg-[#0e1726]/[0.05] text-[#0e1726]' : IDLE}`}
      >
        Tools
        <Icon name="chevron" className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Two-column menu. It opens from the Tools button and grows out of it. */}
      <div
        className={`absolute left-0 top-full z-50 w-[34rem] origin-top-left pt-4 transition duration-200 ${open ? 'visible translate-y-0 scale-100 opacity-100' : 'invisible -translate-y-1 scale-[0.97] opacity-0'}`}
      >
        <div className="grid grid-cols-2 gap-1.5 rounded-3xl bg-white p-2.5 shadow-[0_30px_80px_-24px_rgba(14,23,38,0.4)] ring-1 ring-[#0e1726]/10">
          {TOOLS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              tabIndex={open ? 0 : -1}
              className={({ isActive }) =>
                `group relative flex flex-col gap-3 rounded-2xl p-4 transition-colors hover:bg-[#fafafb] ${FOCUS} ${isActive ? 'bg-[#f3dbd1]/50' : ''}`
              }
            >
              <span className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0e1726] text-[#d9856b] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">
                  <Icon name={t.icon} />
                </span>
                <Icon name="upRight" className="h-4 w-4 -translate-x-1 translate-y-1 text-slate-400 opacity-0 transition duration-200 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100" />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-[0.95rem] font-bold text-[#0e1726]">{t.label}</span>
                <span className="mt-1 block text-sm leading-snug text-slate-600">{t.desc}</span>
              </span>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}

// On small screens the menu drops down as a floating card under the bar.
function MobileMenu({ open, onClose, activeHash, onHome }) {
  const rise = (i) => (open ? { className: 'nav-rise', style: { '--i': i } } : {});

  return (
    <div
      id="mobile-menu"
      aria-hidden={!open}
      className={`absolute inset-x-0 top-full mt-2 origin-top transition duration-300 ease-out lg:hidden ${open ? 'visible translate-y-0 scale-100 opacity-100' : 'invisible -translate-y-2 scale-[0.98] opacity-0'}`}
    >
      <nav aria-label="Mobile" className="max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-3xl bg-white p-3 shadow-[0_30px_80px_-24px_rgba(14,23,38,0.45)] ring-1 ring-[#0e1726]/10">
        <ul className="grid grid-cols-2 gap-2">
          {TOOLS.map((t, i) => (
            <li key={t.to} {...rise(i)}>
              <NavLink
                to={t.to}
                onClick={onClose}
                className={({ isActive }) => `flex h-full flex-col gap-2.5 rounded-2xl p-3.5 ring-1 ring-[#0e1726]/10 transition-colors ${FOCUS} ${isActive ? 'bg-[#f3dbd1]/60' : 'hover:bg-[#fafafb]'}`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0e1726] text-[#d9856b]">
                  <Icon name={t.icon} className="h-[1.1rem] w-[1.1rem]" />
                </span>
                <span>
                  <span className="block text-[0.95rem] font-semibold text-[#0e1726]">{t.label}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-slate-500">{t.desc}</span>
                </span>
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="mt-2 flex flex-col gap-0.5 border-t border-[#0e1726]/10 pt-2">
          {LINKS.map((l) => (
            <SectionOrRouteLink key={l.label} link={l} mobile onClick={onClose} activeHash={activeHash} onHome={onHome} />
          ))}
        </div>

        <Link to="/Workspace" onClick={onClose} className="nav-cta inline-flex mt-3 w-full">
          Open editor
          <Icon name="arrow" className="h-4 w-4" />
        </Link>
      </nav>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Navbar                                                             */
/* ------------------------------------------------------------------ */

export default function Navbar() {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const lastY = useRef(0);
  const onHome = pathname === '/';

  useHashScroll();
  const activeHash = useSectionSpy(onHome);
  const close = useCallback(() => setOpen(false), []);

  // Scroll drives the glass background; scrolling down tucks the bar away, scrolling up brings it back.
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY.current;
      setScrolled(y > 8);
      if (open || y < 160 || dy < -6) setHidden(false);
      else if (dy > 6) setHidden(true);
      if (Math.abs(dy) > 6) lastY.current = y;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [open]);

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
    // The header only reserves space; the bar itself floats inside it, so page content can show around it.
    <header className="pointer-events-none sticky top-0 z-50 px-3 pt-3 sm:px-4">
      <style>{`
        .nav-cta { align-items: center; justify-content: center; gap: .5rem; border-radius: 9999px; background: #d9856b; color: #0e1726; padding: .7rem 1.35rem; font-size: .9375rem; font-weight: 600; line-height: 1.2; box-shadow: 0 8px 20px -10px rgba(217,133,107,.9); transition: background-color .2s, transform .15s, box-shadow .2s; }
        .nav-cta svg { transition: transform .2s; }
        .nav-cta:hover { background: #e29a83; box-shadow: 0 12px 24px -10px rgba(217,133,107,1); }
        .nav-cta:hover svg { transform: translateX(3px); }
        .nav-cta:active { transform: translateY(1px); }
        .nav-cta:focus-visible { outline: 2px solid #0e1726; outline-offset: 3px; }
        @keyframes nav-rise { from { opacity: 0; translate: 0 10px; } }
        .nav-rise { animation: nav-rise .45s cubic-bezier(.16,1,.3,1) calc(var(--i, 0) * 45ms + 60ms) backwards; }
        @media (prefers-reduced-motion: reduce) { .nav-cta, .nav-cta svg, .nav-rise { transition: none; animation: none; } }
      `}</style>

      {open && <button type="button" aria-label="Close menu" tabIndex={-1} onClick={close} className="pointer-events-auto fixed inset-0 -z-10 cursor-default bg-[#0e1726]/25 backdrop-blur-sm lg:hidden" />}

      <div
        onFocus={() => setHidden(false)}
        className={`pointer-events-auto relative mx-auto max-w-6xl transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${hidden ? '-translate-y-[calc(100%+1rem)]' : 'translate-y-0'}`}
      >
        <div
          className={`flex items-center justify-between gap-4 rounded-full py-2 pl-5 pr-2 ring-1 backdrop-blur-xl transition-[background-color,box-shadow] duration-300 ${
            scrolled || open
              ? 'bg-white/85 shadow-[0_10px_40px_-12px_rgba(14,23,38,0.25)] ring-[#0e1726]/10'
              : 'bg-white/60 shadow-[0_2px_12px_-6px_rgba(14,23,38,0.12)] ring-[#0e1726]/[0.06]'
          }`}
        >
          <Link to="/" onClick={close} className="flex min-w-0 items-center rounded transition-opacity hover:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0e1726]">
            <img src={logo1} alt={BRAND} draggable={false} className="h-9 w-auto max-w-[55vw] select-none object-contain object-left" />
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-0.5 lg:flex">
            <ToolsMenu pathname={pathname} />
            {LINKS.map((l) => (
              <SectionOrRouteLink key={l.label} link={l} activeHash={activeHash} onHome={onHome} />
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/Workspace" className="nav-cta hidden lg:inline-flex">
              Open editor
              <Icon name="arrow" className="h-4 w-4" />
            </Link>

            <button
              type="button"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen((v) => !v)}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#0e1726] text-white transition-colors hover:bg-[#1f2e49] lg:hidden ${FOCUS}`}
            >
              <Icon name={open ? 'close' : 'menu'} />
            </button>
          </div>
        </div>

        <MobileMenu open={open} onClose={close} activeHash={activeHash} onHome={onHome} />
      </div>
    </header>
  );
}