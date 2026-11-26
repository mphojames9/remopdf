import { Fragment, Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import image1 from '../assets/image1.webp';
import image2 from '../assets/image2.webp';
import editorShot from '../assets/editor-preview.webp';
import editorShotSmall from '../assets/editor-preview-800.webp';
import brandLogo from '../assets/logo.webp';
import Navbar from '../components/Navbar';
import PricingModal from '../components/Pricing/PricingModal';
import { getCurrentUser, getToken, loginWithGoogle } from '../api/auth';
import { forgetAiPass } from '../api/payments';

// TemplateShowcase pulls in every resume template, so it lives in its own chunk and is only
// fetched when the Templates section is about to scroll into view.
const TemplateShowcase = lazy(() => import('../components/TemplateShowcase'));

// Sign-in (Firebase) and checkout (Paystack) are only needed once someone picks a paid plan, so they load then.
const AuthModal = lazy(() => import('../components/Auth/AuthModal'));
const PaymentModal = lazy(() => import('../components/Payment/PaymentModal'));

function LazyOnView({ children, minHeight = 720, rootMargin = '1200px' }) {
  const ref = useRef(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShow(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  // The reserved height keeps the page length (and the #templates anchor) stable until the chunk arrives.
  return (
    <div ref={ref} style={show ? undefined : { minHeight }}>
      {show ? <Suspense fallback={<div style={{ minHeight }} />}>{children}</Suspense> : null}
    </div>
  );
}

const BRAND = 'RemoPDF';
// What the hero types out after "A resume that": short lines that explain what the builder does.
const HERO_LINES = [
  'gets you noticed',
  'writes with you using AI',
  'passes ATS scans',
  'fixes typos as you type',
  'comes with a cover letter',
  'exports a clean PDF',
];
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
  globe: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z', 'M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20', 'M2 12h20'],
  briefcase: ['M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16', 'M4 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z'],
  cap: ['M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z', 'M22 10v6', 'M6 12.5V16a6 3 0 0 0 12 0v-3.5'],
  person: ['M12 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z', 'M20 21a8 8 0 0 0-16 0'],
  zap: ['M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z'],
  languages: ['m5 8 6 6', 'm4 14 6-6 2-3', 'M2 5h12', 'M7 2h1', 'm22 22-5-10-5 10', 'M14 18h6'],
  calendar: ['M8 2v4', 'M16 2v4', 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z', 'M3 10h18'],
  highlighter: ['m9 11-6 6v3h9l3-3', 'm22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4'],
  sign: ['M12 20h9', 'M16.4 3.6a2.1 2.1 0 0 1 3 3L7.4 18.6l-4 1 1-4 12-12Z'],
  rotate: ['M21 12a9 9 0 1 1-9-9c2.5 0 4.9 1 6.7 2.7L21 8', 'M21 3v5h-5'],
  scissors: ['M6 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z', 'M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z', 'M20 4 8.1 15.9', 'M14.5 14.5 20 20', 'M8.1 8.1 12 12'],
  compress: ['m14 10 7-7', 'M20 10h-6V4', 'm3 21 7-7', 'M4 14h6v6'],
  convert: ['M8 3 4 7l4 4', 'M4 7h16', 'm16 21 4-4-4-4', 'M20 17H4'],
  droplet: ['M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7Z'],
  archive: ['M21 8v13H3V8', 'M1 3h22v5H1z', 'M10 12h4'],
  receipt: ['M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z', 'M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8', 'M12 17.5v-11'],
  layout: ['M4 3h16a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z', 'M4 14h7a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1Z', 'M17 14h3a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1Z'],
  shieldCheck: ['M20 13c0 5-3.5 7.5-7.7 8.95a1 1 0 0 1-.66-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.5 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1Z', 'm9 12 2 2 4-4'],
  spellcheck: ['m6 16 6-12 6 12', 'M8 12h8', 'm16 20 2 2 4-4'],
  fileUp: ['M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z', 'M14 2v4a2 2 0 0 0 2 2h4', 'M12 18v-6', 'm9 15 3-3 3 3'],
  target: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z', 'M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z', 'M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z'],
  image: ['M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z', 'M9 7.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z', 'm21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21'],
  fileText: ['M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z', 'M14 2v4a2 2 0 0 0 2 2h4', 'M10 9H8', 'M16 13H8', 'M16 17H8'],
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

// The resume builder's features, shown in the #tools section: four short cards, then a list of rows that open one at a time.
const benefitCards = [
  { icon: 'spark', title: 'A draft in 10 minutes', desc: 'Add your work history and the AI writes your first summary. You edit it.' },
  { icon: 'sign', title: 'Better wording', desc: 'Get stronger rewrites for any line, with a short reason why.' },
  { icon: 'spellcheck', title: 'No typos', desc: 'Spelling and grammar are checked as you type.' },
  { icon: 'layout', title: 'ATS-ready templates', desc: '30 layouts that applicant tracking systems can read.' },
];

const toolRows = [
  { icon: 'mail', title: 'A matching cover letter', desc: 'Turn the same details into a cover letter for the job you are applying for, then sign it on screen.' },
  { icon: 'target', title: 'Tailored to every job', desc: 'Paste a job advert to see the keywords it asks for and which of your skills already match.' },
  { icon: 'fileUp', title: 'Bring your old resume', desc: 'Upload your current resume and improve it in the builder. No retyping.' },
  { icon: 'download', title: 'A clean PDF to send', desc: 'Preview it, switch template or colour, then download an A4 PDF ready to email or upload.' },
];

// The PDF editor's tools. The first two get a larger tile with a small scene (`feat`); the rest are compact links.
const pdfTools = [
  { icon: 'edit', label: 'Edit and add text', tone: 'coral', feat: 'edit', desc: 'Click any line to fix a typo, or add new text anywhere on the page.' },
  { icon: 'highlighter', label: 'Highlight, sign, add images', tone: 'sun', feat: 'mark', desc: 'Highlight a line, draw your signature, or drop in a logo or a photo.' },
  { icon: 'rotate', label: 'Add, remove and rotate pages', tone: 'sky' },
  { icon: 'scissors', label: 'Split a PDF', tone: 'mint' },
  { icon: 'lock', label: 'Lock and unlock', tone: 'sky' },
  { icon: 'convert', label: 'Convert file types', tone: 'coral' },
  { icon: 'compress', label: 'Compress', tone: 'mint' },
  { icon: 'droplet', label: 'Watermark and page numbers', tone: 'sun' },
];

const atsPoints = [
  { title: 'Headings a scan can find', desc: 'Work history, education and skills sit under the headings a scan looks for.' },
  { title: 'Text that reads cleanly', desc: 'Plain, readable text means your details land in the right place, not in a jumble.' },
  { title: 'Typos caught as you type', desc: 'A misspelled skill is easy to skip. The spell check helps you fix it before you send.' },
];

// Where the scan finds each section, as a box over the resume picture (all values are % of the picture).
const atsFound = [
  { label: 'Name and contact', left: 3, top: 1.5, w: 94, h: 12.5 },
  { label: 'Skills', left: 2, top: 20, w: 29, h: 41 },
  { label: 'Work history', left: 33.5, top: 35, w: 64, h: 15 },
  { label: 'Education', left: 2, top: 62.5, w: 29, h: 12.5 },
];


const steps = [
  { title: 'Start with what you have', desc: 'Pick a template, or import the resume you already have. Then add your work history, education and skills.' },
  { title: 'Let AI do the heavy lifting', desc: 'Get a drafted summary, stronger rewrites of any line, and a skills match against the job advert. Spelling and grammar are checked as you type.' },
  { title: 'Add a cover letter and download', desc: 'Write a matching cover letter, preview both, and download clean A4 PDFs that are ready to send.' },
];

const faqs = [
  { topic: 'General', q: 'What can I do with RemoPDF?', a: 'Build an ATS-friendly resume and a matching cover letter with help from AI, or edit, organize, protect, convert and compress PDFs. There are also tools for zipping files and making invoices.' },
  { topic: 'Resumes', q: 'How does AI smart assist help?', a: 'It drafts your summary from the work history you add, suggests stronger wording for any summary or job description, and shows which skills from a job advert you already have. You stay in charge: nothing goes into your resume until you choose it, and it only works from the details you have entered.' },
  { topic: 'Resumes', q: 'Can I write a cover letter too?', a: 'Yes. The cover letter builder uses the details from your resume and can pull in the job you are applying for. Preview it, sign it on screen and download it as a PDF.' },
  {
    topic: 'Resumes', q: 'What does ATS friendly mean?',
    a: 'Many employers use applicant tracking systems (ATS) to scan resumes before a person reads them. Our resume templates use clear headings and readable text so those systems can pick up your details correctly.',
  },
  { topic: 'Resumes', q: 'Will the spell check catch every mistake?', a: 'Spelling and grammar are checked as you type, which catches most slips. Give your resume one last read before you send it.' },
  { topic: 'Resumes', q: 'Can I use my existing resume?', a: 'Yes. Import your current resume into the builder and improve it from there, so you never have to retype it.' },
  { topic: 'General', q: 'Do I need design skills?', a: 'Not at all. For resumes, choose a template and add your details, and the layout takes care of itself. For PDFs, open a file and edit right on the page.' },
  { topic: 'General', q: 'What file do I get?', a: 'A PDF, ready to email or upload. Resumes and cover letters come as A4.' },
  { topic: 'PDFs', q: 'Can I edit text that is already in a PDF?', a: 'Yes. Open the file in the PDF editor, click a line and type. You can also add new text anywhere on the page, highlight, sign, or place an image.' },
  { topic: 'PDFs', q: 'How do I make a PDF smaller?', a: 'Use Compress. It shrinks heavy files so they are easy to email and upload.' },
  { topic: 'PDFs', q: 'Can I put a password on a PDF?', a: 'Yes. Lock a PDF with a password, and unlock it when you need to work on it again.' },
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
const spot = (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
};

// The real resume image on a scanner glass. A light beam sweeps down it and each section chip
// is revealed as the beam passes. Without motion, the beam is hidden and all chips show.
function ScanStage() {
  return (
    <div className="rounded-3xl bg-[#e3e8f6] p-5 sm:p-8">
      <div className="mx-auto max-w-md rounded-2xl bg-[#0e1726] p-3 shadow-xl sm:p-4 lg:max-w-lg">
        <div className="relative rounded-lg bg-[#1b2a42] px-[12%] py-6 ring-1 ring-white/10 sm:py-8">
          <div className="relative">
            <img
              src={image1}
              alt="Sample resume being read by an ATS scan: name and contact, work history, skills and education are all picked up."
              width="800"
              height="1200"
              loading="lazy"
              decoding="async"
              className="block h-auto w-full rounded-sm bg-white shadow-lg"
            />
            <div aria-hidden="true" className="ats-found pointer-events-none absolute inset-0">
              {atsFound.map((c) => (
                <span
                  key={c.label}
                  style={{ left: `${c.left}%`, top: `${c.top}%`, width: `${c.w}%`, height: `${c.h}%` }}
                  className="absolute rounded-[3px] border border-[#d9856b] bg-[#d9856b]/10"
                >
                  <span className="absolute -left-px -top-px flex items-center gap-1 whitespace-nowrap rounded-br-[5px] rounded-tl-[3px] bg-[#d9856b] px-1.5 py-[3px] text-[9px] font-medium leading-none text-[#0e1726] sm:gap-1.5 sm:px-2 sm:py-1 sm:text-[11px]">
                    <Icon name="check" className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    {c.label}
                  </span>
                </span>
              ))}
            </div>
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
            <span className="ats-bar absolute inset-x-0 top-0 h-0.5 bg-[#f4b19c] shadow-[0_0_18px_4px_rgba(217,133,107,.7)]">
              <span className="absolute inset-x-0 bottom-full h-20 bg-gradient-to-t from-[#d9856b]/30 to-transparent" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Small page and line shapes that the scenes below (hero, ATS scan, PDF editor) are drawn with.
const SHEET_SHADOW = 'shadow-[0_26px_50px_-18px_rgba(14,23,38,.6)]';
const LINE = 'block h-2 rounded-full bg-slate-200';

function MiniSheet({ className = '', children }) {
  return <span className={`block rounded-[5px] bg-white p-3.5 ring-1 ring-black/10 ${SHEET_SHADOW} ${className}`}>{children}</span>;
}

// Small scenes for the two larger PDF tiles. They reuse the .bt tile and .bt-art box from the resume tiles.
function PdfArt({ type }) {
  if (type === 'edit')
    return (
      <div className="absolute inset-0 px-5 pt-9 sm:px-6">
        <span className="relative block rounded-xl bg-white p-4 pt-6 shadow-[0_22px_40px_-18px_rgba(40,56,130,.6)] ring-1 ring-black/5">
          <span className="absolute -top-3.5 left-4 flex items-center gap-0.5 rounded-lg bg-[#0e1726] p-1 text-[11px] font-semibold text-white shadow-lg">
            <span className="rounded bg-white/15 px-1.5 py-0.5">Aa</span>
            <span className="px-1.5">14</span>
            <span className="px-1.5 font-extrabold">B</span>
            <span className="px-1.5 italic">I</span>
          </span>
          <span className="block text-[14px] leading-relaxed text-slate-700">
            Payment is due within{' '}
            <span className="rounded-[3px] border border-dashed border-[#d9856b] bg-[#d9856b]/10 px-1 text-[#7a3b28]">14 days</span>
            <span className="pdf-caret ml-px inline-block h-[1.1em] w-[2px] translate-y-[3px] bg-[#d9856b]" /> of the invoice date.
          </span>
        </span>
      </div>
    );

  return (
    <div className="absolute inset-0 px-5 pt-6 sm:px-6">
      <span className="block rounded-xl bg-white p-4 shadow-[0_22px_40px_-18px_rgba(120,60,40,.55)] ring-1 ring-black/5">
        <span className="block text-[14px] leading-relaxed text-slate-700">
          Thank you for your <mark className="pdf-mark rounded-[3px] bg-[#ffd84d]/70 px-1 text-slate-800">business</mark>, we appreciate it.
        </span>
        <span className="mt-3 flex items-end gap-3">
          <svg viewBox="0 0 60 16" className="h-8 w-24" aria-hidden="true">
            <path className="ta-sig" d="M2 12c6-12 8-12 6-2s6 4 9-4 4 10 9 2 6-6 9-1 7 3 11-3" pathLength="1" fill="none" stroke="#2a46b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="ml-auto flex h-10 w-10 items-center justify-center rounded-lg bg-[#eef1f9] text-[#7686f0]">
            <Icon name="image" className="h-5 w-5" />
          </span>
        </span>
      </span>
    </div>
  );
}

// Four plain cards, then the remaining tools as rows that open one at a time.
// Nothing sticks, stacks or overlaps, so it reads the same on a phone and on a desktop.
function ResumeFeatures() {
  const [open, setOpen] = useState(0);

  return (
    <>
      <ul className="mt-12 grid grid-cols-2 gap-3 sm:mt-14 sm:gap-4 lg:grid-cols-4">
        {benefitCards.map((card, i) => (
          <li key={card.title} style={{ '--i': i }} className="reveal rounded-2xl border border-[#0e1726]/[0.08] bg-[#f6f7fb] p-4 sm:p-6">
            <Icon name={card.icon} className="h-9 w-9 text-[#0e1726] sm:h-10 sm:w-10" />
            <h3 className="mt-5 min-h-[3.1rem] font-display text-lg font-light leading-snug [text-wrap:balance] sm:mt-6 sm:min-h-0 sm:text-xl">{card.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500 [text-wrap:pretty] sm:text-[15px]">{card.desc}</p>
          </li>
        ))}
      </ul>

      <div className="mt-14 sm:mt-16 lg:mt-20 lg:grid lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <h3 className="reveal text-center font-display text-3xl font-light leading-tight tracking-tight [text-wrap:balance] sm:text-4xl lg:text-left">
          Everything else you need is here.
        </h3>
        <ul className="mt-8 space-y-3 lg:mt-0">
          {toolRows.map((row, i) => {
            const isOpen = open === i;
            return (
              <li key={row.title} data-open={isOpen} className="tool-row rounded-2xl border border-[#0e1726]/10 bg-white">
                <h4>
                  <button
                    type="button"
                    id={`tool-btn-${i}`}
                    aria-expanded={isOpen}
                    aria-controls={`tool-panel-${i}`}
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0e1726] sm:gap-4 sm:px-5"
                  >
                    <Icon name={row.icon} className="h-7 w-7 shrink-0 text-[#0e1726]" />
                    <span className="flex-1 font-display text-lg font-light leading-snug">{row.title}</span>
                    <span className="tool-toggle flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#d9856b] text-[#b45a40]" aria-hidden="true">
                      <Icon name="plus" className="h-4 w-4" />
                    </span>
                  </button>
                </h4>
                <div id={`tool-panel-${i}`} role="region" aria-labelledby={`tool-btn-${i}`} className="tool-panel">
                  <div className="overflow-hidden">
                    <p className="pb-5 pl-14 pr-4 text-[15px] leading-relaxed text-slate-600 sm:pl-16 sm:pr-5">{row.desc}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero typewriter                                                    */
/* ------------------------------------------------------------------ */

function Typewriter({ lines }) {
  const [text, setText] = useState(lines[0]);

  useEffect(() => {
    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let i = 0;
    let n = 0;
    let deleting = false;
    let t;
    const tick = () => {
      const full = lines[i];
      if (!deleting) {
        n += 1;
        setText(full.slice(0, n));
        if (n === full.length) {
          deleting = true;
          t = setTimeout(tick, 1700);
          return;
        }
        t = setTimeout(tick, 55);
      } else {
        n -= 1;
        setText(full.slice(0, n));
        if (n === 0) {
          deleting = false;
          i = (i + 1) % lines.length;
          t = setTimeout(tick, 350);
          return;
        }
        t = setTimeout(tick, 26);
      }
    };
    setText('');
    t = setTimeout(tick, 700);
    return () => clearTimeout(t);
  }, [lines]);

  return (
    <span aria-hidden="true" className="block min-h-[2.3em] text-[#c4694b]">
      <span className="tw-mark">{text}</span>
      <span className="tw-caret" />
    </span>
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
      className="stack3d relative isolate mx-auto aspect-[100/118] w-full max-w-[22rem] sm:max-w-[26rem] lg:ml-auto lg:mr-0 lg:max-w-[28rem]"
    >
      <div className="stack-tilt absolute inset-0">
        {/* glow + rotating ring + card behind the pages */}
        <div aria-hidden="true" className="hp-glow absolute -inset-[12%] -z-20 rounded-full bg-[radial-gradient(closest-side,rgba(217,133,107,.38),transparent)] blur-2xl" />
        <div aria-hidden="true" className="hp-orbit absolute -inset-[7%] -z-10 rounded-full" />

        <div aria-hidden="true" className="layer absolute inset-x-[2%] inset-y-[4%] -z-10" style={{ '--depth': 10 }}>
          <div className="h-full w-full rounded-[2.25rem] bg-gradient-to-br from-[#fbeae2] via-[#f3dbd1] to-[#dfe6f7] ring-1 ring-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,.8),0_30px_60px_-20px_rgba(217,133,107,.55)]" />
          <div className="hero-grid absolute inset-0 rounded-[2.25rem] opacity-60" />
        </div>

        {/* floating sparkles */}
        <span aria-hidden="true" className="hp-spark absolute -left-3 top-[18%] text-[#d9856b]" style={{ '--s': '0s' }}><Icon name="spark" className="h-7 w-7" /></span>
        <span aria-hidden="true" className="hp-spark absolute -right-2 bottom-[30%] text-[#0e1726]" style={{ '--s': '1.4s' }}><Icon name="spark" className="h-5 w-5" /></span>

        {/* page 1 */}
        <div className="layer absolute left-[2%] top-[0%] w-[62%]" style={{ '--depth': -16 }}>
          <div className="hp-float-a">
            <div className="relative -rotate-3 overflow-hidden rounded-md shadow-[0_28px_50px_-12px_rgba(14,23,38,.45)] ring-1 ring-black/10">
              <img
                src={image1}
                alt="Resume template preview"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                style={{ '--d': '.25s' }}
                className="rise block h-auto w-full"
              />
              <div aria-hidden="true" className="hp-sheen pointer-events-none absolute inset-0" />
            </div>
          </div>
        </div>

        {/* page 2 */}
        <div className="layer absolute bottom-[0%] right-[0%] w-[54%]" style={{ '--depth': 22 }}>
          <div className="hp-float-b">
            <div className="relative rotate-3 overflow-hidden rounded-md shadow-[0_28px_50px_-12px_rgba(14,23,38,.5)] ring-1 ring-black/10">
              <img
                src={image2}
                alt="A second resume template preview"
                loading="eager"
                decoding="async"
                style={{ '--d': '.4s' }}
                className="rise block h-auto w-full"
              />
              <div aria-hidden="true" className="hp-sheen hp-sheen-b pointer-events-none absolute inset-0" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// Closing statement before the final call to action. Row one is the PDF editor's main actions with
// a small icon pill after each; row two is the rest of the toolset (pages, convert, resumes) in a
// quieter weight, running the other way. Both loop seamlessly and pause on hover. Without motion
// they wrap and stay centred. Words come from the `tools` and `atsPoints` lists above.
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


const footerCols = [
  {
    title: 'Product',
    links: [
      { label: 'Resume builder', to: '/ResumeBuilder', kind: 'route' },
      { label: 'Templates', to: '/#templates', kind: 'route' },
      { label: 'PDF editor', to: PDF_EDITOR_ROUTE, kind: 'route' },
      { label: 'Pricing', to: '/#pricing', kind: 'route' },
    ],
  },
  {
    title: 'Learn',
    links: [
      { label: 'Resume builder', to: '#tools', kind: 'anchor' },
      { label: 'ATS scan', to: '#ats', kind: 'anchor' },
      { label: 'PDF editor', to: '#pdf-editor', kind: 'anchor' },
      { label: 'How it works', to: '#how-it-works', kind: 'anchor' },
      { label: 'FAQ', to: '#faq', kind: 'anchor' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Contact us', to: ``, kind: 'anchor' },
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

const BLURB = 'Write a resume that gets noticed, with AI smart assist, ATS-friendly templates and a cover letter to match. Edit, sign and convert your PDFs too.';

const ONET_URL = 'https://services.onetcenter.org/';
const ONET_BADGE = 'https://www.onetcenter.org/image/link/onet-in-it.svg';

// Required O*NET Web Services attribution: badge image linked to O*NET, plus the credit text.
function OnetCredit() {
  return (
    <div
      style={{ '--i': 6 }}
      className="f-rise group/credit relative mt-14 flex flex-col gap-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.06)] backdrop-blur-sm transition-colors duration-300 hover:border-white/20 sm:flex-row sm:items-center sm:gap-7 sm:p-6"
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#d9856b]/60 to-transparent" />
      <a
        href={ONET_URL}
        target="_blank"
        rel="noopener noreferrer"
        title="This site incorporates information from O*NET Web Services. Click to learn more."
        className="shrink-0 self-start rounded-xl bg-white p-2.5 shadow-lg shadow-black/25 ring-1 ring-white/20 transition-transform duration-300 ease-out hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        <img
          src={ONET_BADGE}
          alt="O*NET in-it"
          width="130"
          height="60"
          loading="lazy"
          decoding="async"
          draggable={false}
          className="block h-[60px] w-[130px] border-0"
        />
      </a>
      <p className="max-w-3xl text-sm leading-relaxed text-slate-400">
        This site incorporates information from{' '}
        <a
          href={ONET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded text-slate-200 underline decoration-[#d9856b]/60 decoration-1 underline-offset-4 transition-colors hover:text-white hover:decoration-[#d9856b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          O*NET Web Services
        </a>{' '}
        by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). O*NET&reg; is a trademark of USDOL/ETA.
      </p>
    </div>
  );
}

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
                aria-label={BRAND}
                className="f-rise group inline-flex items-center rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                <img
                  src={brandLogo}
                  alt={BRAND}
                  width="480"
                  height="160"
                  loading="lazy"
                  decoding="async"
                  className="h-10 w-auto transition-transform duration-300 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
              </Link>
              <p className="mt-5 leading-relaxed text-slate-300">
                {BLURB.split(' ').map((w, i) => (
                  <span key={i}>
                    <span className="f-word" style={{ '--i': i }}>{w}</span>{' '}
                  </span>
                ))}
              </p>
            </div>

            <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
              {footerCols.map((col, ci) => (
                <div key={col.title}>
                  <h2 className="f-rise font-display text-base font-light text-white" style={{ '--i': 1 + ci }}>{col.title}</h2>
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

          <OnetCredit />

          <span aria-hidden="true" className="f-rule mt-10 block h-px bg-white/15" />
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

const faqTopics = ['All', 'General', 'Resumes', 'PDFs'];
const faqTopicIcon = { All: 'grid', General: 'spark', PDFs: 'edit', Resumes: 'briefcase' };

function Faq() {
  const [topic, setTopic] = useState('All');
  const shown = topic === 'All' ? faqs : faqs.filter((f) => f.topic === topic);
  const countOf = (t) => (t === 'All' ? faqs.length : faqs.filter((f) => f.topic === t).length);

  return (
    <section id="faq" className="scroll-mt-20">
      <div className="mx-auto max-w-7xl px-1.5 py-10 sm:px-6 sm:py-24 lg:px-8">
        <div className="rounded-[1.75rem] px-2.5 pb-2.5 pt-8 sm:rounded-[2rem] sm:p-10 lg:p-14 bg-[#f3dbd1]">
          <div className="grid gap-7 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <h2 className="reveal font-display text-[2.5rem] font-light leading-[1.02] tracking-[-0.035em] [text-wrap:balance] sm:text-6xl">
                Questions, answered.
              </h2>
              <p className="reveal mt-4 max-w-sm text-base text-slate-700 sm:mt-5 sm:text-lg" style={{ '--i': 1 }}>
                Quick answers before you start.
              </p>

              {/* Mobile: 4-up segmented control with a sliding thumb. sm and up: the original pills. */}
              <div
                role="group"
                aria-label="Filter questions by topic"
                className="reveal relative mt-6 grid grid-cols-4 gap-1 rounded-2xl border border-[#0e1726]/10 bg-white/60 p-1 shadow-[0_8px_20px_-14px_rgba(14,23,38,.45)] sm:mt-8 sm:flex sm:flex-wrap sm:gap-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none"
                style={{ '--i': 2 }}
              >
                <span aria-hidden="true" className="faq-thumb sm:hidden" style={{ '--idx': faqTopics.indexOf(topic) }} />
                {faqTopics.map((t) => {
                  const on = t === topic;
                  return (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setTopic(t)}
                      className={`relative z-10 flex min-h-[3.5rem] flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-xs font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0e1726] sm:min-h-0 sm:flex-row sm:gap-2 sm:rounded-full sm:border sm:px-4 sm:py-2 sm:text-sm ${
                        on
                          ? 'text-white sm:border-[#0e1726] sm:bg-[#0e1726]'
                          : 'text-[#0e1726] sm:border-[#0e1726]/20 sm:bg-white/70 sm:hover:border-[#0e1726] sm:hover:bg-white'
                      }`}
                    >
                      <Icon name={faqTopicIcon[t]} className="h-[1.15rem] w-[1.15rem] sm:hidden" />
                      {t}
                      <span
                        className={`absolute right-1.5 top-1 text-[11px] font-semibold tabular-nums sm:static sm:text-xs sm:font-medium ${
                          on ? 'text-white/70' : 'text-[#0e1726]/60 sm:text-[#0e1726]/70'
                        }`}
                      >
                        {countOf(t)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="faq-sheet-wrap reveal" style={{ '--i': 1 }}>
              {/* Mobile: separate white cards. sm and up: the paper sheet with a folded corner. */}
              <div className="faq-sheet relative sm:bg-white sm:px-9 sm:pt-4">
                <div aria-hidden="true" className="faq-flap" />
                <div className="flex flex-col gap-2.5 sm:block sm:divide-y sm:divide-[#0e1726]/10">
                  {shown.map(({ q, a }, i) => (
                    <details
                      key={`${topic}-${q}`}
                      name="faq"
                      open={i === 0}
                      style={{ '--i': i }}
                      className="faq-row group rounded-2xl bg-white px-4 py-4 shadow-[0_10px_24px_-16px_rgba(14,23,38,.4)] sm:rounded-none sm:bg-transparent sm:px-0 sm:py-6 sm:shadow-none"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded font-display text-[1.0625rem] font-light leading-snug focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0e1726] sm:gap-6 sm:text-xl [&::-webkit-details-marker]:hidden">
                        <span className="faq-mark">{q}</span>
                        <span
                          aria-hidden="true"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#0e1726]/20 bg-[#f3dbd1]/50 text-[#0e1726] transition-colors duration-200 group-hover:border-[#0e1726] group-open:border-[#d9856b] group-open:bg-[#d9856b] sm:h-9 sm:w-9 sm:bg-transparent"
                        >
                          <Icon name="plus" className="h-4 w-4 transition-transform duration-200 group-open:rotate-45" />
                        </span>
                      </summary>
                      <p className="mt-3 max-w-xl text-[0.9375rem] leading-relaxed text-slate-600 sm:pr-14 sm:text-base sm:leading-normal">{a}</p>
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
  const { hash } = useLocation();

  // Pricing lives at /#pricing, so the Navbar link, the footer link and a shared URL all open it, and Back closes it.
  const pricingOpen = hash === '#pricing';
  const closePricing = () => navigate({ pathname: '/', hash: '' }, { replace: true });

  // Choosing a paid plan: sign in first when needed, then checkout with that plan already picked.
  // flow = { plan, stage: 'auth' | 'pay' } while that is happening. flowRef mirrors it for callbacks that outlive a render.
  const [user, setUser] = useState(() => (getToken() ? getCurrentUser() : null));
  const [flow, setFlow] = useState(null);
  const flowRef = useRef(null);
  const startFlow = (next) => {
    flowRef.current = next;
    setFlow(next);
  };
  const backToPlans = () => {
    startFlow(null);
    navigate({ pathname: '/', hash: '#pricing' }, { replace: true });
  };
  const choosePlan = (plan) => {
    startFlow({ plan, stage: user ? 'pay' : 'auth' });
    closePricing();
  };
  const handleSignIn = async (idToken) => {
    const signedIn = await loginWithGoogle(idToken);
    setUser(signedIn);
    startFlow({ plan: flowRef.current?.plan, stage: 'pay' });
  };
  // The sign-in dialog also calls this after a successful sign-in; by then the stage is already 'pay'.
  const authClosed = () => {
    if (flowRef.current?.stage === 'auth') backToPlans();
  };
  const handlePaid = () => {
    forgetAiPass(); // the next AI request must carry the new plan, not a pass made for the old one
    startFlow(null);
  };

  return (
    <div
      className="min-h-screen w-full overflow-x-clip bg-[#fafafb] text-[#0e1726] antialiased"
      style={{ fontFamily: "'Outfit', ui-sans-serif, system-ui, sans-serif" }}
    >
      <style>{`
        /* Font (Outfit, weights 100-900) is loaded from <head> in index.html, not @import. */
        html { scroll-behavior: smooth; }
        .kin-copy { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: .2em var(--kin-g, .45em); padding-inline: 1rem; }
        .kin-copy + .kin-copy { display: none; }
        .font-display { font-family: 'Outfit', ui-sans-serif, system-ui, sans-serif; }
        @keyframes rise { from { opacity: 0; translate: 0 18px; } }
        .rise { animation: rise .8s cubic-bezier(.16,1,.3,1) both; animation-delay: var(--d, 0s); }
        .btn { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; border-radius: .625rem; padding: .8rem 1.4rem; font-size: .9375rem; font-weight: 500; line-height: 1.2; transition: background-color .2s, border-color .2s, transform .15s; }
        .tw-mark { background-image: linear-gradient(transparent 64%, rgba(217,133,107,.2) 64%); -webkit-box-decoration-break: clone; box-decoration-break: clone; }
        .tw-caret { display: inline-block; width: 2px; height: .85em; margin-left: .12em; vertical-align: -.05em; background: #d9856b; animation: tw-blink 1s steps(2, start) infinite; }
        @keyframes tw-blink { to { visibility: hidden; } }
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
          .ta-sig { animation: ta-sig 4.2s ease-in-out infinite; }
          @keyframes ta-sig { 0%, 32% { stroke-dashoffset: 1.05; } 70%, 92% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: 1.05; } }
          .ta-dot { animation: ta-dot 3s ease-in-out infinite; }
          @keyframes ta-dot { 0% { left: 0; opacity: 0; } 15% { opacity: 1; } 70% { left: calc(100% - 6px); opacity: 1; } 85%, 100% { left: calc(100% - 6px); opacity: 0; } }
          .ta-pop { animation: ta-pop 3s ease-in-out infinite; }
          @keyframes ta-pop { 0%, 68% { scale: 1; } 78% { scale: 1.14; } 90%, 100% { scale: 1; } }
        }
        .hero-glow { background: radial-gradient(26rem circle at var(--mx, 70%) var(--my, 30%), rgba(217,133,107,.2), transparent 70%); }
        @media (prefers-reduced-motion: no-preference) {
          .magnet { translate: var(--bx, 0px) var(--by, 0px); transition: translate .25s cubic-bezier(.16,1,.3,1), background-color .2s; }
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
            @keyframes shot-in { from { opacity: 0; translate: 0 60px; scale: .94; } }
            .shot-in { animation: shot-in linear both; animation-timeline: view(); animation-range: entry 0% cover 30%; }
            @keyframes hero-out { to { opacity: .1; translate: 0 -48px; } }
            .hero-out { animation: hero-out linear both; animation-timeline: scroll(root); animation-range: 0 70vh; }
            @keyframes layer-scroll { to { translate: 0 calc(var(--depth, 0) * -3px); } }
            .layer { animation: layer-scroll linear both; animation-timeline: scroll(root); animation-range: 0 100vh; }
          }
        }
        /* Feature tiles, shared with the PDF tools below. */
        .bt { --p: 1.25rem; position: relative; isolation: isolate; display: flex; flex: 1 1 auto; min-width: 0; flex-direction: column; overflow: hidden; border-radius: 1.5rem; padding: var(--p); color: #0e1726; }
        .bt-copy { position: relative; z-index: 1; }
        .bt-desc { text-wrap: pretty; }
        .bt-art { position: relative; flex: 1 1 auto; min-height: var(--h, 9rem); margin: 1.25rem calc(var(--p) * -1) calc(var(--p) * -1); overflow: hidden; }
        .bt-sky, .bt-peach { background: #f5f6f8; box-shadow: inset 0 0 0 1px rgba(14,23,38,.06); }
        .bt-sky .bt-desc, .bt-peach .bt-desc { color: #5b6573; }
        @media (min-width: 640px) {
          .bt { --p: 1.5rem; border-radius: 1.75rem; }
        }
        /* Resume features: plain cards, then rows that open one at a time. */
        .tool-row { transition: background-color .25s, border-color .25s; }
        .tool-row[data-open="true"] { background: #fdf0e9; border-color: transparent; }
        .tool-toggle { transition: transform .25s, background-color .25s, color .25s; }
        .tool-row[data-open="true"] .tool-toggle { transform: rotate(45deg); background: #d9856b; color: #0e1726; }
        .tool-panel { display: grid; grid-template-rows: 0fr; visibility: hidden; }
        .tool-row[data-open="true"] .tool-panel { grid-template-rows: 1fr; visibility: visible; }
        @media (prefers-reduced-motion: no-preference) {
          .tool-panel { transition: grid-template-rows .3s ease, visibility 0s .3s; }
          .tool-row[data-open="true"] .tool-panel { transition: grid-template-rows .3s ease, visibility 0s; }
        }
        /* PDF editor section: a soft two-colour stage behind the screenshot, and tool tiles that are links. */
        .pdf-stage { background: #f3f4f7; box-shadow: inset 0 0 0 1px rgba(14,23,38,.06); }
        .pdf-sig { stroke-dasharray: 1; }
        .pdf-grid { display: grid; gap: .75rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .pdf-grid > li { min-width: 0; }
        .pdf-feat { grid-column: 1 / -1; }
        @media (min-width: 640px) {
          .pdf-grid { gap: 1rem; grid-template-columns: repeat(6, minmax(0, 1fr)); }
          .pdf-feat { grid-column: span 3; }
          .pdf-grid > li:not(.pdf-feat) { grid-column: span 2; }
        }
        .pdf-link { flex: 1 1 auto; }
        .pdf-tool { background: #fff; box-shadow: inset 0 0 0 1px rgba(14,23,38,.08); color: #0e1726; }
        .pt-coral, .pt-sky, .pt-mint, .pt-sun { background: #f1f3f6; }
        .pdf-tool-go { transition: color .2s, translate .25s cubic-bezier(.16,1,.3,1); }
        .pdf-tool:hover .pdf-tool-go, .pdf-link:hover .pdf-tool-go { color: #0e1726; translate: 2px -2px; }
        .pdf-tool:hover { box-shadow: inset 0 0 0 1px rgba(14,23,38,.2), 0 12px 24px -16px rgba(14,23,38,.3); }
        @media (prefers-reduced-motion: no-preference) {
          .pdf-tool, .pdf-link { transition: box-shadow .25s, translate .25s cubic-bezier(.16,1,.3,1); }
          .pdf-tool:hover, .pdf-link:hover { translate: 0 -3px; }
          .pdf-hl { transform-origin: 0 50%; animation: pdf-hl 8s ease-in-out infinite; }
          @keyframes pdf-hl { 0%, 14% { transform: scaleX(0); } 30%, 88% { transform: scaleX(1); } 100% { transform: scaleX(0); } }
          .pdf-sig { animation: pdf-sig 8s ease-in-out infinite; }
          @keyframes pdf-sig { 0%, 38% { stroke-dashoffset: 1.05; } 58%, 88% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: 1.05; } }
          .pdf-mark { background-size: 0% 100%; background-image: linear-gradient(#ffd84d, #ffd84d); background-repeat: no-repeat; background-color: transparent; animation: pdf-mark 6s ease-in-out infinite; }
          @keyframes pdf-mark { 0%, 15% { background-size: 0% 100%; } 35%, 90% { background-size: 100% 100%; } 100% { background-size: 0% 100%; } }
          .pdf-caret { animation: pdf-caret 1.1s steps(1) infinite; }
          @keyframes pdf-caret { 50% { opacity: 0; } }
        }
        /* Paper-sheet look (folded corner + shadow) only from sm up; on phones each question is its own card. */
        @media (min-width: 640px) {
          .faq-sheet-wrap { filter: drop-shadow(0 18px 28px rgba(14,23,38,.14)); }
          .faq-sheet { border-radius: .875rem; clip-path: polygon(0 0, calc(100% - 2.25rem) 0, 100% 2.25rem, 100% 100%, 0 100%); }
          .faq-flap { position: absolute; top: 0; right: 0; width: 2.25rem; height: 2.25rem; background: linear-gradient(to bottom left, #f1ddd3, #d4b1a0 90%); clip-path: polygon(0 0, 100% 100%, 0 100%); }
        }
        @media (max-width: 639px) { .faq-flap { display: none; } }
        /* Sliding thumb behind the mobile filter buttons: 4 equal columns, 0.25rem padding and gaps. */
        .faq-thumb { position: absolute; top: .25rem; bottom: .25rem; left: .25rem; width: calc((100% - 1.25rem) / 4); border-radius: .75rem; background: #0e1726; box-shadow: 0 6px 14px -6px rgba(14,23,38,.55); transform: translateX(calc(var(--idx, 0) * (100% + .25rem))); }
        @media (prefers-reduced-motion: no-preference) { .faq-thumb { transition: transform .4s cubic-bezier(.16,1,.3,1); } }
        .faq-mark { padding: 0 .12em; margin: 0 -.12em; background-image: linear-gradient(rgba(217,133,107,.55), rgba(217,133,107,.55)); background-repeat: no-repeat; background-position: 0 90%; background-size: 0% .52em; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
        details[open] > summary .faq-mark { background-size: 100% .52em; }
        @media (prefers-reduced-motion: no-preference) {
          .faq-mark { transition: background-size .55s cubic-bezier(.16,1,.3,1); }
          .faq-row { animation: rise .5s cubic-bezier(.16,1,.3,1) calc(var(--i, 0) * 50ms) both; }
        }
        .grad-text { background-image: linear-gradient(100deg, #d9856b 0%, #f2a98f 35%, #b5563a 70%, #d9856b 100%); background-size: 220% 100%; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent; }
        .hp-orbit { background: conic-gradient(from 0deg, rgba(217,133,107,0), rgba(217,133,107,.75), rgba(201,212,242,.8), rgba(217,133,107,0) 70%); -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px)); mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px)); }
        .hp-sheen { background: linear-gradient(115deg, transparent 38%, rgba(255,255,255,.55) 50%, transparent 62%); opacity: 0; }
        .hp-prog { width: 70%; }
        .hp-ping { opacity: .5; }
        .hp-caret { opacity: 1; }
        @media (min-width: 1024px) and (prefers-reduced-motion: no-preference) {
          .stack3d { perspective: 1400px; }
          .stack-tilt { transform-style: preserve-3d; transform: rotateY(calc(var(--px, 0) * 9deg)) rotateX(calc(var(--py, 0) * -7deg)); transition: transform .5s cubic-bezier(.16,1,.3,1); }
        }
        @media (prefers-reduced-motion: no-preference) {
          .grad-text { animation: word .9s cubic-bezier(.16,1,.3,1) calc(var(--i) * 70ms + 80ms) both, grad-slide 6s ease-in-out 1.2s infinite alternate; }
          @keyframes grad-slide { to { background-position: 100% 0; } }
          .hp-orbit { animation: hp-spin 16s linear infinite; }
          @keyframes hp-spin { to { transform: rotate(360deg); } }
          .hp-glow { animation: hp-breathe 6s ease-in-out infinite; }
          @keyframes hp-breathe { 50% { transform: scale(1.1); opacity: .75; } }
          .hp-float-a { animation: hp-fa 7s ease-in-out infinite; }
          .hp-float-b { animation: hp-fb 8s ease-in-out -2s infinite; }
          @keyframes hp-fa { 50% { transform: translateY(-12px) rotate(.6deg); } }
          @keyframes hp-fb { 50% { transform: translateY(10px) rotate(-.8deg); } }
          .hp-sheen { animation: hp-shine 6s ease-in-out 2s infinite; }
          .hp-sheen-b { animation-delay: 4s; }
          @keyframes hp-shine { 0% { transform: translateX(-120%); opacity: 1; } 35%, 100% { transform: translateX(120%); opacity: 1; } }
          .hp-spark { animation: hp-twinkle 3.2s ease-in-out var(--s, 0s) infinite; }
          @keyframes hp-twinkle { 0%, 100% { transform: scale(.7) rotate(0deg); opacity: .5; } 50% { transform: scale(1.15) rotate(25deg); opacity: 1; } }
          .hp-prog { animation: hp-load 5s ease-in-out infinite; }
          @keyframes hp-load { 0% { width: 6%; } 70%, 100% { width: 100%; } }
          .hp-dot { animation: ats-pulse 1.4s ease-in-out infinite; }
          .hp-ping { animation: hp-ping 1.8s cubic-bezier(0,0,.2,1) infinite; }
          @keyframes hp-ping { 75%, 100% { transform: scale(2.4); opacity: 0; } }
          .hp-caret { animation: hp-blink 1s steps(2, start) infinite; }
          @keyframes hp-blink { to { visibility: hidden; } }
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
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 pb-16 pt-10 sm:px-6 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-8 lg:pb-24 lg:pt-16">
            <div className="hero-out text-center lg:text-left">
              <h1 className="font-display text-[2.6rem] font-light leading-[1.08] tracking-[-0.03em] text-[#0e1726] sm:text-[4rem] lg:text-[4.75rem]">
                <span className="word" style={{ '--i': 0 }}>A resume that</span>
                <span className="sr-only"> gets you noticed</span>
                <Typewriter lines={HERO_LINES} />
              </h1>
              <p className="rise mx-auto mt-4 max-w-md text-lg font-light leading-relaxed text-slate-600 sm:text-xl lg:mx-0" style={{ '--d': '.1s' }}>
                Pick a template, let AI help you write, download a clean PDF.
              </p>
              <div className="rise mx-auto mt-9 flex max-w-xs flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center lg:justify-start" style={{ '--d': '.2s' }}>
                <Link to="/ResumeBuilder" onPointerMove={magnet} onPointerLeave={unmagnet} className="btn btn-primary magnet group !gap-3 !rounded-full !py-4 !pl-7 !pr-3 !text-[1.0625rem] shadow-[0_14px_30px_-10px_rgba(217,133,107,.9)] transition-shadow hover:shadow-[0_18px_36px_-10px_rgba(217,133,107,1)]">
                  Build my resume
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#0e1726] text-white transition-transform duration-300 group-hover:rotate-45">
                    <Icon name="arrowUpRight" className="h-4 w-4" />
                  </span>
                </Link>
                <Link to={PDF_EDITOR_ROUTE} className="btn !rounded-full !border !border-[#0e1726]/10 !bg-white/70 !px-7 !py-4 !text-[1.0625rem] !text-[#0e1726] shadow-sm backdrop-blur hover:!border-[#0e1726]/30 hover:!bg-white">
                  <Icon name="fileText" className="h-5 w-5 text-[#b5563a]" />
                  Edit a PDF
                </Link>
              </div>
            </div>

            <ResumeStack />
          </div>
        </section>

        {/* Resume builder: what you get */}
        <section id="tools" className="scroll-mt-20 border-t border-[#0e1726]/10 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="reveal max-w-2xl font-display text-[2.25rem] font-light leading-[1.04] tracking-[-0.03em] [text-wrap:balance] sm:text-5xl">
                  Everything your resume needs to get noticed.
                </h2>
                <p className="reveal mt-4 max-w-xl text-slate-600" style={{ '--i': 1 }}>
                  No design skills and no blank page. AI smart assist writes with you, the spell check keeps you polished, and a cover letter to match is one step away.
                </p>
              </div>
              <div className="reveal" style={{ '--i': 2 }}>
                <Link to="/ResumeBuilder" onPointerMove={magnet} onPointerLeave={unmagnet} className="btn btn-primary magnet">
                  Build my resume
                </Link>
              </div>
            </div>

            <ResumeFeatures />
          </div>
        </section>

        {/* ATS scan */}
        <section id="ats" className="scroll-mt-20 border-t border-[#0e1726]/10">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:px-8">
            <div>
              <h2 className="reveal max-w-xl font-display text-3xl font-light leading-tight tracking-tight [text-wrap:balance] sm:text-4xl">
                Software reads your resume before a person does.
              </h2>
              <p className="reveal mt-4 max-w-lg text-slate-600" style={{ '--i': 1 }}>
                Many employers use an applicant tracking system (ATS) to scan resumes first. If it cannot read your headings, or hits a typo where a keyword should be, your experience may never reach a person. Our templates are built so it can.
              </p>
              <ul className="reveal mt-8 max-w-lg divide-y divide-[#0e1726]/10 border-y border-[#0e1726]/10" style={{ '--i': 2 }}>
                {atsPoints.map((pt) => (
                  <li key={pt.title} className="flex gap-4 py-4">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#d9856b] text-[#0e1726]">
                      <Icon name="check" className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <h3 className="font-display text-base font-light">{pt.title}</h3>
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
                  Browse the templates
                </a>
              </div>
            </div>
            <ScanStage />
          </div>
        </section>

        {/* Templates */}
        <section id="templates" className="scroll-mt-20 border-t border-[#0e1726]/10">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
            <LazyOnView>
              <TemplateShowcase
                title="Pick a look that fits the job"
                subtitle="Preview every layout, try different colours, and start with the one that feels like you."
                onUseTemplate={() => navigate('/ResumeBuilder')}
              />
            </LazyOnView>
          </div>
        </section>

        {/* PDF editor */}
        <section id="pdf-editor" className="scroll-mt-20 border-t border-[#0e1726]/10 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="reveal max-w-2xl font-display text-[2.25rem] font-light leading-[1.04] tracking-[-0.03em] [text-wrap:balance] sm:text-5xl">
                  Need to fix a PDF? Do it right here.
                </h2>
                <p className="reveal mt-4 max-w-xl text-slate-600" style={{ '--i': 1 }}>
                  Open a file and change it right where it sits. Fix a typo, add text, highlight a line or sign. Then split, lock, convert or compress it before you download. No extra software needed.
                </p>
              </div>
              <div className="reveal" style={{ '--i': 2 }}>
                <Link to={PDF_EDITOR_ROUTE} onPointerMove={magnet} onPointerLeave={unmagnet} className="btn btn-primary magnet">
                  Open PDF editor
                </Link>
              </div>
            </div>

            <div className="shot-in relative hidden sm:mx-0 sm:mt-12 sm:block">
              <div className="pdf-stage relative overflow-hidden rounded-none px-0 pt-0 sm:rounded-[2rem] sm:px-8 sm:pt-14 lg:px-14 lg:pt-[4.5rem]">
                {/* The shot runs off the bottom of the stage. On a phone it is zoomed in on the toolbar and page, so the tools are readable.
                    The marks on top are positioned in percentages of the picture, so they stay on the same spot at every size. */}
                <div className="relative mx-auto max-w-[62rem] overflow-hidden rounded-none bg-white sm:rounded-t-2xl sm:shadow-[0_-24px_60px_-30px_rgba(14,23,38,.25)] sm:ring-1 sm:ring-[#0e1726]/10">
                  <div className="relative w-full">
                    <img
                      src={editorShot}
                      srcSet={`${editorShotSmall} 800w, ${editorShot} 1600w`}
                      sizes="(min-width: 1280px) 992px, (min-width: 640px) 92vw, 100vw"
                      alt="The RemoPDF editor with a toolbar for text, highlight, signature and image tools, a page sidebar, and an invoice open on the page."
                      width="1600"
                      height="751"
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                      className="block h-auto w-full max-w-none"
                    />
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                      <span className="absolute left-[23%] top-[27%] h-[7.5%] w-[13.5%] rounded-[3px] border border-dashed border-[#d9856b] bg-[#d9856b]/10">
                        {[['-left-[3px]', '-top-[3px]'], ['-right-[3px]', '-top-[3px]'], ['-left-[3px]', '-bottom-[3px]'], ['-right-[3px]', '-bottom-[3px]']].map(([x, y]) => (
                          <span key={x + y} className={`absolute ${x} ${y} h-1.5 w-1.5 border border-[#d9856b] bg-white`} />
                        ))}
                        <span className="absolute left-full top-1/2 ml-2.5 flex -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#0e1726] py-1 pl-2 pr-2.5 text-[11px] font-semibold text-white shadow-lg sm:text-xs">
                          <Icon name="edit" className="h-3 w-3 text-[#d9856b]" />
                          Edit text
                        </span>
                      </span>
                      <span className="pdf-hl absolute left-[52.5%] top-[82.6%] h-[4.4%] w-[14%] rounded-[2px] bg-[#ffd84d]/60 mix-blend-multiply" />
                      <span className="absolute left-[68.5%] top-[84.8%] flex -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-white py-1 pl-2 pr-2.5 text-[11px] font-semibold text-[#0e1726] shadow-lg ring-1 ring-black/5 sm:text-xs">
                        <Icon name="highlighter" className="h-3 w-3 text-[#c99a1b]" />
                        Highlight
                      </span>
                      <svg viewBox="0 0 60 16" className="absolute left-[24%] top-[74%] h-[8.5%] w-[16%]">
                        <path className="pdf-sig" d="M2 12c6-12 8-12 6-2s6 4 9-4 4 10 9 2 6-6 9-1 7 3 11-3" pathLength="1" fill="none" stroke="#2a46b8" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <ul className="pdf-grid mt-10 sm:mt-4">
              {pdfTools.map((tool) =>
                tool.feat ? (
                  <li key={tool.label} className="pdf-feat flex">
                    <Link
                      to={PDF_EDITOR_ROUTE}
                      className={`bt ${tool.feat === 'edit' ? 'bt-sky' : 'bt-peach'} pdf-link group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0e1726]`}
                    >
                      <div className="bt-copy pr-8">
                        <h3 className="font-display text-xl font-light sm:text-2xl">{tool.label}</h3>
                        <p className="bt-desc mt-2 text-[15px] leading-relaxed">{tool.desc}</p>
                      </div>
                      <Icon name="arrowUpRight" className="pdf-tool-go absolute right-5 top-5 h-5 w-5 text-[#0e1726]/50 sm:right-6 sm:top-6" />
                      <div className="bt-art" aria-hidden="true" style={{ '--h': '10.5rem' }}>
                        <PdfArt type={tool.feat} />
                      </div>
                    </Link>
                  </li>
                ) : (
                  <li key={tool.label} className="flex">
                    <Link
                      to={PDF_EDITOR_ROUTE}
                      data-tone={tool.tone}
                      className="pdf-tool group relative flex min-h-[7.5rem] flex-1 flex-col justify-between gap-5 rounded-2xl p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0e1726] sm:min-h-0 sm:flex-row sm:items-center sm:justify-start sm:gap-4 sm:rounded-[1.25rem] sm:p-4"
                    >
                      <span className={`pt-${tool.tone} grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[#0e1726] sm:h-12 sm:w-12`}>
                        <Icon name={tool.icon} className="h-5 w-5" />
                      </span>
                      <span className="font-display text-[1.0625rem] font-normal leading-snug tracking-[-0.01em] [text-wrap:balance]">{tool.label}</span>
                      <Icon name="arrowUpRight" className="pdf-tool-go absolute right-4 top-4 h-[1.1rem] w-[1.1rem] text-slate-400 sm:static sm:ml-auto sm:shrink-0" />
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="dark-sec bleed scroll-mt-20 bg-[#0e1726] text-white">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:px-8">
            <div className="reveal lg:sticky lg:top-28 lg:self-start">
              <h2 className="font-display text-3xl font-light leading-tight tracking-tight [text-wrap:balance] sm:text-4xl">
                Three steps to a resume you are proud of.
              </h2>
              <p className="mt-4 max-w-md text-slate-300">Already have a resume? Import it and skip straight to the good part.</p>
              <Link to="/ResumeBuilder" className="btn btn-primary mt-8">
                Build my resume
              </Link>
            </div>
            <ol className="relative space-y-12">
              <li aria-hidden="true" className="absolute bottom-6 left-6 top-6 w-px bg-white/15">
                <span className="trace block h-full w-full bg-[#d9856b]" />
              </li>
              {steps.map((s, i) => (
                <li key={s.title} className="reveal relative grid grid-cols-[3rem_1fr] gap-5">
                  <span className="pop-in relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-[#d9856b] bg-[#0e1726] font-display text-xl font-normal text-[#d9856b]">{i + 1}</span>
                  <div>
                    <h3 className="font-display text-xl font-light">{s.title}</h3>
                    <p className="mt-1.5 max-w-md text-slate-300">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* FAQ */}
        <Faq />

        {/* Final call to action */}
        <section className="cta-band bg-[#d9856b]">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-4 py-14 sm:px-6 sm:py-16 lg:flex-row lg:items-center lg:px-8">
            <h2 className="reveal max-w-xl font-display text-3xl font-light leading-tight tracking-tight [text-wrap:balance] sm:text-4xl">
              Your next opportunity starts with a better resume.
            </h2>
            <div className="reveal flex flex-col gap-3 sm:flex-row" style={{ '--i': 2 }}>
              <Link to="/ResumeBuilder" onPointerMove={magnet} onPointerLeave={unmagnet} className="btn btn-ink magnet">
                Build my resume
              </Link>
              <Link to={PDF_EDITOR_ROUTE} className="btn btn-line">
                Edit a PDF
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />

      <PricingModal open={pricingOpen && !flow} user={user} onClose={closePricing} onChoose={choosePlan} />
      {flow && (
        <Suspense fallback={null}>
          <AuthModal open={flow.stage === 'auth'} onClose={authClosed} onSignIn={handleSignIn} />
          {flow.stage === 'pay' && (
            <PaymentModal
              open
              user={user}
              initialPlan={flow.plan}
              onClose={backToPlans}
              onPaid={handlePaid}
              onSignIn={() => startFlow({ plan: flow.plan, stage: 'auth' })}
              doneLabel="Done"
            />
          )}
        </Suspense>
      )}
    </div>
  );
}