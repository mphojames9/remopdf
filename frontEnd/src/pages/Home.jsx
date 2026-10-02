import { Fragment, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import image1 from '../assets/image1.png';
import image2 from '../assets/image2.png';
import editorShot from '../assets/editor-preview.png';
import TemplateShowcase from '../components/TemplateShowcase';
import Navbar from '../components/Navbar';

const BRAND = 'RemoPDF';
const PDF_EDITOR_ROUTE = '/Workspace';

/* ------------------------------------------------------------------ */
/*  Icons: one small component, path data only                         */
/* ------------------------------------------------------------------ */

const PATHS = {
  bolt: ['M12.5 2 4 13.5h6.2L9.8 22 20 9.8h-6.4L12.5 2Z'],
  shield: ['M12 3.5 5 6v5.2c0 4.4 2.9 7.5 7 9.3 4.1-1.8 7-4.9 7-9.3V6l-7-2.5Z', 'm9.2 12.3 1.9 1.9 3.7-3.9'],
  grid: ['M4.5 4.5h6v6h-6zM13.5 4.5h6v6h-6zM4.5 13.5h6v6h-6zM13.5 13.5h6v6h-6z'],
  download: ['M12 3v12m0 0 4-4m-4 4-4-4', 'M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2'],
  menu: ['M4 7h16M4 12h16M4 17h16'],
  edit: ['M4 20h4L19 9l-4-4L4 16v4Z', 'm13.5 6.5 4 4'],
  share: ['M12 15V4', 'm8 8 4-4 4 4', 'M5 14v5h14v-5'],
  lock: ['M7 11V8a5 5 0 0 1 10 0v3', 'M5.5 11h13v9h-13z'],
  close: ['M6 6l12 12M18 6 6 18'],
  arrowUp: ['M12 19V5', 'm6 11 6-6 6 6'],
  arrowUpRight: ['M7 17 17 7', 'M8 7h9v9'],
  plus: ['M12 5v14M5 12h14'],
  check: ['m5 12.5 4.5 4.5L19 7.5'],
  spark: ['M12 3.5c.5 2.9 1.1 3.5 4 4-2.9.5-3.5 1.1-4 4-.5-2.9-1.1-3.5-4-4 2.9-.5 3.5-1.1 4-4Z', 'M19 14.5c.3 1.6.6 1.9 2.2 2.2-1.6.3-1.9.6-2.2 2.2-.3-1.6-.6-1.9-2.2-2.2 1.6-.3 1.9-.6 2.2-2.2Z'],
  mail: ['M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z', 'm22 6-10 7L2 6'],
  phone: ['M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z'],
  pin: ['M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z', 'M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z'],
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
/*  Content                                                            */
/* ------------------------------------------------------------------ */

const editorPoints = [
  { art: 'text', title: 'Edit and add text', desc: 'Click a line to fix it, or place new text anywhere on the page.' },
  { art: 'mark', title: 'Highlight, sign, add images', desc: 'Mark what matters, add your signature, or place an image on the page.' },
  { art: 'pages', title: 'Add, remove and rotate pages', desc: 'Change the page order of a file, with every page shown in the sidebar.' },
  { art: 'split', title: 'Split a PDF', desc: 'Break a big file into smaller ones, ready to send on their own.' },
  { art: 'lock', title: 'Lock and unlock', desc: 'Protect a PDF with a password, and unlock it when you need to work on it.' },
  { art: 'convert', title: 'Convert file types', desc: 'Switch between PDF and other file types in a few taps.' },
  { art: 'compress', title: 'Compress', desc: 'Shrink heavy files so they are easy to email and upload.' },
  { art: 'finish', title: 'Watermark and page numbers', desc: 'Finish the file with a watermark and page numbers, then download it.' },
];

const atsPoints = [
  { title: 'Clear section headings', desc: 'Work history, education and skills sit under the headings a scan looks for.' },
  { title: 'Readable text', desc: 'Each template uses plain, readable text, so your details are picked up in the right place.' },
  { title: 'Typos caught as you type', desc: 'Spelling and grammar checks keep a misspelled skill from being skipped.' },
];

// top = where the chip appears down the page; the scanner reveals each one as the beam passes it.
const atsFound = [
  { label: 'Name and contact', top: '9%', left: true },
  { label: 'Work history', top: '33%' },
  { label: 'Skills', top: '57%', left: true },
  { label: 'Education', top: '80%' },
];

const ticker = ['Edit PDF text', 'Highlight text', 'Organize and protect', 'Convert and compress', 'Scan and share', 'ATS-friendly resumes'];

const steps = [
  { title: 'Pick what you need', desc: 'Open a PDF to edit, or start a resume from a template.' },
  { title: 'Make your changes', desc: 'Edit text, highlight and organize pages, or fill in your resume with spelling and grammar checks as you type.' },
  { title: 'Download your PDF', desc: 'Preview the result, then download a clean PDF.' },
];

const faqs = [
  { topic: 'General', q: 'What can I do with this app?', a: 'Edit and highlight text in PDFs, organize and protect them, convert and compress files, scan and share documents, and build a resume from a template.' },
  { topic: 'PDFs', q: 'Can I edit text that is already in a PDF?', a: 'Yes. Open the file in the PDF editor, click a line and type. You can also add new text anywhere on the page, highlight, sign, or place an image.' },
  { topic: 'PDFs', q: 'How do I make a PDF smaller?', a: 'Use Compress. It shrinks heavy files so they are easy to email and upload.' },
  { topic: 'PDFs', q: 'Can I put a password on a PDF?', a: 'Yes. Lock a PDF with a password, and unlock it when you need to work on it again.' },
  {
    topic: 'Resumes', q: 'What does ATS friendly mean?',
    a: 'Many employers use applicant tracking systems (ATS) to scan resumes before a person reads them. Our resume templates use clear headings and readable text so those systems can pick up your details correctly.',
  },
  { topic: 'General', q: 'Do I need design skills?', a: 'No. For resumes, choose a template and add your details. For PDFs, open a file and edit right on the page.' },
  { topic: 'Resumes', q: 'Can I use my existing resume?', a: 'Yes. Import your current resume in the builder and edit it from there.' },
  { topic: 'General', q: 'What file do I get?', a: 'A PDF, ready to email or upload. Resumes come as A4.' },
];

/* ------------------------------------------------------------------ */
/*  Header                                                             */
/* ------------------------------------------------------------------ */

const magnet = (e) => {
  if (e.pointerType !== 'mouse') return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--bx', `${(e.clientX - r.left - r.width / 2) * 0.22}px`);
  el.style.setProperty('--by', `${(e.clientY - r.top - r.height / 2) * 0.3}px`);
};
const unmagnet = (e) => {
  e.currentTarget.style.setProperty('--bx', '0px');
  e.currentTarget.style.setProperty('--by', '0px');
};
const tilt = (e) => {
  if (e.pointerType !== 'mouse') return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--tx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
  el.style.setProperty('--ty', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
};
const untilt = (e) => {
  e.currentTarget.style.setProperty('--tx', '0');
  e.currentTarget.style.setProperty('--ty', '0');
};

const spot = (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
};

// A quiet scrolling strip: regular-weight body text in a soft grey on the dark band, with small
// dots between the items instead of heavy bold headings and big icons.
function Ticker() {
  const row = (hidden) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {ticker.map((t) => (
        <li key={t} className="flex items-center gap-10 pr-10 text-base font-normal text-slate-300 sm:text-[1.0625rem]">
          {t}
          <span aria-hidden="true" className="h-1 w-1 rounded-full bg-[#d9856b]" />
        </li>
      ))}
    </ul>
  );
  return (
    <div className="bg-[#0e1726] py-3.5">
      <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        <div className="ticker flex w-max">
          {row(false)}
          {row(true)}
        </div>
      </div>
    </div>
  );
}

// The real resume image on a scanner glass. A light beam sweeps down it and each section chip
// is revealed as the beam passes. Without motion, the beam is hidden and all chips show.
function ScanStage() {
  return (
    <div className="rounded-3xl bg-[#e3e8f6] p-5 sm:p-8">
      <div className="mx-auto max-w-md rounded-2xl bg-[#0e1726] p-3 shadow-xl sm:p-4 lg:max-w-lg">
        <div className="relative rounded-lg bg-[#1b2a42] px-[12%] py-6 ring-1 ring-white/10 sm:py-8">
          <img
            src={image1}
            alt="Sample resume being read by an ATS scan: name and contact, work history, skills and education are all picked up."
            loading="lazy"
            decoding="async"
            className="aspect-[3/4] w-full rounded-sm bg-white object-cover object-top shadow-lg"
          />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
            <span className="ats-bar absolute inset-x-0 top-0 h-0.5 bg-[#f4b19c] shadow-[0_0_18px_4px_rgba(217,133,107,.7)]">
              <span className="absolute inset-x-0 bottom-full h-20 bg-gradient-to-t from-[#d9856b]/30 to-transparent" />
            </span>
          </div>
          <div aria-hidden="true" className="ats-found pointer-events-none absolute inset-0">
            {atsFound.map((c) => (
              <span
                key={c.label}
                style={{ top: c.top }}
                className={`absolute flex items-center gap-2 rounded-full bg-white py-1.5 pl-2 pr-3 text-xs font-medium text-[#0e1726] shadow-lg ring-1 ring-black/5 sm:py-2 sm:pl-2.5 sm:pr-4 sm:text-sm ${c.left ? '-left-3 sm:-left-6' : '-right-3 sm:-right-6'}`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#d9856b] text-[#0e1726] sm:h-6 sm:w-6">
                  <Icon name="check" className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </span>
                {c.label}
              </span>
            ))}
          </div>
        </div>
        <p className="flex items-center gap-2.5 px-1 pb-0.5 pt-3.5 text-sm text-slate-300">
          <span aria-hidden="true" className="ats-led h-2 w-2 rounded-full bg-[#d9856b]" />
          Sample ATS scan
        </p>
      </div>
    </div>
  );
}

const PAGE = 'rounded-[3px] bg-white shadow-md ring-1 ring-black/10';
const BAR = 'block h-1.5 rounded-full bg-slate-200';

// A tiny looping scene per tool. All motion lives in the ta-* CSS rules, which only run when motion is allowed,
// so with reduced motion each scene simply shows its finished state.
function ToolArt({ type }) {
  let art = null;

  if (type === 'text')
    art = (
      <span className={`${PAGE} block h-24 w-[4.75rem] p-3`}>
        <span className={`${BAR} w-full`} />
        <span className={`${BAR} mt-2 w-4/5`} />
        <span className={`${BAR} mt-2 w-full`} />
        <span className="relative mt-2 block h-1.5 w-3/5">
          <span className="ta-fill absolute inset-y-0 left-0 w-full rounded-full bg-[#0e1726]" />
          <span className="ta-caret absolute -top-0.5 left-full h-2.5 w-px bg-[#d9856b]" />
        </span>
      </span>
    );

  if (type === 'mark')
    art = (
      <span className={`${PAGE} block h-24 w-[4.75rem] p-3`}>
        <span className="relative block h-2 w-full">
          <span className="ta-hl absolute inset-y-0 left-0 w-full rounded-sm bg-[#d9856b]/45" />
          <span className={`${BAR} absolute inset-x-0 top-0.5 w-full`} />
        </span>
        <span className={`${BAR} mt-2 w-4/5`} />
        <span className={`${BAR} mt-2 w-full`} />
        <svg viewBox="0 0 60 16" className="mt-2.5 h-4 w-full" aria-hidden="true">
          <path className="ta-sig" d="M2 12c6-12 8-12 6-2s6 4 9-4 4 10 9 2 6-6 9-1 7 3 11-3" pathLength="1" fill="none" stroke="#0e1726" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );

  if (type === 'pages')
    art = (
      <span className="flex items-center gap-3">
        <span className={`${PAGE} block h-16 w-12 p-2`}>
          <span className={`${BAR} w-full`} />
          <span className={`${BAR} mt-1.5 w-3/4`} />
        </span>
        <span className={`${PAGE} ta-rot block h-16 w-12 p-2`}>
          <span className={`${BAR} w-full`} />
          <span className={`${BAR} mt-1.5 w-3/4`} />
        </span>
        <span className="ta-add flex h-16 w-12 items-center justify-center rounded-[3px] border border-dashed border-[#d9856b] text-[#d9856b]">
          <Icon name="plus" className="h-4 w-4" />
        </span>
      </span>
    );

  if (type === 'split')
    art = (
      <span className="relative block h-24 w-[4.75rem]">
        <span className="ta-sl absolute inset-y-0 left-0 w-1/2 bg-white py-3 pl-3 shadow-md ring-1 ring-black/10">
          {['w-full', 'w-full', 'w-full', 'w-full'].map((w, i) => (
            <span key={i} className={`${BAR} ${i ? 'mt-2' : ''} ${w} rounded-r-none`} />
          ))}
        </span>
        <span className="ta-sr absolute inset-y-0 right-0 w-1/2 bg-white py-3 pr-3 shadow-md ring-1 ring-black/10">
          {['w-full', 'w-2/3', 'w-full', 'w-1/3'].map((w, i) => (
            <span key={i} className={`${BAR} ${i ? 'mt-2' : ''} ${w} rounded-l-none`} />
          ))}
        </span>
        <span className="ta-cut absolute -inset-y-1 left-1/2 w-0 border-l border-dashed border-[#d9856b]" />
      </span>
    );

  if (type === 'lock')
    art = (
      <span className="relative block h-20 w-14">
        <span className="ta-shackle absolute left-2.5 top-0 block h-9 w-9 rounded-t-full border-4 border-b-0 border-[#0e1726]" />
        <span className="absolute inset-x-0 bottom-0 flex h-11 items-center justify-center rounded-lg bg-[#0e1726]">
          <span className="h-2.5 w-2.5 rounded-full bg-[#d9856b]" />
        </span>
      </span>
    );

  if (type === 'convert')
    art = (
      <span className="flex items-center gap-2.5">
        <span className={`${PAGE} block h-16 w-12 p-2`}>
          <span className={`${BAR} w-full`} />
          <span className={`${BAR} mt-1.5 w-3/4`} />
          <span className={`${BAR} mt-1.5 w-full`} />
        </span>
        <span className="relative block h-px w-12 bg-[#0e1726]/25">
          <span className="ta-dot absolute -top-[3px] left-[calc(100%-6px)] block h-1.5 w-1.5 rounded-full bg-[#d9856b]" />
        </span>
        <span className="ta-pop flex h-16 w-12 items-center justify-center rounded-[3px] bg-[#0e1726] text-xs font-bold text-white shadow-md">PDF</span>
      </span>
    );

  if (type === 'compress')
    art = (
      <span className="block w-28 space-y-3">
        {[0, 1, 2].map((i) => (
          <span key={i} className="block h-2.5 w-full rounded-full bg-[#0e1726]/15">
            <span className="ta-bar block h-full w-[30%] rounded-full bg-[#0e1726]" style={{ '--i': i }} />
          </span>
        ))}
      </span>
    );

  if (type === 'finish')
    art = (
      <span className={`${PAGE} relative block h-24 w-[4.75rem] overflow-hidden p-3`}>
        <span className={`${BAR} w-full`} />
        <span className={`${BAR} mt-2 w-4/5`} />
        <span className={`${BAR} mt-2 w-full`} />
        <span className={`${BAR} mt-2 w-3/5`} />
        <span className="ta-wm absolute inset-0 flex -rotate-[30deg] items-center justify-center text-[11px] font-extrabold tracking-wide text-[#d9856b]/60">DRAFT</span>
        <span className="ta-pn absolute inset-x-0 bottom-1.5 block text-center text-[9px] font-medium text-slate-500">1</span>
      </span>
    );

  return (
    <div aria-hidden="true" className="flex h-28 items-center justify-center overflow-hidden rounded-xl bg-[#eef1f9] ring-1 ring-[#0e1726]/5">
      {art}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero resume stack                                                  */
/* ------------------------------------------------------------------ */

function ResumeStack() {
  const ref = useRef(null);

  const onMove = (e) => {
    if (e.pointerType !== 'mouse' || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    ref.current.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    ref.current.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  };
  const onLeave = () => {
    ref.current?.style.setProperty('--px', '0');
    ref.current?.style.setProperty('--py', '0');
  };

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="relative isolate mx-auto aspect-[4/5] w-full max-w-[26rem] lg:max-w-none"
    >
      <div aria-hidden="true" className="layer absolute inset-x-[6%] inset-y-[8%] -z-10" style={{ '--depth': 10 }}>
        <div className="h-full w-full rounded-[2rem] bg-[#f3dbd1]" />
      </div>

      <div className="layer absolute left-[4%] top-[3%] w-[70%]" style={{ '--depth': -16 }}>
        <img
          src={image1}
          alt="Resume template preview"
          loading="eager"
          decoding="async"
          style={{ '--d': '.25s' }}
          className="rise aspect-[3/4] w-full -rotate-2 rounded-md bg-white object-cover object-top shadow-xl ring-1 ring-black/5"
        />
      </div>

      <div className="layer absolute bottom-[2%] right-0 w-[62%]" style={{ '--depth': 22 }}>
        <img
          src={image2}
          alt="A second resume template preview"
          loading="eager"
          decoding="async"
          style={{ '--d': '.4s' }}
          className="rise aspect-[3/4] w-full rotate-3 rounded-md bg-white object-cover object-top shadow-xl ring-1 ring-black/5"
        />
      </div>

      <div className="layer absolute bottom-[12%] left-0 z-20" style={{ '--depth': 34 }}>
        <span
          style={{ '--d': '.6s' }}
          className="rise chip flex items-center gap-2 rounded-full bg-white py-2 pl-2.5 pr-4 text-sm font-medium text-[#0e1726] shadow-lg ring-1 ring-black/5"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#d9856b] text-[#0e1726]">
            <Icon name="check" className="h-3.5 w-3.5" />
          </span>
          ATS-friendly layout
        </span>
      </div>

      <div className="layer absolute right-0 top-[6%] z-20" style={{ '--depth': 28 }}>
        <span style={{ '--d': '.8s' }} className="rise chip2 flex items-center gap-2 rounded-full bg-[#0e1726] py-2 pl-3 pr-4 text-sm font-medium text-white shadow-lg">
          <Icon name="edit" className="h-4 w-4 text-[#d9856b]" />
          Edit PDF text
        </span>
      </div>
    </div>
  );
}

const accents = [
  { name: 'Navy', bar: '#0e1726', text: '#0e1726', on: '#ffffff' },
  { name: 'Salmon', bar: '#d9856b', text: '#b4573c', on: '#0e1726' },
  { name: 'Slate', bar: '#4b5d7a', text: '#4b5d7a', on: '#ffffff' },
  { name: 'Sage', bar: '#7d9486', text: '#4f6657', on: '#0e1726' },
];

const layouts = [
  { id: 'modern', label: 'Modern' },
  { id: 'sidebar', label: 'Sidebar' },
];

// Sample entries so the page looks finished. The latest job title follows the title typed in the form.
const sampleJobs = [
  { title: null, company: 'Northwind Studio', when: '2021 to now', bullets: ['Led projects from first brief to final delivery.', 'Mentored new team members.'] },
  { title: 'Associate', company: 'Fieldwork Agency', when: '2018 to 2021', bullets: ['Worked with clients to meet every deadline.'] },
];

const initials = (n) => n.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'CV';
const emailFrom = (n) => `${n.toLowerCase().replace(/[^a-z\s]/g, '').trim().split(/\s+/).filter(Boolean).join('.') || 'you'}@email.com`;
// 8-digit hex: '1f' is about 12% opacity, '40' about 25%, '26' about 15%.
const tint = (hex, alpha) => hex + alpha;

function PaperHead({ a, first, children }) {
  return (
    <div className={`${first ? '' : 'mt-4'} flex items-center gap-2.5`}>
      <p className="text-xs font-bold transition-colors duration-500" style={{ color: a.text }}>{children}</p>
      <span className="h-px flex-1 transition-colors duration-500" style={{ background: tint(a.bar, '40') }} />
    </div>
  );
}

function Contact({ items, iconColor, className }) {
  return (
    <ul className={className}>
      {items.map(([icon, text]) => (
        <li key={icon} className="flex min-w-0 items-center gap-1.5">
          <span className="shrink-0 transition-colors duration-500" style={{ color: iconColor }}>
            <Icon name={icon} className="h-3 w-3" />
          </span>
          <span className="min-w-0 [overflow-wrap:anywhere]">{text}</span>
        </li>
      ))}
    </ul>
  );
}

// timeline: a vertical line with a dot per job and the dates as a small tinted tag. Without it, a flat list.
function Jobs({ role, a, timeline }) {
  return (
    <div className={`mt-2.5 ${timeline ? 'ml-1 space-y-3 border-l pl-4' : 'space-y-2.5'}`} style={timeline ? { borderColor: tint(a.bar, '40') } : undefined}>
      {sampleJobs.map((j, i) => (
        <div key={j.company} className={`relative ${i ? 'hidden sm:block' : ''}`}>
          {timeline && (
            <span aria-hidden="true" className="absolute -left-[20.5px] top-[5px] h-2 w-2 rounded-full ring-2 ring-white transition-colors duration-500" style={{ background: a.bar }} />
          )}
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
            <p className="break-words text-xs font-bold">{j.title || role || 'Your job title'}</p>
            {timeline && (
              <span className="rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors duration-500" style={{ background: tint(a.bar, '1f'), color: a.text }}>{j.when}</span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">{timeline ? j.company : `${j.company}, ${j.when}`}</p>
          <ul className="mt-1 list-disc pl-4 text-[11px] leading-snug text-slate-600 marker:text-slate-400">
            {j.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function School({ a }) {
  return (
    <div className="mt-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <p className="text-xs font-bold">BA, Visual Communication</p>
        <span className="text-[10px] font-medium transition-colors duration-500" style={{ color: a.text }}>2014 to 2018</span>
      </div>
      <p className="text-[11px] text-slate-500">Riverside University</p>
    </div>
  );
}

// Two layouts of the same sample resume. The paper box has no overflow clipping, so long input grows the page instead of cutting text.
function ResumePaper({ layout, name, role, about, skills, a }) {
  const nameText = name || 'Your name';
  const roleText = role || 'Your job title';
  const aboutText = about || 'A short summary of who you are appears here.';
  const contact = [['mail', emailFrom(name)], ['phone', '+00 000 000 000'], ['pin', 'City, Country']];
  const mono = initials(name);

  if (layout === 'sidebar')
    return (
      <>
        <span aria-hidden="true" className="swap absolute inset-y-0 left-0 w-[36%] rounded-l-md transition-colors duration-500" style={{ background: a.bar }} />
        <div className="swap relative grid grid-cols-[36%_1fr]">
          <div className="min-w-0 p-4 transition-colors duration-500 sm:p-5" style={{ color: a.on }}>
            <span className="flex h-12 w-12 items-center justify-center rounded-full font-display text-base font-extrabold" style={{ background: tint(a.on, '26') }}>{mono}</span>
            <p className="mt-4 break-words font-display text-lg font-extrabold leading-tight sm:text-xl">{nameText}</p>
            <p className="mt-1 break-words text-xs font-medium">{roleText}</p>
            <p className="mt-6 text-xs font-bold">Contact</p>
            <Contact items={contact} className="mt-2 space-y-1.5 text-[10.5px] leading-snug" />
            <p className="mt-6 text-xs font-bold">Skills</p>
            <ul className="mt-2 space-y-1.5 text-[11px] leading-snug">
              {skills.map((s, i) => (
                <li key={`${s}-${i}`} className="flex items-start gap-1.5">
                  <span aria-hidden="true" className="mt-[5px] h-1 w-1 shrink-0 rounded-full" style={{ background: a.on }} />
                  <span className="min-w-0 break-words">{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="min-w-0 p-4 sm:p-5">
            <PaperHead a={a} first>Profile</PaperHead>
            <p className="mt-2 break-words text-[11px] leading-relaxed text-slate-600">{aboutText}</p>
            <PaperHead a={a}>Experience</PaperHead>
            <Jobs role={role} a={a} />
            <PaperHead a={a}>Education</PaperHead>
            <School a={a} />
          </div>
        </div>
      </>
    );

  return (
    <div className="swap">
      <div className="flex items-center gap-4 rounded-t-md px-5 py-5 transition-colors duration-500 sm:px-7 sm:py-6" style={{ background: tint(a.bar, '1f') }}>
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-display text-lg font-extrabold transition-colors duration-500" style={{ background: a.bar, color: a.on }}>{mono}</span>
        <div className="min-w-0">
          <p className="break-words font-display text-[1.375rem] font-extrabold leading-tight sm:text-[1.625rem]">{nameText}</p>
          <p className="mt-0.5 break-words text-[13px] font-semibold transition-colors duration-500" style={{ color: a.text }}>{roleText}</p>
        </div>
      </div>
      <div className="px-5 pb-5 pt-3 sm:px-7 sm:pb-7">
        <Contact items={contact} iconColor={a.text} className="flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-slate-600" />
        <div className="mt-4">
          <PaperHead a={a} first>Profile</PaperHead>
        </div>
        <p className="mt-2 break-words text-[11.5px] leading-relaxed text-slate-600">{aboutText}</p>
        <PaperHead a={a}>Experience</PaperHead>
        <Jobs role={role} a={a} timeline />
        <PaperHead a={a}>Education</PaperHead>
        <School a={a} />
        <PaperHead a={a}>Skills</PaperHead>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {skills.map((s, i) => (
            <span key={`${s}-${i}`} className="rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors duration-500" style={{ background: tint(a.bar, '1f'), color: a.text }}>{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function LiveDemo() {
  const [name, setName] = useState('Alex Morgan');
  const [role, setRole] = useState('Product Designer');
  const [about, setAbout] = useState('Designer with six years of experience shaping clear, accessible products.');
  const [skillText, setSkillText] = useState('Research, Prototyping, Accessibility');
  const [pick, setPick] = useState(1);
  const [layout, setLayout] = useState('modern');
  const a = accents[pick];
  const list = skillText.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 6);
  const skills = list.length ? list : ['Your skills'];

  return (
    <section id="resume" className="dark-sec relative isolate scroll-mt-20 overflow-hidden bg-[#0e1726] text-white">
      <div aria-hidden="true" className="blob-b pointer-events-none absolute -left-32 top-10 -z-10 h-[26rem] w-[26rem] rounded-full bg-[#d9856b]/15 blur-3xl" />
      <div aria-hidden="true" className="blob-a pointer-events-none absolute -right-24 bottom-0 -z-10 h-80 w-80 rounded-full bg-[#3d5078]/40 blur-3xl" />
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[0.95fr_1.05fr] lg:gap-20 lg:px-8">
        <div className="min-w-0">
          <h2 className="reveal font-display text-3xl font-bold leading-tight tracking-tight [text-wrap:balance] sm:text-4xl">
            Type a few lines. Get a resume that looks finished.
          </h2>
          <p className="reveal mt-4 max-w-md text-slate-300" style={{ '--i': 1 }}>
            Try it right here. Add your details, pick a color and a layout, and the page updates as you type.
          </p>

          <div className="reveal mt-8 grid max-w-md gap-4" style={{ '--i': 2 }}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-200">
                Full name
                <input className="field mt-1.5" value={name} maxLength={28} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="block text-sm font-medium text-slate-200">
                Job title
                <input className="field mt-1.5" value={role} maxLength={32} onChange={(e) => setRole(e.target.value)} />
              </label>
            </div>
            <label className="block text-sm font-medium text-slate-200">
              Short summary
              <textarea className="field mt-1.5 resize-none" rows={3} value={about} maxLength={120} onChange={(e) => setAbout(e.target.value)} />
            </label>
            <label className="block text-sm font-medium text-slate-200">
              Top skills <span className="font-normal text-slate-400">(separate with commas)</span>
              <input className="field mt-1.5" value={skillText} maxLength={80} onChange={(e) => setSkillText(e.target.value)} />
            </label>
          </div>

          <div className="reveal mt-6 flex flex-wrap items-start gap-x-10 gap-y-5" style={{ '--i': 3 }}>
            <fieldset className="min-w-0">
              <legend className="text-sm font-medium text-slate-200">Accent color</legend>
              <div className="mt-2.5 flex gap-3">
                {accents.map((c, i) => (
                  <button
                    key={c.name}
                    type="button"
                    aria-label={`${c.name} accent`}
                    aria-pressed={pick === i}
                    onClick={() => setPick(i)}
                    className={`h-9 w-9 rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${pick === i ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0e1726]' : 'ring-1 ring-white/25'}`}
                    style={{ background: c.bar }}
                  />
                ))}
              </div>
            </fieldset>
            <fieldset className="min-w-0">
              <legend className="text-sm font-medium text-slate-200">Layout</legend>
              <div className="mt-2.5 inline-flex rounded-lg bg-white/10 p-1">
                {layouts.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    aria-pressed={layout === l.id}
                    onClick={() => setLayout(l.id)}
                    className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${layout === l.id ? 'bg-white text-[#0e1726]' : 'text-slate-300 hover:text-white'}`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="reveal mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5" style={{ '--i': 4 }}>
            <Link to="/ResumeBuilder" onPointerMove={magnet} onPointerLeave={unmagnet} className="btn btn-primary magnet">
              Build my resume
            </Link>
            <span className="text-sm text-slate-300">Already have one? Import it in the builder.</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-sm lg:max-w-md">
          <div aria-hidden="true" className="absolute inset-6 -z-10 rounded-full bg-[#d9856b]/25 blur-3xl" />
          <div onPointerMove={tilt} onPointerLeave={untilt} className="tilt">
            <div className="paper-in relative rounded-md bg-white text-[#0e1726] shadow-2xl ring-1 ring-black/10 sm:aspect-[3/4]">
              <ResumePaper layout={layout} name={name} role={role} about={about} skills={skills} a={a} />
            </div>
          </div>
          <span className="absolute -bottom-4 left-4 z-10 flex items-center gap-2 rounded-full bg-white py-2 pl-3.5 pr-4 text-sm font-medium text-[#0e1726] shadow-lg ring-1 ring-black/5">
            <span aria-hidden="true" className="ats-led h-2 w-2 rounded-full bg-[#d9856b]" />
            Live preview
          </span>
        </div>
      </div>
    </section>
  );
}

// Closing statement before the final call to action. Row one is the PDF editor's main actions with
// a small icon pill after each; row two is the rest of the toolset (pages, convert, resumes) in a
// quieter weight, running the other way. Both loop seamlessly and pause on hover. Without motion
// they wrap and stay centred. Words come from the `tools`, `atsPoints` and `ticker` lists above.
const KIN_VERBS = [
  { word: 'Edit text', icon: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></> },
  { word: 'Highlight', icon: <><path d="m9 11-6 6v3h9l3-3" /><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" /></> },
  { word: 'Sign', icon: <><path d="M3 16c3-8 5-9 5-5s2 4 4-1 3 3 6 0" /><path d="M3 21h18" /></> },
  { word: 'Split', icon: <><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4 8.12 15.88" /><path d="M14.47 14.48 20 20" /><path d="M8.12 8.12 12 12" /></> },
  { word: 'Compress', icon: <><path d="M4 14h6v6" /><path d="M20 10h-6V4" /><path d="m14 10 7-7" /><path d="m3 21 7-7" /></> },
  { word: 'Lock', icon: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></> },
];
const KIN_TOOLS = ['Rotate pages', 'Convert file types', 'Watermark and page numbers', 'ATS-friendly resumes', 'Resume templates', 'Spelling and grammar checks'];

function KinPill({ children }) {
  return (
    <span className="inline-flex h-[0.7em] w-[1.3em] shrink-0 items-center justify-center rounded-full bg-[#d9856b] text-[#0e1726]">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[0.38em] w-[0.38em]">
        {children}
      </svg>
    </span>
  );
}

function Kinetic() {
  const copy = (key, children) => <div key={key} className="kin-copy">{children}</div>;
  const verbs = (key) =>
    copy(key, KIN_VERBS.map((v) => (
      <Fragment key={v.word}>
        <span>{v.word}</span>
        <KinPill>{v.icon}</KinPill>
      </Fragment>
    )));
  const tools = (key) =>
    copy(key, KIN_TOOLS.map((t) => (
      <Fragment key={t}>
        <span>{t}</span>
        <span className="h-[0.07em] w-[0.5em] shrink-0 rounded-full bg-[#d9856b]" />
      </Fragment>
    )));

  return (
    <section aria-label="Edit text, highlight, sign, split, compress and lock PDFs, and build ATS-friendly resumes" className="select-none overflow-hidden border-t border-[#0e1726]/10 py-14 sm:py-20">
      <div aria-hidden="true" className="space-y-5 [mask-image:linear-gradient(90deg,transparent,#000_7%,#000_93%,transparent)] sm:space-y-8">
        <div className="kin-track font-display text-[clamp(3.5rem,11vw,10rem)] font-extrabold leading-[1.05] tracking-[-0.04em] text-[#0e1726]" style={{ '--kin-t': '100s' }}>
          {verbs('a')}
          {verbs('b')}
        </div>
        <div className="kin-track rev font-display text-[clamp(2.25rem,5vw,5rem)] font-medium leading-[1.1] tracking-[-0.02em] text-[#0e1726]/45" style={{ '--kin-t': '110s' }}>
          {tools('a')}
          {tools('b')}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Footer                                                             */
/* ------------------------------------------------------------------ */

const CONTACT_EMAIL = 'hello@remopdf.site';

const footerCols = [
  {
    title: 'Product',
    links: [
      { label: 'PDF editor', to: PDF_EDITOR_ROUTE, kind: 'route' },
      { label: 'Resume builder', to: '/ResumeBuilder', kind: 'route' },
      { label: 'Templates', to: '/#templates', kind: 'route' },
    ],
  },
  {
    title: 'Learn',
    links: [
      { label: 'PDF editor', to: '#tools', kind: 'anchor' },
      { label: 'ATS scan', to: '#ats', kind: 'anchor' },
      { label: 'How it works', to: '#how-it-works', kind: 'anchor' },
      { label: 'FAQ', to: '#faq', kind: 'anchor' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Contact us', to: `mailto:${CONTACT_EMAIL}`, kind: 'anchor' },
      { label: 'Privacy policy', to: '/PrivacyPolicy', kind: 'route' },
      { label: 'Terms of use', to: '/terms-of-use', kind: 'route' },
    ],
  },
];

const FOOTER_LINK =
  'inline-block rounded bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-0.5 text-[0.9375rem] text-slate-300 transition-[color,background-size] duration-300 hover:bg-[length:100%_1px] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white';

function FooterLink({ link }) {
  if (link.kind === 'route')
    return (
      <Link to={link.to} className={FOOTER_LINK}>
        {link.label}
      </Link>
    );
  return (
    <a href={link.to} className={FOOTER_LINK}>
      {link.label}
    </a>
  );
}

const BLURB = 'Edit, organize, convert and share PDFs, or build an ATS-friendly resume from a template.';

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
      { threshold: 0.2 },
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
    // The wrapper colour shows through the folded corner, so the CTA band appears to continue underneath.
    <div ref={ref} className={`fold-wrap relative bg-[#d9856b] ${seen ? 'in' : ''}`}>
      <span aria-hidden="true" className="fold-hit absolute right-0 top-0 z-20 h-[6.5rem] w-[6.5rem]" />
      <footer
        onPointerMove={spot}
        style={{ '--glow': 'rgba(217,133,107,.14)' }}
        className="spot fold-cut relative isolate overflow-hidden bg-[#0e1726] text-slate-300"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,#000,transparent_75%)]"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.08) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
        />
        <div aria-hidden="true" className="blob-b pointer-events-none absolute -bottom-40 -left-32 h-[26rem] w-[26rem] rounded-full bg-[#d9856b]/15 blur-3xl" />
        <div aria-hidden="true" className="blob-a pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-[#3d5078]/40 blur-3xl" />
        <div aria-hidden="true" className="fold-flap" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-8 pt-16 sm:px-6 sm:pt-20 lg:px-8">
          <div className="grid gap-14 lg:grid-cols-[1.3fr_2fr] lg:gap-20">
            <div className="max-w-sm">
              <Link
                to="/"
                style={{ '--i': 0 }}
                className="f-rise group inline-flex items-center gap-2.5 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#d9856b] text-[#0e1726] transition-transform duration-500 ease-out group-hover:rotate-90">
                  <Icon name="grid" />
                </span>
                <span className="font-display text-xl font-bold tracking-tight text-white">{BRAND}</span>
              </Link>
              <p className="mt-5 leading-relaxed text-slate-300">
                {BLURB.split(' ').map((w, i) => (
                  <span key={i}>
                    <span className="f-word" style={{ '--i': i }}>{w}</span>{' '}
                  </span>
                ))}
              </p>
              <p className="f-rise mt-9 text-sm text-slate-400" style={{ '--i': 5 }}>Questions? Write to us.</p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                onPointerMove={magnet}
                onPointerLeave={unmagnet}
                style={{ '--i': 6 }}
                className="f-rise magnet group mt-1 inline-flex items-center gap-2 rounded font-display text-xl font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                {CONTACT_EMAIL}
                <Icon name="arrowUpRight" className="h-5 w-5 text-[#d9856b] transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            </div>

            <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
              {footerCols.map((col, ci) => (
                <div key={col.title}>
                  <h2 className="f-rise font-display text-base font-bold text-white" style={{ '--i': 1 + ci }}>{col.title}</h2>
                  <ul className="mt-4 space-y-3">
                    {col.links.map((link, li) => (
                      <li key={link.label} className="f-rise" style={{ '--i': 2 + ci + li * 0.6 }}>
                        <FooterLink link={link} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>

          <span aria-hidden="true" className="f-rule mt-16 block h-px bg-white/15" />
          <div className="f-rise flex items-center justify-between gap-4 pt-6 text-sm text-slate-400" style={{ '--i': 7 }}>
            <p>© {new Date().getFullYear()} {BRAND}</p>
            <button
              type="button"
              onClick={toTop}
              onPointerMove={magnet}
              onPointerLeave={unmagnet}
              className="magnet group inline-flex items-center gap-3 rounded-full py-1 pl-2 text-slate-300 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Back to top
              <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/20 transition-colors group-hover:border-white/40 group-hover:bg-white/10">
                <span className={launching ? 'f-launch' : 'f-arrow'}>
                  <Icon name="arrowUp" className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5" />
                </span>
              </span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

const faqTopics = ['All', 'General', 'PDFs', 'Resumes'];

function Faq() {
  const [topic, setTopic] = useState('All');
  const shown = topic === 'All' ? faqs : faqs.filter((f) => f.topic === topic);
  const countOf = (t) => (t === 'All' ? faqs.length : faqs.filter((f) => f.topic === t).length);

  return (
    <section id="faq" className="scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="rounded-[2rem] bg-[#f3dbd1] p-5 sm:p-10 lg:p-14">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <h2 className="reveal font-display text-[2.75rem] font-extrabold leading-[1.02] tracking-[-0.035em] [text-wrap:balance] sm:text-6xl">
                Questions, answered.
              </h2>
              <p className="reveal mt-5 max-w-sm text-lg text-slate-700" style={{ '--i': 1 }}>
                The short version of what RemoPDF does and what you get.
              </p>
              <div role="group" aria-label="Filter questions by topic" className="reveal mt-8 flex flex-wrap gap-2" style={{ '--i': 2 }}>
                {faqTopics.map((t) => {
                  const on = t === topic;
                  return (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setTopic(t)}
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0e1726] ${
                        on ? 'border-[#0e1726] bg-[#0e1726] text-white' : 'border-[#0e1726]/20 bg-white/70 text-[#0e1726] hover:border-[#0e1726] hover:bg-white'
                      }`}
                    >
                      {t}
                      <span className={`text-xs font-medium ${on ? 'text-white/70' : 'text-[#0e1726]/70'}`}>{countOf(t)}</span>
                    </button>
                  );
                })}
              </div>
              <a href={`mailto:${CONTACT_EMAIL}`} className="btn btn-ink reveal mt-8" style={{ '--i': 3 }}>
                <Icon name="mail" className="h-4 w-4" />
                Email {CONTACT_EMAIL}
              </a>
            </div>

            <div className="faq-sheet-wrap reveal" style={{ '--i': 1 }}>
              <div className="faq-sheet relative bg-white px-5 pt-3 sm:px-9 sm:pt-4">
                <div aria-hidden="true" className="faq-flap" />
                <div className="divide-y divide-[#0e1726]/10">
                  {shown.map(({ q, a }, i) => (
                    <details key={`${topic}-${q}`} name="faq" open={i === 0} style={{ '--i': i }} className="faq-row group py-5 sm:py-6">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-6 rounded font-display text-lg font-semibold leading-snug focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0e1726] sm:text-xl [&::-webkit-details-marker]:hidden">
                        <span className="faq-mark">{q}</span>
                        <span
                          aria-hidden="true"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#0e1726]/20 text-[#0e1726] transition-colors duration-200 group-hover:border-[#0e1726] group-open:border-[#d9856b] group-open:bg-[#d9856b]"
                        >
                          <Icon name="plus" className="h-4 w-4 transition-transform duration-200 group-open:rotate-45" />
                        </span>
                      </summary>
                      <p className="mt-3 max-w-xl pr-14 text-slate-600">{a}</p>
                    </details>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen w-full overflow-x-clip bg-[#fafafb] text-[#0e1726] antialiased"
      style={{ fontFamily: "'Instrument Sans', ui-sans-serif, system-ui, sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Instrument+Sans:wght@400;500;600&display=swap');
        html { scroll-behavior: smooth; }
        .kin-copy { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: .2em var(--kin-g, .45em); padding-inline: 1rem; }
        .kin-copy + .kin-copy { display: none; }
        .font-display { font-family: 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif; }
        @keyframes rise { from { opacity: 0; translate: 0 18px; } }
        .rise { animation: rise .8s cubic-bezier(.16,1,.3,1) both; animation-delay: var(--d, 0s); }
        .btn { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; border-radius: .625rem; padding: .8rem 1.4rem; font-size: .9375rem; font-weight: 600; line-height: 1.2; transition: background-color .2s, border-color .2s, transform .15s; }
        .btn:active { transform: translateY(1px); }
        .btn:focus-visible { outline: 2px solid #0e1726; outline-offset: 3px; }
        .dark-sec .btn:focus-visible { outline-color: #fff; }
        .btn-primary { background: #d9856b; color: #0e1726; }
        .btn-primary:hover { background: #e29a83; }
        .btn-ink { background: #0e1726; color: #fff; }
        .btn-ink:hover { background: #1b2a42; }
        .btn-line { background: #fff; color: #0e1726; border: 1px solid #cbd2dc; }
        .btn-line:hover { border-color: #0e1726; }
        .progress { display: none; position: fixed; inset: 0 0 auto 0; z-index: 60; height: 3px; background: #d9856b; transform-origin: 0 50%; }
        @media (prefers-reduced-motion: no-preference) {
          .word { display: inline-block; animation: word .9s cubic-bezier(.16,1,.3,1) calc(var(--i) * 70ms + 80ms) both; }
          @keyframes word { from { opacity: 0; translate: 0 .45em; filter: blur(10px); } }
          .layer { transform: translate3d(calc(var(--px, 0) * var(--depth, 0) * 1px), calc(var(--py, 0) * var(--depth, 0) * 1px), 0); transition: transform .4s cubic-bezier(.16,1,.3,1); }
          .chip { animation: rise .8s cubic-bezier(.16,1,.3,1) var(--d, 0s) both, bob 6s ease-in-out 1.6s infinite; }
          @keyframes bob { 50% { transform: translateY(-7px); } }
          .btn-primary { position: relative; overflow: hidden; }
          .btn-primary::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(105deg, transparent 35%, rgba(255,255,255,.5) 50%, transparent 65%); translate: -130% 0; transition: translate .7s cubic-bezier(.16,1,.3,1); }
          .btn-primary:hover::after { translate: 130% 0; }
          :root { interpolate-size: allow-keywords; }
          details::details-content { block-size: 0; overflow: clip; transition: block-size .35s ease, content-visibility .35s allow-discrete; }
          details[open]::details-content { block-size: auto; }
          @supports (animation-timeline: view()) {
            @keyframes reveal { from { opacity: 0; translate: 0 40px; } }
            .reveal { animation: reveal linear both; animation-timeline: view(); animation-range: entry calc(5% + var(--i, 0) * 6%) cover calc(26% + var(--i, 0) * 6%); }
            @keyframes grow { from { transform: scaleX(0); } }
            .progress { display: block; animation: grow linear both; animation-timeline: scroll(root); }
          }
        }
        .hero-grid { background-image: radial-gradient(rgba(14,23,38,.16) 1px, transparent 1px); background-size: 22px 22px; -webkit-mask-image: radial-gradient(ellipse 70% 60% at 30% 40%, #000 20%, transparent 75%); mask-image: radial-gradient(ellipse 70% 60% at 30% 40%, #000 20%, transparent 75%); }
        .spot::before { content: ''; position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity .3s; background: radial-gradient(18rem circle at var(--mx, 50%) var(--my, 50%), var(--glow, rgba(255,255,255,.55)), transparent 70%); }
        .spot:hover::before { opacity: 1; }
        .squiggle path { stroke-dasharray: 1; }
        .ta-sig { stroke-dasharray: 1; }
        .ta-shackle { transform-origin: 100% 100%; }
        .ats-bar { display: none; }
        @property --fold { syntax: '<length>'; inherits: true; initial-value: 0px; }
        .fold-wrap { --fold-size: 3.5rem; --fold: 0px; }
        @media (min-width: 1024px) { .fold-wrap { --fold-size: 5rem; } }
        .fold-wrap.in { --fold: var(--fold-size); }
        @media (hover: hover) { .fold-wrap.in:has(.fold-hit:hover) { --fold: calc(var(--fold-size) + 1.25rem); } }
        .fold-cut { clip-path: polygon(0 0, calc(100% - var(--fold)) 0, 100% var(--fold), 100% 100%, 0 100%); }
        .fold-flap { position: absolute; top: 0; right: 0; z-index: 10; width: var(--fold); height: var(--fold); background: linear-gradient(to bottom left, #3d5078, #1f2e49 65%); clip-path: polygon(0 0, 100% 100%, 0 100%); }
        .f-word { display: inline-block; }
        @media (prefers-reduced-motion: no-preference) {
          .fold-wrap { transition: --fold .9s cubic-bezier(.16,1,.3,1); }
          .fold-wrap:not(.in) :is(.f-rise, .f-word) { opacity: 0; }
          .in .f-rise { animation: f-rise .9s cubic-bezier(.16,1,.3,1) calc(var(--i, 0) * 90ms + 250ms) backwards; }
          @keyframes f-rise { from { opacity: 0; translate: 0 24px; } }
          .in .f-word { animation: f-word .9s cubic-bezier(.16,1,.3,1) calc(var(--i, 0) * 45ms + 450ms) backwards; }
          @keyframes f-word { from { opacity: 0; translate: 0 .5em; filter: blur(8px); } }
          .f-rule { transform: scaleX(0); transform-origin: left; }
          .in .f-rule { animation: f-rule 1.3s cubic-bezier(.65,0,.35,1) .8s both; }
          @keyframes f-rule { to { transform: scaleX(1); } }
          .f-arrow { display: block; animation: f-bob 2.4s ease-in-out infinite; }
          @keyframes f-bob { 50% { translate: 0 -3px; } }
          .f-launch { display: block; animation: f-launch .8s cubic-bezier(.5,0,.2,1); }
          @keyframes f-launch { 45% { translate: 0 -2rem; opacity: 0; } 46% { translate: 0 2rem; opacity: 0; } }
        }
        @media (prefers-reduced-motion: no-preference) {
          .ticker { animation: marquee 32s linear infinite; }
          .ticker:hover { animation-play-state: paused; }
          @keyframes marquee { to { transform: translateX(-50%); } }
          .blob-a { animation: drift 14s ease-in-out infinite; }
          .blob-b { animation: drift 18s ease-in-out infinite reverse; }
          @keyframes drift { 50% { transform: translate(40px, 30px) scale(1.12); } }
          .squiggle path { animation: draw 1s cubic-bezier(.65,0,.35,1) 1s both; }
          @keyframes draw { from { stroke-dashoffset: 1; } }
          .chip2 { animation: rise .8s cubic-bezier(.16,1,.3,1) var(--d, 0s) both, bob 7s ease-in-out 2.2s infinite reverse; }
          .ats-bar { display: block; animation: ats-sweep 7s linear infinite; }
          .ats-found { animation: ats-reveal 7s linear infinite; }
          .ats-led { animation: ats-pulse 1.6s ease-in-out infinite; }
          @keyframes ats-sweep { 0% { top: 0; opacity: 0; } 4% { opacity: 1; } 60% { top: 100%; opacity: 1; } 64%, 100% { top: 100%; opacity: 0; } }
          @keyframes ats-reveal { 0% { clip-path: inset(-10% -60% 100% -60%); opacity: 1; } 60%, 92% { clip-path: inset(-10% -60% 0% -60%); opacity: 1; } 100% { clip-path: inset(-10% -60% 0% -60%); opacity: 0; } }
          @keyframes ats-pulse { 50% { opacity: .35; } }
          .swatch { animation: wave 2.8s ease-in-out infinite; animation-delay: calc(var(--i) * .14s); }
          @keyframes wave { 0%, 50%, 100% { transform: translateY(0); } 25% { transform: translateY(-9px); } }
          .cta-band { background-image: linear-gradient(110deg, #d9856b 0%, #eea28b 40%, #d9856b 80%); background-size: 250% 100%; animation: band 10s ease-in-out infinite alternate; }
          @keyframes band { to { background-position: 100% 0; } }
          @supports (animation-timeline: view()) {
            @keyframes fill { from { transform: scaleY(0); } }
            .trace { transform-origin: top; animation: fill linear both; animation-timeline: view(); animation-range: entry 30% cover 55%; }
          }
        }
        @media (prefers-reduced-motion: no-preference) {
          .ta-fill { animation: ta-grow 3.6s steps(9, end) infinite; }
          .ta-caret { animation: ta-move 3.6s steps(9, end) infinite; }
          @keyframes ta-grow { 0% { width: 0; } 70%, 100% { width: 100%; } }
          @keyframes ta-move { 0% { left: 0; } 70%, 100% { left: 100%; } }
          .ta-hl { animation: ta-hl 4.2s ease-in-out infinite; }
          @keyframes ta-hl { 0% { width: 0; } 30%, 90% { width: 100%; } 100% { width: 0; } }
          .ta-sig { animation: ta-sig 4.2s ease-in-out infinite; }
          @keyframes ta-sig { 0%, 32% { stroke-dashoffset: 1; } 70%, 92% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: 1; } }
          .ta-rot { animation: ta-rot 4s ease-in-out infinite; }
          @keyframes ta-rot { 0%, 20% { rotate: 0deg; } 45%, 70% { rotate: 90deg; } 95%, 100% { rotate: 0deg; } }
          .ta-add { animation: ta-add 4s ease-in-out infinite; }
          @keyframes ta-add { 0%, 50% { opacity: .45; scale: .92; } 70%, 90% { opacity: 1; scale: 1; } 100% { opacity: .45; scale: .92; } }
          .ta-sl { animation: ta-sl 4s ease-in-out infinite; }
          .ta-sr { animation: ta-sr 4s ease-in-out infinite; }
          @keyframes ta-sl { 0%, 25% { translate: 0 0; rotate: 0deg; } 50%, 75% { translate: -12px 0; rotate: -4deg; } 100% { translate: 0 0; rotate: 0deg; } }
          @keyframes ta-sr { 0%, 25% { translate: 0 0; rotate: 0deg; } 50%, 75% { translate: 12px 0; rotate: 4deg; } 100% { translate: 0 0; rotate: 0deg; } }
          .ta-cut { animation: ta-cut 4s ease-in-out infinite; }
          @keyframes ta-cut { 0%, 15% { opacity: 0; } 30%, 70% { opacity: 1; } 85%, 100% { opacity: 0; } }
          .ta-shackle { animation: ta-lock 4s ease-in-out infinite; }
          @keyframes ta-lock { 0%, 25% { translate: 0 0; rotate: 0deg; } 45%, 65% { translate: 0 -7px; rotate: -22deg; } 85%, 100% { translate: 0 0; rotate: 0deg; } }
          .ta-dot { animation: ta-dot 3s ease-in-out infinite; }
          @keyframes ta-dot { 0% { left: 0; opacity: 0; } 15% { opacity: 1; } 70% { left: calc(100% - 6px); opacity: 1; } 85%, 100% { left: calc(100% - 6px); opacity: 0; } }
          .ta-pop { animation: ta-pop 3s ease-in-out infinite; }
          @keyframes ta-pop { 0%, 68% { scale: 1; } 78% { scale: 1.14; } 90%, 100% { scale: 1; } }
          .ta-bar { animation: ta-bar 3.6s ease-in-out infinite; animation-delay: calc(var(--i, 0) * .22s); }
          @keyframes ta-bar { 0%, 12% { width: 100%; } 55%, 85% { width: 30%; } 100% { width: 100%; } }
          .ta-wm { animation: ta-wm 4s ease-in-out infinite; }
          @keyframes ta-wm { 0%, 15% { opacity: 0; } 40%, 85% { opacity: 1; } 100% { opacity: 0; } }
          .ta-pn { animation: ta-pn 4s ease-in-out infinite; }
          @keyframes ta-pn { 0%, 40% { scale: 1; } 52% { scale: 1.5; } 64%, 100% { scale: 1; } }
        }
        .hero-glow { background: radial-gradient(26rem circle at var(--mx, 70%) var(--my, 30%), rgba(217,133,107,.2), transparent 70%); }
        .field { width: 100%; border: 1px solid #cbd2dc; border-radius: .625rem; background: #fff; padding: .75rem 1rem; font-size: .9375rem; transition: border-color .2s, box-shadow .2s; }
        .field:focus { outline: none; border-color: #0e1726; box-shadow: 0 0 0 3px rgba(217,133,107,.4); }
        .dark-sec .field { background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.2); color: #fff; }
        .dark-sec .field::placeholder { color: rgba(255,255,255,.4); }
        .dark-sec .field:focus { border-color: #d9856b; box-shadow: 0 0 0 3px rgba(217,133,107,.35); }
        @media (prefers-reduced-motion: no-preference) {
          .magnet { translate: var(--bx, 0px) var(--by, 0px); transition: translate .25s cubic-bezier(.16,1,.3,1), background-color .2s; }
          .tilt { transform: perspective(900px) rotateX(calc(var(--ty, 0) * -7deg)) rotateY(calc(var(--tx, 0) * 9deg)); transition: transform .3s cubic-bezier(.16,1,.3,1); }
          @keyframes swap { from { opacity: 0; translate: 0 10px; } }
          .swap { animation: swap .45s cubic-bezier(.16,1,.3,1) both; }
          .kin-track { display: flex; width: max-content; animation: kin-run var(--kin-t, 60s) linear infinite; will-change: transform; }
          .kin-track.rev { animation-direction: reverse; }
          .kin-track:hover { animation-play-state: paused; }
          .kin-track .kin-copy, .kin-track .kin-copy + .kin-copy { display: flex; flex: none; flex-wrap: nowrap; justify-content: flex-start; padding-inline: 0 var(--kin-g, .45em); }
          @keyframes kin-run { to { transform: translateX(-50%); } }
        }
        @media (prefers-reduced-motion: no-preference) {
          @supports (animation-timeline: view()) {
            @keyframes bleed { from { margin-inline: clamp(.5rem, 3vw, 2rem); border-radius: 2rem; } }
            .bleed { animation: bleed linear both; animation-timeline: view(); animation-range: entry 0% entry 80%; }
            @keyframes pop-in { from { scale: .3; opacity: 0; } }
            .pop-in { animation: pop-in linear both; animation-timeline: view(); animation-range: entry 10% cover 28%; }
            @keyframes paper-in { from { opacity: 0; translate: 0 80px; rotate: 6deg; scale: .9; } }
            .paper-in { animation: paper-in linear both; animation-timeline: view(); animation-range: entry 5% cover 36%; }
            @keyframes shot-in { from { opacity: 0; translate: 0 60px; scale: .94; } }
            .shot-in { animation: shot-in linear both; animation-timeline: view(); animation-range: entry 0% cover 30%; }
            @keyframes hero-out { to { opacity: .1; translate: 0 -48px; } }
            .hero-out { animation: hero-out linear both; animation-timeline: scroll(root); animation-range: 0 70vh; }
            @keyframes layer-scroll { to { translate: 0 calc(var(--depth, 0) * -3px); } }
            .layer { animation: layer-scroll linear both; animation-timeline: scroll(root); animation-range: 0 100vh; }
          }
        }
        .faq-sheet-wrap { filter: drop-shadow(0 18px 28px rgba(14,23,38,.14)); }
        .faq-sheet { border-radius: .875rem; clip-path: polygon(0 0, calc(100% - 2.25rem) 0, 100% 2.25rem, 100% 100%, 0 100%); }
        .faq-flap { position: absolute; top: 0; right: 0; width: 2.25rem; height: 2.25rem; background: linear-gradient(to bottom left, #f1ddd3, #d4b1a0 90%); clip-path: polygon(0 0, 100% 100%, 0 100%); }
        .faq-mark { padding: 0 .12em; margin: 0 -.12em; background-image: linear-gradient(rgba(217,133,107,.55), rgba(217,133,107,.55)); background-repeat: no-repeat; background-position: 0 90%; background-size: 0% .52em; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
        details[open] > summary .faq-mark { background-size: 100% .52em; }
        @media (prefers-reduced-motion: no-preference) {
          .faq-mark { transition: background-size .55s cubic-bezier(.16,1,.3,1); }
          .faq-row { animation: rise .5s cubic-bezier(.16,1,.3,1) calc(var(--i, 0) * 50ms) both; }
        }
        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
          .rise { animation: none; }
          .btn { transition: none; }
        }
      `}</style>

      <div className="progress" aria-hidden="true" />

      <main>
        {/* Hero */}
              <Navbar />
        <section onPointerMove={spot} className="relative isolate overflow-hidden">
          <div aria-hidden="true" className="hero-glow pointer-events-none absolute inset-0 -z-10" />
          <div aria-hidden="true" className="hero-grid pointer-events-none absolute inset-0 -z-10" />
          <div aria-hidden="true" className="blob-a pointer-events-none absolute -right-24 -top-24 -z-10 h-[30rem] w-[30rem] rounded-full bg-[#f3b9a5]/50 blur-3xl" />
          <div aria-hidden="true" className="blob-b pointer-events-none absolute -left-32 top-1/2 -z-10 h-[26rem] w-[26rem] rounded-full bg-[#c9d4f2]/60 blur-3xl" />
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 pb-16 pt-10 sm:px-6 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-8 lg:pb-28 lg:pt-20">
            <div className="hero-out">
              <h1 className="font-display text-[2.75rem] font-extrabold leading-[1.02] tracking-[-0.035em] [text-wrap:balance] sm:text-6xl lg:text-[4.5rem]">
                {'Edit PDFs. Build resumes.'.split(' ').map((w, i) => (
                  <span key={i}>
                    <span className="word relative" style={{ '--i': i }}>
                      {w}
                      {i === 3 && (
                        <svg className="squiggle absolute -bottom-1.5 left-0 h-3 w-full overflow-visible" viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden="true">
                          <path d="M3 8c30-7 60 5 95-1s60-4 99-1" pathLength="1" fill="none" stroke="#d9856b" strokeWidth="5" strokeLinecap="round" />
                        </svg>
                      )}
                    </span>{' '}
                  </span>
                ))}
              </h1>
              <p className="rise mt-6 max-w-lg text-lg leading-relaxed text-slate-600" style={{ '--d': '.1s' }}>
                Edit, organize, convert and share PDFs, or build an ATS-friendly resume from a template. Download a clean PDF either way.
              </p>
              <div className="rise mt-9 flex flex-col gap-3 sm:flex-row" style={{ '--d': '.2s' }}>
                <Link to={PDF_EDITOR_ROUTE} onPointerMove={magnet} onPointerLeave={unmagnet} className="btn btn-primary magnet">
                  Open PDF editor
                </Link>
                <Link to="/ResumeBuilder" className="btn btn-line">
                  Build a resume
                </Link>
              </div>
            </div>

            <ResumeStack />
          </div>
        </section>

        <Ticker />

        {/* PDF editor */}
        <section id="tools" className="scroll-mt-20 border-t border-[#0e1726]/10 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="reveal max-w-2xl font-display text-3xl font-bold leading-tight tracking-tight [text-wrap:balance] sm:text-4xl">
                  Edit a PDF right on the page.
                </h2>
                <p className="reveal mt-4 max-w-xl text-slate-600" style={{ '--i': 1 }}>
                  Open a file and change it where it sits: fix a typo, add text, highlight a line, sign. Then split, lock, convert or compress it before you download.
                </p>
              </div>
              <div className="reveal" style={{ '--i': 2 }}>
                <Link to={PDF_EDITOR_ROUTE} onPointerMove={magnet} onPointerLeave={unmagnet} className="btn btn-primary magnet">
                  Open PDF editor
                </Link>
              </div>
            </div>

            <div className="shot-in relative mt-12">
              <div className="rounded-3xl bg-[#f3dbd1] p-3 sm:p-6 lg:p-8">
                <img
                  src={editorShot}
                  alt="The RemoPDF editor with a toolbar for text, highlight, signature and image tools, a page sidebar, and an invoice open on the page."
                  width="1366"
                  height="641"
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="block h-auto w-full rounded-xl bg-white shadow-2xl ring-1 ring-black/10"
                />
              </div>
              <span style={{ '--d': '.2s' }} className="rise chip2 absolute -top-4 left-8 z-10 hidden items-center gap-2 rounded-full bg-[#0e1726] py-2 pl-3 pr-4 text-sm font-medium text-white shadow-lg sm:flex">
                <Icon name="edit" className="h-4 w-4 text-[#d9856b]" />
                Edit text on the page
              </span>
              <span style={{ '--d': '.4s' }} className="rise chip absolute -bottom-4 right-8 z-10 hidden items-center gap-2 rounded-full bg-white py-2 pl-2.5 pr-4 text-sm font-medium text-[#0e1726] shadow-lg ring-1 ring-black/5 sm:flex">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#d9856b] text-[#0e1726]">
                  <Icon name="download" className="h-3.5 w-3.5" />
                </span>
                Download as PDF
              </span>
            </div>

            <ul className="mt-14 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {editorPoints.map((pt, i) => (
                <li key={pt.title} style={{ '--i': i % 4 }} className="reveal">
                  <ToolArt type={pt.art} />
                  <h3 className="mt-5 font-display text-lg font-bold">{pt.title}</h3>
                  <p className="mt-1.5 text-slate-600">{pt.desc}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ATS scan */}
        <section id="ats" className="scroll-mt-20 border-t border-[#0e1726]/10">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:px-8">
            <div>
              <h2 className="reveal max-w-xl font-display text-3xl font-bold leading-tight tracking-tight [text-wrap:balance] sm:text-4xl">
                A scan reads your resume before a person does.
              </h2>
              <p className="reveal mt-4 max-w-lg text-slate-600" style={{ '--i': 1 }}>
                Many employers use an applicant tracking system (ATS) to scan resumes first. If it cannot read your headings or hits a typo where a keyword should be, your experience may never reach a person.
              </p>
              <ul className="reveal mt-8 max-w-lg divide-y divide-[#0e1726]/10 border-y border-[#0e1726]/10" style={{ '--i': 2 }}>
                {atsPoints.map((pt) => (
                  <li key={pt.title} className="flex gap-4 py-4">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#d9856b] text-[#0e1726]">
                      <Icon name="check" className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <h3 className="font-display text-base font-bold">{pt.title}</h3>
                      <p className="mt-0.5 text-slate-600">{pt.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="reveal mt-8 flex flex-col gap-3 sm:flex-row" style={{ '--i': 3 }}>
                <Link to="/ResumeBuilder" onPointerMove={magnet} onPointerLeave={unmagnet} className="btn btn-primary magnet">
                  Build an ATS-friendly resume
                </Link>
                <a href="#templates" className="btn btn-line">
                  See templates
                </a>
              </div>
            </div>
            <ScanStage />
          </div>
        </section>

        <LiveDemo />

        {/* Templates */}
        <section id="templates" className="scroll-mt-20 border-t border-[#0e1726]/10">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
            <TemplateShowcase onUseTemplate={() => navigate('/ResumeBuilder')} />
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="dark-sec bleed scroll-mt-20 bg-[#0e1726] text-white">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:px-8">
            <div className="reveal lg:sticky lg:top-28 lg:self-start">
              <h2 className="font-display text-3xl font-bold leading-tight tracking-tight [text-wrap:balance] sm:text-4xl">
                From file to finished PDF in three steps.
              </h2>
              <p className="mt-4 max-w-md text-slate-300">Already have a resume? Import it and skip straight to editing.</p>
              <Link to={PDF_EDITOR_ROUTE} className="btn btn-primary mt-8">
                Open PDF editor
              </Link>
            </div>
            <ol className="relative space-y-12">
              <li aria-hidden="true" className="absolute bottom-6 left-6 top-6 w-px bg-white/15">
                <span className="trace block h-full w-full bg-[#d9856b]" />
              </li>
              {steps.map((s, i) => (
                <li key={s.title} className="reveal relative grid grid-cols-[3rem_1fr] gap-5">
                  <span className="pop-in relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-[#d9856b] bg-[#0e1726] font-display text-xl font-bold text-[#d9856b]">{i + 1}</span>
                  <div>
                    <h3 className="font-display text-xl font-bold">{s.title}</h3>
                    <p className="mt-1.5 max-w-md text-slate-300">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* FAQ */}
        <Faq />

        <Kinetic />

        {/* Final call to action */}
        <section className="cta-band bg-[#d9856b]">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-4 py-14 sm:px-6 sm:py-16 lg:flex-row lg:items-center lg:px-8">
            <h2 className="reveal max-w-xl font-display text-3xl font-bold leading-tight tracking-tight [text-wrap:balance] sm:text-4xl">
              Your next PDF or resume is a few minutes away.
            </h2>
            <div className="reveal flex flex-col gap-3 sm:flex-row" style={{ '--i': 2 }}>
              <Link to={PDF_EDITOR_ROUTE} onPointerMove={magnet} onPointerLeave={unmagnet} className="btn btn-ink magnet">
                Open PDF editor
              </Link>
              <Link to="/ResumeBuilder" className="btn btn-line">
                Build a resume
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
