import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, memo } from 'react';
import ResumePhoto, { PHOTO_DEFAULTS } from './Resume/Sections/ResumePhoto';
import profile2 from '../assets/profile2.png';

// Import actual templates
import BlueSidebarTemplate from './Resume/Templates/BlueSidebarTemplate';
import GreenHeaderTemplate from './Resume/Templates/GreenHeaderTemplate';
import PinkHeaderTemplate from './Resume/Templates/PinkHeaderTemplate';
import DarkTopTemplate from './Resume/Templates/DarkTopTemplate';
import TealTimelineTemplate from './Resume/Templates/TealTimelineTemplate';
import BurgundyExecutiveTemplate from './Resume/Templates/BurgundyExecutiveTemplate';
import SteelMinimalTemplate from './Resume/Templates/SteelMinimalTemplate';
import ForestClassicTemplate from './Resume/Templates/ForestClassicTemplate';
import CharcoalCompactTemplate from './Resume/Templates/CharcoalCompactTemplate';
import IndigoCreativeTemplate from './Resume/Templates/IndigoCreativeTemplate';
import PlumElegantTemplate from './Resume/Templates/PlumElegantTemplate';
import CrimsonBoldTemplate from './Resume/Templates/CrimsonBoldTemplate';
import CobaltContemporaryTemplate from './Resume/Templates/CobaltContemporaryTemplate';
import CopperStudioTemplate from './Resume/Templates/CopperStudioTemplate';
import CyanMetroTemplate from './Resume/Templates/CyanMetroTemplate';
import OliveHeritageTemplate from './Resume/Templates/OliveHeritageTemplate';
import SkyNordicTemplate from './Resume/Templates/SkyNordicTemplate';
import MagentaVividTemplate from './Resume/Templates/MagentaVividTemplate';
import GoldPrestigeTemplate from './Resume/Templates/GoldPrestigeTemplate';
import KhakiPioneerTemplate from './Resume/Templates/KhakiPioneerTemplate';
import SlateRefinedTemplate from './Resume/Templates/SlateRefinedTemplate';
import MidnightCorporateTemplate from './Resume/Templates/MidnightCorporateTemplate';
import EmeraldFreshTemplate from './Resume/Templates/EmeraldFreshTemplate';
import UmberScholarTemplate from './Resume/Templates/UmberScholarTemplate';
import StoneJournalTemplate from './Resume/Templates/StoneJournalTemplate';
import RoseGracefulTemplate from './Resume/Templates/RoseGracefulTemplate';
import VioletGalleryTemplate from './Resume/Templates/VioletGalleryTemplate';
import SageSereneTemplate from './Resume/Templates/SageSereneTemplate';
import DenimEditorialTemplate from './Resume/Templates/DenimEditorialTemplate';
import OrchidBoutiqueTemplate from './Resume/Templates/OrchidBoutiqueTemplate';
import { DEFAULT_ACCENT } from './Resume/Templates/templateShared';


const STORAGE_KEY_TEMPLATE = 'resumeBuilder:selectedTemplate';
const STORAGE_KEY_COLOR = 'resumeBuilder:selectedColor';
const DEFAULT_TEMPLATE = 'blue-sidebar';
const GRAYSCALE = '#475569';
const HEX_RE = /^#[0-9a-f]{6}$/i;

const COPY = {
  title: 'Pick a layout, then make it yours',
  subtitle: 'Pick any layout and any accent colour, and watch it update before you start.',
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

const AUTOPLAY_MS = 3500; // time each layout stays on stage while auto-playing
const LEAVE_MS = 500; // how long the outgoing layout lingers while it slides away

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  @keyframes ts-in-next { from { opacity: 0; transform: translateX(56px) rotate(1.8deg) scale(.96); } to { opacity: 1; transform: none; } }
  @keyframes ts-in-prev { from { opacity: 0; transform: translateX(-56px) rotate(-1.8deg) scale(.96); } to { opacity: 1; transform: none; } }
  @keyframes ts-out-next { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateX(-56px) rotate(-1.8deg) scale(.96); } }
  @keyframes ts-out-prev { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateX(56px) rotate(1.8deg) scale(.96); } }

  .ts-paper { opacity: 0; }
  .ts-paper.ts-in { opacity: 1; animation: ts-settle .7s cubic-bezier(.2,.8,.2,1) both; }
  .ts-paper.ts-in.ts-dir-next { animation: ts-in-next .6s cubic-bezier(.2,.8,.2,1) both; }
  .ts-paper.ts-in.ts-dir-prev { animation: ts-in-prev .6s cubic-bezier(.2,.8,.2,1) both; }
  .ts-leave.ts-dir-next { animation: ts-out-next .45s cubic-bezier(.4,0,.8,.4) both; }
  .ts-leave.ts-dir-prev { animation: ts-out-prev .45s cubic-bezier(.4,0,.8,.4) both; }
  .ts-fade { animation: ts-fade .25s ease-out; }
  .ts-modal { animation: ts-modal .35s cubic-bezier(.2,.9,.25,1.05); }
  .ts-bounce { animation: ts-bounce .35s ease-out; }
  @keyframes ts-swap { from { opacity: 0; transform: scale(.985); } to { opacity: 1; transform: none; } }
  .ts-swap { transform-origin: top center; animation: ts-swap .55s cubic-bezier(.45,.05,.2,1) both; }

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

// Unlike useInView, this tracks live visibility so autoplay stops when scrolled away.
const useOnScreen = (ref, threshold = 0.15) => {
  const [onScreen, setOnScreen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setOnScreen(true);
      return undefined;
    }
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold]);

  return onScreen;
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
  { id: 'teal-timeline', label: 'Timeline', note: 'Experience and education on a vertical timeline.', Template: TealTimelineTemplate },
  { id: 'burgundy-executive', label: 'Executive', note: 'Clean single column with burgundy accents.', Template: BurgundyExecutiveTemplate },
  { id: 'steel-minimal', label: 'Minimal', note: 'Clean single column with steel accents.', Template: SteelMinimalTemplate },
  { id: 'forest-classic', label: 'Classic', note: 'Clean single column with forest accents.', Template: ForestClassicTemplate },
  { id: 'charcoal-compact', label: 'Compact', note: 'Clean single column with charcoal accents.', Template: CharcoalCompactTemplate },
  { id: 'indigo-creative', label: 'Creative', note: 'Clean single column with indigo accents.', Template: IndigoCreativeTemplate },
  { id: 'plum-elegant', label: 'Elegant', note: 'Clean single column with plum accents.', Template: PlumElegantTemplate },
  { id: 'crimson-bold', label: 'Bold', note: 'Clean single column with crimson accents.', Template: CrimsonBoldTemplate },
  { id: 'cobalt-contemporary', label: 'Contemporary', note: 'Clean single column with cobalt accents.', Template: CobaltContemporaryTemplate },
  { id: 'copper-studio', label: 'Studio', note: 'Clean single column with copper accents.', Template: CopperStudioTemplate },
  { id: 'cyan-metro', label: 'Metro', note: 'Clean single column with cyan accents.', Template: CyanMetroTemplate },
  { id: 'olive-heritage', label: 'Heritage', note: 'Clean single column with olive accents.', Template: OliveHeritageTemplate },
  { id: 'sky-nordic', label: 'Nordic', note: 'Clean single column with sky accents.', Template: SkyNordicTemplate },
  { id: 'magenta-vivid', label: 'Vivid', note: 'Clean single column with magenta accents.', Template: MagentaVividTemplate },
  { id: 'gold-prestige', label: 'Prestige', note: 'Clean single column with gold accents.', Template: GoldPrestigeTemplate },
  { id: 'khaki-pioneer', label: 'Pioneer', note: 'Clean single column with khaki accents.', Template: KhakiPioneerTemplate },
  { id: 'slate-refined', label: 'Refined', note: 'Clean single column with slate accents.', Template: SlateRefinedTemplate },
  { id: 'midnight-corporate', label: 'Corporate', note: 'Clean single column with midnight accents.', Template: MidnightCorporateTemplate },
  { id: 'emerald-fresh', label: 'Fresh', note: 'Clean single column with emerald accents.', Template: EmeraldFreshTemplate },
  { id: 'umber-scholar', label: 'Scholar', note: 'Clean single column with umber accents.', Template: UmberScholarTemplate },
  { id: 'stone-journal', label: 'Journal', note: 'Clean single column with stone accents.', Template: StoneJournalTemplate },
  { id: 'rose-graceful', label: 'Graceful', note: 'Clean single column with rose accents.', Template: RoseGracefulTemplate },
  { id: 'violet-gallery', label: 'Gallery', note: 'Clean single column with violet accents.', Template: VioletGalleryTemplate },
  { id: 'sage-serene', label: 'Serene', note: 'Clean single column with sage accents.', Template: SageSereneTemplate },
  { id: 'denim-editorial', label: 'Editorial', note: 'Clean single column with denim accents.', Template: DenimEditorialTemplate },
  { id: 'orchid-boutique', label: 'Boutique', note: 'Clean single column with orchid accents.', Template: OrchidBoutiqueTemplate },
];

const TEMPLATE_IDS = TEMPLATE_CARDS.map((c) => c.id);

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

const IconPrev = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const IconNext = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const IconPlay = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
    <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
  </svg>
);

const IconPause = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
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

// memo + a cached thumbnail element: when the selection moves, only the two rows whose highlight
// changes re-render, and the (heavy) resume inside every thumbnail is left untouched.
const TemplateRow = memo(function TemplateRow({ card, color, selected, featured, featuredLabel, onSelect }) {
  const { id, label, note, Template } = card;
  const accent = color || DEFAULT_ACCENT[id];
  const props = useMemo(() => getTemplateProps(accent), [accent]);
  const [rowRef, seen] = useInView(0.01);
  const thumb = useMemo(() => (seen ? <Template {...props} /> : null), [seen, Template, props]);

  return (
    <button
      ref={rowRef}
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(id)}
      className={`flex w-full shrink-0 items-center gap-4 rounded-2xl p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${
        selected ? 'bg-slate-900 text-white' : 'text-slate-900 hover:bg-slate-100'
      }`}
    >
      <TemplateThumb className="w-14 shrink-0 rounded-[3px] shadow-md ring-1 ring-black/10">
        {thumb}
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
});

const PAPER_CLASS =
  'w-full rounded-[3px] shadow-[0_40px_80px_-24px_rgba(0,0,0,.65),0_8px_20px_-8px_rgba(0,0,0,.4)]';

const CTRL_BTN =
  'flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/15 active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white';

// The layout that was just on stage; it stays mounted briefly so it can slide out.
const LeavingPaper = ({ card, accent, direction }) => {
  const props = useMemo(() => getTemplateProps(accent), [accent]);
  const { Template } = card;

  return (
    <div
      className={`ts-leave ts-dir-${direction > 0 ? 'next' : 'prev'} pointer-events-none absolute inset-0`}
      aria-hidden="true"
    >
      <TemplateThumb className={PAPER_CLASS}>
        <Template {...props} />
      </TemplateThumb>
    </div>
  );
};

const Stage = ({ card, accent, visible, direction, index, total, playing, onPrev, onNext, onTogglePlay }) => {
  const props = useMemo(() => getTemplateProps(accent), [accent]);
  const { Template } = card;
  const dir = direction > 0 ? 'next' : direction < 0 ? 'prev' : '';

  const lastShown = useRef({ card, accent });
  const [leaving, setLeaving] = useState(null);

  // When the layout changes, keep the previous one around so it can animate out.
  useLayoutEffect(() => {
    const last = lastShown.current;
    if (last.card.id !== card.id && direction !== 0 && !prefersReducedMotion()) {
      setLeaving({ card: last.card, accent: last.accent, direction });
    }
    lastShown.current = { card, accent };
  }, [card, accent, direction]);

  useEffect(() => {
    if (!leaving) return undefined;
    const t = setTimeout(() => setLeaving(null), LEAVE_MS);
    return () => clearTimeout(t);
  }, [leaving]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onNext();
    }
  };

  return (
    <div
      className="ts-stage ts-spot flex h-full flex-col items-center justify-center gap-6 overflow-hidden rounded-[28px] px-6 py-8 sm:px-14 sm:py-12"
      style={{ '--ts-accent': accent }}
      role="group"
      aria-roledescription="carousel"
      aria-label="Layout preview"
    >
      <div className="relative w-full max-w-[460px]">
        {leaving && <LeavingPaper key={`leaving-${leaving.card.id}`} {...leaving} />}

        <div
          key={card.id}
          className={`ts-paper relative ${visible ? 'ts-in' : ''} ${visible && dir ? `ts-dir-${dir}` : ''}`}
        >
          <TemplateThumb className={PAPER_CLASS}>
            <Template {...props} />
          </TemplateThumb>
        </div>
      </div>

      <div
        className="flex items-center gap-1 rounded-full bg-white/10 p-1.5 text-white ring-1 ring-white/15 backdrop-blur"
        role="group"
        aria-label="Layout controls"
        onKeyDown={handleKeyDown}
      >
        <button type="button" onClick={onPrev} aria-label="Previous layout" title="Previous" className={CTRL_BTN}>
          <IconPrev />
        </button>
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={playing ? 'Pause slideshow' : 'Play slideshow'}
          title={playing ? 'Pause' : 'Play'}
          className={CTRL_BTN}
        >
          {playing ? <IconPause /> : <IconPlay />}
        </button>
        <span className="min-w-[4.5rem] select-none text-center text-sm font-semibold tabular-nums text-white/90">
          {index + 1} / {total}
        </span>
        <button type="button" onClick={onNext} aria-label="Next layout" title="Next" className={CTRL_BTN}>
          <IconNext />
        </button>
      </div>

      <p className="sr-only" aria-live={playing ? 'off' : 'polite'}>
        {card.label} layout, {index + 1} of {total}
      </p>
    </div>
  );
};

const BTN_PRIMARY =
  'inline-flex items-center justify-center rounded-full bg-[#d9856b] px-6 py-3 text-sm font-bold text-slate-900 transition hover:bg-[#e39478] active:scale-[.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2';
const BTN_SECONDARY =
  'inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 active:scale-[.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2';

const NAV_BTN =
  'flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900';

const PreviewModal = ({ templateId, color, onColorChange, onStep, onClose, onUse }) => {
  const card = TEMPLATE_CARDS.find((c) => c.id === templateId);
  const startRef = useRef(null);
  const scrollRef = useRef(null);
  const accent = card ? color || DEFAULT_ACCENT[card.id] : null;
  const templateProps = useMemo(() => (accent ? getTemplateProps(accent) : null), [accent]);

  // Lock page scroll and focus the primary action once, when the preview opens.
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    startRef.current?.focus();
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        onStep(e.key === 'ArrowRight' ? 1 : -1);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, onStep]);

  // A new layout starts at the top of its first page.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [templateId]);

  if (!card) return null;

  const { Template } = card;
  const total = TEMPLATE_IDS.length;
  const position = TEMPLATE_IDS.indexOf(card.id) + 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={`Preview of ${card.label}`}>
      <div className="ts-fade absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div className="ts-modal relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 px-6 py-4">
          <div className="min-w-0">
            <h2 className="ts-display text-xl font-extrabold text-slate-900">{card.label}</h2>
            <p className="text-sm text-slate-500">{card.note}</p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => onStep(-1)} aria-label="Previous layout" title="Previous" className={NAV_BTN}>
              <IconPrev />
            </button>
            <span className="min-w-[3.5rem] select-none text-center text-sm font-semibold tabular-nums text-slate-700">
              {position} / {total}
            </span>
            <button type="button" onClick={() => onStep(1)} aria-label="Next layout" title="Next" className={NAV_BTN}>
              <IconNext />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label={COPY.closePreview}
              className="ml-1 rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              <IconClose />
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="ts-stage pro-scroll pro-scroll-dark flex-1 overflow-auto p-4 sm:p-10" style={{ '--ts-accent': accent }}>
          {/* Templates render multiple pages; stack them at true page width and let the area scroll */}
          <div key={card.id} className="ts-swap mx-auto flex select-none flex-col gap-6" style={{ width: PAGE_WIDTH_PX }}>
            <Template {...templateProps} />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-4 px-6 py-4">
          <div>
            <div className="mb-2 flex items-baseline gap-3">
              <h3 className="text-sm font-semibold text-slate-900">{COPY.colors}</h3>
              <span className="text-sm text-slate-500">{colorName(color)}</span>
            </div>
            <ColorBar color={color} onChange={onColorChange} />
          </div>

          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className={BTN_SECONDARY}>{COPY.back}</button>
            <button type="button" ref={startRef} onClick={() => onUse(card.id)} className={BTN_PRIMARY}>{COPY.use}</button>
          </div>
        </div>

        <p className="sr-only" aria-live="polite">{card.label} layout, {position} of {total}</p>
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
  const [direction, setDirection] = useState(0); // 1 = moving forward, -1 = backward, 0 = first paint
  const [playing, setPlaying] = useState(true); // starts on its own; visitors can pause it
  const [hovering, setHovering] = useState(false);
  const listRef = useRef(null);
  const onScreen = useOnScreen(ref, 0.15);

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
  // Close the preview and leave the page on whichever layout was last viewed.
  const closePreview = useCallback(() => {
    if (previewId) setSelected(previewId);
    setPreviewId(null);
  }, [previewId]);

  // Prev/next inside the preview (wraps around at both ends).
  const stepPreview = useCallback(
    (step) => {
      const n = TEMPLATE_IDS.length;
      const from = Math.max(0, TEMPLATE_IDS.indexOf(previewId));
      setDirection(step > 0 ? 1 : -1);
      setPreviewId(TEMPLATE_IDS[(from + step + n) % n]);
    },
    [previewId],
  );

  const index = Math.max(0, TEMPLATE_IDS.indexOf(selected));

  // Step forward/back one layout, wrapping around at both ends.
  const stepBy = useCallback(
    (step) => {
      const n = TEMPLATE_IDS.length;
      setDirection(step > 0 ? 1 : -1);
      setSelected(TEMPLATE_IDS[(index + step + n) % n]);
    },
    [index],
  );
  const handlePrev = useCallback(() => stepBy(-1), [stepBy]);
  const handleNext = useCallback(() => stepBy(1), [stepBy]);
  const togglePlay = useCallback(() => setPlaying((p) => !p), []);

  // Picking a layout from the list means the visitor is browsing, so stop auto-advancing.
  const handleSelect = useCallback(
    (id) => {
      const to = TEMPLATE_IDS.indexOf(id);
      if (to < 0 || to === index) return;
      setDirection(to > index ? 1 : -1);
      setSelected(id);
      setPlaying(false);
    },
    [index],
  );
  const stopAutoplay = useCallback(() => setPlaying(false), []);

  // Auto-advance. The timer restarts after every change, so a manual Prev/Next gets a full interval.
  useEffect(() => {
    if (!playing || hovering || !onScreen || previewId) return undefined;
    const t = setTimeout(handleNext, AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [playing, hovering, onScreen, previewId, handleNext]);

  const handlePointerEnter = useCallback((e) => {
    if (e.pointerType === 'mouse') setHovering(true);
  }, []);
  const handlePointerLeave = useCallback(() => setHovering(false), []);

  // Slide the thumbnail list so the active row stays centred (scrolls the list only, never the page).
  // The first paint, before anything has moved, jumps instantly; every later change glides.
  useEffect(() => {
    const list = listRef.current;
    const row = list && list.querySelector('[aria-pressed="true"]');
    if (!list || !row) return;
    const target = row.offsetTop - (list.clientHeight - row.offsetHeight) / 2;
    const glide = direction !== 0 && !prefersReducedMotion();
    list.scrollTo({ top: Math.max(0, target), behavior: glide ? 'smooth' : 'auto' });
  }, [selected, direction]);

  const card = TEMPLATE_CARDS[index];
  const accent = color || DEFAULT_ACCENT[card.id];

  return (
    <section ref={ref} className={`py-12 sm:py-20 ${className}`}>
      <style>{SHOWCASE_CSS}</style>
      <style>{SCROLLBAR_CSS}</style>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div
          className="grid gap-8 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-14 lg:gap-y-8"
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
        >
          <header className="lg:col-start-1 lg:row-start-1">
            <h2 className="ts-display text-4xl font-extrabold leading-[1.03] tracking-tight text-slate-900 sm:text-5xl" style={{ textWrap: 'balance' }}>
              {title}
            </h2>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-slate-600">{subtitle}</p>
          </header>

          <div className="lg:col-start-2 lg:row-start-1 lg:row-span-2">
            <Stage
              card={card}
              accent={accent}
              visible={seen}
              direction={direction}
              index={index}
              total={TEMPLATE_CARDS.length}
              playing={playing}
              onPrev={handlePrev}
              onNext={handleNext}
              onTogglePlay={togglePlay}
            />
          </div>

          <div className="flex flex-col gap-8 lg:col-start-1 lg:row-start-2">
            <div
              ref={listRef}
              role="group"
              aria-label={COPY.templates}
              onPointerDown={stopAutoplay}
              onWheel={stopAutoplay}
              className="pro-scroll relative -mx-4 flex max-h-[24rem] flex-col gap-1.5 overflow-y-auto overscroll-contain px-1 py-1"
            >
              {TEMPLATE_CARDS.map((c) => (
                <TemplateRow
                  key={c.id}
                  card={c}
                  color={color}
                  selected={selected === c.id}
                  onSelect={handleSelect}
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
        <PreviewModal
          templateId={previewId}
          color={color}
          onColorChange={setColor}
          onStep={stepPreview}
          onClose={closePreview}
          onUse={handleUse}
        />
      )}
    </section>
  );
}

// Shared with TemplateSlideshow.jsx
export { TEMPLATE_CARDS, DEFAULT_ACCENT, TemplateThumb, getTemplateProps, saveChoice, readColor };
