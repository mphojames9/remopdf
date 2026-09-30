import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import image1 from '../assets/image1.png';
import image2 from '../assets/image2.png';
import TemplateShowcase from '../components/TemplateShowcase';

/* ------------------------------------------------------------------ */
/*  Icons — small inline SVGs, no external icon package required       */
/* ------------------------------------------------------------------ */

const iconCls = 'h-full w-full';

const IconSparkle = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={iconCls} {...props}>
    <path d="M12 3.5c.5 2.9 1.1 3.5 4 4-2.9.5-3.5 1.1-4 4-.5-2.9-1.1-3.5-4-4 2.9-.5 3.5-1.1 4-4Z" />
    <path d="M19 3v3M17.5 4.5h3" />
  </svg>
);

const IconBolt = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={iconCls} {...props}>
    <path d="M12.5 2 4 13.5h6.2L9.8 22 20 9.8h-6.4L12.5 2Z" />
  </svg>
);

const IconShield = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={iconCls} {...props}>
    <path d="M12 3.5 5 6v5.2c0 4.4 2.9 7.5 7 9.3 4.1-1.8 7-4.9 7-9.3V6l-7-2.5Z" />
    <path d="m9.2 12.3 1.9 1.9 3.7-3.9" />
  </svg>
);

const IconGrid = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={iconCls} {...props}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.4" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.4" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.4" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.4" />
  </svg>
);

const IconDownload = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={iconCls} {...props}>
    <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
);

const IconPlay = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={iconCls} {...props}>
    <path d="M8 5.5v13l11-6.5-11-6.5Z" />
  </svg>
);

const IconArrowRight = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconCls} {...props}>
    <path d="M4 12h16m0 0-6-6m6 6-6 6" />
  </svg>
);

const IconSun = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={iconCls} {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
  </svg>
);

const IconMenu = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={iconCls} {...props}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const IconClose = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={iconCls} {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Content data                                                       */
/* ------------------------------------------------------------------ */

const navLinks = [
  { label: 'Home', to: '/', kind: 'route' },
  { label: 'Templates', to: '/templates', kind: 'route' },
  { label: 'Features', to: '#features', kind: 'anchor' },
  { label: 'How It Works', to: '#how-it-works', kind: 'anchor' },
  { label: 'Pricing', to: '/pricing', kind: 'route' },
  { label: 'FAQ', to: '#faq', kind: 'anchor' },
];

const features = [
  { Icon: IconBolt, title: 'Easy to Use', desc: 'No technical skills needed' },
  { Icon: IconShield, title: 'ATS Friendly', desc: 'Get past applicant tracking' },
  { Icon: IconGrid, title: 'Professional Templates', desc: 'Modern & clean designs' },
  { Icon: IconDownload, title: 'Instant PDF', desc: 'Download in seconds' },
];

/* ------------------------------------------------------------------ */
/*  Header                                                             */
/* ------------------------------------------------------------------ */

function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? 'border-slate-200/80 bg-white/85 shadow-[0_1px_0_0_rgba(15,23,42,0.04),0_12px_30px_-18px_rgba(15,23,42,0.25)] backdrop-blur-xl'
          : 'border-transparent bg-white/60 backdrop-blur-md'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 sm:py-4 lg:px-8">
        {/* Logo */}
        <Link to="/" className="group flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 p-2 text-white shadow-md shadow-amber-500/25 transition-transform duration-300 group-hover:-rotate-3">
            <IconGrid />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Resume<span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">Pro</span>
            </span>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Build Your Future
            </span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) =>
            link.kind === 'route' ? (
              <NavLink
                key={link.label}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `relative rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                    isActive ? 'bg-amber-50 text-slate-900' : 'text-slate-600 hover:text-slate-900'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ) : (
              <a
                key={link.label}
                href={link.to}
                className="group relative rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition-colors duration-200 hover:text-slate-900"
              >
                {link.label}
                <span className="pointer-events-none absolute inset-x-4 -bottom-0.5 h-px scale-x-0 bg-slate-900 transition-transform duration-200 group-hover:scale-x-100" />
              </a>
            )
          )}
        </nav>

        {/* Right utilities */}
        <div className="hidden items-center gap-3 lg:flex">
          <button
            type="button"
            aria-label="Toggle theme"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 p-2 text-slate-500 transition-colors duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
          >
            <IconSun />
          </button>
          <Link
            to="/ResumeBuilder"
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-amber-500/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
          >
            Get Started
            <span className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5">
              <IconArrowRight />
            </span>
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 lg:hidden"
        >
          <span className="h-5 w-5">{mobileOpen ? <IconClose /> : <IconMenu />}</span>
        </button>
      </div>

      {/* Mobile panel */}
      <div
        className={`overflow-hidden border-t border-slate-100 bg-white/95 backdrop-blur-xl transition-[max-height,opacity] duration-300 lg:hidden ${
          mobileOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <nav className="flex flex-col gap-1 px-4 py-4 sm:px-6">
          {navLinks.map((link) =>
            link.kind === 'route' ? (
              <NavLink
                key={link.label}
                to={link.to}
                end={link.to === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2.5 text-sm font-medium ${
                    isActive ? 'bg-amber-50 text-slate-900' : 'text-slate-600'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ) : (
              <a
                key={link.label}
                href={link.to}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600"
              >
                {link.label}
              </a>
            )
          )}
          <Link
            to="/ResumeBuilder"
            onClick={() => setMobileOpen(false)}
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-500/25"
          >
            Get Started
            <span className="h-4 w-4">
              <IconArrowRight />
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  Photo preview stack (right column of the hero)                     */
/* ------------------------------------------------------------------ */

function ResumePreviewStack() {
  return (
    <div className="relative mx-auto max-w-xs sm:max-w-sm lg:mx-0 lg:max-w-md">
      {/* ambient glow behind the stack */}
      <div
        aria-hidden="true"
        className="absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-to-br from-amber-200/40 to-orange-200/15 blur-3xl"
      />

      {/* base card */}
      <div className="anim-fade-right relative z-0 -rotate-2 overflow-hidden rounded-[5px] border-4 border-white bg-white shadow-2xl shadow-slate-900/15">
        <img
          src={image1}
          alt="Resume preview"
          loading="eager"
          decoding="async"
          className="aspect-[3/4] w-full sm:aspect-[4/5]"
        />
      </div>

      {/* smaller card, stacked on top */}
      <div className="anim-fade-right absolute -right-3 -top-5 z-10 hidden w-[70%] rotate-6 overflow-hidden rounded-[5px] border-4 border-white shadow-xl shadow-slate-900/15 sm:block sm:w-[68%]">
        <img
          src={image2}
          alt="Second resume preview"
          loading="eager"
          decoding="async"
          className="aspect-[3/4] w-full"
        />
      </div>

      {/* cursive sticky note */}
      <p
        className="absolute -bottom-5 -left-2 z-20 hidden -rotate-6 select-none text-base text-amber-600 sm:block sm:text-lg"
        style={{ fontFamily: "'Segoe Script','Brush Script MT',cursive" }}
      >
        Your next chapter starts here
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function Home() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen w-full overflow-x-hidden bg-[#fffcf6] text-slate-900 antialiased"
      style={{ fontFamily: "'Outfit', ui-sans-serif, system-ui, sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeRight { from { opacity:0; transform:translateX(18px); } to { opacity:1; transform:translateX(0); } }
        .anim-fade-up { animation: fadeUp .7s cubic-bezier(.16,1,.3,1) both; }
        .anim-fade-right { animation: fadeRight .8s cubic-bezier(.16,1,.3,1) both; }
        .anim-delay-1 { animation-delay: .08s; }
        .anim-delay-2 { animation-delay: .16s; }
        .anim-delay-3 { animation-delay: .24s; }
        @media (prefers-reduced-motion: reduce) {
          .anim-fade-up, .anim-fade-right { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>

      <SiteHeader />

      <main>
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 right-0 -z-10 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-amber-200/40 to-orange-200/20 blur-3xl"
          />

          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:pb-28 lg:pt-20">
            {/* Left column */}
            <div className="text-center lg:text-left">
              <span className="anim-fade-up inline-flex items-center gap-2 rounded-full border border-amber-200/70 bg-amber-50 px-3.5 py-1.5 text-xs font-medium text-amber-700 sm:px-4 sm:text-sm">
                <span className="h-4 w-4 shrink-0"><IconSparkle /></span>
                Create a Professional Resume in Minutes
              </span>

              <h1 className="anim-fade-up anim-delay-1 mt-6 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                <span className="text-slate-900">Build Your</span>
                <br />
                <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                  Dream Resume
                </span>
              </h1>

              <p className="anim-fade-up anim-delay-2 mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:mt-6 sm:text-lg lg:mx-0">
                Create a professional, ATS-friendly resume with ease. Choose from modern templates, customize it to
                your style, and stand out from the crowd.
              </p>

              <div className="anim-fade-up anim-delay-2 mx-auto mt-8 grid max-w-md grid-cols-2 gap-x-5 gap-y-7 text-left sm:mt-9 sm:max-w-none sm:grid-cols-4 sm:gap-x-6 lg:mx-0">
                {features.map(({ Icon, title, desc }) => (
                  <div key={title}>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 p-2.5 text-amber-600">
                      <Icon />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-900">{title}</p>
                    <p className="mt-0.5 text-sm text-slate-500">{desc}</p>
                  </div>
                ))}
              </div>

              <div className="anim-fade-up anim-delay-3 mt-9 flex flex-col items-center gap-5 sm:mt-10 sm:flex-row sm:justify-center lg:justify-start">
                <Link
                  to="/ResumeBuilder"
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-amber-500/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 sm:w-auto"
                >
                  Build Your Resume
                  <span className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5">
                    <IconArrowRight />
                  </span>
                </Link>

                <a href="#how-it-works" className="group inline-flex items-center gap-3 text-sm font-semibold text-slate-700">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition-colors duration-200 group-hover:border-slate-900 group-hover:text-slate-900">
                    <span className="h-4 w-4"><IconPlay /></span>
                  </span>
                  <span className="border-b border-transparent group-hover:border-slate-900">Watch How It Works</span>
                </a>
              </div>
            </div>

            {/* Right column */}
            <div className="mt-4 lg:mt-0 lg:pl-6">
              <ResumePreviewStack />
            </div>
          </div>
        </section>

        <section id="templates" className="scroll-mt-24 border-t border-amber-100/70">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
            <TemplateShowcase onUseTemplate={() => navigate('/ResumeBuilder')} />
          </div>
        </section>
      </main>
    </div>
  );
}
