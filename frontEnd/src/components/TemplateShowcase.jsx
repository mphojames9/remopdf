import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, memo } from 'react';
import ResumePhoto, { PHOTO_DEFAULTS } from './Resume/Sections/ResumePhoto';
import profile2 from '../assets/profile2.webp';

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
const GRAYSCALE = '#475569';
const HEX_RE = /^#[0-9a-f]{6}$/i;

const COPY = {
  title: 'Pick a layout, then make it yours',
  subtitle: '',
  colors: 'Accent colour',
  carousel: 'Resume layouts',
  prev: 'Previous layouts',
  next: 'Next layouts',
  useShort: 'Use this template',
  viewAll: 'View all templates',
  allTitle: 'All templates',
  allHint: 'Select a layout to preview it.',
  closeAll: 'Close all templates',
  use: 'Start with this template',
  useMobile: 'Use template',
  closePreview: 'Close preview',
  back: 'Back',
  featured: 'Recommended',
};

const PAGE_WIDTH_PX = 794;
const PAGE_HEIGHT_PX = 1123;

// Zoom levels in the full-screen preview, as multiples of the fit-to-screen size.
const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
const ZOOM_FIT = ZOOM_STEPS.indexOf(1);

const AUTOPLAY_MS = 4000; // how long each screenful of cards stays before the carousel slides on

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Below this width the carousel becomes a centered "coverflow": one card in the middle, neighbours behind it.
// Keep in sync with the (max-width) media query in SHOWCASE_CSS and with the `sm:` classes on the track and cards.
const CENTER_MQ = '(max-width: 639px)';
const isCentered = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(CENTER_MQ).matches;

// Page scroll stays locked until the last open modal (grid or preview) has closed.
let scrollLocks = 0;
const useBodyScrollLock = () => {
  useEffect(() => {
    scrollLocks += 1;
    document.body.style.overflow = 'hidden';
    return () => {
      scrollLocks -= 1;
      if (scrollLocks === 0) document.body.style.overflow = '';
    };
  }, []);
};

const SHOWCASE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&display=swap');
.ts-display { font-family: 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif; }

/* Full-screen preview: a dark stage tinted with the chosen accent, with a soft light from the top */
.ts-preview { isolation: isolate; background: #0b0f1a; background: color-mix(in srgb, var(--ts-accent) 26%, #090c14); }
.ts-preview::before {
  content: ''; position: absolute; inset: 0; z-index: -1; pointer-events: none;
  background: radial-gradient(ellipse 70% 45% at 50% 0%, rgba(255,255,255,.12), transparent 70%);
}
/* Compact toolbars: smaller icons inside round buttons */
.ts-compact svg { width: 1rem; height: 1rem; }
.ts-pages > * { box-shadow: 0 30px 60px -24px rgba(0,0,0,.6); }

/* Carousel track: native swipe/scroll, no visible scrollbar */
.ts-track { scrollbar-width: none; -ms-overflow-style: none; }
.ts-track::-webkit-scrollbar { display: none; }

/* Small screens: the carousel is a focus strip. The card in the middle is full size; its neighbours sit a little
   behind it, smaller and faded. JS writes --ts-o (signed distance from the middle, -1..1) and --ts-d (0..1) on each
   card while scrolling, so the effect follows the finger. The transform lives on an inner element so the card's
   own box (which snapping and the loop maths measure) never moves. */
@media (max-width: 639px) {
  .ts-coverflow .ts-slide {
    transform: translateX(calc(var(--ts-o, 0) * -14%)) scale(calc(1 - var(--ts-d, 0) * .16));
    opacity: calc(1 - var(--ts-d, 0) * .58);
  }
}

/* "Use this template" pill appears on hover or keyboard focus (hidden on touch, where tapping opens the preview) */
.ts-use { opacity: 0; transform: translateY(8px); pointer-events: none; }
.ts-card:hover .ts-use, .ts-open:focus-visible ~ .ts-use, .ts-use:focus-visible { opacity: 1; transform: none; pointer-events: auto; }
@media (hover: none) { .ts-use { display: none; } }

@media (prefers-reduced-motion: no-preference) {
  @keyframes ts-fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes ts-modal { from { opacity: 0; transform: translateY(16px) scale(.97); } to { opacity: 1; transform: none; } }
  @keyframes ts-bounce { 0% { transform: scale(1); } 40% { transform: scale(1.25); } 100% { transform: scale(1); } }
  @keyframes ts-swap { from { opacity: 0; transform: scale(.985); } to { opacity: 1; transform: none; } }

  .ts-fade { animation: ts-fade .25s ease-out; }
  .ts-modal { animation: ts-modal .35s cubic-bezier(.2,.9,.25,1.05); }
  .ts-bounce { animation: ts-bounce .35s ease-out; }
  .ts-swap { transform-origin: top center; animation: ts-swap .55s cubic-bezier(.45,.05,.2,1) both; }

  .ts-preview { transition: background-color .6s ease; }
  .ts-thumb, .ts-thumb * { transition: background-color .45s ease, color .45s ease, border-color .45s ease; }
  .ts-use { transition: opacity .2s ease, transform .2s ease; }
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

// Flips to true the first time the element is near view. Pass rootRef to observe inside a scroll container
// (e.g. the carousel track) and rootMargin to start a little early; enabled=false keeps it dormant.
const useInView = (threshold = 0.1, { rootRef, rootMargin = '0px', enabled = true } = {}) => {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    if (!enabled || seen) return undefined;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold, root: (rootRef && rootRef.current) || null, rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, rootRef, rootMargin, enabled, seen]);

  return [ref, seen];
};

// Live visibility (unlike useInView it flips back to false when scrolled away), so autoplay only runs on screen.
const useOnScreen = (ref, threshold = 0.2) => {
  const [onScreen, setOnScreen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setOnScreen(true);
      return undefined;
    }
    const io = new IntersectionObserver((entries) => setOnScreen(entries[entries.length - 1].isIntersecting), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold]);

  return onScreen;
};

const ACCENT_SWATCHES = [
  { hex: '#1f2937', label: 'Charcoal' },
  { hex: '#2b6cb0', label: 'Steel blue' },
  { hex: '#881337', label: 'Burgundy' },
  { hex: '#c2410c', label: 'Orange' },
  { hex: '#0f766e', label: 'Teal' },
  { hex: '#6d28d9', label: 'Purple' },
  { hex: '#64748b', label: 'Slate' },
  { hex: '#0e7490', label: 'Cyan' },
  { hex: '#1e3a8a', label: 'Navy' },
  { hex: '#166534', label: 'Forest' },
];

const DEMO_RESUME = {
  name: 'Claire Whitfield',
  title: 'Senior Product Designer',
  email: 'claire.whitfield@email.com',
  phone: '+1 (512) 555-0147',
  location: 'Austin, Texas, USA',
  website: 'www.clairewhitfield.design',
  linkedin: 'linkedin.com/in/claire-whitfield-ux',
  highlights: [
    { label: 'Product Reach', value: '2M+ Monthly Users' },
    { label: 'Core Expertise', value: 'UX Research & Systems' },
    { label: 'Leadership', value: 'Design Team of 8' },
  ],
  summary:
    'Senior product designer with eight years of experience turning complex workflows into clear, accessible interfaces. Combines user research, design systems, and rapid prototyping with a track record of leading cross-functional teams and shipping features that measurably improve engagement and retention.',
  jobs: [
    {
      title: 'Senior Product Designer',
      employer: 'Brightwell Digital',
      dates: '2022 – Present',
      points: [
        'Led the redesign of the customer dashboard used by more than two million people a month, lifting task completion by 28%.',
        'Built and maintained a company-wide design system of 120+ components, cutting design-to-development handoff time by 40%.',
        'Ran moderated usability studies and turned the findings into roadmap priorities for three product squads.',
        'Mentored four junior designers and introduced weekly critique sessions that raised design quality across the team.',
      ],
    },
    {
      title: 'UX Designer',
      employer: 'Northlake Studio',
      dates: '2018 – 2022',
      points: [
        'Designed responsive web and mobile experiences for retail and healthcare clients, from first sketches to final handoff.',
        'Introduced accessibility reviews against WCAG 2.1 AA, cutting audit issues by more than half before launch.',
      ],
    },
    {
      title: 'Junior Graphic Designer',
      employer: 'Harbor & Pine Creative',
      dates: '2016 – 2018',
      points: [
        'Produced brand identities, packaging, and campaign assets for more than 25 small-business clients.',
        'Moved the studio\u2019s proofing process online, shortening client approval cycles from two weeks to four days.',
      ],
    },
  ],
  education: [
    {
      degree: 'BA in Interaction Design',
      school: 'Westbrook University',
      dates: '2012 – 2016',
      detail: 'Graduated with honors. Focus on human-centered design, typography, and prototyping.',
    },
    {
      degree: 'Certificate in UX Research',
      school: 'Lakeshore Design Institute',
      dates: 'Jun 2019',
      detail: 'Coursework in interview methods, usability testing, and research synthesis.',
    },
  ],
  projects: [
    { name: 'Bloom Budget App', category: 'Mobile Design', detail: 'End-to-end design of a personal budgeting app, from user research to a tested high-fidelity prototype.' },
    { name: 'Meridian Design System', category: 'Design Systems', detail: 'Component library with tokens, documentation, and accessibility guidelines adopted by five product teams.' },
    { name: 'CareConnect Portal', category: 'Web Application', detail: 'Patient scheduling portal redesign that cut missed appointments by 18% in its first quarter.' },
  ],
  certifications: [
    { name: 'Accessible Design Practitioner', year: 'Feb 2025' },
    { name: 'Advanced Prototyping Workshop', year: 'Sep 2024' },
    { name: 'Design Leadership Program', year: 'Mar 2023' },
    { name: 'Data-Informed Design Course', year: 'Nov 2021' },
  ],
  skills: [
    { text: 'Figma & Prototyping', rating: 5, category: 'Design' },
    { text: 'User Research', rating: 5, category: 'Research' },
    { text: 'Design Systems', rating: 5, category: 'Systems' },
    { text: 'Accessibility (WCAG)', rating: 4, category: 'Standards' },
    { text: 'HTML & CSS', rating: 4, category: 'Frontend' },
    { text: 'Workshop Facilitation', rating: 4, category: 'Leadership' },
  ],
  languages: [
    { name: 'English', level: 'Fluent / Native' },
    { name: 'Spanish', level: 'Fluent / Professional' },
  ],
  interests: ['Illustration', 'Trail Running', 'Ceramics', 'Travel Photography'],
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

// Pre-building: once the section is near the screen, the carousel builds its thumbnails in idle moments instead of
// waiting for each card to scroll into range. The whole middle copy is built, plus the cards on either side of it
// (WARM_SEAM) so the loop seams are ready too. WARM_RANK gives each card its place in the build order: the card the
// carousel starts on first, then outwards in both directions.
const WARM_SEAM = 8;
const WARM_RANK = (() => {
  const n = TEMPLATE_CARDS.length;
  const entries = [];
  for (let copy = 0; copy < 3; copy += 1) {
    for (let i = 0; i < n; i += 1) {
      const nearSeam = (copy === 0 && i >= n - WARM_SEAM) || (copy === 2 && i < WARM_SEAM);
      if (copy === 1 || nearSeam) {
        entries.push({ key: `${copy}-${TEMPLATE_CARDS[i].id}`, dist: Math.abs((copy - 1) * n + i) });
      }
    }
  }
  entries.sort((a, b) => a.dist - b.dist);
  return new Map(entries.map((entry, index) => [entry.key, index]));
})();
const WARM_TOTAL = WARM_RANK.size;
const WARM_BATCH = 2; // cards built per idle slot

// Colour changes re-render every pre-built thumbnail. Where React can defer that (18+), the swatch updates at once
// and the thumbnails catch up without blocking the tap; older versions just render straight away.
const useDeferred = React.useDeferredValue || ((value) => value);

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

const IconZoomIn = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="11" y1="8" x2="11" y2="14" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

const IconZoomOut = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

const colorName = (color) => {
  if (color == null) return 'Template default';
  if (color === GRAYSCALE) return 'Grayscale';
  const hit = ACCENT_SWATCHES.find((s) => s.hex === color);
  return hit ? hit.label : `Custom ${color.toUpperCase()}`;
};

const SWATCH_BASE = 'flex shrink-0 items-center justify-center rounded-full text-white transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2';
const SWATCH = `${SWATCH_BASE} focus-visible:ring-slate-900 focus-visible:ring-offset-2`;
const SWATCH_DARK = `${SWATCH_BASE} focus-visible:ring-white`;
const SWATCH_ON = 'ring-2 ring-offset-2 ring-slate-900 ts-bounce';
const SWATCH_ON_DARK = 'ring-2 ring-white ts-bounce';
const RAINBOW = 'conic-gradient(from 180deg, #ef4444, #f59e0b, #84cc16, #06b6d4, #6366f1, #d946ef, #ef4444)';

const ColorBar = ({ color, onChange, className = 'flex-wrap', dark = false, compact = false }) => {
  const isCustom = !!color && color !== GRAYSCALE && !ACCENT_SWATCHES.some((s) => s.hex === color);
  const base = `${compact ? 'h-6 w-6' : 'h-7 w-7 sm:h-8 sm:w-8'} ${dark ? SWATCH_DARK : SWATCH}`;
  const ring = dark ? SWATCH_ON_DARK : SWATCH_ON;

  return (
    <div className={`flex items-center ${compact ? 'gap-x-2.5 gap-y-2' : 'gap-x-2.5 gap-y-3 sm:gap-x-3.5'} ${className}`} role="group" aria-label="Resume colour">
      {/* Rainbow ring = each layout keeps its own colour */}
      <button
        type="button"
        onClick={() => onChange(null)}
        title="Template default"
        aria-label="Template default colour"
        aria-pressed={color === null}
        style={{ backgroundImage: RAINBOW }}
        className={`${base} ${compact ? 'p-[2px]' : 'p-[3px]'} ${color === null ? 'ts-bounce' : ''}`}
      >
        <span className="flex h-full w-full items-center justify-center rounded-full bg-white text-slate-800">
          {color === null && <IconCheck />}
        </span>
      </button>

      {ACCENT_SWATCHES.map((swatch) => {
        const on = color === swatch.hex;
        return (
          <button
            key={swatch.hex}
            type="button"
            onClick={() => onChange(swatch.hex)}
            title={swatch.label}
            aria-label={swatch.label}
            aria-pressed={on}
            style={{ backgroundColor: swatch.hex }}
            className={`${base} ${on ? ring : ''}`}
          >
            {on && <IconCheck />}
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => onChange(GRAYSCALE)}
        title="Grayscale"
        aria-label="Grayscale"
        aria-pressed={color === GRAYSCALE}
        className={`${base} relative border border-slate-300 bg-white ${color === GRAYSCALE ? ring : ''}`}
      >
        <span className={`absolute h-px rotate-45 bg-slate-400 ${compact ? 'w-[22px]' : 'w-[24px] sm:w-[28px]'}`} />
      </button>

      <label
        title="Custom colour"
        className={`${base} relative cursor-pointer border border-dashed text-base font-bold leading-none focus-within:ring-2 ${
          dark ? 'focus-within:ring-white' : 'focus-within:ring-slate-900 focus-within:ring-offset-2'
        } ${
          isCustom
            ? `${ring} border-transparent text-white`
            : dark
              ? 'border-white/40 text-white/80 hover:bg-white/10'
              : 'border-slate-400 text-slate-600 hover:bg-slate-100'
        }`}
        style={isCustom ? { backgroundColor: color } : undefined}
      >
        {isCustom ? <IconCheck /> : '+'}
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

const CARD_W =
  'w-[64%] sm:w-[calc((100%_-_1.25rem)/2)] md:w-[calc((100%_-_2.5rem)/3)] lg:w-[calc((100%_-_3.75rem)/4)]';

const ARROW_BTN =
  // Hidden below 640px: on small screens the carousel is swiped (or autoplays), so the arrows only get in the way.
  'absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl bg-slate-200/95 text-slate-700 shadow-sm backdrop-blur transition hover:bg-slate-300 hover:text-slate-900 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 sm:flex sm:h-12 sm:w-12';

// One card in the carousel. memo + a cached thumbnail element: a colour change re-renders only the
// cards that have already been built, and cards the visitor hasn't scrolled near yet cost nothing.
const TemplateCard = memo(function TemplateCard({
  card,
  color,
  active,
  trackRef,
  featured,
  featuredLabel,
  onOpen,
  onUse,
  widthClass = CARD_W,
  rootMargin = '0px 1200px',
  showLabel = false,
  clone = false,
  warmed = false,
}) {
  const { id, label, Template } = card;
  const accent = color || DEFAULT_ACCENT[id];
  const props = useMemo(() => getTemplateProps(accent), [accent]);
  const [cardRef, seen] = useInView(0.01, { rootRef: trackRef, rootMargin, enabled: active });
  const ready = seen || warmed; // built because it is near the screen, or because the pre-build has reached it
  const thumb = useMemo(() => (ready ? <Template {...props} /> : null), [ready, Template, props]);

  return (
    <div
      ref={cardRef}
      data-ts-slide=""
      className={`group shrink-0 snap-center sm:snap-start ${widthClass}`}
      aria-hidden={clone ? 'true' : undefined}
    >
      <div className="ts-slide">
      <div className="ts-card relative rounded-2xl shadow-[0_2px_14px_rgba(15,23,42,.14)] transition duration-200 group-hover:-translate-y-1 group-hover:shadow-[0_16px_34px_-10px_rgba(15,23,42,.35)] motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
        <button
          type="button"
          onClick={() => onOpen(id)}
          tabIndex={clone ? -1 : undefined}
          aria-label={`Preview the ${label} layout`}
          className="ts-open block w-full rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
        >
          <TemplateThumb className="w-full rounded-2xl ring-1 ring-black/5">{thumb}</TemplateThumb>
        </button>

        {featured && (
          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-amber-300 px-2 py-0.5 text-xs font-semibold text-slate-900 shadow-sm">
            {featuredLabel}
          </span>
        )}

        <button
          type="button"
          onClick={() => onUse(id)}
          tabIndex={clone ? -1 : undefined}
          className="ts-use absolute inset-x-3 bottom-3 rounded-full bg-[#d9856b] px-4 py-2.5 text-sm font-bold text-slate-900 shadow-lg hover:bg-[#e39478] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
        >
          {COPY.useShort}
        </button>
      </div>

      {showLabel && <p className="mt-3 text-center text-sm font-semibold text-slate-700">{label}</p>}
      </div>
    </div>
  );
});

const BTN_PRIMARY =
  'inline-flex items-center justify-center rounded-full bg-[#d9856b] px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-[#e39478] active:scale-[.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-white';
const BTN_SECONDARY =
  'inline-flex items-center justify-center rounded-full border border-white/25 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 active:scale-[.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-white';

const NAV_BTN =
  'flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white active:scale-90 disabled:pointer-events-none disabled:opacity-35 focus:outline-none focus-visible:ring-2 focus-visible:ring-white';

// Resume pages are laid out at true A4 pixel width; this scales them to fit whatever screen they are on.
const FitPages = ({ scale, className = '', children }) => {
  const innerRef = useRef(null);
  const [height, setHeight] = useState(PAGE_HEIGHT_PX);

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return undefined;
    const update = () => setHeight(el.offsetHeight);
    update();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className={`mx-auto ${className}`} style={{ width: PAGE_WIDTH_PX * scale, height: height * scale }}>
      <div
        ref={innerRef}
        className="ts-pages flex select-none flex-col gap-6"
        style={{ width: PAGE_WIDTH_PX, transform: `scale(${scale})`, transformOrigin: 'top left' }}
      >
        {children}
      </div>
    </div>
  );
};

const PreviewModal = ({ templateId, color, onColorChange, onStep, onClose, onUse }) => {
  const card = TEMPLATE_CARDS.find((c) => c.id === templateId);
  const startRef = useRef(null);
  const scrollRef = useRef(null);
  const [boxWidth, setBoxWidth] = useState(0);
  const [zoomIdx, setZoomIdx] = useState(ZOOM_FIT);
  const anchor = useRef(null);
  const accent = card ? color || DEFAULT_ACCENT[card.id] : null;
  const templateProps = useMemo(() => (accent ? getTemplateProps(accent) : null), [accent]);

  useBodyScrollLock();

  // Zooming keeps whatever is in the middle of the screen in the middle of the screen.
  const holdCenter = useCallback(() => {
    const el = scrollRef.current;
    if (el && el.scrollWidth && el.scrollHeight) {
      anchor.current = {
        x: (el.scrollLeft + el.clientWidth / 2) / el.scrollWidth,
        y: (el.scrollTop + el.clientHeight / 2) / el.scrollHeight,
      };
    }
  }, []);
  const stepZoom = useCallback(
    (delta) => {
      holdCenter();
      setZoomIdx((i) => Math.min(ZOOM_STEPS.length - 1, Math.max(0, i + delta)));
    },
    [holdCenter],
  );
  const resetZoom = useCallback(() => {
    holdCenter();
    setZoomIdx(ZOOM_FIT);
  }, [holdCenter]);

  // Focus the primary action once, when the preview opens.
  useEffect(() => {
    startRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return; // leave the browser's own zoom shortcuts alone
      const typing = e.target.tagName === 'INPUT';
      if (e.key === 'Escape') onClose();
      else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !typing) {
        e.preventDefault();
        onStep(e.key === 'ArrowRight' ? 1 : -1);
      } else if ((e.key === '+' || e.key === '=') && !typing) {
        e.preventDefault();
        stepZoom(1);
      } else if ((e.key === '-' || e.key === '_') && !typing) {
        e.preventDefault();
        stepZoom(-1);
      } else if (e.key === '0' && !typing) {
        e.preventDefault();
        resetZoom();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, onStep, stepZoom, resetZoom]);

  // A new layout starts at the top of its first page.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [templateId]);

  // Track the width of the reading area so the pages can be scaled to fit it.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const update = () => setBoxWidth(el.clientWidth);
    update();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // After the pages have been resized, scroll back to the spot that was in the middle.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    const a = anchor.current;
    if (!el || !a) return;
    el.scrollLeft = a.x * el.scrollWidth - el.clientWidth / 2;
    el.scrollTop = a.y * el.scrollHeight - el.clientHeight / 2;
    anchor.current = null;
  }, [zoomIdx]);

  if (!card) return null;

  const { Template } = card;
  const total = TEMPLATE_IDS.length;
  const position = TEMPLATE_IDS.indexOf(card.id) + 1;
  // "Fit" fills the width of the screen (minus the side padding), but never blows the page up past 125%.
  const sidePad = boxWidth >= 640 ? 80 : 32;
  const fitScale = boxWidth ? Math.min(1.25, Math.max(0.3, (boxWidth - sidePad) / PAGE_WIDTH_PX)) : 1;
  const zoom = ZOOM_STEPS[zoomIdx];
  const scale = fitScale * zoom;

  return (
    <div
      className="ts-fade ts-preview fixed inset-0 z-[110] flex flex-col"
      style={{ '--ts-accent': accent }}
      role="dialog"
      aria-modal="true"
      aria-label={`Preview of ${card.label}`}
    >
      <header className="ts-compact flex h-12 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black/25 px-3 backdrop-blur-md sm:px-5">
        <div className="flex min-w-0 flex-1 items-baseline gap-3">
          <h2 className="ts-display shrink-0 text-base font-extrabold leading-none text-white">{card.label}</h2>
          <p className="hidden min-w-0 truncate text-sm text-white/55 md:block">{card.note}</p>
        </div>

        <div className="flex shrink-0 items-center rounded-full bg-white/10 p-0.5 ring-1 ring-white/15">
          <button type="button" onClick={() => onStep(-1)} aria-label="Previous layout" title="Previous" className={NAV_BTN}>
            <IconPrev />
          </button>
          <span className="min-w-[3rem] select-none text-center text-xs font-semibold tabular-nums text-white/90">
            {position} / {total}
          </span>
          <button type="button" onClick={() => onStep(1)} aria-label="Next layout" title="Next" className={NAV_BTN}>
            <IconNext />
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={COPY.closePreview}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <IconClose />
        </button>
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          className="pro-scroll pro-scroll-dark h-full overflow-auto overscroll-contain px-4 py-6 [scrollbar-gutter:stable_both-edges] sm:px-10 sm:py-10"
        >
          {/* Templates render several pages; stack them at true page width, scaled, and let the area scroll */}
          <FitPages key={card.id} scale={scale} className="ts-swap">
            <Template {...templateProps} />
          </FitPages>
        </div>

        <div
          className="ts-compact absolute bottom-3 right-5 z-10 flex items-center rounded-full bg-black/60 p-0.5 text-white shadow-lg ring-1 ring-white/15 backdrop-blur-md sm:right-8"
          role="group"
          aria-label="Zoom"
        >
          <button type="button" onClick={() => stepZoom(-1)} disabled={zoomIdx === 0} aria-label="Zoom out" title="Zoom out (-)" className={NAV_BTN}>
            <IconZoomOut />
          </button>
          <button
            type="button"
            onClick={resetZoom}
            aria-label="Fit to screen"
            title="Fit to screen (0)"
            className="min-w-[3rem] rounded-full px-2 py-1.5 text-center text-xs font-semibold tabular-nums text-white/90 transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {zoom === 1 ? 'Fit' : `${Math.round(zoom * 100)}%`}
          </button>
          <button
            type="button"
            onClick={() => stepZoom(1)}
            disabled={zoomIdx === ZOOM_STEPS.length - 1}
            aria-label="Zoom in"
            title="Zoom in (+)"
            className={NAV_BTN}
          >
            <IconZoomIn />
          </button>
        </div>
      </div>

      <footer className="ts-compact shrink-0 border-t border-white/10 bg-black/30 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 sm:px-5">
          <div className="hidden shrink-0 items-baseline gap-2 sm:flex">
            <h3 className="text-xs font-semibold text-white">{COPY.colors}</h3>
            <span className="text-xs text-white/55">{colorName(color)}</span>
          </div>
          <ColorBar
            dark
            compact
            color={color}
            onChange={onColorChange}
            className="ts-track min-w-0 flex-1 flex-nowrap overflow-x-auto p-1"
          />
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={onClose} className={`${BTN_SECONDARY} hidden sm:inline-flex`}>{COPY.back}</button>
            <button type="button" ref={startRef} onClick={() => onUse(card.id)} className={BTN_PRIMARY}>
              <span className="sm:hidden">{COPY.useMobile}</span>
              <span className="hidden sm:inline">{COPY.use}</span>
            </button>
          </div>
        </div>
      </footer>

      <p className="sr-only" aria-live="polite">{card.label} layout, {position} of {total}</p>
    </div>
  );
};

// Carousel geometry: the distance between neighbouring cards, and the width of one whole copy of the list.
const cardStride = (el) => {
  const [a, b] = el.children;
  return a && b ? b.getBoundingClientRect().left - a.getBoundingClientRect().left : 0;
};
const setWidth = (el) => {
  const a = el.children[0];
  const b = el.children[TEMPLATE_CARDS.length];
  return a && b ? b.getBoundingClientRect().left - a.getBoundingClientRect().left : 0;
};

// Full-screen gallery of every layout. A card opens the full-size preview on top of it.
const AllTemplatesModal = ({ color, onColorChange, featuredTemplate, featuredLabel, onOpen, onUse, onClose, suspended }) => {
  const scrollRef = useRef(null);
  const closeRef = useRef(null);
  useBodyScrollLock();

  // Move focus in when the gallery opens and hand it back to whatever opened it.
  useEffect(() => {
    const opener = document.activeElement;
    if (closeRef.current) closeRef.current.focus();
    return () => {
      if (opener && typeof opener.focus === 'function') opener.focus();
    };
  }, []);

  // While a preview is open on top, Escape belongs to the preview.
  useEffect(() => {
    if (suspended) return undefined;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, suspended]);

  return (
    <div className="ts-fade fixed inset-0 z-[100] flex flex-col bg-white" role="dialog" aria-modal="true" aria-label={COPY.allTitle}>
      <header className="ts-compact shrink-0 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <h2 className="ts-display truncate text-base font-extrabold tracking-tight text-slate-900">{COPY.allTitle}</h2>
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-slate-600">
              {TEMPLATE_CARDS.length} layouts
            </span>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={COPY.closeAll}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          >
            <IconClose />
          </button>
        </div>
      </header>
      <p className="sr-only">{COPY.allHint}</p>

      <div ref={scrollRef} className="pro-scroll flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4 xl:grid-cols-5">
            {TEMPLATE_CARDS.map((c) => (
              <TemplateCard
                key={c.id}
                card={c}
                color={color}
                active
                trackRef={scrollRef}
                widthClass="w-full"
                rootMargin="500px 0px"
                showLabel
                featured={featuredTemplate === c.id}
                featuredLabel={featuredLabel}
                onOpen={onOpen}
                onUse={onUse}
              />
            ))}
          </div>
        </div>
      </div>

      <footer className="shrink-0 border-t border-slate-200/80 bg-white/90 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <div className="hidden shrink-0 items-baseline gap-2 sm:flex">
            <h3 className="text-xs font-semibold text-slate-900">{COPY.colors}</h3>
            <span className="text-xs text-slate-500">{colorName(color)}</span>
          </div>
          <ColorBar
            compact
            color={color}
            onChange={onColorChange}
            className="ts-track min-w-0 flex-1 flex-nowrap overflow-x-auto p-1"
          />
        </div>
      </footer>
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
  // Cards only start building once the section is near the viewport.
  const [sectionRef, sectionSeen] = useInView(0.01, { rootMargin: '300px 0px' });
  const onScreen = useOnScreen(sectionRef, 0.2);
  const [color, setColor] = useState(null);
  const [previewId, setPreviewId] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [playing, setPlaying] = useState(true); // auto-slide; a swipe or sideways scroll switches it off for good
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false); // keyboard focus inside the carousel
  const [tick, setTick] = useState(0); // bumps on every slide so the autoplay clock restarts
  const [warm, setWarm] = useState(0); // how many carousel cards (in WARM_RANK order) have been pre-built so far
  const trackRef = useRef(null);
  const settleTimer = useRef(null);
  const touching = useRef(false);
  const lastSet = useRef(0);
  const lastMode = useRef(false); // whether the track was in centered (small-screen) mode last time it was laid out
  const frame = useRef(0);

  useEffect(() => {
    setColor(readColor());
  }, []);

  // The carousel thumbnails follow the colour a beat behind the swatches, so a tap never waits on them.
  const thumbColor = useDeferred(color);

  // Fetch and decode the demo photo up front, so the first thumbnails don't flash an empty photo frame.
  useEffect(() => {
    const img = new Image();
    img.src = profile2;
    if (img.decode) img.decode().catch(() => {});
  }, []);

  // Pre-build the carousel a few cards at a time, only when the browser is idle, so it never competes with scrolling.
  useEffect(() => {
    if (!sectionSeen || warm >= WARM_TOTAL) return undefined;
    const step = () => setWarm((w) => Math.min(WARM_TOTAL, w + WARM_BATCH));
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(step, { timeout: 500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(step, 90);
    return () => clearTimeout(id);
  }, [sectionSeen, warm]);

  const handleUse = useCallback(
    (templateId) => {
      saveChoice(templateId, color);
      setPreviewId(null);
      setShowAll(false);
      if (onUseTemplate) onUseTemplate({ template: templateId, color });
    },
    [color, onUseTemplate],
  );

  const closePreview = useCallback(() => setPreviewId(null), []);

  // Prev/next inside the preview (wraps around at both ends).
  const stepPreview = useCallback(
    (step) => {
      const n = TEMPLATE_IDS.length;
      const from = Math.max(0, TEMPLATE_IDS.indexOf(previewId));
      setPreviewId(TEMPLATE_IDS[(from + step + n) % n]);
    },
    [previewId],
  );

  // Arrows and autoplay move the track by one screenful of cards. The track holds three identical copies
  // of the list, so there is always another card ahead or behind: it never runs out and never rewinds.
  const scrollTrack = useCallback((dir) => {
    const el = trackRef.current;
    if (!el) return;
    const stride = cardStride(el);
    if (!stride) return;
    // Centered mode moves one card at a time; wider layouts move a whole screenful.
    const visible = isCentered() ? 1 : Math.max(1, Math.round(el.clientWidth / stride));
    el.scrollTo({ left: el.scrollLeft + dir * visible * stride, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, []);

  // Once the track is at rest, hop to the same spot in the middle copy. The copies are identical, so the
  // hop is invisible and the loop keeps going in both directions.
  const normalize = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const w = setWidth(el);
    if (!w) return;
    const target = w + (el.scrollLeft % w);
    if (Math.abs(target - el.scrollLeft) > 0.5) el.scrollLeft = target;
  }, []);

  // Runs after scrolling has stopped (and never while a finger is down).
  const settle = useCallback(() => {
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      if (!touching.current) normalize();
    }, 140);
  }, [normalize]);

  // Small screens: tell every card how far it sits from the middle (-1 left … 0 centre … 1 right). Reads first,
  // writes second, so the browser lays out once per frame. Wider screens: clear everything.
  const updateFocus = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const slides = Array.from(el.children);
    if (!isCentered()) {
      slides.forEach((s) => {
        s.style.removeProperty('--ts-o');
        s.style.removeProperty('--ts-d');
        s.style.zIndex = '';
        if (s.firstElementChild) s.firstElementChild.style.willChange = '';
      });
      return;
    }
    const stride = cardStride(el) || 1;
    const box = el.getBoundingClientRect();
    const mid = box.left + box.width / 2;
    const offsets = slides.map((s) => {
      const r = s.getBoundingClientRect();
      return (r.left + r.width / 2 - mid) / stride;
    });
    slides.forEach((s, i) => {
      // Only the few cards around the middle get their own compositing layer: with every card pre-built, a layer
      // per card would cost a lot of memory for nothing.
      const inner = s.firstElementChild;
      if (inner) {
        const hint = Math.abs(offsets[i]) < 2.5 ? 'transform, opacity' : '';
        if (inner.style.willChange !== hint) inner.style.willChange = hint;
      }
      const clamped = Math.max(-1, Math.min(1, offsets[i]));
      const o = clamped.toFixed(3);
      if (s.style.getPropertyValue('--ts-o') === o) return;
      s.style.setProperty('--ts-o', o);
      s.style.setProperty('--ts-d', Math.abs(clamped).toFixed(3));
      s.style.zIndex = String(Math.round((1 - Math.abs(clamped)) * 10)); // the middle card stays on top
    });
  }, []);

  const handleScroll = useCallback(() => {
    settle();
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      updateFocus();
    });
  }, [settle, updateFocus]);

  // Small screens: tapping a card beside the middle one brings it to the middle instead of opening it.
  const handleTrackClickCapture = useCallback((e) => {
    if (!isCentered()) return;
    const el = trackRef.current;
    const slide = e.target.closest ? e.target.closest('[data-ts-slide]') : null;
    if (!el || !slide || slide.parentElement !== el) return;
    const stride = cardStride(el);
    const box = el.getBoundingClientRect();
    const r = slide.getBoundingClientRect();
    if (!stride || Math.abs(r.left + r.width / 2 - (box.left + box.width / 2)) < stride * 0.4) return;
    e.preventDefault();
    e.stopPropagation();
    slide.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
    setTick((t) => t + 1);
  }, []);

  const handleTouchStart = useCallback(() => {
    touching.current = true;
  }, []);
  const handleTouchEnd = useCallback(() => {
    touching.current = false;
    settle();
  }, [settle]);

  // Start on the middle copy, and keep the same place in it when the cards change size.
  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;
    const fit = () => {
      const w = setWidth(el);
      if (!w) return;
      const centered = isCentered();
      if (!lastSet.current || centered !== lastMode.current) {
        // First layout, or the screen crossed the breakpoint: start on the middle copy. In centered mode the
        // first card of that copy is lined up with the middle of the track rather than its left edge.
        const first = el.children[0];
        const inset = centered && first ? (el.clientWidth - first.getBoundingClientRect().width) / 2 : 0;
        el.scrollLeft = w - inset;
      } else {
        el.scrollLeft = (el.scrollLeft * w) / lastSet.current;
      }
      lastSet.current = w;
      lastMode.current = centered;
      updateFocus();
    };
    fit();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateFocus]);

  useEffect(
    () => () => {
      clearTimeout(settleTimer.current);
      cancelAnimationFrame(frame.current);
    },
    [],
  );

  // Slides the track and restarts the autoplay clock, so a manual click always gets a full interval.
  const advance = useCallback(
    (dir) => {
      scrollTrack(dir);
      setTick((t) => t + 1);
    },
    [scrollTrack],
  );

  // Auto-slide. It holds still while the visitor hovers or keyboard-focuses the carousel, while the
  // carousel is off screen, while the gallery or a preview is open, and for reduced-motion visitors.
  useEffect(() => {
    if (!playing || hovering || focused || !onScreen || showAll || previewId || prefersReducedMotion()) return undefined;
    const t = setTimeout(() => advance(1), AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [playing, hovering, focused, onScreen, showAll, previewId, tick, advance]);

  const handlePointerEnter = useCallback((e) => {
    if (e.pointerType === 'mouse') setHovering(true);
  }, []);
  const handlePointerLeave = useCallback(() => setHovering(false), []);
  const handleFocus = useCallback((e) => {
    let keyboard = false;
    try {
      keyboard = e.target.matches(':focus-visible');
    } catch {
      keyboard = false;
    }
    if (keyboard) setFocused(true);
  }, []);
  const handleBlur = useCallback((e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
  }, []);
  // Swiping or scrolling sideways means the visitor is browsing by hand, so stop auto-sliding.
  const handleTrackWheel = useCallback((e) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) setPlaying(false);
  }, []);
  const handleTrackPointerDown = useCallback((e) => {
    if (e.pointerType === 'touch') setPlaying(false);
  }, []);

  const openAll = useCallback(() => setShowAll(true), []);
  const closeAll = useCallback(() => setShowAll(false), []);

  return (
    <section ref={sectionRef} className={`py-12 sm:py-20 ${className}`}>
      <style>{SHOWCASE_CSS}</style>
      <style>{SCROLLBAR_CSS}</style>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <header className="mx-auto max-w-4xl text-center">
          <h2
            className="ts-display text-3xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-4xl lg:text-5xl"
            style={{ textWrap: 'balance' }}
          >
            {title}
          </h2>
          {subtitle ? <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-slate-600">{subtitle}</p> : null}
        </header>

        <div
          className="relative mt-10 sm:mt-12"
          role="region"
          aria-roledescription="carousel"
          aria-label={COPY.carousel}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          onFocus={handleFocus}
          onBlur={handleBlur}
        >
          <button
            type="button"
            onClick={() => advance(-1)}
            aria-label={COPY.prev}
            title="Previous"
            className={`${ARROW_BTN} left-2 lg:left-0 lg:-translate-x-1/2`}
          >
            <IconPrev />
          </button>

          <div
            ref={trackRef}
            className="ts-track ts-coverflow -mx-4 flex snap-x snap-mandatory gap-0 overflow-x-auto py-4 sm:mx-0 sm:gap-5"
            aria-live={playing ? 'off' : 'polite'}
            onWheel={handleTrackWheel}
            onPointerDown={handleTrackPointerDown}
            onClickCapture={handleTrackClickCapture}
            onScroll={handleScroll}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            {/* Three copies back to back (only the middle one is announced and tabbable) make the loop endless. */}
            {[0, 1, 2].flatMap((copy) =>
              TEMPLATE_CARDS.map((c) => (
                <TemplateCard
                  key={`${copy}-${c.id}`}
                  card={c}
                  clone={copy !== 1}
                  color={thumbColor}
                  active={sectionSeen}
                  warmed={(WARM_RANK.get(`${copy}-${c.id}`) ?? Infinity) < warm}
                  trackRef={trackRef}
                  featured={featuredTemplate === c.id}
                  featuredLabel={featuredLabel}
                  onOpen={setPreviewId}
                  onUse={handleUse}
                />
              )),
            )}
          </div>

          <button
            type="button"
            onClick={() => advance(1)}
            aria-label={COPY.next}
            title="Next"
            className={`${ARROW_BTN} right-2 lg:right-0 lg:translate-x-1/2`}
          >
            <IconNext />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          {/* Small screens: one swipeable row that runs to the screen edges. From sm up it wraps as before. */}
          <ColorBar
            color={color}
            onChange={setColor}
            className="ts-track -mx-4 flex-nowrap overflow-x-auto px-4 py-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:p-0"
          />

          <button
            type="button"
            onClick={openAll}
            aria-haspopup="dialog"
            className="inline-flex items-center gap-1 self-start rounded-md text-lg font-semibold text-blue-600 transition-colors hover:text-blue-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:self-auto"
          >
            {COPY.viewAll}
            <IconNext />
          </button>
        </div>
      </div>

      {showAll && (
        <AllTemplatesModal
          color={color}
          onColorChange={setColor}
          featuredTemplate={featuredTemplate}
          featuredLabel={featuredLabel}
          onOpen={setPreviewId}
          onUse={handleUse}
          onClose={closeAll}
          suspended={!!previewId}
        />
      )}

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
