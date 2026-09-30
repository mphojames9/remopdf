import React, { useRef, useState, useLayoutEffect } from 'react';
import ResumePhoto, { PHOTO_DEFAULTS } from '../Sections/ResumePhoto';
import profile2 from '../../../assets/profile2.png';
import {
  PAGE_WIDTH_PX,
  PAGE_HEIGHT_PX,
  tint,
  DEFAULT_ACCENT,
} from './templateShared';

/* -------------------------------------------------------------------------- */
/*              Template thumbnails (demo content + profile photo)            */
/* -------------------------------------------------------------------------- */

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
    <div ref={ref} className="relative w-full aspect-[1/1.414] overflow-hidden bg-white pointer-events-none select-none" aria-hidden="true">
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
const SidebarThumb = ({ accent = DEFAULT_ACCENT['blue-sidebar'] }) => {
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
const GreenHeaderThumb = ({ accent = DEFAULT_ACCENT['green-header'] }) => {
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
const PinkHeaderThumb = ({ accent = DEFAULT_ACCENT['pink-header'] }) => {
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
const DarkTopThumb = ({ accent = DEFAULT_ACCENT['dark-top'] }) => {
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

// One entry per card in the picker. Every label pill shares the same frosted-glass look (see the card markup).
const TEMPLATE_CARDS = [
  { id: 'blue-sidebar', label: 'Sidebar', Thumb: SidebarThumb },
  { id: 'green-header', label: 'Accent', Thumb: GreenHeaderThumb },
  { id: 'pink-header', label: 'Modern', Thumb: PinkHeaderThumb },
  { id: 'dark-top', label: 'Professional', Thumb: DarkTopThumb },
];

export { TemplateThumb, TEMPLATE_CARDS, DEMO_RESUME, SidebarThumb, GreenHeaderThumb, PinkHeaderThumb, DarkTopThumb };
