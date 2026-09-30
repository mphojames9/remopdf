import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
// This file lives in src/components/ (Home.jsx imports it from '../components/TemplateShowcase').
// If ResumePhoto sits somewhere else in your project, adjust the first path.
import ResumePhoto, { PHOTO_DEFAULTS } from './Resume/Sections/ResumePhoto';
import profile2 from '../assets/profile2.png';

/**
 * TemplateShowcase - home page section that previews the resume templates.
 *
 * - Click a card to select a template, "Preview" opens a large preview.
 * - The colour bar recolours every thumbnail live, on the page and in the preview.
 * - The choice is saved to the same localStorage keys the builder uses
 *   (template) plus one new key for the colour, so it carries into the builder.
 *
 * Props
 *   onUseTemplate({ template, color })  called when "Get started" / "Build my resume" is pressed
 *                                       (color is null for the template default)
 *   featuredTemplate, featuredLabel     optional: put a gold tag (default "Recommended")
 *                                       on one card, e.g. featuredTemplate="blue-sidebar"
 *   title, subtitle, className          optional
 */

const STORAGE_KEY_TEMPLATE = 'resumeBuilder:selectedTemplate';
const STORAGE_KEY_COLOR = 'resumeBuilder:selectedColor';
const TEMPLATE_IDS = ['blue-sidebar', 'green-header', 'pink-header', 'dark-top'];
const DEFAULT_TEMPLATE = 'blue-sidebar';
const GRAYSCALE = '#475569';
const HEX_RE = /^#[0-9a-f]{6}$/i;

// All visible wording lives here so it is easy to tweak.
const COPY = {
  title: 'Designed to get you noticed',
  subtitle: 'Choose a polished template, add your signature color, and have a standout resume in minutes.',
  colors: 'Signature color',
  preview: 'Preview',
  use: 'Get started',
  useInPreview: 'Build my resume',
  closePreview: 'Close preview',
  featured: 'Recommended',
};

// Exact A4 Dimensions at 96 DPI (210mm x 297mm)
const PAGE_WIDTH_PX = 794;
const PAGE_HEIGHT_PX = 1123;

// All motion lives here so the component stays drop-in (no tailwind.config edits).
// Everything sits inside a no-preference query, so people who ask their OS for
// reduced motion get the static version.
const SHOWCASE_CSS = `
@media (prefers-reduced-motion: no-preference) {
  @keyframes ts-rise { from { opacity: 0; transform: translateY(28px) scale(.96); } to { opacity: 1; transform: none; } }
  @keyframes ts-fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes ts-modal { from { opacity: 0; transform: translateY(18px) scale(.95); } to { opacity: 1; transform: none; } }
  @keyframes ts-swap { from { opacity: 0; transform: translateY(6px) scale(.96); } to { opacity: 1; transform: none; } }
  @keyframes ts-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
  @keyframes ts-glow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,.5), 0 10px 28px -10px rgba(59,130,246,.5); }
    50% { box-shadow: 0 0 0 7px rgba(59,130,246,0), 0 14px 34px -8px rgba(59,130,246,.85); }
  }
  @keyframes ts-pop { 0% { transform: scale(0) rotate(-60deg); } 60% { transform: scale(1.3) rotate(10deg); } 100% { transform: scale(1) rotate(0); } }
  @keyframes ts-ripple { from { transform: scale(1); opacity: .55; } to { transform: scale(2.4); opacity: 0; } }
  @keyframes ts-sheen { 0%, 55% { transform: translateX(-120%); } 100% { transform: translateX(120%); } }
  @keyframes ts-bounce { 0% { transform: scale(1); } 40% { transform: scale(1.4); } 100% { transform: scale(1); } }

  /* entrances */
  .ts-reveal { opacity: 0; }
  .ts-reveal.ts-in { opacity: 1; animation: ts-rise .75s cubic-bezier(.2,.8,.2,1) backwards; animation-delay: var(--ts-d, 0ms); }
  .ts-fade { animation: ts-fade .25s ease-out; }
  .ts-modal { animation: ts-modal .4s cubic-bezier(.2,.9,.25,1.1); }
  .ts-swap { animation: ts-swap .4s cubic-bezier(.2,.8,.2,1); }

  /* idle life */
  .ts-float { animation: ts-float 6s ease-in-out infinite; }
  .ts-float:hover { animation-play-state: paused; }

  /* small confirmations */
  .ts-pop { animation: ts-pop .5s cubic-bezier(.34,1.56,.64,1); }
  .ts-ripple { animation: ts-ripple .9s ease-out; }
  .ts-bounce { animation: ts-bounce .4s ease-out; }

  /* colour changes glide instead of snapping, on every thumbnail */
  .ts-thumb, .ts-thumb * { transition: background-color .45s ease, color .45s ease, border-color .45s ease; }

  /* card: lifts, tilts towards the pointer, catches the light */
  .ts-card {
    transform: perspective(900px) rotateX(var(--ts-rx, 0deg)) rotateY(var(--ts-ry, 0deg)) translateY(var(--ts-lift, 0px));
    transition: transform .5s cubic-bezier(.2,.8,.2,1), box-shadow .35s ease;
    will-change: transform;
  }
  .ts-card:hover, .ts-card:focus-visible {
    --ts-lift: -8px;
    box-shadow: 0 26px 44px -18px rgba(2,6,23,.6);
    transition: transform .12s ease-out, box-shadow .35s ease;
  }
  .ts-card::after {
    content: ''; position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity .3s ease;
    background: radial-gradient(circle at var(--ts-mx, 50%) var(--ts-my, 30%), rgba(255,255,255,.3), transparent 55%);
  }
  .ts-card:hover::after { opacity: 1; }
  .ts-card[aria-pressed="true"] { animation: ts-glow 2.6s ease-in-out infinite; }

  /* accent buttons: a sheen sweeps across on hover */
  .ts-cta { position: relative; overflow: hidden; }
  .ts-cta::before {
    content: ''; position: absolute; inset: 0; pointer-events: none; transform: translateX(-120%);
    background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,.5) 50%, transparent 70%);
  }
  .ts-cta:hover::before { transform: translateX(120%); transition: transform .7s ease; }
  .ts-cta-attn::before { animation: ts-sheen 3.4s ease-in-out infinite; }
}
`;

// Slim, rounded scrollbars. `.pro-scroll` suits light surfaces; add `.pro-scroll-dark` on dark ones.
// The thumb is drawn inside a transparent border so it looks thin and floats off the edge,
// then thickens on hover and while dragging. Firefox has no ::-webkit-scrollbar, so it gets
// the standard properties instead (Chrome ignores the webkit rules if those are set, hence @supports).
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

// True once the element has scrolled into view (and stays true), so entrances
// play when the person actually gets to the section.
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

const tint = (hex, amount) => {
  if (!hex) return hex;
  const num = parseInt(hex.replace('#', ''), 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  if (amount >= 0) {
    r += (255 - r) * amount;
    g += (255 - g) * amount;
    b += (255 - b) * amount;
  } else {
    r += r * amount;
    g += g * amount;
    b += b * amount;
  }
  const toHex = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const DEFAULT_ACCENT = {
  'blue-sidebar': '#1e3a8a',
  'green-header': '#15803d',
  'pink-header': '#be185d',
  'dark-top': '#334155',
};

// Deep, muted tones that read as professional. Each is dark enough to carry white
// text, because the accent is used as a background in the sidebar/header templates.
const ACCENT_SWATCHES = [
  { hex: '#1e3a8a', label: 'Navy' },
  { hex: '#2b6cb0', label: 'Steel blue' },
  { hex: '#0f766e', label: 'Teal' },
  { hex: '#166534', label: 'Forest' },
  { hex: '#881337', label: 'Burgundy' },
  { hex: '#1f2937', label: 'Charcoal' },
];

// Sample résumé used only by the template picker, so every thumbnail looks like
// a real page. Nothing here is read from the user's own data.
const DEMO_RESUME = {
  name: 'Alex Morgan',
  title: 'Frontend Developer',
  email: 'alex.morgan@email.com',
  phone: '+27 82 123 4567',
  location: 'Cape Town, South Africa',
  website: 'alexmorgan.dev',
  linkedin: 'linkedin.com/in/alexmorgan',
  summary:
    'Frontend developer with 5+ years of experience building fast, accessible web apps with React and TypeScript. Focused on clean interfaces, smooth user experiences and close collaboration with designers.',
  jobs: [
    {
      title: 'Senior Frontend Developer',
      employer: 'BrightWave Software',
      dates: '2022 – Present',
      points: [
        'Led a redesign that cut page load time by 40%.',
        'Mentored four junior developers.',
        'Introduced automated testing, cutting production bugs by 30%.',
      ],
    },
    {
      title: 'Frontend Developer',
      employer: 'Pixel & Co',
      dates: '2019 – 2022',
      points: [
        'Built a reusable component library.',
        'Shipped 15+ client websites.',
        'Worked with designers to deliver pixel-perfect interfaces.',
      ],
    },
    {
      title: 'Junior Web Developer',
      employer: 'Nova Digital',
      dates: '2017 – 2019',
      points: [
        'Converted designs into responsive pages.',
        'Fixed bugs and improved accessibility.',
        'Supported senior developers on live client projects.',
      ],
    },
  ],
  education: {
    degree: 'BSc Computer Science',
    school: 'University of Cape Town',
    dates: '2015 – 2018',
    detail: 'Graduated with distinction',
  },
  projects: [
    { name: 'TaskFlow', detail: 'Drag-and-drop kanban app used by 2,000+ people.' },
    { name: 'Pixel UI Kit', detail: 'Open-source React components with 1.2k GitHub stars.' },
  ],
  certifications: [
    { name: 'Meta Front-End Developer Certificate', year: '2021' },
    { name: 'Google UX Design Certificate', year: '2020' },
  ],
  skills: [
    { text: 'React', rating: 5 },
    { text: 'TypeScript', rating: 4 },
    { text: 'Tailwind CSS', rating: 5 },
    { text: 'Next.js', rating: 4 },
    { text: 'Node.js', rating: 3 },
    { text: 'Figma', rating: 4 },
    { text: 'Git', rating: 5 },
  ],
  languages: [
    { name: 'English', level: 'Fluent' },
    { name: 'Afrikaans', level: 'Good' },
    { name: 'Zulu', level: 'Basic' },
  ],
  interests: ['Photography', 'Trail running', 'Open source'],
};

// Draws its children on a full A4 page (794 x 1123) and scales that page down
// to whatever width the card has, so the tiny text keeps the real proportions.
const TemplateThumb = ({ children }) => {
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
    <div ref={ref} className="ts-thumb relative w-full aspect-[1/1.414] overflow-hidden bg-white pointer-events-none select-none" aria-hidden="true">
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ width: PAGE_WIDTH_PX, height: PAGE_HEIGHT_PX, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
};

// Same component and default look as the real templates, so a thumbnail shows
// the photo exactly where (and how) the finished resume will.
const ThumbPhoto = ({ borderColor }) => (
  <ResumePhoto src={profile2} style={PHOTO_DEFAULTS} borderColor={borderColor} />
);

const ThumbHeading = ({ className = '', style, children }) => (
  <div className={`text-[15px] font-extrabold uppercase tracking-wider mb-3 ${className}`} style={style}>
    {children}
  </div>
);

const ThumbJob = ({ job, employerColor = '#475569', stacked = false, maxPoints = 3 }) => (
  <div className="mb-5">
    <div className={stacked ? '' : 'flex justify-between items-baseline gap-3'}>
      <div className="text-[18px] font-bold text-slate-900 leading-tight">{job.title}</div>
      {!stacked && <div className="text-[13px] text-slate-500 whitespace-nowrap">{job.dates}</div>}
    </div>
    <div className="text-[15px] font-semibold mt-0.5" style={{ color: employerColor }}>{job.employer}</div>
    {stacked && <div className="text-[13px] text-slate-400">{job.dates}</div>}
    <div className="mt-1.5 space-y-1">
      {job.points.slice(0, maxPoints).map((p) => (
        <div key={p} className="flex gap-2 text-[14px] leading-snug text-slate-600">
          <span>•</span>
          <span>{p}</span>
        </div>
      ))}
    </div>
  </div>
);

/* Sidebar ------------------------------------------------------------------ */
const SidebarThumb = ({ accent }) => {
  const D = DEMO_RESUME;
  const soft = tint(accent, 0.75);
  const sideHeading = (text) => (
    <ThumbHeading className="text-white pb-1 border-b" style={{ borderColor: 'rgba(255,255,255,0.3)' }}>{text}</ThumbHeading>
  );

  return (
    <div className="flex w-full h-full text-slate-800">
      <div className="w-[35%] h-full px-6 py-10 text-white overflow-hidden" style={{ backgroundColor: accent }}>
        <div className="mb-9"><ThumbPhoto borderColor="#ffffff" /></div>

        {sideHeading('Contact')}
        <div className="space-y-2 mb-8 text-[13px] break-words" style={{ color: soft }}>
          <div>{D.email}</div>
          <div>{D.phone}</div>
          <div>{D.location}</div>
          <div>{D.website}</div>
          <div>{D.linkedin}</div>
        </div>

        {sideHeading('Skills')}
        <div className="mb-8">
          {D.skills.map((s) => (
            <div key={s.text} className="mb-3">
              <div className="text-[14px] font-semibold">{s.text}</div>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className="h-[4px] flex-1 rounded-full"
                    style={{ backgroundColor: i <= s.rating ? '#ffffff' : 'rgba(255,255,255,0.25)' }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {sideHeading('Languages')}
        <div className="mb-8">
          {D.languages.map((l) => (
            <div key={l.name} className="flex justify-between items-baseline mb-2 text-[14px]">
              <span className="font-semibold">{l.name}</span>
              <span className="text-[12px]" style={{ color: soft }}>{l.level}</span>
            </div>
          ))}
        </div>

        {sideHeading('Interests')}
        <div className="text-[13px] leading-relaxed" style={{ color: soft }}>{D.interests.join(' · ')}</div>
      </div>

      <div className="w-[65%] h-full px-9 py-10 overflow-hidden">
        <div className="text-[46px] leading-none font-extrabold text-slate-900 mb-2">{D.name}</div>
        <div className="text-[22px] font-semibold mb-8" style={{ color: accent }}>{D.title}</div>

        <ThumbHeading className="border-b border-slate-200 pb-1" style={{ color: accent }}>Summary</ThumbHeading>
        <p className="text-[15px] leading-relaxed text-slate-600 mb-7">{D.summary}</p>

        <ThumbHeading className="border-b border-slate-200 pb-1" style={{ color: accent }}>Experience</ThumbHeading>
        {D.jobs.map((job) => <ThumbJob key={job.title} job={job} />)}

        <ThumbHeading className="border-b border-slate-200 pb-1" style={{ color: accent }}>Education</ThumbHeading>
        <div className="mb-7">
          <div className="text-[18px] font-bold text-slate-900">{D.education.degree}</div>
          <div className="text-[15px] text-slate-600">{D.education.school} · {D.education.dates}</div>
          <div className="text-[13px] text-slate-400 mt-0.5">{D.education.detail}</div>
        </div>

        <ThumbHeading className="border-b border-slate-200 pb-1" style={{ color: accent }}>Projects</ThumbHeading>
        {D.projects.map((p) => (
          <div key={p.name} className="mb-2.5">
            <div className="text-[15px] font-bold text-slate-900 leading-tight">{p.name}</div>
            <div className="text-[14px] leading-snug text-slate-600">{p.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* Green header ("Accent") --------------------------------------------------- */
const GreenHeaderThumb = ({ accent }) => {
  const D = DEMO_RESUME;
  const heading = (text) => <ThumbHeading style={{ color: accent }}>{text}</ThumbHeading>;

  return (
    <div className="w-full h-full flex flex-col text-slate-800 bg-white">
      <div className="px-10 py-8 bg-slate-50 border-b-[6px] flex items-center gap-7" style={{ borderColor: tint(accent, 0.35) }}>
        <ThumbPhoto borderColor={accent} />
        <div className="min-w-0">
          <div className="text-[46px] leading-none font-extrabold text-slate-900 mb-2">{D.name}</div>
          <div className="text-[22px] font-semibold" style={{ color: accent }}>{D.title}</div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-[13px] font-medium text-slate-600">
            <span>{D.email}</span>
            <span>{D.phone}</span>
            <span>{D.website}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-7 px-10 py-8 overflow-hidden">
        <div className="w-[33%] border-r border-slate-100 pr-6">
          {heading('Skills')}
          <div className="mb-6">
            {D.skills.map((s) => (
              <span key={s.text} className="inline-block mr-2 mb-2 px-2 py-1 text-[13px] font-semibold text-slate-700 border border-slate-200 rounded">
                {s.text}
              </span>
            ))}
          </div>

          {heading('Languages')}
          <div className="mb-6">
            {D.languages.map((l) => (
              <div key={l.name} className="flex justify-between text-[14px] mb-1.5">
                <span className="font-semibold text-slate-700">{l.name}</span>
                <span className="text-slate-500">{l.level}</span>
              </div>
            ))}
          </div>

          {heading('Education')}
          <div className="text-[16px] font-bold text-slate-900 leading-tight">{D.education.degree}</div>
          <div className="text-[14px] font-semibold mt-0.5" style={{ color: accent }}>{D.education.school}</div>
          <div className="text-[13px] text-slate-500 mb-6">{D.education.dates}</div>

          {heading('Certificates')}
          {D.certifications.map((c) => (
            <div key={c.name} className="mb-2">
              <div className="text-[14px] font-semibold text-slate-800 leading-snug">{c.name}</div>
              <div className="text-[13px] text-slate-500">{c.year}</div>
            </div>
          ))}
        </div>

        <div className="w-[67%]">
          {heading('Summary')}
          <p className="text-[15px] leading-relaxed text-slate-600 mb-7">{D.summary}</p>
          {heading('Experience')}
          {D.jobs.map((job) => <ThumbJob key={job.title} job={job} employerColor={accent} />)}
          {heading('Projects')}
          {D.projects.map((p) => (
            <div key={p.name} className="mb-2.5">
              <div className="text-[15px] font-bold text-slate-900 leading-tight">{p.name}</div>
              <div className="text-[14px] leading-snug text-slate-600">{p.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* Pink header ("Modern") ---------------------------------------------------- */
const PinkHeaderThumb = ({ accent }) => {
  const D = DEMO_RESUME;
  const heading = (text) => (
    <ThumbHeading className="border-b-2 pb-1 tracking-widest" style={{ color: accent, borderColor: tint(accent, 0.9) }}>{text}</ThumbHeading>
  );

  return (
    <div className="w-full h-full flex flex-col text-slate-800" style={{ backgroundColor: tint(accent, 0.92) }}>
      <div className="px-10 py-8 text-white flex items-center justify-between gap-6" style={{ backgroundColor: accent }}>
        <div className="min-w-0 flex-1">
          <div className="text-[46px] leading-none font-extrabold mb-2">{D.name}</div>
          <div className="text-[22px] mb-4" style={{ color: tint(accent, 0.55) }}>{D.title}</div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[13px]" style={{ color: tint(accent, 0.85) }}>
            <span>{D.email}</span>
            <span>{D.phone}</span>
            <span>{D.website}</span>
          </div>
        </div>
        <ThumbPhoto borderColor="#ffffff" />
      </div>

      <div
        className="flex-1 flex gap-8 m-6 mt-0 px-8 py-7 bg-white rounded-b-md shadow-sm border overflow-hidden"
        style={{ borderColor: tint(accent, 0.82) }}
      >
        <div className="w-1/2">
          {heading('Summary')}
          <p className="text-[14px] leading-relaxed text-slate-600 mb-6">{D.summary}</p>
          {heading('Experience')}
          {D.jobs.map((job) => <ThumbJob key={job.title} job={job} stacked maxPoints={2} />)}
        </div>

        <div className="w-1/2">
          {heading('Skills')}
          <div className="mb-6">
            {D.skills.map((s) => (
              <div key={s.text} className="flex items-center gap-2 text-[14px] text-slate-600 mb-1">
                <span>•</span>
                <span>{s.text}</span>
              </div>
            ))}
          </div>
          {heading('Education')}
          <div className="text-[16px] font-bold text-slate-900 leading-tight">{D.education.degree}</div>
          <div className="text-[14px] font-semibold text-slate-600">{D.education.school}</div>
          <div className="text-[13px] text-slate-400 mb-6">{D.education.dates}</div>

          {heading('Languages')}
          <div className="mb-6">
            {D.languages.map((l) => (
              <div key={l.name} className="flex justify-between text-[14px] text-slate-600 mb-1">
                <span>{l.name}</span>
                <span className="text-slate-400">{l.level}</span>
              </div>
            ))}
          </div>

          {heading('Interests')}
          <div className="text-[14px] text-slate-600">{D.interests.join(' · ')}</div>
        </div>
      </div>
    </div>
  );
};

/* Dark top ("Professional") ------------------------------------------------- */
const DarkTopThumb = ({ accent }) => {
  const D = DEMO_RESUME;
  const heading = (text, plain = false) => (
    <ThumbHeading className={`text-slate-400 tracking-widest ${plain ? '' : 'border-b border-slate-100 pb-1'}`}>{text}</ThumbHeading>
  );

  return (
    <div className="w-full h-full flex flex-col px-9 py-9 text-slate-800" style={{ backgroundColor: accent }}>
      <div className="flex items-center gap-6 mb-7 text-white">
        <ThumbPhoto borderColor="#ffffff" />
        <div className="flex-1 min-w-0">
          <div className="text-[46px] leading-none font-extrabold mb-2">{D.name}</div>
          <div className="text-[22px] font-medium text-slate-300">{D.title}</div>
          <div className="mt-3 text-[13px] text-slate-300">{D.email} · {D.phone}</div>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-md shadow-sm px-8 py-7 overflow-hidden">
        {heading('Summary', true)}
        <p className="text-[15px] leading-relaxed text-slate-700 mb-7">{D.summary}</p>

        {heading('Experience')}
        {D.jobs.map((job) => <ThumbJob key={job.title} job={job} employerColor="#334155" />)}

        {heading('Education')}
        <div className="mb-6">
          <div className="text-[18px] font-bold text-slate-900">{D.education.degree}</div>
          <div className="text-[15px] text-slate-600">{D.education.school} · {D.education.dates}</div>
        </div>

        {heading('Skills')}
        <div>
          {D.skills.map((s) => (
            <span key={s.text} className="inline-block mr-2 mb-2 px-3 py-1 text-[13px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded">
              {s.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                         Home page template showcase                        */
/* -------------------------------------------------------------------------- */

const TEMPLATE_CARDS = [
  { id: 'blue-sidebar', label: 'Sidebar', Thumb: SidebarThumb },
  { id: 'green-header', label: 'Accent', Thumb: GreenHeaderThumb },
  { id: 'pink-header', label: 'Modern', Thumb: PinkHeaderThumb },
  { id: 'dark-top', label: 'Professional', Thumb: DarkTopThumb },
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
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

// Same swatches and behaviour as the "Colors" bar in the builder's preview.
const ColorBar = ({ color, onChange }) => {
  const isCustom = !!color && color !== GRAYSCALE && !ACCENT_SWATCHES.some((s) => s.hex === color);
  const ring = 'ring-2 ring-offset-2 ring-slate-400 ts-bounce';

  return (
    <div className="flex flex-wrap items-center gap-2.5" role="group" aria-label="Resume colour">
      <button
        type="button"
        onClick={() => onChange(null)}
        title="Template default"
        aria-label="Template default colour"
        aria-pressed={color === null}
        className={`w-6 h-6 rounded-full border border-slate-300 bg-white text-slate-500 flex items-center justify-center hover:scale-110 transition-transform focus:outline-none ${color === null ? ring : ''}`}
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
          className={`w-6 h-6 rounded-full shadow-sm hover:scale-110 transition-transform focus:outline-none ${color === swatch.hex ? ring : ''}`}
        />
      ))}

      <button
        type="button"
        onClick={() => onChange(GRAYSCALE)}
        title="Grayscale"
        aria-label="Grayscale"
        aria-pressed={color === GRAYSCALE}
        className={`w-6 h-6 rounded-full border border-slate-300 bg-white relative flex items-center justify-center hover:scale-110 transition-transform focus:outline-none ${color === GRAYSCALE ? ring : ''}`}
      >
        <span className="absolute w-[22px] h-[1px] bg-slate-400 rotate-45" />
      </button>

      <label
        title="Custom color"
        className={`relative w-6 h-6 rounded-full border border-dashed border-slate-300 flex items-center justify-center text-[16px] font-bold leading-none cursor-pointer hover:scale-110 transition-transform ${
          isCustom ? `${ring} text-white border-transparent` : 'text-slate-600 hover:bg-slate-100'
        }`}
        style={isCustom ? { backgroundColor: color } : undefined}
      >
        +
        <input
          type="color"
          aria-label="Custom colour"
          value={isCustom ? color : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </label>
    </div>
  );
};

const TemplateCard = ({ card, color, selected, onSelect, onPreview, onUse, index = 0, visible = true, featured = false, featuredLabel = COPY.featured }) => {
  const { id, label, Thumb } = card;
  const accent = color || DEFAULT_ACCENT[id];
  const cardRef = useRef(null);

  // Tilts the card towards the pointer and moves the light spot with it.
  const handlePointerMove = (e) => {
    const el = cardRef.current;
    if (!el || e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty('--ts-ry', `${((px - 0.5) * 12).toFixed(2)}deg`);
    el.style.setProperty('--ts-rx', `${((0.5 - py) * 12).toFixed(2)}deg`);
    el.style.setProperty('--ts-mx', `${(px * 100).toFixed(1)}%`);
    el.style.setProperty('--ts-my', `${(py * 100).toFixed(1)}%`);
  };

  const handlePointerLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.removeProperty('--ts-rx');
    el.style.removeProperty('--ts-ry');
  };

  return (
    <div
      className={`flex flex-col gap-2.5 ts-reveal ${visible ? 'ts-in' : ''}`}
      style={{ '--ts-d': `${200 + index * 110}ms` }}
    >
      <div className="ts-float" style={{ animationDelay: `${index * -1.5}s` }}>
        <div
          ref={cardRef}
          role="button"
          tabIndex={0}
          aria-pressed={selected}
          aria-label={`Select the ${label} template`}
          onClick={() => onSelect(id)}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect(id);
            }
          }}
          className="ts-card relative group cursor-pointer overflow-hidden bg-slate-800 border-2 border-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]"
        >
          <TemplateThumb>
            <Thumb accent={accent} />
          </TemplateThumb>

          <div className="absolute inset-x-0 bottom-0 w-full bg-slate-900/40 group-hover:bg-slate-900/55 backdrop-blur-md text-white text-[9px] font-extrabold text-center py-1 uppercase tracking-wide transition-colors duration-300">
            {label}
          </div>

          {featured && (
            <span className="absolute top-2 left-2 bg-amber-300 text-slate-900 text-[9px] font-extrabold uppercase tracking-wide px-2 py-1 shadow">
              {featuredLabel}
            </span>
          )}

          {selected && (
            <span className="ts-pop absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center shadow">
              <span className="ts-ripple pointer-events-none absolute inset-0 rounded-full bg-blue-500" />
              <span className="relative">
                <IconCheck />
              </span>
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPreview(id)}
          className="flex-1 px-3 py-2 rounded-full border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]"
        >
          {COPY.preview}
        </button>
        <button
          type="button"
          onClick={() => onUse(id)}
          className={`ts-cta ${selected ? 'ts-cta-attn' : ''} flex-1 px-3 py-2 rounded-full bg-[#d9856b] text-white text-xs font-bold shadow-md shadow-[#d9856b]/25 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ae6a56]`}
        >
          {COPY.use}
        </button>
      </div>
    </div>
  );
};

const TemplatePreviewModal = ({ templateId, setTemplateId, color, setColor, onUse, onClose }) => {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const card = TEMPLATE_CARDS.find((c) => c.id === templateId) || TEMPLATE_CARDS[0];
  const { Thumb } = card;
  const accent = color || DEFAULT_ACCENT[card.id];

  return (
    <div
      className="ts-fade fixed inset-0 z-[60] bg-slate-950/70 flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${card.label} template preview`}
    >
      <div
        className="ts-modal bg-white rounded-lg shadow-2xl w-full max-w-[720px] max-h-full flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 flex items-center justify-between gap-3 border-b border-slate-200 shrink-0">
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_CARDS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setTemplateId(c.id)}
                aria-pressed={c.id === card.id}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors focus:outline-none ${
                  c.id === card.id ? 'bg-slate-900 text-white' : 'border border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="p-1.5 rounded-full text-slate-500 hover:bg-slate-100 transition-colors focus:outline-none"
          >
            <IconClose />
          </button>
        </div>

        <div className="px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 shrink-0">
          <span className="text-[13px] font-extrabold text-slate-800">{COPY.colors}</span>
          <ColorBar color={color} onChange={setColor} />
        </div>

        <div className="pro-scroll pro-scroll-dark flex-1 min-h-0 overflow-y-auto bg-[#091122] p-4 sm:p-6">
          <div key={card.id} className="ts-swap mx-auto w-full max-w-[520px] shadow-2xl">
            <TemplateThumb>
              <Thumb accent={accent} />
            </TemplateThumb>
          </div>
        </div>

        <div className="px-5 py-3 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 border-t border-slate-200 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-full border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors focus:outline-none"
          >
            {COPY.closePreview}
          </button>
          <button
            type="button"
            onClick={() => onUse(card.id)}
            className="ts-cta px-8 py-2.5 rounded-full bg-[#d9856b] text-white text-xs font-bold shadow-md shadow-[#d9856b]/25 hover:shadow-lg active:scale-95 transition-all focus:outline-none"
          >
            {COPY.useInPreview}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function TemplateShowcase({
  onUseTemplate,
  featuredTemplate = null,
  featuredLabel = COPY.featured,
  title = COPY.title,
  subtitle = COPY.subtitle,
  className = '',
}) {
  const [template, setTemplate] = useState(readTemplate);
  const [color, setColor] = useState(readColor);
  const [previewId, setPreviewId] = useState(null);
  const [sectionRef, seen] = useInView(0.1);

  useEffect(() => {
    saveChoice(template, color);
  }, [template, color]);

  const closePreview = useCallback(() => setPreviewId(null), []);

  const handleUse = (id) => {
    setTemplate(id);
    saveChoice(id, color); // written now so the builder sees it even if we navigate right away
    setPreviewId(null);
    if (onUseTemplate) onUseTemplate({ template: id, color });
  };

  return (
    <section ref={sectionRef} className={`w-full ${className}`}>
      <style>{SHOWCASE_CSS + SCROLLBAR_CSS}</style>
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
        <div className={`ts-reveal ${seen ? 'ts-in' : ''}`}>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
        </div>

        <div
          className={`flex flex-wrap items-center gap-x-4 gap-y-2 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 self-start lg:self-auto ts-reveal ${seen ? 'ts-in' : ''}`}
          style={{ '--ts-d': '140ms' }}
        >
          <span className="text-[13px] font-extrabold text-slate-800">{COPY.colors}</span>
          <ColorBar color={color} onChange={setColor} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {TEMPLATE_CARDS.map((card, index) => (
          <TemplateCard
            key={card.id}
            card={card}
            index={index}
            visible={seen}
            featured={card.id === featuredTemplate}
            featuredLabel={featuredLabel}
            color={color}
            selected={template === card.id}
            onSelect={setTemplate}
            onPreview={setPreviewId}
            onUse={handleUse}
          />
        ))}
      </div>

      {previewId && (
        <TemplatePreviewModal
          templateId={previewId}
          setTemplateId={setPreviewId}
          color={color}
          setColor={setColor}
          onUse={handleUse}
          onClose={closePreview}
        />
      )}
    </section>
  );
}
