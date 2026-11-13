import React, { useEffect, useMemo, useRef, useState } from 'react';
import { downloadBlob } from '../../api/client';
import logo from '../../assets/logo1.webp'; // the logo for light bars (logo.webp is the white one for dark bars)
import { usePremiumAccess, useSignedIn, requestUpgrade, requestSignIn } from '../../hooks/premiumAccess';
import {
  TONES,
  TEMPLATES,
  LETTER_COLORS,
  resolveLetterColor,
  MAX_BODY_CHARS,
  MAX_FIELD_CHARS,
  MAX_URL_CHARS,
  aiSignature,
  buildDraft,
  buildLetterModel,
  fullNameOf,
  joinList,
  loadLetter,
  saveLetter,
  todayIso,
  syncWithTarget,
  applyTarget,
  jobFromTarget,
  targetKeyOf,
} from '../../utils/coverLetter';
import { generateCoverLetterBody, readJobPosting } from '../../utils/coverLetterAI';
import { SignatureError, SIGNATURE_ERRORS, signatureFromFile } from '../../utils/letterSignature';
import SignatureDialog from './SignatureDialog';
import { dropUnlistedQualificationSentences, unlistedQualifications } from '../../utils/letterClaims';
import {
  PAGE_W,
  PAGE_H,
  COVER_LETTER_WATERMARK,
  pastelTint,
  creamTint,
  deepShade,
  loadFontMetrics,
  layoutLetter,
  sanitizeModel,
  buildCoverLetterPdf,
} from '../../utils/coverLetterPdf';

/**
 * Full-screen cover letter page, opened from "Build cover letter" in the builder's sidebar.
 *
 * The page first asks for the link to the job advert. The server reads it (readJobPosting in
 * utils/coverLetterAI.js) and the position, company, address and what the job asks for fill in on the left; the AI
 * (Groq) then writes the letter so that it answers those requirements with what the resume says, and the address
 * goes into the letter's address block. When a site cannot be read by a server, a box to paste the job description
 * takes its place. Without a link, "Write with AI" writes a general letter from the resume alone
 * (AUTO_WRITE_WITHOUT_JOB below writes it as soon as the page opens, as this page used to).
 * The position, company, tone and requirements are used the next time the AI writes ("Rewrite with AI"). People who are signed out or not on Premium, or when the AI cannot be reached,
 * start from a plain draft built from the resume (name, job titles, skills, qualification) instead. Either way the
 * person can edit the text; once they do, nothing replaces it without asking.
 * The preview is the real layout of the PDF (utils/coverLetterPdf.js), so the download matches it exactly.
 * The last step, Signature, lets the person sign the letter: draw it on a pad (SignatureDialog) or upload a photo or
 * scan of it (utils/letterSignature.js). It is kept with the letter on this device and drawn above the typed name,
 * in the preview and in the PDF. Without one the letter shows the typed name, as before.
 *
 * Look and layout (2026 refresh): a flat glass top bar (back arrow, logo, Download), a soft aurora background, the
 * form as a stack of dropdown step cards (each one shows a one-line summary while closed), the preview on a dotted
 * "stage" with a paper-style page, and on small screens a floating Edit / Preview switcher at the bottom. The two
 * main containers (form and preview) run edge to edge with square corners. Only the presentation changed; the
 * behaviour is the same.
 *
 * Props
 *  - resumeData:   the resume being built (same object the builder holds). Its jobTarget (position, company, address,
 *                  requirements, duties) is imported into the letter when the page opens, so the advert is not read
 *                  twice; removing the job target on the resume takes the imported details out of the letter too.
 *  - accountFirstName, accountLastName: the signed-in account's name. Used for the letter's heading and signature
 *                  when the resume's Heading step has no name yet.
 *  - accentColor:  the resume's colour (#rrggbb); the letter's banner tint, divider, bullets and signature use it, unless
 *                  the person picks a colour of their own for the letter in the Design step (letter.color)
 *                  (the Classic design uses it for its header line and bullets)
 *  - storageKey:   one letter is kept per resume under this key (localStorage, on this device)
 *  - checkPremium: async () => boolean, asked at download time. Premium gets a clean page; others get a small label.
 *  - onClose:      () => void
 */

// false: opening the page asks for the job link first and writes nothing until there is a link (or the person
// chooses "Write with AI"). true: the AI writes a general letter the moment the page opens, link or no link.
const AUTO_WRITE_WITHOUT_JOB = false;

const REQ_PREVIEW = 4; // how many requirements the list shows before "Show more"

const PREVIEW_FONT = "Helvetica, Arial, 'Liberation Sans', sans-serif";
const ASCENT = 0.8465; // where Arial/Helvetica put the baseline inside a line box of height = font size
const PREVIEW_SERIF = "'Times New Roman', Times, 'Liberation Serif', serif"; // the Banner design's name and signature (Times in the PDF)
const ASCENT_SERIF = 0.8375; // the same, for Times

/* ------------------------------------------------------------------ icons */

const Svg = ({ className = 'h-4 w-4', children }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {children}
  </svg>
);

const IconBack = ({ className }) => (
  <Svg className={className}>
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </Svg>
);

const IconDownload = ({ className }) => (
  <Svg className={className}>
    <path d="M12 3v12" />
    <path d="m7 11 5 5 5-5" />
    <path d="M5 21h14" />
  </Svg>
);

const IconRefresh = ({ className }) => (
  <Svg className={className}>
    <path d="M21 12a9 9 0 1 1-2.6-6.4" />
    <path d="M21 4v5h-5" />
  </Svg>
);

const IconInfo = ({ className }) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </Svg>
);

const IconSparkle = ({ className }) => (
  <Svg className={className}>
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
    <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
  </Svg>
);

const IconCheck = ({ className }) => (
  <Svg className={className}>
    <path d="M20 6 9 17l-5-5" />
  </Svg>
);

const IconClose = ({ className }) => (
  <Svg className={className}>
    <path d="M18 6 6 18" />
    <path d="M6 6l12 12" />
  </Svg>
);

const IconSpinner = ({ className }) => (
  <Svg className={`${className} animate-spin`}>
    <path d="M21 12a9 9 0 1 1-6.2-8.55" />
  </Svg>
);

const IconLink = ({ className }) => (
  <Svg className={className}>
    <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07l-1.33 1.33" />
    <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07l1.33-1.33" />
  </Svg>
);

const IconEdit = ({ className }) => (
  <Svg className={className}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
  </Svg>
);

const IconEye = ({ className }) => (
  <Svg className={className}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);

const IconPen = ({ className }) => (
  <Svg className={className}>
    <path d="M3 17c2.5-5 4.5-8 6-8 2 0 .5 5 2.5 5 1.2 0 2-2 3-2 .8 0 .8 1.5 1.5 1.5S18 12 21 12" />
    <path d="M3 21h18" />
  </Svg>
);

const IconUpload = ({ className }) => (
  <Svg className={className}>
    <path d="M12 16V4" />
    <path d="m7 9 5-5 5 5" />
    <path d="M5 20h14" />
  </Svg>
);

const IconChevron = ({ className }) => (
  <Svg className={className}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);

/* ------------------------------------------------------------------ shared styles */

// Phones get compact sizes (40px fields, 14px text, small buttons); from sm up everything is a little roomier.
const inputClass =
  'h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50/70 px-3 text-[14px] text-slate-900 placeholder:text-slate-400 transition-all hover:border-slate-300 focus:border-[#d9856b] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#d9856b]/15 sm:h-11 sm:rounded-xl sm:px-3.5';

const textareaClass =
  'w-full resize-y rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-[14px] leading-relaxed text-slate-900 placeholder:text-slate-400 transition-all hover:border-slate-300 focus:border-[#d9856b] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#d9856b]/15 sm:rounded-xl sm:px-3.5 sm:py-3';

// Navy, for the job-advert button and the small in-notice actions.
const navyButtonClass =
  'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-[#2a4bb0] to-[#1e3a8a] px-3.5 text-[12.5px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_6px_16px_-6px_rgba(30,58,138,0.55)] transition-all hover:-translate-y-px hover:shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_10px_22px_-8px_rgba(30,58,138,0.6)] active:translate-y-0 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1e3a8a]/25 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none sm:h-11 sm:rounded-xl sm:px-4 sm:text-[13px]';

// The quieter partner of the navy button, for a second action next to it.
const outlineButtonClass =
  'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-[12.5px] font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1e3a8a]/20 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none sm:h-11 sm:rounded-xl sm:px-4 sm:text-[13px]';

const navyPillClass =
  'shrink-0 rounded-full bg-[#1e3a8a] px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-blue-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1e3a8a]/25 sm:px-3.5';

// The same coral pill as the resume builder's main buttons (Next, Download).
const downloadButtonClass =
  'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#e0906f] to-[#d9856b] px-3.5 text-[12px] font-bold text-white shadow-md shadow-[#d9856b]/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#d9856b]/40 active:translate-y-0 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#d9856b]/30 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none motion-reduce:transition-none sm:h-10 sm:gap-2 sm:px-5 sm:text-[13px] sm:shadow-lg';

// "Write with AI": the one gradient on the page, so the AI action is easy to find.
const aiButtonClass =
  'inline-flex h-8 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#e8957a] via-[#d9856b] to-[#c9607a] px-3 text-[12px] font-semibold text-white shadow-[0_6px_16px_-6px_rgba(201,96,122,0.6)] transition-all hover:-translate-y-px hover:shadow-[0_10px_20px_-8px_rgba(201,96,122,0.7)] active:translate-y-0 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#d9856b]/30 disabled:translate-y-0 disabled:cursor-wait disabled:opacity-70 motion-reduce:transition-none sm:h-9 sm:px-3.5';

const ghostPillClass =
  'inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/60 disabled:opacity-50 sm:h-9 sm:px-3';

/* ------------------------------------------------------------------ form pieces */

const Field = ({ id, label, optional = false, note = '', children }) => (
  <div className="min-w-0">
    <label htmlFor={id} className="mb-1 flex items-baseline justify-between gap-2 text-[11.5px] font-medium text-slate-600 sm:mb-1.5 sm:text-[12px]">
      <span>{label}</span>
      {optional && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:px-2 sm:text-[10.5px]">Optional</span>}
      {!optional && note && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 sm:px-2 sm:text-[10.5px]">{note}</span>}
    </label>
    {children}
  </div>
);

// One dropdown step of the form. The header always shows the step number, the title and a one-line summary, so a
// closed step still says where it stands. The body stays in the page when closed (it is only hidden), so nothing
// the person typed is lost.
const Accordion = ({ id, step, title, summary, open, onToggle, busy = false, alert = false, children }) => (
  <section className="bg-white">
    <h2 className="m-0">
      <button
        type="button"
        id={`${id}-trigger`}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#d9856b]/60 sm:px-5 sm:py-3.5"
      >
        <span
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold transition-colors motion-reduce:transition-none sm:h-7 sm:w-7 sm:text-[12px] ${
            open ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {busy ? <IconSpinner className="h-3.5 w-3.5" /> : step}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[15px]">{title}</span>
          {summary ? <span className="mt-0.5 block truncate text-[11.5px] leading-snug text-slate-500 sm:text-[12px]">{summary}</span> : null}
        </span>
        {alert && <span role="img" aria-label="Needs attention" className="h-2 w-2 shrink-0 rounded-full bg-amber-500 ring-4 ring-amber-100" />}
        <IconChevron className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
      </button>
    </h2>
    <div
      id={`${id}-panel`}
      role="region"
      aria-labelledby={`${id}-trigger`}
      className={`grid transition-[grid-template-rows,visibility] duration-300 ease-out motion-reduce:transition-none ${open ? 'visible grid-rows-[1fr]' : 'invisible grid-rows-[0fr]'}`}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="px-3.5 pb-4 pt-1 sm:px-5 sm:pb-5">{children}</div>
      </div>
    </div>
  </section>
);

// A labelled card that holds a few related steps, so the six steps read as three groups instead of six loose boxes.
const Group = ({ label, children }) => (
  <div>
    <p className="mb-1.5 px-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-400 sm:mb-2 sm:text-[11px]">{label}</p>
    <div className="divide-y divide-slate-200/70 overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:rounded-2xl">{children}</div>
  </div>
);

const NOTICE_TONES = {
  info: { box: 'border-slate-200/80 bg-slate-50 text-slate-600', icon: 'bg-white text-slate-400 ring-1 ring-slate-200' },
  warn: { box: 'border-amber-200/80 bg-amber-50/80 text-amber-900', icon: 'bg-amber-100 text-amber-700' },
  ok: { box: 'border-emerald-200/80 bg-emerald-50/80 text-emerald-900', icon: 'bg-emerald-100 text-emerald-700' },
  busy: { box: 'border-[#d9856b]/25 bg-[#fff7f3] text-slate-700', icon: 'bg-white text-[#d9856b] ring-1 ring-[#d9856b]/20' },
};

// Status messages: a tinted card with a round icon, text, and an optional action on the right.
const Notice = ({ tone = 'info', icon, action, className = '', children, ...rest }) => {
  const t = NOTICE_TONES[tone] || NOTICE_TONES.info;
  return (
    <div {...rest} className={`flex flex-wrap items-start gap-x-2.5 gap-y-1.5 rounded-xl border px-2.5 py-2 text-[12px] leading-snug sm:gap-x-3 sm:rounded-2xl sm:px-3 sm:py-2.5 sm:text-[12.5px] ${t.box} ${className}`}>
      <span className={`mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full sm:h-6 sm:w-6 [&_svg]:h-3 [&_svg]:w-3 sm:[&_svg]:h-3.5 sm:[&_svg]:w-3.5 ${t.icon}`}>{icon}</span>
      <span className="min-w-0 flex-1 break-words py-0.5">{children}</span>
      {action}
    </div>
  );
};

/* ------------------------------------------------------------------ design picker */

const HEX_RE = /^#[0-9a-f]{6}$/i;
const rgbCss = ([r, g, b]) => `rgb(${r}, ${g}, ${b})`;
const CUSTOM_START = '#4a90b8'; // what the colour picker opens on before the person has picked their own

// A tiny drawing of each design for the picker (the real thing is drawn by utils/coverLetterPdf.js).
const DesignThumb = ({ id, accent, pastel = false }) => {
  const color = HEX_RE.test(accent || '') ? accent : '#1e3a8a';
  const deep = rgbCss(deepShade(color));
  const tint = rgbCss(pastel ? pastelTint(color) : creamTint(color));
  // Lines of the letter underneath the header: a number is a line of that width in %, 0 is a gap.
  const lines = id === 'banner' ? [30, 22, 0, 100, 96, 100, 64, 0, 100, 90, 54] : [100, 94, 100, 58, 0, 100, 96, 100, 70, 0, 100, 88];
  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[3px] bg-white ring-1 ring-slate-900/10" aria-hidden="true">
      {id === 'banner' ? (
        <div className="absolute inset-x-[8%] top-[7%] h-[27%]" style={{ background: tint }}>
          <span className="absolute left-[9%] top-[24%] h-[15%] w-[40%] rounded-[1px]" style={{ background: deep }} />
          <span className="absolute left-[9%] top-[44%] h-[15%] w-[30%] rounded-[1px]" style={{ background: deep }} />
          <span className="absolute left-[9%] top-[70%] h-[5%] w-[34%] rounded-full opacity-60" style={{ background: deep }} />
          <span className="absolute bottom-0 left-[60%] top-0 w-px" style={{ background: deep }} />
          {[30, 46, 62].map((top) => (
            <span key={top} className="absolute left-[67%] h-[5%] w-[24%] rounded-full bg-slate-500/50" style={{ top: `${top}%` }} />
          ))}
        </div>
      ) : (
        <>
          <span className="absolute left-[8%] top-[7%] h-[4.5%] w-[38%] rounded-[1px] bg-slate-800" />
          <span className="absolute left-[8%] top-[13.5%] h-[2.5%] w-[26%] rounded-full" style={{ background: color }} />
          <span className="absolute left-[8%] top-[18%] h-[2%] w-[56%] rounded-full bg-slate-300" />
          <span className="absolute inset-x-[8%] top-[23%] h-[1.5px]" style={{ background: color }} />
        </>
      )}
      <div className={`absolute inset-x-[8%] flex flex-col gap-[3.2%] ${id === 'banner' ? 'top-[40%]' : 'top-[30%]'}`}>
        {lines.map((w, i) => (w === 0 ? <span key={i} className="h-[2%]" /> : <span key={i} className="h-[1.5px] rounded-full bg-slate-300" style={{ width: `${w}%` }} />))}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ preview */

const colorOf = (rgb) => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;

// One A4 page, drawn from the layout lines and scaled to the width of the screen.
// Motion for the small-screen Edit / Preview switch: the dock rises in, the pane that opens slides in from its side,
// and the icon of the chosen tab plays one short move (pen writes, eye blinks). All of it stops for reduced motion.
const VIEW_CSS = `
@keyframes cl-dock-in{from{opacity:0;transform:translateY(18px) scale(.94)}to{opacity:1;transform:none}}
@keyframes cl-pane-left{from{opacity:0;transform:translateX(-18px)}to{opacity:1;transform:none}}
@keyframes cl-pane-right{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:none}}
@keyframes cl-pen{0%{transform:rotate(0) translate(0,0)}25%{transform:rotate(-16deg) translate(-1px,1px)}50%{transform:rotate(10deg) translate(1px,-1px)}75%{transform:rotate(-6deg)}100%{transform:none}}
@keyframes cl-eye{0%,100%{transform:scaleY(1)}40%{transform:scaleY(.08)}65%{transform:scaleY(1.18)}}
.cl-dock{animation:cl-dock-in .5s cubic-bezier(.2,.9,.25,1.1) both}
.cl-thumb{transition:transform .38s cubic-bezier(.3,1.25,.4,1)}
.cl-icon-edit{animation:cl-pen .6s ease-out both}
.cl-icon-eye{animation:cl-eye .55s ease-in-out both}
@media (max-width:1023.98px){
  .cl-pane-left{animation:cl-pane-left .3s cubic-bezier(.2,.8,.2,1) both}
  .cl-pane-right{animation:cl-pane-right .3s cubic-bezier(.2,.8,.2,1) both}
}
@media (prefers-reduced-motion:reduce){
  .cl-dock,.cl-pane-left,.cl-pane-right,.cl-icon-edit,.cl-icon-eye{animation:none}
  .cl-thumb{transition:none}
}
`;

const PreviewPage = ({ page, scale, index, total }) => (
  <figure className="mx-auto mb-7 last:mb-0" style={{ width: PAGE_W * scale }}>
    <div
      className="relative overflow-hidden rounded-[3px] bg-white shadow-[0_1px_1px_rgba(15,23,42,0.06),0_8px_24px_-6px_rgba(15,23,42,0.14),0_28px_56px_-16px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/5"
      style={{ width: PAGE_W * scale, height: PAGE_H * scale }}
    >
      <div style={{ position: 'absolute', left: 0, top: 0, width: PAGE_W, height: PAGE_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        {page.items.map((item, i) =>
          item.type === 'rect' ? (
            <div key={i} style={{ position: 'absolute', left: item.x, top: item.top, width: item.width, height: item.height, background: colorOf(item.color) }} />
          ) : item.type === 'image' ? (
            <img key={i} src={item.dataUrl} alt="" draggable={false} style={{ position: 'absolute', left: item.x, top: item.top, width: item.width, height: item.height }} />
          ) : (
            <span
              key={i}
              style={{
                position: 'absolute',
                left: item.x,
                top: item.baseline - item.size * (item.serif ? ASCENT_SERIF : ASCENT),
                fontSize: item.size,
                lineHeight: 1,
                whiteSpace: 'pre',
                fontWeight: item.bold ? 700 : 400,
                color: colorOf(item.color),
                fontFamily: item.serif ? PREVIEW_SERIF : PREVIEW_FONT,
              }}
            >
              {item.text}
            </span>
          ),
        )}
      </div>
    </div>
    {total > 1 && <figcaption className="mt-2.5 text-center text-[11px] font-medium tracking-wide text-slate-400">{`Page ${index + 1} of ${total}`}</figcaption>}
  </figure>
);

/* ------------------------------------------------------------------ the page */

export default function CoverLetterBuilder({ resumeData, accountFirstName = '', accountLastName = '', accentColor, storageKey, checkPremium, onClose }) {
  // The job target on the resume is brought in before anything is drawn, so the letter (and the AI's first letter)
  // already know the position, company and requirements.
  const [letter, setLetter] = useState(() => syncWithTarget(loadLetter(storageKey), resumeData?.jobTarget));
  const [view, setView] = useState('edit'); // small screens show one side at a time
  const [open, setOpen] = useState({ job: true, who: false, tone: false, design: false, letter: true, sign: false }); // which dropdown steps are open
  const [signing, setSigning] = useState(false); // the "Draw your signature" pad is open
  const signingRef = useRef(false); // the same, readable inside the Escape listener
  signingRef.current = signing;
  const [signatureError, setSignatureError] = useState('');
  const [signatureBusy, setSignatureBusy] = useState(false); // an uploaded picture is being prepared
  const signatureFileRef = useRef(null);
  const [fonts, setFonts] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(''); // '' | 'reset' | 'regen': which "replace your edits?" question is showing
  const [ai, setAi] = useState({ state: 'idle', code: '' }); // state: idle | loading | done | blocked | error
  const aiStateRef = useRef('idle'); // the same state, readable inside effects and callbacks
  const [previewWidth, setPreviewWidth] = useState(0);
  const [posting, setPosting] = useState({ state: 'idle', code: '', message: '', found: null }); // state: idle | loading | done | error
  const postingStateRef = useRef('idle');
  const [pasteOpen, setPasteOpen] = useState(false); // the "paste the job description" box
  const [pasteText, setPasteText] = useState('');
  const [reqExpanded, setReqExpanded] = useState(false); // the requirements list shows the first few until opened
  const letterRef = useRef(letter); // the latest letter, readable after an await
  letterRef.current = letter;

  const dialogRef = useRef(null);
  const previewRef = useRef(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // The letter is kept per resume as it is typed.
  useEffect(() => {
    saveLetter(storageKey, letter);
  }, [storageKey, letter]);

  // Text measurements for the preview (the same ones the PDF is written with).
  useEffect(() => {
    let cancelled = false;
    loadFontMetrics()
      .then((f) => {
        if (!cancelled) setFonts(f);
      })
      .catch(() => {
        if (!cancelled) setError('The preview could not be prepared. Please close this page and open it again.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Focus starts inside the page (once, when it opens).
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  // Escape closes the page. The latest onClose is kept in a ref so the listener is not re-added on every render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !downloading && !signingRef.current) onCloseRef.current?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [downloading]);

  // The preview is scaled to the room it has.
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return undefined;
    const measure = () => setPreviewWidth(el.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const premium = usePremiumAccess();
  const signedIn = useSignedIn();
  const watermark = premium === true ? null : COVER_LETTER_WATERMARK;

  // The letter is written for the name in the resume's Heading step. With no name there yet, the account's name
  // stands in, so the heading and signature are never blank for someone who is signed in.
  const resume = useMemo(() => {
    const first = String(accountFirstName || '').trim();
    if (fullNameOf(resumeData?.personal) || !first) return resumeData;
    return { ...resumeData, personal: { ...(resumeData?.personal || {}), firstName: first, lastName: String(accountLastName || '').trim() } };
  }, [resumeData, accountFirstName, accountLastName]);
  const usingAccountName = resume !== resumeData;

  const draft = useMemo(
    () => buildDraft(resume, { tone: letter.tone, jobTitle: letter.jobTitle, company: letter.company }),
    [resume, letter.tone, letter.jobTitle, letter.company],
  );
  // The person's own text, else the AI's letter, else the plain draft.
  const storedBody = letter.bodyEdited ? letter.body : letter.aiBody || draft;

  // A degree, diploma or certificate is checked by the employer with the school, so a letter may name only those the
  // resume lists under Education or Certificates (utils/letterClaims.js). The position and company are not claims.
  // A letter the APP wrote (the AI's, one saved before this check existed, or the draft) never shows or prints a
  // sentence that claims an unlisted one, silently. The person's own wording is left as they wrote it, with a warning.
  const claimIgnore = useMemo(() => [letter.jobTitle, letter.company], [letter.jobTitle, letter.company]);
  const body = useMemo(
    () => (letter.bodyEdited ? storedBody : dropUnlistedQualificationSentences(storedBody, resume, claimIgnore)),
    [letter.bodyEdited, storedBody, resume, claimIgnore],
  );
  const ownUnlistedClaims = useMemo(
    () => (letter.bodyEdited ? unlistedQualifications(body, resume, claimIgnore) : []),
    [letter.bodyEdited, body, resume, claimIgnore],
  );

  const model = useMemo(() => buildLetterModel(resume, letter, body), [resume, letter, body]);
  const prepared = useMemo(() => (fonts ? sanitizeModel(model, fonts) : null), [fonts, model]);
  // The colour the page is drawn with: the resume's colour, or the light colour the person picked for the letter.
  const letterColor = useMemo(() => resolveLetterColor(letter.color, accentColor), [letter.color, accentColor]);
  const layout = useMemo(
    () => (prepared ? layoutLetter(prepared.model, fonts, { accent: letterColor.accent, pastel: letterColor.pastel, watermark, template: letter.template }) : null),
    [prepared, fonts, letterColor, watermark, letter.template],
  );

  const fullName = fullNameOf(resume?.personal);
  const hasText = model.blocks.length > 0;
  const wordCount = useMemo(() => {
    const text = String(body || '').trim();
    return text ? text.split(/\s+/).length : 0;
  }, [body]);

  const writing = ai.state === 'loading';

  const setAiStatus = (state, code = '') => {
    aiStateRef.current = state;
    setAi({ state, code });
  };

  const setPostingStatus = (next) => {
    postingStateRef.current = next.state;
    setPosting({ state: 'idle', code: '', message: '', found: null, ...next });
  };

  const toggleSection = (key) => setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  const openSection = (key) => setOpen((prev) => (prev[key] ? prev : { ...prev, [key]: true }));

  // Asks the AI for the letter. The reply replaces whatever is shown (callers ask first when the person has edits).
  // details: position, company and requirements to use instead of the saved ones (an advert was just read, and the
  // page has not drawn the new values yet).
  const generate = async ({ fresh = false, details } = {}) => {
    if (aiStateRef.current === 'loading') return;
    setAiStatus('loading');
    setConfirm('');
    const target = { ...letterRef.current, ...(details || {}) };
    // A letter written for an advert must name the position. When the advert does not state one (a pasted job
    // description often has no title), ask for it instead of writing "the role you are offering".
    if ((target.requirements || []).length > 0 && !String(target.jobTitle || '').trim()) {
      setAiStatus('error', 'position');
      // The position field lives in a dropdown step: open it first, then focus the field once it is showing.
      openSection('who');
      if (typeof window !== 'undefined') window.setTimeout(() => document.getElementById('cl-job')?.focus(), 80);
      return;
    }
    const wroteFor = aiSignature(resume, target);
    try {
      const text = await generateCoverLetterBody({
        resumeData: resume,
        jobTitle: target.jobTitle,
        company: target.company,
        tone: target.tone,
        requirements: target.requirements,
        duties: target.duties,
        fresh,
      });
      if (!alive.current) return;
      setLetter((prev) => ({ ...prev, aiBody: text.slice(0, MAX_BODY_CHARS), aiFor: wroteFor, body: '', bodyEdited: false }));
      setAiStatus('done');
    } catch (err) {
      if (!alive.current) return;
      const code = err?.code || 'unavailable';
      if (code === 'signin' || code === 'premium') setAiStatus('blocked', code);
      else setAiStatus('error', code);
    }
  };

  // The automatic part. Nothing is asked when the person already has a letter (an AI one kept from before, or
  // their own), so reopening the page costs nothing and never overwrites anything.
  // Signed out, or no Premium: say so instead of asking. If either changes while the page is open (they sign in
  // or pay in the dialog on top), this runs again.
  // With no position or requirements to write for, the AI waits for the job link (see AUTO_WRITE_WITHOUT_JOB);
  // with them (the person read an advert on an earlier visit) the letter is written now.
  useEffect(() => {
    if (letter.bodyEdited || letter.aiBody) return;
    if (aiStateRef.current === 'loading' || aiStateRef.current === 'error') return;
    const hasTarget = letter.requirements.length > 0 || Boolean(letter.jobTitle.trim());
    if (signedIn === false) setAiStatus('blocked', 'signin');
    else if (premium === false) setAiStatus('blocked', 'premium');
    else if (AUTO_WRITE_WITHOUT_JOB || hasTarget) generate();
    else if (aiStateRef.current === 'blocked') setAiStatus('idle'); // they signed in or upgraded: the buttons come back
  }, [premium, signedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const rewrite = () => {
    if (letter.bodyEdited) setConfirm('regen');
    else generate({ fresh: true });
  };

  // Reads the advert (the link, or the text pasted instead), fills in the position, company and address, keeps what
  // the job asks for, and has the AI write the letter from it (unless the person has written their own text).
  const readPosting = async () => {
    if (postingStateRef.current === 'loading') return;
    if (signedIn === false) {
      requestSignIn();
      return;
    }
    if (premium === false) {
      requestUpgrade();
      return;
    }

    const url = letter.jobUrl.trim();
    const text = pasteOpen ? pasteText.trim() : '';
    if (!url && !text) {
      setPostingStatus({ state: 'error', code: 'badlink', message: pasteOpen ? 'Paste the job description first.' : 'Paste the link to the job advert first.' });
      return;
    }

    setPostingStatus({ state: 'loading' });
    try {
      const found = await readJobPosting({ url, text });
      if (!alive.current) return;
      const current = letterRef.current;
      const details = {
        jobTitle: found.jobTitle || current.jobTitle,
        company: found.company || current.company,
        companyAddress: found.address || current.companyAddress,
        requirements: found.requirements,
        duties: found.duties,
      };
      setLetter((prev) => ({ ...prev, ...details, imported: null }));
      setPostingStatus({
        state: 'done',
        found: { title: Boolean(found.jobTitle), company: Boolean(found.company), address: Boolean(found.address), count: found.requirements.length, source: found.source },
      });
      openSection('who'); // the details that were just filled in are in the next step: show them
      if (!current.bodyEdited) generate({ fresh: true, details });
    } catch (err) {
      if (!alive.current) return;
      const code = err?.code || 'unavailable';
      if (code === 'signin' || code === 'premium') {
        setAiStatus('blocked', code);
        setPostingStatus({ state: 'idle' });
        return;
      }
      const messages = {
        busy: 'Too many adverts in a short time. Please try again in a minute.',
        quota: 'You have used today’s AI actions for your plan. They start again at midnight.',
        timeout: 'That took too long. Try again, or paste the job description instead.',
        offline: 'Could not reach the server. Check your connection and try again.',
      };
      const own = ['badlink', 'unreadable', 'nodetails'].includes(code) ? err.message : '';
      const message = messages[code] || own || 'The advert reader is unavailable right now. You can paste the job description instead.';
      // A page that cannot be read is the moment the paste box is useful.
      if (['unreadable', 'nodetails', 'timeout', 'unavailable'].includes(code)) setPasteOpen(true);
      setPostingStatus({ state: 'error', code, message });
    }
  };

  // The job target set on the resume (Premium): what it holds, and whether the letter already has it.
  const targetJob = useMemo(() => jobFromTarget(resumeData?.jobTarget), [resumeData?.jobTarget]);
  const targetKey = useMemo(() => targetKeyOf(resumeData?.jobTarget), [resumeData?.jobTarget]);
  const offerTarget = Boolean(targetJob) && letter.imported?.key !== targetKey; // only when the person has details of their own

  const importTargetJob = () => {
    if (!targetJob) return;
    setLetter((prev) => applyTarget(prev, resumeData.jobTarget));
    setPostingStatus({ state: 'idle' });
    openSection('who');
    if (!letterRef.current.bodyEdited && premium === true && signedIn !== false) generate({ fresh: true, details: targetJob });
  };

  const removeRequirement = (index) => {
    setLetter((prev) => {
      const requirements = prev.requirements.filter((_, i) => i !== index);
      return { ...prev, requirements, duties: requirements.length > 0 ? prev.duties : [] };
    });
  };

  const clearPosting = () => {
    setLetter((prev) => ({ ...prev, jobUrl: '', requirements: [], duties: [], imported: null }));
    setPasteText('');
    setPasteOpen(false);
    setPostingStatus({ state: 'idle' });
  };

  const setJobUrl = (e) => {
    const value = e.target.value.slice(0, MAX_URL_CHARS);
    setLetter((prev) => ({ ...prev, jobUrl: value }));
  };

  const padding = previewWidth >= 640 ? 64 : 24;
  const scale = Math.max(0.3, Math.min(1.15, (previewWidth - padding) / PAGE_W));

  const setField = (name) => (e) => {
    const value = e.target.value.slice(0, MAX_FIELD_CHARS);
    setLetter((prev) => ({ ...prev, [name]: value }));
  };

  const setDate = (e) => {
    const value = e.target.value;
    setLetter((prev) => ({ ...prev, dateOverride: !value || value === todayIso() ? '' : value }));
  };

  const setBody = (e) => {
    const value = e.target.value.slice(0, MAX_BODY_CHARS);
    setLetter((prev) => ({ ...prev, body: value, bodyEdited: true }));
  };

  // Goes back to the last letter the AI wrote (or the plain draft when there is none).
  const resetToDraft = () => {
    setLetter((prev) => ({ ...prev, body: '', bodyEdited: false }));
    setConfirm('');
  };

  // The signature: drawn on the pad, or a picture the person uploads. Either way it is kept with the letter.
  const saveSignature = (signature) => {
    setLetter((prev) => ({ ...prev, signature }));
    setSignatureError('');
    setSigning(false);
  };

  const removeSignature = () => {
    setLetter((prev) => ({ ...prev, signature: null }));
    setSignatureError('');
  };

  const onSignatureFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // so choosing the same picture again still counts
    if (!file) return;
    setSignatureBusy(true);
    setSignatureError('');
    try {
      const signature = await signatureFromFile(file);
      if (alive.current) setLetter((prev) => ({ ...prev, signature }));
    } catch (err) {
      if (alive.current) setSignatureError(err instanceof SignatureError ? SIGNATURE_ERRORS[err.code] : SIGNATURE_ERRORS.unreadable);
    } finally {
      if (alive.current) setSignatureBusy(false);
    }
  };

  const download = async () => {
    if (downloading || !hasText) return;
    setDownloading(true);
    setError('');
    try {
      // Premium gets a clean PDF; everyone else gets the small "Created with RemoPDF" label on each page.
      const isPremium = typeof checkPremium === 'function' ? await checkPremium() : false;
      const baseName = (fullName ? `${fullName} - Cover Letter` : 'Cover Letter').replace(/[\\/:*?"<>|]/g, '').trim() || 'Cover Letter';
      const bytes = await buildCoverLetterPdf(model, {
        accent: letterColor.accent,
        pastel: letterColor.pastel,
        watermark: isPremium ? null : COVER_LETTER_WATERMARK,
        title: baseName,
        template: letter.template,
      });
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `${baseName}.pdf`);
    } catch (err) {
      console.error('Cover letter PDF export failed', err);
      if (alive.current) setError('Sorry, the PDF could not be created. Please try again.');
    } finally {
      if (alive.current) setDownloading(false);
    }
  };

  const postingBusy = posting.state === 'loading';
  const pageCount = layout ? layout.pages.length : 0;
  const positionNeeded = letter.requirements.length > 0 && !letter.jobTitle.trim();

  // The one-line summaries shown on the dropdown headers while a step is closed (and open).
  const reqCount = letter.requirements.length;
  const jobSummary = postingBusy
    ? 'Reading the advert…'
    : reqCount > 0
      ? `${reqCount} ${reqCount === 1 ? 'requirement' : 'requirements'} ${letter.imported ? 'from your resume' : 'found'}`
      : letter.jobUrl.trim()
        ? 'Link added'
        : 'Paste a link to the advert';
  const whoSummary = [letter.jobTitle.trim(), letter.company.trim()].filter(Boolean).join(' · ') || 'Position, company, address';
  const toneSummary = (TONES.find((t) => t.id === letter.tone) || {}).label || '';
  const colorLabel = (LETTER_COLORS.find((c) => c.id === letter.color) || {}).label || 'Custom colour';
  const designSummary = `${(TEMPLATES.find((t) => t.id === letter.template) || TEMPLATES[0]).label} · ${colorLabel}`;
  const letterStatus = writing ? 'Writing…' : letter.bodyEdited ? 'Your own wording' : letter.aiBody ? 'Written by AI' : 'Starter draft';
  const letterSummary = `${letterStatus} · ${wordCount} ${wordCount === 1 ? 'word' : 'words'}`;
  const signatureSummary = letter.signature ? (letter.signature.source === 'uploaded' ? 'Uploaded signature added' : 'Your signature is added') : 'Optional · draw or upload';

  const aiErrorText =
    {
      busy: 'You asked for several letters in a short time. Please try again in a minute.',
      quota: 'You have used today’s AI actions for your plan. They start again at midnight. A starter draft is shown below.',
      timeout: 'The AI took too long to answer. A starter draft is shown below.',
      offline: 'Could not reach the AI service. Check your connection. A starter draft is shown below.',
      empty: 'Add your experience, skills or education to the resume and the AI can write the letter from them.',
      position: 'Type the position you are applying for under “Who is it for” (for example CRM Lead). The letter names it in its first sentence.',
    }[ai.code] || 'The AI writer is unavailable right now. A starter draft is shown below.';

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cover-letter-title"
      tabIndex={-1}
      className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-[#f7f6f4] text-slate-900 antialiased [-webkit-tap-highlight-color:transparent] focus:outline-none"
      style={{ fontFamily: "'Outfit', ui-sans-serif, system-ui, sans-serif" }}
    >
      <style>{VIEW_CSS}</style>

      {/* Soft aurora behind everything */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(52rem 28rem at 88% -8%, rgba(217,133,107,0.20), transparent 62%), radial-gradient(46rem 26rem at -6% 108%, rgba(30,58,138,0.11), transparent 62%), radial-gradient(30rem 20rem at 50% 50%, rgba(255,255,255,0.7), transparent 70%)',
        }}
      />

      {/* Top bar: a back arrow, the RemoPDF logo, and Download */}
      <header className="relative z-20 shrink-0 border-b border-slate-200/70 bg-white/80 px-2.5 pb-1.5 pt-[max(0.375rem,env(safe-area-inset-top))] backdrop-blur-xl sm:px-5 sm:pb-2.5 sm:pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={downloading}
            aria-label="Back to resume"
            title="Back to resume"
            className="group grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-all duration-200 hover:border-[#d9856b]/40 hover:bg-[#d9856b] hover:text-white active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#d9856b]/25 disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none motion-reduce:active:scale-100 sm:h-10 sm:w-10"
          >
            <IconBack className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5 motion-reduce:transform-none sm:h-5 sm:w-5" />
          </button>

          <img src={logo} alt="RemoPDF" draggable={false} className="h-6 w-auto max-w-[34vw] shrink-0 select-none object-contain object-left sm:h-9 sm:max-w-[40vw]" />
          <h1 id="cover-letter-title" className="sr-only">
            Cover letter
          </h1>

          <div className="flex-1" />

          <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[12px] font-medium text-emerald-700 ring-1 ring-emerald-200/70 lg:inline-flex">
            <IconCheck className="h-3.5 w-3.5" />
            Saved on this device
          </span>

          <button type="button" onClick={download} disabled={!hasText || downloading || writing} className={downloadButtonClass}>
            {downloading ? <IconSpinner className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <IconDownload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            <span className="sm:hidden">{downloading ? 'Preparing…' : 'Download'}</span>
            <span className="hidden sm:inline">{downloading ? 'Preparing PDF…' : 'Download PDF'}</span>
          </button>
        </div>
      </header>

      {/* The two main containers run edge to edge with square corners. */}
      <main className="relative z-10 flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Form panel */}
        <aside
          aria-label="Cover letter details"
          className={`${view === 'edit' ? 'cl-pane-left flex' : 'hidden'} min-h-0 flex-1 flex-col bg-white/70 backdrop-blur-xl lg:flex lg:w-[28rem] lg:flex-none lg:border-r lg:border-slate-200/80 xl:w-[30rem]`}
        >
          <div className="pro-scroll flex-1 space-y-4 overflow-y-auto overscroll-contain p-3 pb-20 sm:space-y-5 sm:p-4 sm:pb-24 lg:pb-6">
            {fullName && usingAccountName && (
              <Notice role="status" tone="info" icon={<IconInfo className="h-3.5 w-3.5" />}>
                {`The letter uses the name on your account, ${fullName}.`}
              </Notice>
            )}

            {/* The job: where it comes from, and who the letter goes to */}
            <Group label="The job">
              {/* 1 · Job advert */}
              <Accordion id="cl-sec-job" step="1" title="Job advert" summary={jobSummary} open={open.job} onToggle={() => toggleSection('job')} busy={postingBusy}>
                <div className="space-y-4">
                  {letter.imported && (
                    <div className="flex items-start gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3">
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                        <IconCheck className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-emerald-700">Imported from your resume</p>
                        <p className="mt-0.5 break-words text-[13px] font-semibold leading-snug text-slate-900">{letter.imported.jobTitle || 'Your target job'}</p>
                        {letter.imported.company ? <p className="break-words text-[12px] leading-snug text-slate-600">{letter.imported.company}</p> : null}
                        <p className="mt-1 text-[11.5px] leading-snug text-slate-500">Change the job target on your resume and the letter follows.</p>
                      </div>
                    </div>
                  )}
                  {offerTarget && (
                    <Notice
                      tone="info"
                      icon={<IconInfo className="h-3.5 w-3.5" />}
                      action={
                        <button type="button" onClick={importTargetJob} className={navyPillClass}>
                          Use it
                        </button>
                      }
                    >
                      {`Use the job target on your resume: ${[targetJob.jobTitle, targetJob.company].filter(Boolean).join(' · ') || 'a target job'}?`}
                    </Notice>
                  )}

                  {/* Read another advert: by link, or by pasting its text */}
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-[12px] font-semibold text-slate-700 sm:text-[12.5px]">{letter.imported ? 'Use a different advert' : 'Read the advert'}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-medium text-slate-400">Optional</span>
                    </div>
                    <div className="mb-2.5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="radiogroup" aria-label="How to give the advert">
                      {[
                        { id: 'link', label: 'Link', on: !pasteOpen },
                        { id: 'text', label: 'Paste text', on: pasteOpen },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          role="radio"
                          aria-checked={m.on}
                          onClick={() => setPasteOpen(m.id === 'text')}
                          className={`h-8 rounded-lg text-[12.5px] font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/60 motion-reduce:transition-none ${
                            m.on ? 'bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.1),0_0_0_1px_rgba(15,23,42,0.04)]' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>

                    {!pasteOpen ? (
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <div className="relative min-w-0 flex-1">
                          <label htmlFor="cl-link" className="sr-only">
                            Link to the job you are applying for
                          </label>
                          <IconLink className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 sm:left-3.5 sm:h-4 sm:w-4" />
                          <input
                            id="cl-link"
                            type="text"
                            inputMode="url"
                            value={letter.jobUrl}
                            onChange={setJobUrl}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                readPosting();
                              }
                            }}
                            placeholder="Paste the link to the advert"
                            className={`${inputClass} pl-9 sm:pl-10`}
                            autoComplete="off"
                            autoCapitalize="none"
                            spellCheck={false}
                          />
                        </div>
                        <button type="button" onClick={readPosting} disabled={postingBusy} className={`${navyButtonClass} w-full sm:w-auto`}>
                          {postingBusy ? <IconSpinner className="h-4 w-4" /> : null}
                          {postingBusy ? 'Reading…' : 'Read advert'}
                        </button>
                      </div>
                    ) : (
                      <div id="cl-paste-box" className="space-y-2">
                        <label htmlFor="cl-paste" className="sr-only">
                          Job description
                        </label>
                        <textarea
                          id="cl-paste"
                          value={pasteText}
                          onChange={(e) => setPasteText(e.target.value.slice(0, 20000))}
                          rows={5}
                          placeholder="Paste the whole advert here, including the requirements."
                          className={textareaClass}
                        />
                        <button type="button" onClick={readPosting} disabled={postingBusy} className={`${navyButtonClass} w-full`}>
                          {postingBusy ? <IconSpinner className="h-4 w-4" /> : null}
                          {postingBusy ? 'Reading…' : 'Read advert'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div role="status" aria-live="polite" className="space-y-2 empty:hidden">
                    {postingBusy && (
                      <Notice tone="busy" icon={<IconSpinner className="h-3.5 w-3.5" />}>
                        Reading the advert. The first one can take up to a minute while the server wakes up.
                      </Notice>
                    )}

                    {!postingBusy && posting.state === 'error' && (
                      <Notice tone="warn" icon={<IconInfo className="h-3.5 w-3.5" />}>
                        {posting.message}
                      </Notice>
                    )}

                    {!postingBusy && posting.state === 'done' && posting.found && (
                      <Notice tone="ok" icon={<IconCheck className="h-3.5 w-3.5" />}>
                        {`Found ${posting.found.count} ${posting.found.count === 1 ? 'requirement' : 'requirements'}${posting.found.source === 'text' ? ' in the text you pasted' : ''}`}
                        {(() => {
                          const filled = [posting.found.title && 'position', posting.found.company && 'company', posting.found.address && 'address'].filter(Boolean);
                          return filled.length > 0 ? `, and filled in the ${joinList(filled)} in the next step. Check them before you send the letter.` : '. Check the details in the next step.';
                        })()}
                        {!posting.found.title && ' The advert does not state the position, so type it in the next step: the letter names it in its first sentence.'}
                        {!posting.found.address && ' The advert gives no address, so add one there if you want it on the letter.'}
                      </Notice>
                    )}
                  </div>

                  {letter.requirements.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h3 className="flex items-center gap-2 text-[12px] font-semibold text-slate-800 sm:text-[12.5px]">
                          The letter will answer these
                          <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10.5px] font-semibold text-white">{letter.requirements.length}</span>
                        </h3>
                        <button type="button" onClick={clearPosting} className={ghostPillClass}>
                          Clear
                        </button>
                      </div>
                      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
                        <ul className="divide-y divide-slate-100">
                          {(reqExpanded ? letter.requirements : letter.requirements.slice(0, REQ_PREVIEW)).map((item, i) => (
                            <li key={`${i}-${item}`} className="flex items-start gap-2.5 py-2 pl-3 pr-1.5 text-[12.5px] leading-snug text-slate-700">
                              <IconCheck className="mt-[3px] h-3.5 w-3.5 shrink-0 text-emerald-600" />
                              <span className="min-w-0 flex-1 break-words">{item}</span>
                              <button
                                type="button"
                                onClick={() => removeRequirement(i)}
                                aria-label={`Remove: ${item}`}
                                className="-my-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/60"
                              >
                                <IconClose className="h-3.5 w-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                        {letter.requirements.length > REQ_PREVIEW && (
                          <button
                            type="button"
                            onClick={() => setReqExpanded((v) => !v)}
                            aria-expanded={reqExpanded}
                            className="flex w-full items-center justify-center gap-1.5 border-t border-slate-100 bg-slate-50/70 py-2 text-[12px] font-semibold text-[#a64a30] transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#d9856b]/60"
                          >
                            {reqExpanded ? 'Show fewer' : `Show ${letter.requirements.length - REQ_PREVIEW} more`}
                            <IconChevron className={`h-3.5 w-3.5 transition-transform motion-reduce:transition-none ${reqExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Accordion>

              {/* 2 · Who is it for */}
              <Accordion id="cl-sec-who" step="2" title="Who is it for" summary={whoSummary} open={open.who} onToggle={() => toggleSection('who')} alert={positionNeeded}>
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-x-3 lg:grid-cols-1 xl:grid-cols-2">
                  <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
                    <Field id="cl-job" label="Position you are applying for" note={positionNeeded ? 'Needed for the letter' : ''}>
                      <input id="cl-job" type="text" value={letter.jobTitle} onChange={setField('jobTitle')} placeholder="e.g. Front-End Developer" className={inputClass} autoComplete="off" />
                    </Field>
                  </div>
                  <Field id="cl-company" label="Company">
                    <input id="cl-company" type="text" value={letter.company} onChange={setField('company')} placeholder="e.g. Takealot" className={inputClass} autoComplete="off" />
                  </Field>
                  <Field id="cl-manager" label="Hiring manager" optional>
                    <input id="cl-manager" type="text" value={letter.hiringManager} onChange={setField('hiringManager')} placeholder="e.g. Ms Dlamini" className={inputClass} autoComplete="off" />
                  </Field>
                  <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
                    <Field id="cl-address" label="Company address" optional>
                      <input id="cl-address" type="text" value={letter.companyAddress} onChange={setField('companyAddress')} placeholder="e.g. 12 Rivonia Road, Sandton" className={inputClass} autoComplete="off" />
                    </Field>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
                    <Field id="cl-date" label="Date">
                      <input id="cl-date" type="date" value={letter.dateOverride || todayIso()} onChange={setDate} className={inputClass} />
                    </Field>
                  </div>
                </div>
              </Accordion>
            </Group>

            {/* The letter: how it sounds, how it looks, what it says */}
            <Group label="The letter">
            {/* 3 · Tone */}
            <Accordion id="cl-sec-tone" step="3" title="Tone" summary={toneSummary} open={open.tone} onToggle={() => toggleSection('tone')}>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 sm:rounded-2xl" role="radiogroup" aria-label="Tone of the letter">
                {TONES.map((tone) => (
                  <button
                    key={tone.id}
                    type="button"
                    role="radio"
                    aria-checked={letter.tone === tone.id}
                    onClick={() => setLetter((prev) => ({ ...prev, tone: tone.id }))}
                    className={`h-8 rounded-lg text-[12.5px] font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/60 motion-reduce:transition-none sm:h-9 sm:rounded-xl sm:text-[13px] ${
                      letter.tone === tone.id ? 'bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.1),0_0_0_1px_rgba(15,23,42,0.04)]' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tone.label}
                  </button>
                ))}
              </div>
              <p className="mt-2.5 text-[11.5px] leading-relaxed text-slate-500 sm:text-[12px]">
                {letter.bodyEdited
                  ? 'You are using your own wording, so changing the tone no longer rewrites the letter. Use “Reset to draft” to start from a new draft.'
                  : letter.aiBody
                    ? 'The AI uses the tone the next time it writes the letter. Choose “Rewrite with AI” after changing it.'
                    : 'Changes the wording of the starter draft below.'}
              </p>
            </Accordion>

            {/* 4 · Design */}
            <Accordion id="cl-sec-design" step="4" title="Design" summary={designSummary} open={open.design} onToggle={() => toggleSection('design')}>
              <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Design of the letter">
                {TEMPLATES.map((design) => {
                  const selected = letter.template === design.id;
                  return (
                    <button
                      key={design.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setLetter((prev) => ({ ...prev, template: design.id }))}
                      className={`group rounded-xl p-2 text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/60 motion-reduce:transition-none ${
                        selected ? 'bg-[#d9856b]/10 ring-2 ring-[#d9856b]' : 'bg-slate-50 ring-1 ring-slate-200 hover:bg-slate-100 hover:ring-slate-300'
                      }`}
                    >
                      <DesignThumb id={design.id} accent={letterColor.accent} pastel={letterColor.pastel} />
                      <span className={`mt-2 block text-[12.5px] font-medium sm:text-[13px] ${selected ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-900'}`}>{design.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Colour: the resume's cream by default, modern light colours, or any colour of their own */}
              <div className="mt-5">
                <p className="mb-2 text-[12px] font-semibold text-slate-700 sm:text-[12.5px]">Colour</p>
                <div className="grid grid-cols-4 gap-2" role="group" aria-label="Colour of the letter">
                  {LETTER_COLORS.map((c) => {
                    const look = resolveLetterColor(c.id, accentColor);
                    const base = HEX_RE.test(look.accent || '') ? look.accent : '#1e3a8a';
                    const selected = letter.color === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        aria-pressed={selected}
                        aria-label={`${c.label} colour`}
                        onClick={() => setLetter((prev) => ({ ...prev, color: c.id }))}
                        className={`group flex flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/60 motion-reduce:transition-none ${
                          selected ? 'bg-[#d9856b]/10 ring-2 ring-[#d9856b]' : 'bg-slate-50 ring-1 ring-slate-200 hover:bg-slate-100 hover:ring-slate-300'
                        }`}
                      >
                        <span
                          className="grid h-8 w-8 place-items-center rounded-full"
                          style={{
                            background: rgbCss(look.pastel ? pastelTint(base) : creamTint(base)),
                            boxShadow: `inset 0 0 0 2px ${look.pastel ? base : 'rgba(120,105,80,0.45)'}`,
                            color: rgbCss(deepShade(base)),
                          }}
                        >
                          {selected && <IconCheck className="h-3.5 w-3.5" />}
                        </span>
                        <span className={`text-[11.5px] font-medium ${selected ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-900'}`}>{c.label}</span>
                      </button>
                    );
                  })}

                  {/* Any colour: the native colour picker sits invisibly over the round swatch. */}
                  {(() => {
                    const custom = HEX_RE.test(letter.color || '');
                    const base = custom ? letter.color : CUSTOM_START;
                    return (
                      <label
                        className={`group relative flex cursor-pointer flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 transition-all focus-within:ring-2 focus-within:ring-[#d9856b]/60 motion-reduce:transition-none ${
                          custom ? 'bg-[#d9856b]/10 ring-2 ring-[#d9856b]' : 'bg-slate-50 ring-1 ring-slate-200 hover:bg-slate-100 hover:ring-slate-300'
                        }`}
                      >
                        <span
                          className="grid h-8 w-8 place-items-center rounded-full"
                          style={
                            custom
                              ? { background: rgbCss(pastelTint(base)), boxShadow: `inset 0 0 0 2px ${base}`, color: rgbCss(deepShade(base)) }
                              : { background: 'conic-gradient(from 0deg, #f9a8a8, #fcd9a0, #bfe8b0, #a5dcf0, #c4b8f5, #f5b8dc, #f9a8a8)', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.9)' }
                          }
                        >
                          {custom ? <IconCheck className="h-3.5 w-3.5" /> : null}
                        </span>
                        <span className={`text-[11.5px] font-medium ${custom ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-900'}`}>Custom</span>
                        <input
                          type="color"
                          value={base}
                          onChange={(e) => {
                            const value = e.target.value.toLowerCase();
                            setLetter((prev) => ({ ...prev, color: value }));
                          }}
                          aria-label="Pick your own colour"
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        />
                      </label>
                    );
                  })()}
                </div>
              </div>
            </Accordion>

            {/* 5 · The letter */}
            <Accordion id="cl-sec-letter" step="5" title="Letter" summary={letterSummary} open={open.letter} onToggle={() => toggleSection('letter')} busy={writing}>
              {(confirm || letter.bodyEdited || ai.state !== 'blocked') && (
                <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
                  {confirm ? (
                    <>
                      <span className="mr-auto text-[12px] text-slate-600 sm:text-[12.5px]">{confirm === 'regen' ? 'Replace your edits?' : 'Discard your edits?'}</span>
                      <button
                        type="button"
                        onClick={confirm === 'regen' ? () => generate({ fresh: true }) : resetToDraft}
                        className="inline-flex h-8 items-center rounded-full bg-[#d9856b]/10 px-3 text-[12px] font-semibold text-[#a64a30] hover:bg-[#d9856b]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/60 sm:h-9"
                      >
                        {confirm === 'regen' ? 'Yes, rewrite' : 'Yes, reset'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirm('')}
                        className="inline-flex h-8 items-center rounded-full px-3 text-[12px] font-medium text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/60 sm:h-9"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      {letter.bodyEdited && (
                        <button type="button" onClick={() => setConfirm('reset')} disabled={writing} className={ghostPillClass}>
                          <IconRefresh className="h-3.5 w-3.5" />
                          Reset to draft
                        </button>
                      )}
                      {ai.state !== 'blocked' && (
                        <button type="button" onClick={rewrite} disabled={writing} className={aiButtonClass}>
                          <IconSparkle className={`h-3.5 w-3.5 ${writing ? 'animate-pulse' : ''}`} />
                          {writing ? 'Writing…' : letter.aiBody ? 'Rewrite with AI' : 'Write with AI'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* What the AI is doing, or why it is not */}
              <div role="status" aria-live="polite" className="empty:hidden">
                {writing && (
                  <Notice tone="busy" icon={<IconSpinner className="h-3.5 w-3.5" />} className="mb-3">
                    {letter.requirements.length > 0 ? 'Writing your letter from your resume and what the job asks for.' : 'Writing your letter from your resume.'} The first one can take up to a minute while the server wakes up.
                  </Notice>
                )}

                {!writing && ai.state === 'blocked' && (
                  <Notice
                    tone="info"
                    icon={<IconSparkle className="h-3.5 w-3.5" />}
                    className="mb-3"
                    action={
                      <button type="button" onClick={ai.code === 'signin' ? requestSignIn : requestUpgrade} className={navyPillClass}>
                        {ai.code === 'signin' ? 'Sign in' : 'Upgrade'}
                      </button>
                    }
                  >
                    {ai.code === 'signin'
                      ? 'Sign in to have AI write this letter from your resume. Until then, here is a starter draft you can edit.'
                      : 'AI-written letters are a Premium feature. Here is a starter draft you can edit.'}
                  </Notice>
                )}

                {!writing && ai.state === 'error' && (
                  <Notice
                    tone="warn"
                    icon={<IconInfo className="h-3.5 w-3.5" />}
                    className="mb-3"
                    action={
                      ai.code !== 'empty' ? (
                        <button
                          type="button"
                          onClick={() => generate({ fresh: true })}
                          className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-amber-900 ring-1 ring-amber-300 transition-colors hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 sm:px-3.5 sm:py-1.5"
                        >
                          {ai.code === 'position' ? 'Write letter' : 'Try again'}
                        </button>
                      ) : null
                    }
                  >
                    {aiErrorText}
                  </Notice>
                )}

                {!writing && !postingBusy && ai.state === 'idle' && !letter.aiBody && !letter.bodyEdited && (
                  <Notice tone="info" icon={<IconInfo className="h-3.5 w-3.5" />} className="mb-3">
                    Add a job advert in step 1 for a letter that answers what the job asks for, or choose “Write with AI” for a general one. Until then, this is a starter draft.
                  </Notice>
                )}

                {!writing && ownUnlistedClaims.length > 0 && (
                  <Notice tone="warn" icon={<IconInfo className="h-3.5 w-3.5" />} className="mb-3">
                    Your letter names a qualification your resume does not list ({joinList(ownUnlistedClaims.map((q) => `“${q}”`))}). Employers check these with the school, so remove it from the letter, or add it under Education or Certificates first if you hold it.
                  </Notice>
                )}
              </div>

              <label htmlFor="cl-body" className="sr-only">
                Letter text
              </label>
              <textarea
                id="cl-body"
                value={body}
                onChange={setBody}
                readOnly={writing}
                aria-busy={writing}
                rows={10}
                spellCheck
                className={`${textareaClass} min-h-[11rem] sm:min-h-[16rem] ${writing ? 'opacity-60' : ''}`}
              />
              <div className="mt-2 flex items-center justify-between gap-3 text-[11.5px] font-medium text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <IconEdit className="h-3.5 w-3.5" />
                  {`${wordCount} ${wordCount === 1 ? 'word' : 'words'}`}
                </span>
                {pageCount > 0 && <span>{`${pageCount} ${pageCount === 1 ? 'page' : 'pages'}`}</span>}
              </div>
            </Accordion>

            </Group>

            <Group label="Finish">
            {/* 6 · Signature */}
            <Accordion id="cl-sec-sign" step="6" title="Signature" summary={signatureSummary} open={open.sign} onToggle={() => toggleSection('sign')} busy={signatureBusy}>
              {letter.signature ? (
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <img src={letter.signature.dataUrl} alt="Your signature" className="h-12 min-w-0 max-w-[55%] object-contain object-left" draggable={false} />
                  <span className="flex-1" />
                  <button type="button" onClick={removeSignature} className={ghostPillClass}>
                    Remove
                  </button>
                </div>
              ) : (
                <p className="text-[12px] leading-snug text-slate-500 sm:text-[12.5px]">Your signature goes above your typed name. It stays on this device and is only used in the PDF you download.</p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setSigning(true)} className={navyButtonClass}>
                  <IconPen className="h-4 w-4" />
                  {letter.signature ? 'Draw again' : 'Draw signature'}
                </button>
                <button type="button" onClick={() => signatureFileRef.current?.click()} disabled={signatureBusy} className={outlineButtonClass}>
                  {signatureBusy ? <IconSpinner className="h-4 w-4" /> : <IconUpload className="h-4 w-4" />}
                  Upload a picture
                </button>
                <input ref={signatureFileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onSignatureFile} className="sr-only" tabIndex={-1} aria-label="Upload a picture of your signature" />
              </div>
              <p className="mt-2 text-[11.5px] leading-snug text-slate-400">For a picture, sign on plain white paper in good light. The paper is removed for you.</p>
              {signatureError && (
                <p role="alert" className="mt-2 text-[12px] leading-snug text-red-600">
                  {signatureError}
                </p>
              )}
            </Accordion>
            </Group>

            {prepared?.lost && (
              <Notice role="status" tone="info" icon={<IconInfo className="h-3.5 w-3.5" />}>
                Some characters, such as emoji, can’t be used in a PDF letter and are left out.
              </Notice>
            )}

            {premium !== true && (
              <p className="px-1 text-[11.5px] leading-relaxed text-slate-500 sm:text-[12px]">
                Free downloads carry a small “Created with RemoPDF” line at the bottom of each page. Premium removes it.
              </p>
            )}
          </div>
        </aside>

        {/* Preview stage */}
        <section
          aria-label="Cover letter preview"
          className={`${view === 'preview' ? 'cl-pane-right block' : 'hidden'} relative min-h-0 flex-1 overflow-hidden lg:block`}
          style={{
            backgroundColor: '#efede9',
            backgroundImage: 'radial-gradient(rgba(15,23,42,0.09) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        >
          <div ref={previewRef} className="pro-scroll absolute inset-0 overflow-y-auto overscroll-contain px-3 pb-20 pt-3 sm:px-8 sm:pb-24 sm:pt-8 lg:pb-10">
            {layout ? (
              layout.pages.map((page, i) => <PreviewPage key={i} page={page} scale={scale} index={i} total={layout.pages.length} />)
            ) : (
              <p className="py-20 text-center text-[13px] text-slate-400">{error || 'Preparing preview…'}</p>
            )}
          </div>
        </section>
      </main>

      {/* Small screens: a floating switch between the form and the preview */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 flex justify-center lg:hidden">
        <div
          className="cl-dock pointer-events-auto relative grid grid-cols-2 gap-0.5 rounded-full bg-slate-900/90 p-0.5 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.55)] ring-1 ring-white/10 backdrop-blur-xl"
          role="tablist"
          aria-label="Cover letter views"
        >
          {/* The white pill slides to the chosen tab */}
          <span
            aria-hidden="true"
            className="cl-thumb pointer-events-none absolute bottom-0.5 left-0.5 top-0.5 w-[calc((100%-0.375rem)/2)] rounded-full bg-white shadow-sm"
            style={{ transform: view === 'preview' ? 'translateX(calc(100% + 0.125rem))' : 'translateX(0)' }}
          />
          {[
            ['edit', 'Edit', IconEdit, 'cl-icon-edit'],
            ['preview', 'Preview', IconEye, 'cl-icon-eye'],
          ].map(([id, label, Icon, motion]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => setView(id)}
              className={`relative z-10 inline-flex h-8 min-w-[5.25rem] items-center justify-center gap-1.5 rounded-full px-4 text-[12px] font-semibold transition-[color,transform] duration-300 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/80 motion-reduce:transition-none ${
                view === id ? 'text-slate-900' : 'text-white/70 hover:text-white'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${view === id ? motion : ''}`} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* A failed download shows as a small message at the bottom of the page. */}
      {error && layout && (
        <div className="pointer-events-none absolute inset-x-0 bottom-16 z-40 flex justify-center px-4 lg:bottom-6">
          <div role="alert" className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-red-200 bg-white py-2.5 pl-3.5 pr-2.5 text-[13px] text-slate-800 shadow-[0_16px_40px_-16px_rgba(185,28,28,0.35)]">
            <span aria-hidden="true" className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-red-100 text-red-600">
              <IconInfo className="h-3.5 w-3.5" />
            </span>
            <p className="min-w-0 flex-1 leading-snug">{error}</p>
            <button
              type="button"
              onClick={() => setError('')}
              className="rounded-full px-3 py-2 text-[12px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/60"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {signing && <SignatureDialog onSave={saveSignature} onClose={() => setSigning(false)} />}
    </div>
  );
}
