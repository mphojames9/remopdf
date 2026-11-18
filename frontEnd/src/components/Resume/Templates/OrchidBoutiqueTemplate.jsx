import React from 'react';
import { parseBlocks, renderInline } from '../Sections/richText';
import ResumePhoto from '../Sections/ResumePhoto';
import { languageLevelInfo } from '../Sections/LanguageLevelSelect';
import { formatRange } from '../Sections/dateFormat';
import {
  PAGE_WIDTH_PX,
  PAGE_HEIGHT_PX,
  tint,
  jobDates,
  skillRating,
  DEFAULT_ACCENT,
  usePaginatedBlocks,
  A4Page,
  padLast,
  editAttrs,
  markSection,
} from './templateShared';

/**
 * Velvet (id: velvet). A deep burgundy sidebar with rose accents beside a cream main column. The name,
 * the "About Me" summary, contact lines, languages and interests live in the sidebar; experience, education,
 * skills (with percentage bars), projects, certifications and references live in the main column, where one
 * thin timeline runs down the whole section with a date column beside it.
 *
 *   sidebar  round photo with a soft glow, name + profession, Contact, About Me, Languages, Interests (see CONTACT_FIRST)
 *   main     Experience, Education, Skills, Projects, Certifications, References (in the user's order)
 *
 * Colours: with the default accent the page uses the original burgundy / rose / cream palette exactly. When the
 * user picks another accent, a matching palette is derived from it (sidebar background, rose highlights,
 * company names, bars), so the page re-themes and stays readable.
 *
 * Both columns are paginated on their own with usePaginatedBlocks and the page count is whichever needs
 * more. Everything inside a column is a FLAT list of plain elements (no section wrappers). The timeline is drawn
 * per element (border-left), and the gaps between entries are padding rather than margin, so the line stays
 * unbroken inside a section, also across a page break.
 *
 * Register: id 'velvet' in Templates/index.js, DEFAULT_ACCENT (#D49A9C), TEMPLATE_CARDS in TemplateThumbs.jsx
 * and in TemplateShowcase.jsx. A missing accent key falls back to BASE_ACCENT.
 */

/* ------------------------------ Design tokens ------------------------------ */
const FONT = `ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`;
const SERIF = `ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif`;
const BASE_ACCENT = '#D49A9C'; // the rose

// The original palette.
const BASE_PALETTE = {
  sideBg: '#33111A', ink: '#33111A',
  rose: '#D49A9C', roseMid: '#B5737A', roseDeep: '#A66269',
  muted: '#B89C9F', track: '#E5D5D7',
  sideHead: '#F5EBEB', sideText: '#E5D5D7',
  cream: '#FDFBF7', body: '#594A4D', inkBody: '#2B2224',
};

const alpha = (hex, a) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

const luminance = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return 0.5;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// tint(hex, +x) mixes with white, tint(hex, -x) mixes with black.
const buildPalette = (accent) => {
  if (!accent || String(accent).toLowerCase() === BASE_ACCENT.toLowerCase()) return BASE_PALETTE;
  const dark = luminance(accent) < 0.3;
  return {
    ...BASE_PALETTE,
    sideBg: tint(accent, -0.8), ink: tint(accent, -0.8),
    rose: dark ? tint(accent, 0.55) : accent, // the highlight colour on the dark sidebar
    roseMid: luminance(accent) < 0.5 ? accent : tint(accent, -0.2),
    roseDeep: tint(accent, -0.25),
    muted: tint(accent, 0.5), track: tint(accent, 0.85),
  };
};

// Geometry (px). The hidden measuring boxes must be exactly as wide as the real column bodies.
const SIDEBAR_W = 278; // 35% of the A4 width
const SIDE_PAD_X = 40;
const SIDE_PAD_TOP = 48;
const SIDE_PAD_BOTTOM = 32;
const SIDE_CONTENT_W = SIDEBAR_W - SIDE_PAD_X * 2 - 1; // 1px right border
const MAIN_W = PAGE_WIDTH_PX - SIDEBAR_W;
const MAIN_PAD_X = 48;
const MAIN_PAD_TOP = 48;
const MAIN_PAD_BOTTOM = 32; // the paginator keeps a further 48px clear above it for the page number
const MAIN_CONTENT_W = MAIN_W - MAIN_PAD_X * 2;
const SIDE_MAX_HEIGHT = PAGE_HEIGHT_PX - SIDE_PAD_TOP - SIDE_PAD_BOTTOM; // pages 2+
const MAIN_MAX_HEIGHT = PAGE_HEIGHT_PX - MAIN_PAD_TOP - MAIN_PAD_BOTTOM; // pages 2+
const TIMELINE_INDENT = 12; // ml-3: the line is inset from the column edge
const DATE_COL = 120;

// Sections that live in the sidebar. Everything else goes in the main column.
const SIDEBAR_KEYS = ['summary', 'languages', 'hobbies'];

// The original puts "About Me" above "Contact". With the photo and name above them, a normal-length summary pushes
// the contact lines off page 1, and contact details belong on the first page of a CV. So Contact comes first here.
// Set to false to restore the original order (About Me, then Contact).
const CONTACT_FIRST = true;

/* ------------------------------ Contact lines ------------------------------ */
// The builder hands over one flat list of strings. Personal details ("Born: ...", "Nationality: ...")
// are shown as plain contact lines here (this design has no separate details block).
const MAIL_HOST = /^(?!www\.)[^\s@/]+(gmail|googlemail|yahoo|outlook|hotmail|live|icloud|proton|protonmail)\.(com|me|co\.za|co\.uk)$/;

const contactKind = (raw) => {
  const s = String(raw).trim().toLowerCase();
  const m = s.match(/^([a-z][a-z .\/&-]{1,28}):(?!\/\/)\s*/); // a leading "Label:" (not the "https:" of a URL)
  const label = m ? m[1] : '';
  const value = m ? s.slice(m[0].length) : s;

  if (s.includes('linkedin')) return 'linkedin';
  if (s.includes('github')) return 'github';
  if (/^(born|date of birth|dob)\b/.test(label)) return 'calendar';
  if (/^(nationality|citizenship|gender|sex|marital status|civil status)\b/.test(label) || /^driver'?s?\s+licen[cs]e/.test(s) || /^driving\s+licen[cs]e/.test(s)) return 'person';
  if (value.includes('@') || /e-?mail/.test(label) || MAIL_HOST.test(value)) return 'mail';
  if (/^(tel|telephone|phone|mobile|cell|whatsapp|fax)\b/.test(label) || /^[+()\d\s.-]{7,}$/.test(value)) return 'phone';
  if (/web|site|portfolio|url|link/.test(label) || /(https?:\/\/|www\.|\.(com|dev|io|net|org|me|site|co|app)\b)/.test(value)) return 'globe';
  if (/address|location|city|based|residen/.test(label)
    || /\d+\s+.*\b(street|st|road|rd|avenue|ave|drive|dr|lane|ln|blvd|boulevard|close|crescent|way)\b/.test(value)
    || /\bp\.?o\.?\s*box\b/.test(value)
    || value.includes(',')) return 'pin';
  return 'dot';
};

// A resume has one location: only the first address-like line gets the pin. If nothing looked like an
// address, the first unrecognised line is the most likely one. Every other unknown line gets a neutral dot.
const resolveContactKinds = (lines) => {
  const kinds = lines.map(contactKind);
  let pinSeen = false;
  const out = kinds.map((k) => {
    if (k !== 'pin') return k;
    if (pinSeen) return 'dot';
    pinSeen = true;
    return 'pin';
  });
  if (!pinSeen) {
    const i = out.indexOf('dot');
    if (i >= 0) out[i] = 'pin';
  }
  return out;
};

const ICON_PATHS = {
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  pin: <><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
  linkedin: <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 11v6M8 7.5v.01M12 17v-6M12 13.5a2.5 2.5 0 0 1 5 0V17" /></>,
  github: <><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  person: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  dot: <circle cx="12" cy="12" r="3" />,
};

// Icon inside a small round badge, as in the original sidebar.
// "linkedin.com/in/name" may break after a slash (a <wbr> adds no characters to the text).
const breakAfterSlashes = (text) => {
  const parts = String(text).split('/');
  if (parts.length === 1) return text;
  return parts.map((part, i) => (
    <React.Fragment key={i}>{part}{i < parts.length - 1 ? <>/<wbr /></> : null}</React.Fragment>
  ));
};

const ContactBadge = ({ name, rose }) => (
  <span
    className="flex shrink-0 items-center justify-center rounded-full"
    style={{ width: 28, height: 28, border: `1px solid ${alpha(rose, 0.4)}`, backgroundColor: alpha(rose, 0.1) }}
    aria-hidden="true"
  >
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={rose} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {ICON_PATHS[name] || ICON_PATHS.dot}
    </svg>
  </span>
);

// Icons in the square before each main heading.
const HEADING_ICONS = {
  experience: { size: 14, path: <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /> },
  education: { size: 12, path: <><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></> },
  skills: { size: 12, path: <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /> },
  projects: { size: 14, path: <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /> },
  certificates: { size: 14, path: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /> },
  references: { size: 12, path: <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /> },
};

/* -------------------------------- Template -------------------------------- */
const VelvetTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, certificates, isEmpty, sectionOrder, edit } = props;
  const accent = props.accentColor || DEFAULT_ACCENT.velvet || BASE_ACCENT;
  const C = buildPalette(accent);

  /* ----------------------------- Sidebar helpers ---------------------------- */
  const sideHeading = (key, text) => (
    <h3
      key={`${key}-h`}
      className="flex items-center gap-3 text-[11px] font-bold uppercase mb-5"
      style={{ color: C.sideHead, letterSpacing: '0.3em' }}
    >
      <span aria-hidden="true" className="shrink-0 rounded-full" style={{ width: 6, height: 6, backgroundColor: C.rose }} />
      <span>{text}</span>
    </h3>
  );

  // Sidebar rich text: a bullet line gets a small rose dot, a plain line stays a paragraph.
  const sideBlocks = (text, keyPrefix, extra = {}) => parseBlocks(text).map((block, i) => {
    const key = `${keyPrefix}-${i}`;
    const style = { fontSize: 13, lineHeight: 1.9, fontWeight: 300, color: C.sideText, ...extra };
    return block.bullet ? (
      <div key={key} className="flex items-start gap-4 mb-2" style={style}>
        <span aria-hidden="true" className="shrink-0 rounded-full" style={{ width: 4, height: 4, marginTop: 12, backgroundColor: alpha(C.rose, 0.7) }} />
        <span className="min-w-0 break-words">{renderInline(block.text, key)}</span>
      </div>
    ) : (
      <p key={key} className="mb-2 break-words" style={style}>{renderInline(block.text, key)}</p>
    );
  });

  /* ----------------------------- SIDEBAR sections --------------------------- */
  const languageItems = (languages?.items || []).filter((l) => l.name);
  const hobbyBlocks = hobbies?.enabled && hobbies.text ? parseBlocks(hobbies.text) : [];

  const allLines = (contactList || []).filter((c) => typeof c === 'string' && c.trim());
  const contactKinds = resolveContactKinds(allLines);

  const sideMap = {
    summary: summary && parseBlocks(summary).length > 0 ? padLast([
      sideHeading('summary', 'About Me'),
      ...sideBlocks(summary, 'summary', { textAlign: 'justify' }),
    ], 'mb-7') : [],

    languages: languages?.enabled && languageItems.length > 0 ? padLast([
      sideHeading('languages', 'Languages'),
      ...languageItems.map((l) => {
        const { label } = languageLevelInfo(l);
        return (
          <div key={`language-${l.id}`} className="flex justify-between items-baseline gap-2 mb-5">
            <span className="font-medium break-words" style={{ fontSize: 12, color: C.sideHead, letterSpacing: '0.025em' }}>{l.name}</span>
            <span className="shrink-0 uppercase" style={{ fontSize: 10, color: C.muted, letterSpacing: '0.1em' }}>{label}</span>
          </div>
        );
      }),
    ], 'mb-7') : [],

    hobbies: hobbyBlocks.length > 0 ? padLast([
      sideHeading('hobbies', 'Interests'),
      ...hobbyBlocks.map((block, i) => (
        <div key={`hobby-${i}`} className="flex items-start gap-4 mb-5" style={{ fontSize: 12, fontWeight: 300, color: C.sideText, letterSpacing: '0.025em', lineHeight: 1.5 }}>
          <span aria-hidden="true" className="shrink-0 rounded-full" style={{ width: 4, height: 4, marginTop: 7, backgroundColor: alpha(C.rose, 0.7) }} />
          <span className="min-w-0 break-words">{renderInline(block.text, `hobby-${i}`)}</span>
        </div>
      )),
    ], 'mb-7') : [],
  };

  // Contact is one element, so the short list never splits across two pages.
  const contactBlocks = allLines.length > 0 ? markSection(edit, 'personal', [
    <div key="contact-block" className="mb-7">
      {sideHeading('contact', 'Contact')}
      {allLines.map((line, i) => (
        <div key={`contact-${i}`} className={`flex items-center gap-4${i < allLines.length - 1 ? ' mb-5' : ''}`} style={{ fontSize: 12 }}>
          <ContactBadge name={contactKinds[i]} rose={C.rose} />
          <span className="min-w-0 break-words" style={{ fontWeight: 300, letterSpacing: '0.025em', color: C.sideText, lineHeight: 1.45 }}>{breakAfterSlashes(line)}</span>
        </div>
      ))}
    </div>,
  ], false) : [];

  const sideOrder = (sectionOrder || []).filter((key) => SIDEBAR_KEYS.includes(key));
  const sideAtoms = [];
  let contactPlaced = false;
  if (CONTACT_FIRST) { sideAtoms.push(...contactBlocks); contactPlaced = true; }
  sideOrder.forEach((key) => {
    sideAtoms.push(...markSection(edit, key, sideMap[key] || []));
    if (!contactPlaced && key === 'summary') { sideAtoms.push(...contactBlocks); contactPlaced = true; }
  });
  if (!contactPlaced) sideAtoms.unshift(...contactBlocks);

  /* ------------------------------ MAIN helpers ------------------------------ */
  const mainHeading = (key, text) => {
    const icon = HEADING_ICONS[key];
    return (
      <h3
        key={`${key}-h`}
        className="flex items-center gap-3 text-[12px] font-bold uppercase mb-4"
        style={{ color: C.ink, letterSpacing: '0.3em' }}
      >
        <span
          aria-hidden="true"
          className="flex shrink-0 items-center justify-center rounded-sm"
          style={{ width: 24, height: 24, border: `1px solid ${alpha(C.rose, 0.6)}`, backgroundColor: alpha(C.rose, 0.1) }}
        >
          <svg viewBox="0 0 24 24" width={icon.size} height={icon.size} fill="none" stroke={C.roseMid} strokeWidth="2">{icon.path}</svg>
        </span>
        <span>{text}</span>
      </h3>
    );
  };

  // One element of the timeline. Every element draws its own piece of the vertical line (border-left), so the line
  // is continuous down the section, also across a page break. `dot`: 'solid' | 'hollow' | null (first row of an
  // entry). `keepWithNext` makes it an <h3>, which the paginator never leaves alone at the bottom of a page.
  const timelineRow = (key, { date, content, dot, pt = 0, pb = 8, keepWithNext = false }) => {
    const Tag = keepWithNext ? 'h3' : 'div';
    return (
      <Tag
        key={key}
        className="relative flex border-l pl-6 text-left"
        style={{ marginLeft: TIMELINE_INDENT, borderColor: alpha(C.rose, 0.4), paddingTop: pt, paddingBottom: pb, fontWeight: 'normal' }}
      >
        {dot && (
          <span
            aria-hidden="true"
            className="absolute rounded-full"
            style={dot === 'solid'
              ? { width: 10, height: 10, left: -5, top: 14, backgroundColor: C.rose, boxShadow: `0 0 6px ${alpha(C.rose, 0.5)}` }
              : { width: 10, height: 10, left: -5, top: 14, backgroundColor: C.cream, border: `2px solid ${C.rose}` }}
          />
        )}
        <div className="shrink-0 font-medium" style={{ width: DATE_COL, paddingRight: 8, fontSize: 12, lineHeight: 1.5, color: C.roseMid, letterSpacing: '0.05em' }}>
          {date || null}
        </div>
        <div className="min-w-0 flex-1">{content}</div>
      </Tag>
    );
  };

  const detailLine = (block, key) => (
    <div className="flex items-start gap-3" style={{ fontSize: 13, lineHeight: 1.8, fontWeight: 300, color: C.body }}>
      {block.bullet && <span aria-hidden="true" className="shrink-0" style={{ width: 6, height: 6, marginTop: 9, backgroundColor: C.rose, transform: 'rotate(45deg)' }} />}
      <span className="min-w-0 break-words">{renderInline(block.text, key)}</span>
    </div>
  );

  // rows: [{ date?, content, pb?, head? }]. The first row carries the dot and the top padding; the last row carries
  // the 16px that continues the line before the next entry. Rows marked `head` stay with the row that follows them.
  const entry = (id, dot, rows) => {
    const list = rows.filter(Boolean);
    return list.map((row, i) => timelineRow(`${id}-${i}`, {
      date: row.date,
      content: row.content,
      dot: i === 0 ? dot : null,
      pt: i === 0 ? 8 : 0,
      pb: i === list.length - 1 ? 16 : (row.pb ?? 8),
      keepWithNext: Boolean(row.head) && i < list.length - 1,
    }));
  };

  const title = (text) => (
    <p className="break-words font-bold" style={{ fontSize: 15, color: C.ink, letterSpacing: '0.025em', lineHeight: 1.4 }}>{text}</p>
  );
  const subline = (primary, place) => (
    <p className="break-words font-medium" style={{ fontSize: 13, color: C.roseDeep, lineHeight: 1.5 }}>
      {primary}
      {place && <span className="font-light" style={{ color: C.muted, marginLeft: primary ? 4 : 0 }}>{primary ? '• ' : ''}{place}</span>}
    </p>
  );
  const bodyRows = (text, keyPrefix) => parseBlocks(text).map((block, i) => ({ content: detailLine(block, `${keyPrefix}-${i}`), pb: 8 }));

  /* ------------------------------ MAIN sections ----------------------------- */
  const projectItems = (projects?.items || []).filter((p) => p.title || p.description);
  const certificateItems = (certificates?.items || []).filter((c) => c.name || c.issuer);
  const referenceItems = (references?.items || []).filter((r) => r.name);
  const skillItems = namedSkills.map((s) => ({ id: s.id, text: s.text, rating: skillRating(s) }));

  // The last element of a section carries the gap before the next heading (outside the timeline).
  const closeSection = (nodes) => padLast(nodes, 'mb-4');

  const mainMap = {
    experience: jobs.length > 0 ? closeSection([
      mainHeading('experience', 'Experience'),
      ...jobs.flatMap((job) => {
        const id = `job-${job.id}`;
        const place = [job.location, job.remote ? 'Remote' : ''].filter(Boolean).join(' · ');
        const head = job.title || job.employer;
        const sub = job.title ? job.employer : '';
        return entry(id, 'solid', [
          { date: jobDates(job), content: title(head), pb: 4, head: true },
          (sub || place) && { content: subline(sub, place), pb: 8, head: true },
          ...bodyRows(job.achievements, `${id}-ach`),
        ]);
      }),
    ]) : [],

    education: educations.length > 0 ? closeSection([
      mainHeading('education', 'Education'),
      ...educations.flatMap((ed) => {
        const id = `education-${ed.id}`;
        const degree = [ed.degree, ed.field].filter(Boolean).join(', ') || ed.institution;
        const school = degree === ed.institution ? '' : ed.institution;
        return entry(id, 'hollow', [
          { date: ed.date, content: title(degree), pb: 4, head: true },
          (school || ed.location) && { content: subline(school, ed.location), pb: 8, head: true },
          ...bodyRows(ed.achievements, `${id}-ach`),
        ]);
      }),
    ]) : [],

    skills: skillItems.length > 0 ? closeSection([
      mainHeading('skills', 'Skills'),
      ...skillItems.map((s, i) => {
        const pct = s.rating > 0 ? Math.round((s.rating / 5) * 100) : 0;
        const last = i === skillItems.length - 1;
        return (
          <div
            key={`skill-${s.id}`}
            className="relative flex items-center border-l pl-6"
            style={{ marginLeft: TIMELINE_INDENT, borderColor: alpha(C.rose, 0.4), paddingBottom: last ? 24 : 16 }}
          >
            <div className="shrink-0 break-words font-medium" style={{ width: 180, fontSize: 13, color: C.inkBody, letterSpacing: '0.025em', lineHeight: 1.4, paddingRight: 8 }}>{s.text}</div>
            {pct > 0 && (
              <div className="flex min-w-0 flex-1 items-center gap-4" style={{ paddingRight: 40 }}>
                <div className="relative flex-1 overflow-hidden rounded" style={{ height: 3, backgroundColor: C.track }}>
                  <div
                    className="absolute left-0 top-0"
                    style={{ height: '100%', width: `${pct}%`, backgroundImage: `linear-gradient(to right, ${alpha(C.rose, 0.7)}, ${C.roseMid})` }}
                  />
                </div>
                <span className="text-right font-medium" style={{ width: 32, fontSize: 11, color: C.muted }}>{pct}%</span>
              </div>
            )}
          </div>
        );
      }),
    ]) : [],
  };

  const mainExtras = {
    projects: projects?.enabled && projectItems.length > 0 ? closeSection([
      mainHeading('projects', 'Projects'),
      ...projectItems.flatMap((p) => {
        const id = `project-${p.id}`;
        return entry(id, 'hollow', [
          { date: 'Project', content: title(p.title || 'Project'), pb: 4, head: true },
          p.link && { content: <p className="break-all" style={{ fontSize: 12, color: C.muted }}>{p.link}</p>, pb: 8, head: true },
          ...bodyRows(p.description, `${id}-desc`),
        ]);
      }),
    ]) : [],

    certificates: certificates?.enabled && certificateItems.length > 0 ? closeSection([
      mainHeading('certificates', 'Certifications'),
      ...certificateItems.flatMap((c) => {
        const id = `certificate-${c.id}`;
        return entry(id, 'hollow', [
          { date: c.date ? formatRange(c.date) : 'Certification', content: title(c.name || c.issuer), pb: 4, head: true },
          c.name && c.issuer && { content: subline(c.issuer, ''), pb: 4, head: true },
          c.link && { content: <p className="break-all" style={{ fontSize: 12, color: C.muted }}>{c.link}</p>, pb: 4, head: true },
          ...bodyRows(c.description, `${id}-desc`),
        ]);
      }),
    ]) : [],

    references: references?.enabled && (references.availableUponRequest || referenceItems.length > 0) ? closeSection([
      mainHeading('references', 'References'),
      ...(references.availableUponRequest
        ? entry('references-note', 'hollow', [{ date: 'Reference', content: <p style={{ fontSize: 13, fontWeight: 300, color: C.body }}>Available upon request.</p> }])
        : referenceItems.flatMap((r) => entry(`reference-${r.id}`, 'hollow', [
          { date: 'Reference', content: title(r.name), pb: 4, head: true },
          r.relationship && { content: subline(r.relationship, ''), pb: 4, head: true },
          r.contact && { content: <p className="break-all" style={{ fontSize: 13, fontWeight: 300, color: C.body }}>{r.contact}</p>, pb: 4 },
        ]))),
    ]) : [],
  };

  const mainOrder = (sectionOrder || []).filter((key) => !SIDEBAR_KEYS.includes(key));
  const mainAtoms = mainOrder.flatMap((key) => markSection(edit, key, mainMap[key] || mainExtras[key] || []));

  /* ------------------------------ Sidebar head ------------------------------ */
  // Page 1 only: photo, name and profession. This block is not paginated; the sections below it use whatever
  // height is left on page 1 (firstBodyRef), then continue on the next pages.
  const hasPhoto = Boolean(personal && personal.photo);
  const name = (fullName || 'Your Name').trim();
  const words = name.split(/\s+/);
  const longest = Math.max(...words.map((w) => w.length));
  const nameSize = longest <= 7 ? 28 : longest <= 9 ? 24 : longest <= 12 ? 20 : 17;
  const professionParts = ((personal && personal.profession) || '').split('|').map((p) => p.trim()).filter(Boolean);

  /* ------------------------------ Pagination ------------------------------- */
  const main = usePaginatedBlocks(mainAtoms, MAIN_MAX_HEIGHT);
  const side = usePaginatedBlocks(sideAtoms, SIDE_MAX_HEIGHT);
  const pageCount = Math.max(1, main.pages.length, side.pages.length);

  return (
    <>
      {/* Hidden copies of every element, one box per column, as wide as the real column body. */}
      <div
        ref={main.measureContainerRef}
        className="absolute pointer-events-none"
        style={{ top: -9999, left: -9999, width: MAIN_CONTENT_W, fontFamily: FONT }}
      >
        {main.measureContent}
      </div>
      <div
        ref={side.measureContainerRef}
        className="absolute pointer-events-none"
        style={{ top: -9999, left: -9999, width: SIDE_CONTENT_W, fontFamily: FONT }}
      >
        {side.measureContent}
      </div>

      {Array.from({ length: pageCount }, (_, index) => (
        <A4Page key={index} pageNum={index + 1} totalPages={pageCount}>
          <div
            className="relative flex w-full h-full text-left"
            style={{ fontFamily: FONT, color: C.inkBody, backgroundColor: C.cream, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
          >
            {/* ------------------------------ Sidebar ------------------------------ */}
            <div
              className="relative shrink-0 h-full flex flex-col"
              style={{
                width: SIDEBAR_W,
                padding: `${SIDE_PAD_TOP}px ${SIDE_PAD_X}px ${SIDE_PAD_BOTTOM}px`,
                backgroundColor: C.sideBg,
                borderRight: `1px solid ${alpha(C.rose, 0.2)}`,
                color: C.sideText,
              }}
            >
              {index === 0 && (
                <div {...editAttrs(edit, 'personal')} className="shrink-0 text-center" style={{ marginBottom: sideAtoms.length > 0 ? 36 : 0 }}>
                  {hasPhoto && (
                    <div className="flex justify-center" style={{ marginBottom: 36 }}>
                      <div className="relative" style={{ width: 192, height: 192 }}>
                        <div
                          aria-hidden="true"
                          className="absolute"
                          style={{ inset: -16, backgroundImage: `radial-gradient(circle closest-side at 50% 50%, ${alpha(C.rose, 0.18)} 0%, ${alpha(C.rose, 0)} 100%)` }}
                        />
                        <div
                          className="relative w-full h-full overflow-hidden rounded-full"
                          style={{ padding: 4, border: `2px solid ${alpha(C.rose, 0.4)}` }}
                        >
                          <div className="w-full h-full overflow-hidden rounded-full" style={{ backgroundColor: C.sideBg, filter: 'grayscale(0.1) sepia(0.2)' }}>
                            <ResumePhoto src={personal.photo} style={{ ...(personal.photoStyle || {}), shape: 'circle', border: 'none' }} sizePx={180} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <h1
                    className="uppercase"
                    style={{ fontFamily: SERIF, fontSize: nameSize, lineHeight: 1.25, letterSpacing: '0.1em', fontWeight: 300, color: C.sideHead, marginBottom: professionParts.length ? 20 : 0, overflowWrap: 'anywhere' }}
                  >
                    {words.map((word, i) => (
                      <span key={i} style={i === words.length - 1 && words.length > 1 ? { color: C.rose, fontWeight: 500 } : undefined}>
                        {word}{i < words.length - 1 ? ' ' : ''}
                      </span>
                    ))}
                  </h1>
                  {professionParts.length > 0 && (
                    <div className="border-b" style={{ paddingBottom: 24, borderColor: alpha(C.rose, 0.2) }}>
                      {professionParts.map((part, i) => (
                        <p
                          key={i}
                          className="font-medium uppercase"
                          style={{ fontSize: 11, color: C.muted, letterSpacing: '0.4em', lineHeight: 1.7, marginTop: i > 0 ? 4 : 0 }}
                        >
                          {part}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div ref={index === 0 ? side.firstBodyRef : undefined} className="flex-1 min-h-0 overflow-hidden">
                {side.pages[index] || null}
              </div>
            </div>

            {/* ------------------------------ Main column ------------------------------ */}
            <div
              className="shrink-0 h-full flex flex-col"
              style={{ width: MAIN_W, padding: `${MAIN_PAD_TOP}px ${MAIN_PAD_X}px ${MAIN_PAD_BOTTOM}px`, backgroundColor: C.cream }}
            >
              <div ref={index === 0 ? main.firstBodyRef : undefined} className="flex-1 min-h-0 overflow-hidden">
                {main.pages[index] || null}
                {isEmpty && index === 0 && (
                  <p className="text-xs italic text-slate-400">Nothing entered yet — fill in a few steps to see them appear here.</p>
                )}
              </div>
            </div>
          </div>
        </A4Page>
      ))}
    </>
  );
};

export default VelvetTemplate;
