import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, memo } from 'react';
import { flushSync } from 'react-dom';
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
import BasicClassicTemplate from './Resume/Templates/BasicClassicTemplate';
import BasicCenteredTemplate from './Resume/Templates/BasicCenteredTemplate';
import BasicSplitTemplate from './Resume/Templates/BasicSplitTemplate';
import BasicSidebarTemplate from './Resume/Templates/BasicSidebarTemplate';
import BasicCompactTemplate from './Resume/Templates/BasicCompactTemplate';
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
  choose: 'Choose template',
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

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const AUTOPLAY_MS = 4000; // how long each card stays in the middle before the carousel slides on

// The carousel only builds live templates for the card in the middle and this many cards either side of it.
// Every other card is a plain placeholder, so the page never holds more than a handful of full-size resumes.
// A phone only ever shows the middle card and a sliver of each neighbour, so it builds fewer; a wide desktop shows more.
const LIVE_RANGE = 2;
const LIVE_RANGE_SMALL = 1;
const LIVE_RANGE_WIDE = 3;
const SMALL_MQ = '(max-width: 639px)';
const WIDE_MQ = '(min-width: 1280px)';
const DOT_COUNT = 7; // pagination dots shown at once; they slide along as you move through the layouts

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

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
/* Outfit is already loaded from index.html, so this section no longer fetches a second font. */
.ts-display { font-family: 'Outfit', ui-sans-serif, system-ui, sans-serif; }

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

/* Carousel rail: one card in the middle with its neighbours peeking in on both sides. Plain native scroll-snap, so
   swiping runs on the browser's own scroller. The side padding lets the first and last card reach the middle. */
.ts-rail {
  --ts-card: min(72vw, 18.5rem);
  padding-inline: calc((100% - var(--ts-card)) / 2);
  scroll-snap-type: x mandatory;
  overscroll-behavior-x: contain;
}
@media (min-width: 640px) { .ts-rail { --ts-card: 17.5rem; } }
@media (min-width: 1024px) { .ts-rail { --ts-card: 19rem; } }
.ts-pane { flex: 0 0 var(--ts-card); scroll-snap-align: center; opacity: .5; }
/* The rail breaks out of the page's centred column and spans the whole screen (the page clips any overshoot). */
.ts-bleed { width: 100vw; margin-left: calc(50% - 50vw); }
.ts-pane[data-active='true'] { opacity: 1; }

/* Colour swatches scale with the width of the box they sit in (not the screen). While the box is narrow they wrap into
   two even, centred rows (7 + 6) and grow to fill the width, up to 2.5rem; once all 13 fit on one line they sit in one
   row. --s is the swatch size and --g the gap. The .5rem leaves room for the selected swatch's ring. */
.ts-sw-wrap { container-type: inline-size; width: 100%; }
.ts-swatches {
  --g: clamp(.5rem, 2.6cqw, .875rem);
  --s: clamp(1.75rem, calc((100cqw - .5rem - 6 * var(--g)) / 7), 2.5rem);
  gap: var(--g); max-width: calc(7 * var(--s) + 6 * var(--g)); margin-inline: auto;
}
.ts-sw { width: var(--s); height: var(--s); }
@container (min-width: 37rem) { .ts-swatches { --s: 2rem; --g: .875rem; max-width: none; } }
/* Browsers without container query units keep the old screen-width sizing. */
@supports not (width: 1cqw) {
  .ts-swatches { --s: clamp(1.75rem, 9.5vw, 2.25rem); --g: clamp(.5rem, 2.4vw, .75rem); }
  @media (min-width: 640px) { .ts-swatches { --s: 2rem; --g: .875rem; max-width: none; } }
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
  .ts-pane { transition: opacity .2s ease; }
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

// True while the element is within rootMargin of the viewport (or of rootRef's box) and false again once it has
// scrolled far away, so a long grid only keeps the resumes near the screen built.
const useNearView = (rootRef, rootMargin = '0px') => {
  const ref = useRef(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return undefined;
    }
    const io = new IntersectionObserver((entries) => setNear(entries[entries.length - 1].isIntersecting), {
      root: (rootRef && rootRef.current) || null,
      rootMargin,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [rootRef, rootMargin]);

  return [ref, near];
};

// How many cards either side of the middle one are built: fewer on a phone, more on a wide screen.
const liveRangeNow = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return LIVE_RANGE;
  if (window.matchMedia(SMALL_MQ).matches) return LIVE_RANGE_SMALL;
  if (window.matchMedia(WIDE_MQ).matches) return LIVE_RANGE_WIDE;
  return LIVE_RANGE;
};

const useLiveRange = () => {
  const [range, setRange] = useState(liveRangeNow);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const queries = [window.matchMedia(SMALL_MQ), window.matchMedia(WIDE_MQ)];
    const update = () => setRange(liveRangeNow());
    update();
    queries.forEach((mq) => (mq.addEventListener ? mq.addEventListener('change', update) : mq.addListener(update)));
    return () =>
      queries.forEach((mq) => (mq.removeEventListener ? mq.removeEventListener('change', update) : mq.removeListener(update)));
  }, []);

  return range;
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
    <div
      ref={ref}
      className={`ts-thumb relative aspect-[1/1.414] overflow-hidden bg-white pointer-events-none select-none ${className}`}
      style={{ contain: 'layout paint style' }}
      aria-hidden="true"
    >
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
  { id: 'basic-classic', label: 'Basic Classic', note: 'Plain left-aligned single column.', Template: BasicClassicTemplate },
  { id: 'basic-centered', label: 'Basic Centered', note: 'Plain single column with a centred header.', Template: BasicCenteredTemplate },
  { id: 'basic-split', label: 'Basic Split', note: 'Dates in a left gutter, details on the right.', Template: BasicSplitTemplate },
  { id: 'basic-sidebar', label: 'Basic Sidebar', note: 'Plain two columns with a light sidebar.', Template: BasicSidebarTemplate },
  { id: 'basic-compact', label: 'Basic Compact', note: 'Dense single column that fits more on a page.', Template: BasicCompactTemplate },
];

const TEMPLATE_IDS = TEMPLATE_CARDS.map((c) => c.id);

// Where React can defer it (18+), the swatch updates at once and the carousel thumbnails catch up without
// blocking the tap; older versions just render straight away.
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

const ColorBar = ({ color, onChange, className = 'flex-wrap', dark = false, compact = false, fluid = false }) => {
  const isCustom = !!color && color !== GRAYSCALE && !ACCENT_SWATCHES.some((s) => s.hex === color);
  const size = fluid ? 'ts-sw' : compact ? 'h-6 w-6' : 'h-7 w-7 sm:h-8 sm:w-8';
  const base = `${size} ${dark ? SWATCH_DARK : SWATCH}`;
  const ring = dark ? SWATCH_ON_DARK : SWATCH_ON;

  const bar = (
    <div
      className={`flex items-center ${
        fluid ? 'ts-swatches flex-wrap justify-center' : compact ? 'gap-x-2.5 gap-y-2' : 'gap-x-2.5 gap-y-3 sm:gap-x-3.5'
      } ${className}`}
      role="group"
      aria-label="Resume colour"
    >
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
        <span className={`absolute h-px rotate-45 bg-slate-400 ${fluid ? 'w-[88%]' : compact ? 'w-[22px]' : 'w-[24px] sm:w-[28px]'}`} />
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

  return fluid ? <div className="ts-sw-wrap">{bar}</div> : bar;
};

const ARROW_BTN =
  // Hidden below 640px: on a phone you swipe, so the arrows would only cover the neighbouring cards.
  'absolute top-[44%] z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-800 shadow-md ring-1 ring-black/10 transition-colors hover:bg-slate-50 active:scale-95 disabled:pointer-events-none disabled:opacity-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 sm:flex';

// One card in the "All templates" grid. memo + a cached thumbnail element: a colour change re-renders only the
// cards that are built, and cards far from the screen are empty frames that cost nothing.
const TemplateCard = memo(function TemplateCard({
  card,
  color,
  trackRef,
  featured,
  featuredLabel,
  onOpen,
  onUse,
  widthClass = 'w-full',
  rootMargin = '500px 0px',
  showLabel = false,
}) {
  const { id, label, Template } = card;
  const accent = color || DEFAULT_ACCENT[id];
  const props = useMemo(() => getTemplateProps(accent), [accent]);
  const [cardRef, ready] = useNearView(trackRef, rootMargin); // built while near the screen, dropped once far away
  const thumb = useMemo(() => (ready ? <Template {...props} /> : null), [ready, Template, props]);

  return (
    <div ref={cardRef} className={`group shrink-0 ${widthClass}`}>
      <div>
      <div className="ts-card relative shadow-[0_2px_14px_rgba(15,23,42,.14)] transition duration-200 group-hover:-translate-y-1 group-hover:shadow-[0_16px_34px_-10px_rgba(15,23,42,.35)] motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
        <button
          type="button"
          onClick={() => onOpen(id)}
          aria-label={`Preview the ${label} layout`}
          className="ts-open block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
        >
          <TemplateThumb className="w-full ring-1 ring-black/5">{thumb}</TemplateThumb>
        </button>

        {featured && (
          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-amber-300 px-2 py-0.5 text-xs font-semibold text-slate-900 shadow-sm">
            {featuredLabel}
          </span>
        )}

        <button
          type="button"
          onClick={() => onUse(id)}
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

// The rail holds three identical copies of the layout list, back to back. It starts on the middle copy, and whenever it
// comes to rest in the first or last copy it hops to the same card in the middle copy. The copies look the same, so the
// hop cannot be seen, and there is always another card on both sides: the loop never ends and nothing is ever empty.
const CARD_COUNT = TEMPLATE_CARDS.length;
const SLOT_COUNT = CARD_COUNT * 3;
const SLOTS = Array.from({ length: SLOT_COUNT }, (_, slot) => ({
  slot,
  copy: Math.floor(slot / CARD_COUNT),
  index: slot % CARD_COUNT,
}));

// Stand-in for a card whose resume is not built: a blank page with the layout's accent bar. Static on purpose.
const SlideSkeleton = ({ accent }) => (
  <div className="aspect-[1/1.414] w-full bg-white px-[9%] pt-[9%]" aria-hidden="true">
    <div className="h-2 w-2/5 rounded-full" style={{ backgroundColor: accent }} />
    <div className="mt-5 space-y-2.5">
      <div className="h-1.5 w-full rounded-full bg-slate-100" />
      <div className="h-1.5 w-4/5 rounded-full bg-slate-100" />
    </div>
    <div className="mt-8 space-y-2.5">
      <div className="h-1.5 w-1/3 rounded-full bg-slate-200" />
      <div className="h-1.5 w-full rounded-full bg-slate-100" />
    </div>
  </div>
);

// The real resume layout, scaled down. Only mounted for the few cards around the middle of the carousel.
const LiveThumb = memo(function LiveThumb({ Template, accent }) {
  const props = useMemo(() => getTemplateProps(accent), [accent]);
  return (
    <TemplateThumb className="w-full">
      <Template {...props} />
    </TemplateThumb>
  );
});

// One card in the carousel. Tapping the middle card opens the full preview, tapping a neighbour brings it to the
// middle, and the dark "Choose template" button on the middle card starts the builder with that layout.
// `slot` is the card's place in the whole rail (all three copies), `index` its place in the list of layouts.
const CarouselSlide = memo(function CarouselSlide({
  card,
  slot,
  index,
  total,
  active,
  clone,
  live,
  color,
  featured,
  featuredLabel,
  onTap,
  onUse,
}) {
  const { id, label, Template } = card;
  const accent = color || DEFAULT_ACCENT[id];

  return (
    <div
      className="ts-pane"
      data-active={active ? 'true' : 'false'}
      role="group"
      aria-roledescription="slide"
      aria-label={`${label}, ${index + 1} of ${total}`}
      aria-hidden={clone ? 'true' : undefined}
    >
      <div className="relative overflow-hidden bg-white shadow-[0_8px_28px_-10px_rgba(15,23,42,.3)] ring-1 ring-black/5">
        <button
          type="button"
          onClick={() => onTap(slot)}
          tabIndex={clone ? -1 : undefined}
          aria-label={active ? `Preview the ${label} layout` : `Show the ${label} layout`}
          className="block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900"
        >
          {live ? <LiveThumb Template={Template} accent={accent} /> : <SlideSkeleton accent={accent} />}
        </button>

        {featured && (
          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-amber-300 px-2 py-0.5 text-xs font-semibold text-slate-900 shadow-sm">
            {featuredLabel}
          </span>
        )}

        {active && (
          <button
            type="button"
            onClick={() => onUse(id)}
            tabIndex={clone ? -1 : undefined}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-xl bg-slate-900 px-5 py-3 text-base font-semibold text-white shadow-lg transition-transform hover:bg-black active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            {COPY.choose}
          </button>
        )}
      </div>

      <p className="mt-3 text-center text-sm font-semibold text-slate-700">{label}</p>
    </div>
  );
});

export default function TemplateShowcase({
  onUseTemplate,
  featuredTemplate,
  featuredLabel = COPY.featured,
  title = COPY.title,
  subtitle = COPY.subtitle,
  className = '',
}) {
  // Nothing is built until the section is near the viewport.
  const [sectionRef, sectionSeen] = useInView(0.01, { rootMargin: '300px 0px' });
  const onScreen = useOnScreen(sectionRef, 0.25);
  const liveRange = useLiveRange();
  const [color, setColor] = useState(null);
  const [previewId, setPreviewId] = useState(null);
  const [showAll, setShowAll] = useState(false);
  // The card in the middle of the rail, counted across all three copies. It starts on the first card of the middle copy.
  const [activeSlot, setActiveSlot] = useState(CARD_COUNT);
  // The card the live templates are built around. It trails `activeSlot` while the rail is moving.
  const [liveSlot, setLiveSlot] = useState(CARD_COUNT);
  const [playing, setPlaying] = useState(true); // auto-slide; a swipe, sideways scroll or arrow key switches it off for good
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false); // keyboard focus inside the carousel
  const [tick, setTick] = useState(0); // bumps when a tick is skipped (tab in the background) so the clock restarts
  const railRef = useRef(null);
  const activeRef = useRef(CARD_COUNT);
  const strideRef = useRef(0);
  const frame = useRef(0);
  const settleTimer = useRef(0);
  const idleId = useRef(0);
  const touching = useRef(false);
  const activeIndex = activeSlot % CARD_COUNT;

  useEffect(() => {
    setColor(readColor());
  }, []);

  // The thumbnails follow the colour a beat behind the swatches, so a tap never waits on them.
  const thumbColor = useDeferred(color);

  // Fetch and decode the demo photo up front, so the first thumbnails don't flash an empty photo frame.
  useEffect(() => {
    const img = new Image();
    img.src = profile2;
    if (img.decode) img.decode().catch(() => {});
  }, []);

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

  // The distance between two neighbouring cards. The first card of the middle copy starts in the middle of the rail,
  // and the rail keeps its place (the same card in the middle) when the cards change size.
  useLayoutEffect(() => {
    const el = railRef.current;
    if (!el) return undefined;
    const measure = () => {
      const [a, b] = el.children;
      if (!a || !b) return;
      const stride = b.getBoundingClientRect().left - a.getBoundingClientRect().left;
      if (!stride) return;
      const prev = strideRef.current;
      strideRef.current = stride;
      if (!prev || Math.abs(stride - prev) > 0.01) el.scrollLeft = activeRef.current * stride;
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Runs once the rail has been still for a moment (and never while a finger is down). It builds the live templates
  // around the card in the middle, and if the rail has drifted into the first or last copy it moves it to the same
  // spot in the middle copy. The state change is flushed before the jump, so the first paint after the jump already
  // has the middle card marked and its resume built.
  const settle = useCallback(() => {
    const el = railRef.current;
    const stride = strideRef.current;
    if (!el || !stride || touching.current) return;
    const slot = clamp(Math.round(el.scrollLeft / stride), 0, SLOT_COUNT - 1);
    const home = CARD_COUNT + (slot % CARD_COUNT);
    if (slot === home) {
      setLiveSlot(slot);
      return;
    }
    activeRef.current = home;
    flushSync(() => {
      setActiveSlot(home);
      setLiveSlot(home);
    });
    el.scrollLeft = home * stride;
  }, []);

  // Restarts the "has it stopped?" timer, then settles in an idle slot, so nothing is built in the middle of a slide.
  const scheduleSettle = useCallback(() => {
    clearTimeout(settleTimer.current);
    if (idleId.current && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleId.current);
    idleId.current = 0;
    settleTimer.current = setTimeout(() => {
      const run = () => {
        idleId.current = 0;
        settle();
      };
      if (typeof window.requestIdleCallback === 'function') idleId.current = window.requestIdleCallback(run, { timeout: 500 });
      else run();
    }, 150);
  }, [settle]);

  // While the rail moves: work out which card is in the middle (one division per frame, and React only hears about
  // it when the answer changes).
  const handleScroll = useCallback(() => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      scheduleSettle();
      const el = railRef.current;
      const stride = strideRef.current;
      if (!el || !stride) return;
      const next = clamp(Math.round(el.scrollLeft / stride), 0, SLOT_COUNT - 1);
      if (next !== activeRef.current) {
        activeRef.current = next;
        setActiveSlot(next);
      }
    });
  }, [scheduleSettle]);

  const handleTouchStart = useCallback(() => {
    touching.current = true;
  }, []);
  const handleTouchEnd = useCallback(() => {
    touching.current = false;
    scheduleSettle();
  }, [scheduleSettle]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      clearTimeout(settleTimer.current);
      if (idleId.current && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleId.current);
    },
    [],
  );

  // Scroll so that card `slot` sits in the middle of the rail. Thanks to the padding on both sides of the rail, that is
  // always exactly slot * (distance between cards).
  const goToSlot = useCallback((slot, instant = false) => {
    const el = railRef.current;
    const stride = strideRef.current;
    if (!el || !stride) return;
    el.scrollTo({
      left: clamp(slot, 0, SLOT_COUNT - 1) * stride,
      behavior: instant || prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }, []);

  // A dot names a layout, not a place on the rail: go to whichever copy of it is closest.
  const goToCard = useCallback(
    (index) => {
      const here = activeRef.current;
      const base = Math.floor(here / CARD_COUNT) * CARD_COUNT;
      let best = base + index;
      [base - CARD_COUNT + index, base + CARD_COUNT + index].forEach((candidate) => {
        if (candidate >= 0 && candidate < SLOT_COUNT && Math.abs(candidate - here) < Math.abs(best - here)) best = candidate;
      });
      goToSlot(best);
    },
    [goToSlot],
  );

  const handleTap = useCallback(
    (slot) => {
      if (slot === activeRef.current) setPreviewId(TEMPLATE_IDS[slot % CARD_COUNT]);
      else goToSlot(slot);
    },
    [goToSlot],
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPlaying(false);
        goToSlot(activeRef.current + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPlaying(false);
        goToSlot(activeRef.current - 1);
      }
    },
    [goToSlot],
  );

  // Auto-slide: one card every AUTOPLAY_MS, and because the rail loops it simply keeps going. It holds still while the
  // visitor hovers or keyboard-focuses the carousel, while the section is off screen or the tab is in the background,
  // while the gallery or a preview is open, and for reduced-motion visitors. Depending on `activeSlot` gives every
  // card, however it got to the middle, a full interval.
  useEffect(() => {
    if (!playing || hovering || focused || !onScreen || showAll || previewId || prefersReducedMotion()) return undefined;
    const t = setTimeout(() => {
      if (document.hidden) {
        setTick((n) => n + 1);
        return;
      }
      goToSlot(activeRef.current + 1);
    }, AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [playing, hovering, focused, onScreen, showAll, previewId, activeSlot, tick, goToSlot]);

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
  // Swiping or scrolling sideways means the visitor is browsing by hand, so stop auto-sliding for good.
  const handleRailWheel = useCallback((e) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) setPlaying(false);
  }, []);
  const handleRailPointerDown = useCallback((e) => {
    if (e.pointerType === 'touch') setPlaying(false);
  }, []);

  const openAll = useCallback(() => setShowAll(true), []);
  const closeAll = useCallback(() => setShowAll(false), []);

  // A short window of dots around the active layout. The list loops, so the window wraps past the ends too.
  const dotCount = Math.min(DOT_COUNT, CARD_COUNT);
  const dotHalf = Math.floor(dotCount / 2);
  const dots = Array.from({ length: dotCount }, (_, j) => (((activeIndex - dotHalf + j) % CARD_COUNT) + CARD_COUNT) % CARD_COUNT);

  return (
    <section ref={sectionRef} className={`py-12 sm:py-20 ${className}`}>
      <style>{SHOWCASE_CSS}</style>
      <style>{SCROLLBAR_CSS}</style>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <header className="mx-auto max-w-4xl text-center">
          <h2
            className="ts-display text-3xl font-extralight leading-[1.1] tracking-tight text-slate-900 sm:text-4xl lg:text-5xl"
            style={{ textWrap: 'balance' }}
          >
            {title}
          </h2>
          {subtitle ? <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-slate-600">{subtitle}</p> : null}
        </header>
      </div>

      {/* The rail runs the full width of the screen, so the cards reach both edges. */}
      <div
        className="ts-bleed relative mt-8 sm:mt-10"
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
          onClick={() => goToSlot(activeRef.current - 1)}
          aria-label={COPY.prev}
          title="Previous"
          className={`${ARROW_BTN} left-4 lg:left-8`}
        >
          <IconPrev />
        </button>

        <div
          ref={railRef}
          tabIndex={0}
          aria-label={COPY.carousel}
          aria-live={playing ? 'off' : 'polite'}
          className="ts-track ts-rail relative flex gap-4 overflow-x-auto py-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 sm:gap-6"
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          onWheel={handleRailWheel}
          onPointerDown={handleRailPointerDown}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          {SLOTS.map(({ slot, copy, index }) => {
            const c = TEMPLATE_CARDS[index];
            return (
              <CarouselSlide
                key={`${copy}-${c.id}`}
                card={c}
                slot={slot}
                index={index}
                total={CARD_COUNT}
                active={slot === activeSlot}
                clone={copy !== 1}
                live={sectionSeen && Math.abs(slot - liveSlot) <= liveRange}
                color={thumbColor}
                featured={featuredTemplate === c.id}
                featuredLabel={featuredLabel}
                onTap={handleTap}
                onUse={handleUse}
              />
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => goToSlot(activeRef.current + 1)}
          aria-label={COPY.next}
          title="Next"
          className={`${ARROW_BTN} right-4 lg:right-8`}
        >
          <IconNext />
        </button>
      </div>

      <p className="sr-only" aria-live={playing ? 'off' : 'polite'}>
        {TEMPLATE_CARDS[activeIndex].label} layout, {activeIndex + 1} of {CARD_COUNT}
      </p>

      {/* Pagination: the active dot stretches into a pill; the dots at both ends of the window shrink to hint at more. */}
      <div className="mt-2 flex items-center justify-center" role="group" aria-label="Choose a layout">
        {dots.map((i, j) => {
          const on = i === activeIndex;
          const edge = !on && CARD_COUNT > dotCount && (j === 0 || j === dotCount - 1);
          return (
            <button
              key={i}
              type="button"
              onClick={() => goToCard(i)}
              aria-label={`Show the ${TEMPLATE_CARDS[i].label} layout`}
              aria-current={on ? 'true' : undefined}
              className="grid h-7 place-items-center px-[3px] focus:outline-none focus-visible:rounded-full focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              <span
                className={`block rounded-full motion-safe:transition-[width,background-color] motion-safe:duration-200 ${
                  on ? 'h-2 w-6 bg-slate-900' : edge ? 'h-1.5 w-1.5 bg-slate-300' : 'h-2 w-2 bg-slate-300'
                }`}
              />
            </button>
          );
        })}
      </div>

      <div className="mx-auto mt-5 flex max-w-6xl flex-col items-center gap-6 px-4 sm:px-6 lg:px-8">
        <ColorBar fluid color={color} onChange={setColor} className="" />

        <button
          type="button"
          onClick={openAll}
          aria-haspopup="dialog"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-5 py-3 text-base font-semibold text-slate-900 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
        >
          {COPY.viewAll}
          <IconNext />
        </button>
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
