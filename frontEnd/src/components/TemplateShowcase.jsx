import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import ResumePhoto, { PHOTO_DEFAULTS } from './Resume/Sections/ResumePhoto';
import profile2 from '../assets/profile2.png';

// Import actual templates
import BlueSidebarTemplate from './Resume/Templates/BlueSidebarTemplate';
import GreenHeaderTemplate from './Resume/Templates/GreenHeaderTemplate';
import PinkHeaderTemplate from './Resume/Templates/PinkHeaderTemplate';
import DarkTopTemplate from './Resume/Templates/DarkTopTemplate';


const STORAGE_KEY_TEMPLATE = 'resumeBuilder:selectedTemplate';
const STORAGE_KEY_COLOR = 'resumeBuilder:selectedColor';
const TEMPLATE_IDS = ['blue-sidebar', 'green-header', 'pink-header', 'dark-top'];
const DEFAULT_TEMPLATE = 'blue-sidebar';
const GRAYSCALE = '#475569';
const HEX_RE = /^#[0-9a-f]{6}$/i;

const COPY = {
  title: 'Pick a layout, then make it yours',
  subtitle: 'Four layouts, any accent colour. Choose one and watch it update before you start.',
  colors: 'Accent colour',
  templates: 'Layouts',
  preview: 'Preview full size',
  use: 'Start with this template',
  closePreview: 'Close preview',
  back: 'Back',
  featured: 'Recommended',
};

const PAGE_WIDTH_PX = 794;
const PAGE_HEIGHT_PX = 1123;

const SHOWCASE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&display=swap');
.ts-display { font-family: 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif; }
.ts-stage { background: var(--ts-accent); background: color-mix(in srgb, var(--ts-accent) 50%, #05080f); }
.ts-spot { position: relative; isolation: isolate; }
.ts-spot::before {
  content: ''; position: absolute; inset: 0; z-index: -1; border-radius: inherit; pointer-events: none;
  background: radial-gradient(ellipse 70% 55% at 50% 38%, rgba(255,255,255,.16), transparent 70%);
}
@media (prefers-reduced-motion: no-preference) {
  @keyframes ts-settle { from { opacity: 0; transform: translateY(26px) rotate(-1.4deg); } to { opacity: 1; transform: none; } }
  @keyframes ts-fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes ts-modal { from { opacity: 0; transform: translateY(16px) scale(.97); } to { opacity: 1; transform: none; } }
  @keyframes ts-bounce { 0% { transform: scale(1); } 40% { transform: scale(1.25); } 100% { transform: scale(1); } }

  .ts-paper { opacity: 0; }
  .ts-paper.ts-in { opacity: 1; animation: ts-settle .7s cubic-bezier(.2,.8,.2,1) both; }
  .ts-fade { animation: ts-fade .25s ease-out; }
  .ts-modal { animation: ts-modal .35s cubic-bezier(.2,.9,.25,1.05); }
  .ts-bounce { animation: ts-bounce .35s ease-out; }

  .ts-stage { transition: background-color .6s ease; }
  .ts-thumb, .ts-thumb * { transition: background-color .45s ease, color .45s ease, border-color .45s ease; }
}
`;

const SCROLLBAR_CSS = `
.pro-scroll { --sb-thumb: #cbd5e1; --sb-thumb-hover: #94a3b8; --sb-thumb-active: #64748b; }
.pro-scroll-dark { --sb-thumb: rgba(255,255,255,.16); --sb-thumb-hover: rgba(255,255,255,.3); --sb-thumb-active: rgba(255,255,255,.45); }
.pro-scroll::-webkit-scrollbar { width: 12px; height: 12px; }
.pro-scroll::-webkit-scrollbar-track, .pro-scroll::-webkit-scrollbar-corner { background: transparent; }
.pro-scroll::-webkit-scrollbar-thumb { background-color: var(--sb-thumb); background-clip: padding-box; border: 4px solid transparent; border-radius: 999px; min-height: 44px; }
.pro-scroll::-webkit-scrollbar-thumb:hover { background-color: var(--sb-thumb-hover); border-width: 3px; }
.pro-scroll::-webkit-scrollbar-thumb:active { background-color: var(--sb-thumb-active); border-width: 3px; }
@supports not selector(::-webkit-scrollbar) {
  .pro-scroll { scrollbar-width: thin; scrollbar-color: var(--sb-thumb) transparent; }
}
`;

const useInView = (threshold = 0.1) => {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);

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
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return [ref, seen];
};

const DEFAULT_ACCENT = {
  'blue-sidebar': '#1e3a8a',
  'green-header': '#15803d',
  'pink-header': '#be185d',
  'dark-top': '#334155',
};

const ACCENT_SWATCHES = [
  { hex: '#1e3a8a', label: 'Navy' },
  { hex: '#2b6cb0', label: 'Steel blue' },
  { hex: '#0f766e', label: 'Teal' },
  { hex: '#166534', label: 'Forest' },
  { hex: '#881337', label: 'Burgundy' },
  { hex: '#1f2937', label: 'Charcoal' },
];

const DEMO_RESUME = {
  name: 'Mpho James Matli',
  title: 'Software Engineer & Founder',
  email: 'hello@remopdf.site',
  phone: '+27 82 123 4567',
  location: 'Gauteng, South Africa',
  website: 'www.remopdf.site',
  linkedin: 'github.com/mphojames9',
  highlights: [
    { label: 'Platform Reach', value: '100K+ Files Processed' },
    { label: 'Core Expertise', value: 'Full-Stack & Mobile' },
    { label: 'Leadership', value: 'Senior Operational Mgmt' },
  ],
  summary:
    'Full-stack software engineer and founder with a proven track record of architecting web document utilities, native Android mobile software, and high-throughput Python backends. Combines deep technical proficiency in React, FastAPI, PyMuPDF, and Capacitor with multi-year senior management experience leading operational excellence.',
  jobs: [
    {
      title: 'Founder & Lead Software Engineer',
      employer: 'RemoPDF',
      dates: '2026 – Present',
      points: [
        'Engineered an AI-driven resume builder and digital document utility suite utilizing React, Vite, Tailwind CSS, FastAPI, and MongoDB.',
        'Integrated PyMuPDF & pdf2docx engines to process complex document transformations with sub-second backend response times.',
        'Monetized web & native app channels via Google AdSense and native Android Google Mobile Ads (AdMob) SDK integrations.',
        'Organized and hosted the official product launch event in Braamfontein featuring guest keynote collaboration with ALX leadership.',
      ],
    },
    {
      title: 'Web Developer Intern',
      employer: 'Sandtech',
      dates: 'Oct 2024 – Nov 2024',
      points: [
        'Collaborated remotely across offshore development sprints, optimizing client-side rendering speed by 35%.',
        'Implemented responsive cross-browser interface components and resolved complex cross-platform UI state bugs.',
      ],
    },
    {
      title: 'Senior Manager & Quality Controller',
      employer: 'Beekman Super Canopies',
      dates: '2014 – 2023',
      points: [
        'Promoted through Quality Controller and Assistant Manager roles to Senior Manager, overseeing multi-team assembly lines.',
        'Streamlined quality assurance protocols, reducing production defects and improving overall throughput reliability.',
      ],
    },
  ],
  education: [
    {
      degree: 'Software Engineering Certificate (Back-End)',
      school: 'ALX & MasterCard Foundation',
      dates: '2023 – 2024',
      detail: 'Specialized in distributed systems, back-end web architecture, and Python API microservices.',
    },
    {
      degree: 'Diploma in Management',
      school: 'Intec College SA',
      dates: 'Feb 2018',
      detail: 'Focus on strategic planning, operational workflows, and team leadership.',
    },
  ],
  projects: [
    { name: 'Word Fun Adventure', category: 'Android Native', detail: 'Casual word puzzle app built with Capacitor, Java, Gradle, and AdMob integration.' },
    { name: 'Nexus Defense', category: 'Web Graphics', detail: 'Interactive 2D HTML5 Canvas space shooter game with high-performance collision physics.' },
    { name: 'Fall Detection System', category: 'IoT / Smartwatch', detail: 'Smartwatch fall detection algorithm engineered during senior smartwatch internship.' },
  ],
  certifications: [
    { name: 'Skyscanner Front-End Engineering Job Simulation', year: 'May 2026' },
    { name: 'ALX AI Starter Kit Certificate', year: 'Mar 2025' },
    { name: 'ALX Ventures Gig-at-a-Startup Certificate', year: 'Nov 2024' },
    { name: 'Google Hardware Hackathon Participant', year: 'Nov 2024' },
  ],
  skills: [
    { text: 'React & Vite', rating: 5, category: 'Frontend' },
    { text: 'Python (FastAPI)', rating: 5, category: 'Backend' },
    { text: 'Tailwind CSS', rating: 5, category: 'Design' },
    { text: 'MongoDB & PyMuPDF', rating: 5, category: 'Data' },
    { text: 'Java & Capacitor', rating: 4, category: 'Mobile' },
    { text: 'Node.js & Render', rating: 4, category: 'Cloud' },
  ],
  languages: [
    { name: 'English', level: 'Fluent / Professional' },
    { name: 'Setswana', level: 'Fluent / Native' },
  ],
  interests: ['Native Android Apps', 'Game Development', 'Music Composition', 'Hardware Hackathons'],
};

// Generates correct props formatting for the actual Template components
const getTemplateProps = (accentColor) => {
  const D = DEMO_RESUME;
  return {
    fullName: D.name,
    contactList: [D.email, D.phone, D.location, D.website, D.linkedin].filter(Boolean),
    personal: {
      profession: D.title,
      photo: profile2,
      photoStyle: PHOTO_DEFAULTS,
    },
    summary: [D.summary],
    jobs: D.jobs.map((j, i) => ({
      id: `job-${i}`,
      title: j.title,
      employer: j.employer,
      date: j.dates,
      achievements: j.points,
    })),
    educations: [
      ...D.education.map((e, i) => ({
        id: `edu-${i}`,
        degree: e.degree,
        institution: e.school,
        date: e.dates,
        achievements: e.detail ? [e.detail] : [],
      })),
      // Merge certifications into education array seamlessly for standard render formatting
      ...D.certifications.map((c, i) => ({
        id: `cert-${i}`,
        degree: c.name,
        date: c.year,
        achievements: [],
      }))
    ],
    namedSkills: D.skills.map((s, i) => ({
      id: `skill-${i}`,
      text: s.text,
      rating: s.rating,
    })),
    projects: D.projects.map((p, i) => ({
      id: `proj-${i}`,
      title: p.name,
      employer: p.category, 
      achievements: [p.detail],
    })),
    languages: {
      enabled: true,
      items: D.languages.map((l, i) => ({
        id: `lang-${i}`,
        name: l.name,
        level: l.level,
      })),
    },
    hobbies: D.interests.map((h, i) => ({
      id: `hob-${i}`,
      text: h,
    })),
    references: [],
    isEmpty: false,
    accentColor,
    sectionOrder: [
      'summary',
      'experience',
      'education',
      'skills',
      'projects',
      'languages',
      'hobbies'
    ],
    edit: { sections: {} },
  };
};

const TemplateThumb = ({ children, className = 'w-full' }) => {
  const ref = useRef(null);
  const [scale, setScale] = useState(0.24);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => setScale(el.clientWidth / PAGE_WIDTH_PX);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className={`ts-thumb relative aspect-[1/1.414] overflow-hidden bg-white pointer-events-none select-none ${className}`} aria-hidden="true">
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ width: PAGE_WIDTH_PX, height: PAGE_HEIGHT_PX, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
};

const TEMPLATE_CARDS = [
  { id: 'blue-sidebar', label: 'Sidebar', note: 'Contact details and skills in a side column.', Template: BlueSidebarTemplate },
  { id: 'green-header', label: 'Accent', note: 'A colour header over a clean single column.', Template: GreenHeaderTemplate },
  { id: 'pink-header', label: 'Modern', note: 'Bold header with generous spacing.', Template: PinkHeaderTemplate },
  { id: 'dark-top', label: 'Professional', note: 'A dark banner for a formal tone.', Template: DarkTopTemplate },
];

const readTemplate = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_TEMPLATE);
    return TEMPLATE_IDS.includes(saved) ? saved : DEFAULT_TEMPLATE;
  } catch {
    return DEFAULT_TEMPLATE;
  }
};

const readColor = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_COLOR);
    return HEX_RE.test(saved) ? saved : null;
  } catch {
    return null;
  }
};

const saveChoice = (template, color) => {
  try {
    localStorage.setItem(STORAGE_KEY_TEMPLATE, template);
    if (color) localStorage.setItem(STORAGE_KEY_COLOR, color);
    else localStorage.removeItem(STORAGE_KEY_COLOR);
  } catch {}
};

const IconCheck = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
  </svg>
);

const IconClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconReset = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const colorName = (color) => {
  if (color == null) return 'Template default';
  if (color === GRAYSCALE) return 'Grayscale';
  const hit = ACCENT_SWATCHES.find((s) => s.hex === color);
  return hit ? hit.label : `Custom ${color.toUpperCase()}`;
};

const SWATCH = 'h-8 w-8 rounded-full transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2';
const SWATCH_ON = 'ring-2 ring-offset-2 ring-slate-900 ts-bounce';

const ColorBar = ({ color, onChange }) => {
  const isCustom = !!color && color !== GRAYSCALE && !ACCENT_SWATCHES.some((s) => s.hex === color);

  return (
    <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Resume colour">
      <button
        type="button"
        onClick={() => onChange(null)}
        title="Template default"
        aria-label="Template default colour"
        aria-pressed={color === null}
        className={`${SWATCH} flex items-center justify-center border border-slate-300 bg-white text-slate-500 ${color === null ? SWATCH_ON : ''}`}
      >
        <IconReset />
      </button>

      {ACCENT_SWATCHES.map((swatch) => (
        <button
          key={swatch.hex}
          type="button"
          onClick={() => onChange(swatch.hex)}
          title={swatch.label}
          aria-label={swatch.label}
          aria-pressed={color === swatch.hex}
          style={{ backgroundColor: swatch.hex }}
          className={`${SWATCH} ${color === swatch.hex ? SWATCH_ON : ''}`}
        />
      ))}

      <button
        type="button"
        onClick={() => onChange(GRAYSCALE)}
        title="Grayscale"
        aria-label="Grayscale"
        aria-pressed={color === GRAYSCALE}
        className={`${SWATCH} relative flex items-center justify-center border border-slate-300 bg-white ${color === GRAYSCALE ? SWATCH_ON : ''}`}
      >
        <span className="absolute h-px w-[28px] rotate-45 bg-slate-400" />
      </button>

      <label
        title="Custom colour"
        className={`${SWATCH} relative flex cursor-pointer items-center justify-center border border-dashed text-base font-bold leading-none focus-within:ring-2 focus-within:ring-slate-900 focus-within:ring-offset-2 ${
          isCustom ? `${SWATCH_ON} border-transparent text-white` : 'border-slate-400 text-slate-600 hover:bg-slate-100'
        }`}
        style={isCustom ? { backgroundColor: color } : undefined}
      >
        +
        <input
          type="color"
          aria-label="Custom colour"
          value={isCustom ? color : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
};

const TemplateRow = ({ card, color, selected, featured, featuredLabel, onSelect }) => {
  const { id, label, note, Template } = card;
  const accent = color || DEFAULT_ACCENT[id];
  const props = useMemo(() => getTemplateProps(accent), [accent]);

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(id)}
      className={`flex w-full items-center gap-4 rounded-2xl p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${
        selected ? 'bg-slate-900 text-white' : 'text-slate-900 hover:bg-slate-100'
      }`}
    >
      <TemplateThumb className="w-14 shrink-0 rounded-[3px] shadow-md ring-1 ring-black/10">
        <Template {...props} />
      </TemplateThumb>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{label}</span>
          {featured && (
            <span className="rounded-full bg-amber-300 px-2 py-0.5 text-xs font-semibold text-slate-900">{featuredLabel}</span>
          )}
        </span>
        <span className={`mt-0.5 block text-sm ${selected ? 'text-slate-300' : 'text-slate-500'}`}>{note}</span>
      </span>

      {selected && (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-slate-900">
          <IconCheck />
        </span>
      )}
    </button>
  );
};

const Stage = ({ card, accent, visible }) => {
  const props = useMemo(() => getTemplateProps(accent), [accent]);
  const { Template } = card;

  return (
    <div
      className="ts-stage ts-spot flex h-full items-center justify-center rounded-[28px] px-6 py-10 sm:px-14 sm:py-14"
      style={{ '--ts-accent': accent }}
    >
      <div key={card.id} className={`ts-paper w-full max-w-[460px] ${visible ? 'ts-in' : ''}`}>
        <TemplateThumb className="w-full rounded-[3px] shadow-[0_40px_80px_-24px_rgba(0,0,0,.65),0_8px_20px_-8px_rgba(0,0,0,.4)]">
          <Template {...props} />
        </TemplateThumb>
      </div>
    </div>
  );
};

const BTN_PRIMARY =
  'inline-flex items-center justify-center rounded-full bg-[#d9856b] px-6 py-3 text-sm font-bold text-slate-900 transition hover:bg-[#e39478] active:scale-[.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2';
const BTN_SECONDARY =
  'inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 active:scale-[.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2';

const PreviewModal = ({ templateId, color, onClose, onUse }) => {
  const card = TEMPLATE_CARDS.find((c) => c.id === templateId);
  const startRef = useRef(null);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    startRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!card) return null;

  const accent = color || DEFAULT_ACCENT[card.id];
  const { Template } = card;
  const templateProps = getTemplateProps(accent);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={`Preview of ${card.label}`}>
      <div className="ts-fade absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div className="ts-modal relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between px-6 py-4">
          <div>
            <h2 className="ts-display text-xl font-extrabold text-slate-900">{card.label}</h2>
            <p className="text-sm text-slate-500">{card.note}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={COPY.closePreview}
            className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          >
            <IconClose />
          </button>
        </div>

        <div className="ts-stage pro-scroll pro-scroll-dark flex-1 overflow-auto p-4 sm:p-10" style={{ '--ts-accent': accent }}>
          {/* Templates render multiple pages; stack them at true page width and let the area scroll */}
          <div className="mx-auto flex select-none flex-col gap-6" style={{ width: PAGE_WIDTH_PX }}>
            <Template {...templateProps} />
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between px-6 py-4">
          <button type="button" onClick={onClose} className={BTN_SECONDARY}>{COPY.back}</button>
          <button type="button" ref={startRef} onClick={() => onUse(card.id)} className={BTN_PRIMARY}>{COPY.use}</button>
        </div>
      </div>
    </div>
  );
};

export default function TemplateShowcase({
  onUseTemplate,
  featuredTemplate,
  featuredLabel = COPY.featured,
  title = COPY.title,
  subtitle = COPY.subtitle,
  className = '',
}) {
  const [ref, seen] = useInView(0.15);
  const [selected, setSelected] = useState(DEFAULT_TEMPLATE);
  const [color, setColor] = useState(null);
  const [previewId, setPreviewId] = useState(null);

  useEffect(() => {
    setSelected(readTemplate());
    setColor(readColor());
  }, []);

  const handleUse = useCallback(
    (templateId) => {
      saveChoice(templateId, color);
      onUseTemplate({ template: templateId, color });
    },
    [color, onUseTemplate],
  );
  const closePreview = useCallback(() => setPreviewId(null), []);

  const card = TEMPLATE_CARDS.find((c) => c.id === selected) || TEMPLATE_CARDS[0];
  const accent = color || DEFAULT_ACCENT[card.id];

  return (
    <section ref={ref} className={`py-12 sm:py-20 ${className}`}>
      <style>{SHOWCASE_CSS}</style>
      <style>{SCROLLBAR_CSS}</style>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-14 lg:gap-y-8">
          <header className="lg:col-start-1 lg:row-start-1">
            <h2 className="ts-display text-4xl font-extrabold leading-[1.03] tracking-tight text-slate-900 sm:text-5xl" style={{ textWrap: 'balance' }}>
              {title}
            </h2>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-slate-600">{subtitle}</p>
          </header>

          <div className="lg:col-start-2 lg:row-start-1 lg:row-span-2">
            <Stage card={card} accent={accent} visible={seen} />
          </div>

          <div className="flex flex-col gap-8 lg:col-start-1 lg:row-start-2">
            <div role="group" aria-label={COPY.templates} className="-mx-3 flex flex-col gap-1.5">
              {TEMPLATE_CARDS.map((c) => (
                <TemplateRow
                  key={c.id}
                  card={c}
                  color={color}
                  selected={selected === c.id}
                  onSelect={setSelected}
                  featured={featuredTemplate === c.id}
                  featuredLabel={featuredLabel}
                />
              ))}
            </div>

            <div>
              <div className="mb-3 flex items-baseline justify-between gap-4">
                <h3 className="text-sm font-semibold text-slate-900">{COPY.colors}</h3>
                <span className="text-sm text-slate-500">{colorName(color)}</span>
              </div>
              <ColorBar color={color} onChange={setColor} />
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => handleUse(card.id)} className={BTN_PRIMARY}>{COPY.use}</button>
              <button type="button" onClick={() => setPreviewId(card.id)} className={BTN_SECONDARY}>{COPY.preview}</button>
            </div>
          </div>
        </div>
      </div>

      {previewId && (
        <PreviewModal templateId={previewId} color={color} onClose={closePreview} onUse={handleUse} />
      )}
    </section>
  );
}

// Shared with TemplateSlideshow.jsx
export { TEMPLATE_CARDS, DEFAULT_ACCENT, TemplateThumb, getTemplateProps, saveChoice, readColor };
