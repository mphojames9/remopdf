import React from 'react';
import { parseBlocks, renderInline } from '../Sections/richText';
import ResumePhoto from '../Sections/ResumePhoto';
import { languageLevelInfo } from '../Sections/LanguageLevelSelect';
import { getSkillLevelLabel } from '../Sections/SkillsField';
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
 * Visionary (id: visionary). A pale sky-blue sidebar beside a white main column. Experience, projects,
 * education and certificates hang on a thin indigo timeline with glowing cyan dots, dates sit in rounded
 * pills, and the summary sits in a soft card with a cyan edge.
 *
 *   sidebar  tilted photo frame, Contact, Details, Core Expertise (skill bars), Languages (level badges), Interests
 *   main     name + profession, Summary, Professional Experience, Projects, Education, Certifications, References
 *
 * Colours: with the default accent the page uses the original sky / cyan / indigo palette exactly. When the
 * user picks another accent, a matching palette is derived from it (sidebar tints, timeline, pills, dots,
 * company names, name colour), so the whole page re-themes and stays readable.
 *
 * Both columns are paginated on their own with usePaginatedBlocks and the page count is whichever needs
 * more. Everything inside a column is a FLAT list of plain elements (no section wrappers); the timeline line
 * is drawn per element (border-left), so it stays continuous when an entry continues on the next page.
 *
 * Register: id 'visionary' in Templates/index.js, DEFAULT_ACCENT (#0ea5e9), TEMPLATE_CARDS in
 * TemplateThumbs.jsx and in TemplateShowcase.jsx. A missing accent key falls back to BASE_ACCENT.
 */

/* ------------------------------ Design tokens ------------------------------ */
const FONT = `ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`;
const BASE_ACCENT = '#0ea5e9'; // sky-500

// The original palette.
const BASE_PALETTE = {
  sky50: '#f0f9ff', sky100: '#e0f2fe', sky200: '#bae6fd',
  skyTrack: 'rgba(186, 230, 253, 0.5)', skyTrackLine: 'rgba(186, 230, 253, 0.3)', skyBadgeLine: 'rgba(186, 230, 253, 0.6)',
  sky400: '#38bdf8', sky500: '#0ea5e9', sky600: '#0284c7', sky700: '#0369a1',
  glowFrame: 'rgba(14, 165, 233, 0.15)', glowBar: 'rgba(14, 165, 233, 0.4)', glowDiamond: 'rgba(14, 165, 233, 0.3)',
  cyan400: '#22d3ee', cyan500: '#06b6d4', cyan600: '#0891b2', glowDot: 'rgba(34, 211, 238, 0.8)',
  indigo50: '#eef2ff', indigo100: '#e0e7ff', indigo700: '#4338ca', ink: '#1e1b4b',
};

const alpha = (hex, a) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

// tint(hex, +x) mixes with white, tint(hex, -x) mixes with black.
const buildPalette = (accent) => {
  if (!accent || String(accent).toLowerCase() === BASE_ACCENT) return BASE_PALETTE;
  return {
    sky50: tint(accent, 0.94), sky100: tint(accent, 0.86), sky200: tint(accent, 0.72),
    skyTrack: alpha(tint(accent, 0.72), 0.5), skyTrackLine: alpha(tint(accent, 0.72), 0.3), skyBadgeLine: alpha(tint(accent, 0.72), 0.6),
    sky400: tint(accent, 0.2), sky500: accent, sky600: tint(accent, -0.15), sky700: tint(accent, -0.35),
    glowFrame: alpha(accent, 0.15), glowBar: alpha(accent, 0.4), glowDiamond: alpha(accent, 0.3),
    cyan400: tint(accent, 0.15), cyan500: accent, cyan600: tint(accent, -0.2), glowDot: alpha(accent, 0.8),
    indigo50: tint(accent, 0.92), indigo100: tint(accent, 0.85), indigo700: tint(accent, -0.45), ink: tint(accent, -0.8),
  };
};

const SLATE_50 = '#f8fafc';
const SLATE_100 = '#f1f5f9';
const SLATE_400 = '#94a3b8';
const SLATE_500 = '#64748b';
const SLATE_600 = '#475569';
const SLATE_700 = '#334155';

// Geometry (px). The hidden measuring boxes must be exactly as wide as the real column bodies.
const SIDEBAR_W = 270; // 34% of the A4 width
const SIDE_PAD = 32;
const SIDE_CONTENT_W = SIDEBAR_W - SIDE_PAD * 2 - 1; // 1px right border
const MAIN_W = PAGE_WIDTH_PX - SIDEBAR_W;
const MAIN_PAD = 32;
const MAIN_CONTENT_W = MAIN_W - MAIN_PAD * 2;
const MARKER_GUTTER = 6; // room left of the main column for the timeline dots (they sit 3px outside it)
const SIDE_MAX_HEIGHT = PAGE_HEIGHT_PX - SIDE_PAD * 2; // pages 2+
const MAIN_MAX_HEIGHT = PAGE_HEIGHT_PX - MAIN_PAD * 2; // pages 2+

// Sections that live in the sidebar. Everything else goes in the main column.
const SIDEBAR_KEYS = ['skills', 'languages', 'hobbies'];

/* ------------------------------ Contact lines ------------------------------ */
// The builder hands over one flat list of strings. Personal details ("Born: ...", "Nationality: ...")
// are pulled out and shown as label / value pairs; everything else is a contact line with an icon.
const DETAIL_RULES = [
  [/^(born|date of birth|dob)\s*:/i, 'Date of birth'],
  [/^(nationality|citizenship)\s*:/i, 'Nationality'],
  [/^(gender|sex)\s*:/i, 'Gender'],
  [/^(marital status|civil status)\s*:/i, 'Marital status'],
  [/^(driver'?s?|driving)\s+licen[cs]e\b/i, "Driver's licence"],
];

const parseDetail = (line) => {
  const text = String(line).trim();
  const rule = DETAIL_RULES.find(([re]) => re.test(text));
  if (!rule) return null;
  const m = /^[^:]+:\s*(.+)$/.exec(text);
  return { label: rule[1], value: m ? m[1].trim() : 'Yes' };
};

// An email typed without its "@" (e.g. "name9gmail.com") still gets the mail icon.
const MAIL_HOST = /^(?!www\.)[^\s@/]+(gmail|googlemail|yahoo|outlook|hotmail|live|icloud|proton|protonmail)\.(com|me|co\.za|co\.uk)$/;

const contactKind = (raw) => {
  const s = String(raw).trim().toLowerCase();
  const m = s.match(/^([a-z][a-z .\/&-]{1,28}):(?!\/\/)\s*/); // a leading "Label:" (not the "https:" of a URL)
  const label = m ? m[1] : '';
  const value = m ? s.slice(m[0].length) : s;

  if (s.includes('linkedin')) return 'linkedin';
  if (s.includes('github')) return 'github';
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

const LINKEDIN_FILLED = 'M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z';

const CONTACT_ICONS = {
  mail: <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
  phone: <><rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><path d="M12 18h.01" /></>,
  pin: <><path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-8-4.5-8-11.8A8 8 0 0112 1.2a8 8 0 018 8C20 16.5 12 21 12 21z" /><circle cx="12" cy="9.2" r="3" /></>,
  globe: <><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8" /><path strokeLinecap="round" strokeLinejoin="round" d="M11.5 3a17 17 0 000 18M12.5 3a17 17 0 000 18" /></>,
  github: <><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></>,
  dot: <circle cx="12" cy="12" r="3" />,
};

const ContactIcon = ({ name, color }) => (
  name === 'linkedin' ? (
    <svg viewBox="0 0 24 24" width="16" height="16" fill={color} className="shrink-0" style={{ marginTop: 1 }} aria-hidden="true"><path d={LINKEDIN_FILLED} /></svg>
  ) : (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" style={{ marginTop: 1 }} aria-hidden="true">
      {CONTACT_ICONS[name] || CONTACT_ICONS.dot}
    </svg>
  )
);

// Icons in front of the main section headings.
const HEADING_ICONS = {
  experience: <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
  projects: <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />,
  education: <><path d="M12 14l9-5-9-5-9 5 9 5z" /><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 14v7" /></>,
  certificates: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
  references: <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />,
};

const CHECK_PATH = <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />;

/* -------------------------------- Template -------------------------------- */
const VisionaryTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, certificates, isEmpty, sectionOrder, edit } = props;
  const accent = props.accentColor || DEFAULT_ACCENT.visionary || BASE_ACCENT;
  const C = buildPalette(accent);

  /* ----------------------------- Small helpers ----------------------------- */
  // A line of detail text under an entry: a bullet line gets a cyan check, a plain line stays a paragraph.
  const detailRow = (key, block) => (
    <div
      key={key}
      className="flex items-start gap-2.5"
      style={{ fontSize: 13.5, lineHeight: 1.625, color: SLATE_600 }}
    >
      {block.bullet && (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={C.cyan500} strokeWidth="2.5" className="shrink-0" style={{ marginTop: 5 }} aria-hidden="true">{CHECK_PATH}</svg>
      )}
      <span className="min-w-0 break-words">{renderInline(block.text, key)}</span>
    </div>
  );

  const sideHeading = (key, text) => (
    <h3
      key={`${key}-h`}
      className="text-xs font-bold uppercase border-b pb-2 mb-4"
      style={{ color: C.sky700, borderColor: C.sky200, letterSpacing: '0.2em' }}
    >
      {text}
    </h3>
  );

  const mainHeading = (key, text) => (
    <h3
      key={`${key}-h`}
      className="flex items-center gap-3 text-lg font-bold uppercase mb-4"
      style={{ color: C.ink, letterSpacing: '0.1em' }}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={C.cyan500} strokeWidth="2" className="shrink-0" aria-hidden="true">{HEADING_ICONS[key]}</svg>
      <span>{text}</span>
    </h3>
  );

  const dot = (glow) => (
    <span
      aria-hidden="true"
      className="absolute rounded-full"
      style={{ width: 8, height: 8, left: -5, top: 6, backgroundColor: C.cyan400, boxShadow: glow ? `0 0 5px ${C.glowDot}` : 'none' }}
    />
  );

  // One element of a timeline entry. Each element draws its own piece of the vertical line (border-left),
  // so the line carries on across a page break. The first element of an entry also carries the dot.
  // `keepWithNext` makes the element an <h3>, which is what the paginator treats as "never alone at the bottom
  // of a page": the title and company rows always move to the next page together with the first detail line.
  const timeline = (key, content, isFirst, gap, glow, keepWithNext) => {
    const Tag = keepWithNext ? 'h3' : 'div';
    return (
      <Tag key={key} className="relative pl-4 border-l-2" style={{ borderColor: C.indigo100, paddingBottom: gap }}>
        {isFirst && dot(glow)}
        {content}
      </Tag>
    );
  };

  // rows = [{ el, gap }]. gap = space under that row inside the entry; the entry's last row gets mb-5 instead.
  const entry = (id, rows, glow = false) => {
    const list = rows.filter(Boolean);
    return padLast(
      list.map(({ el, gap, head }, i) => timeline(`${id}-${i}`, el, i === 0, i === list.length - 1 ? 0 : gap, glow, Boolean(head) && i < list.length - 1)),
      'mb-5',
    );
  };

  const datePill = (text) => (
    <span
      className="shrink-0 font-bold uppercase whitespace-nowrap rounded-full"
      style={{ fontSize: 11, color: C.indigo700, backgroundColor: C.indigo50, padding: '4px 12px', letterSpacing: '0.05em' }}
    >
      {text}
    </span>
  );

  const titleRow = (title, date, size) => (
    <div className="flex items-baseline justify-between gap-3">
      <p className="min-w-0 break-words font-bold" style={{ fontSize: size, color: C.ink, lineHeight: 1.4 }}>{title}</p>
      {date && datePill(date)}
    </div>
  );

  const metaRow = (primary, secondary, kind = 'company') => (
    <div className="flex items-baseline justify-between gap-3">
      {primary ? (
        <p
          className={`min-w-0 break-words ${kind === 'company' ? 'font-semibold' : ''}`}
          style={{ fontSize: 14, color: kind === 'company' ? C.cyan600 : SLATE_600, lineHeight: 1.5 }}
        >
          {primary}
        </p>
      ) : <span />}
      {secondary && <p className="shrink-0 font-medium uppercase whitespace-nowrap" style={{ fontSize: 11, color: SLATE_400 }}>{secondary}</p>}
    </div>
  );

  const bodyRows = (text, keyPrefix, gap = 6) => parseBlocks(text).map((block, i) => ({ el: detailRow(`${keyPrefix}-${i}`, block), gap }));

  /* ------------------------------ MAIN column ------------------------------ */
  const projectItems = (projects?.items || []).filter((p) => p.title || p.description);
  const certificateItems = (certificates?.items || []).filter((c) => c.name || c.issuer);
  const referenceItems = (references?.items || []).filter((r) => r.name);
  const summaryBlocks = summary ? parseBlocks(summary) : [];

  const mainMap = {
    // No heading, exactly like the original design: one soft card with a cyan edge, under the name.
    // It is a single element so the card stays whole; a summary is short enough for that.
    summary: summaryBlocks.length > 0 ? [
      <div
        key="summary-card"
        className="mb-5 rounded-r-lg"
        style={{
          fontSize: 14,
          lineHeight: 1.625,
          color: SLATE_600,
          padding: 16,
          borderLeft: `4px solid ${C.cyan400}`,
          backgroundImage: `linear-gradient(to right, ${SLATE_50}, #ffffff)`,
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
        }}
      >
        {summaryBlocks.map((block, i) => (
          <div key={`summary-${i}`} className="flex items-start gap-2.5 break-words" style={{ marginBottom: i < summaryBlocks.length - 1 ? 8 : 0 }}>
            {block.bullet && (
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={C.cyan500} strokeWidth="2.5" className="shrink-0" style={{ marginTop: 5 }} aria-hidden="true">{CHECK_PATH}</svg>
            )}
            <span className="min-w-0">{renderInline(block.text, `summary-${i}`)}</span>
          </div>
        ))}
      </div>,
    ] : [],

    experience: jobs.length > 0 ? [
      mainHeading('experience', 'Professional Experience'),
      ...jobs.flatMap((job) => {
        const id = `job-${job.id}`;
        const place = [job.location, job.remote ? 'Remote' : ''].filter(Boolean).join(' · ');
        const head = job.title || job.employer;
        const sub = job.title ? job.employer : '';
        return entry(id, [
          { el: titleRow(head, jobDates(job), 16), gap: 4, head: true },
          (sub || place) && { el: metaRow(sub, place, 'company'), gap: 8, head: true },
          ...bodyRows(job.achievements, `${id}-ach`),
        ], true);
      }),
    ] : [],

    education: educations.length > 0 ? [
      mainHeading('education', 'Education'),
      ...educations.flatMap((ed) => {
        const id = `education-${ed.id}`;
        const title = [ed.degree, ed.field].filter(Boolean).join(', ') || ed.institution;
        const school = title === ed.institution ? '' : ed.institution;
        return entry(id, [
          { el: titleRow(title, ed.date, 15), gap: 4, head: true },
          (school || ed.location) && { el: metaRow(school, ed.location, 'school'), gap: 8, head: true },
          ...bodyRows(ed.achievements, `${id}-ach`, 6),
        ]);
      }),
    ] : [],
  };

  const mainExtras = {
    projects: projects?.enabled && projectItems.length > 0 ? [
      mainHeading('projects', 'Projects'),
      ...projectItems.flatMap((p) => {
        const id = `project-${p.id}`;
        return entry(id, [
          { el: titleRow(p.title || 'Project', '', 15), gap: 4, head: true },
          p.link && { el: <p className="break-all" style={{ fontSize: 12, color: SLATE_500 }}>{p.link}</p>, gap: 8, head: true },
          ...bodyRows(p.description, `${id}-desc`),
        ]);
      }),
    ] : [],

    certificates: certificates?.enabled && certificateItems.length > 0 ? [
      mainHeading('certificates', 'Certifications'),
      ...certificateItems.flatMap((c) => {
        const id = `certificate-${c.id}`;
        return entry(id, [
          { el: titleRow(c.name || c.issuer, c.date ? formatRange(c.date) : '', 14), gap: 4, head: true },
          c.name && c.issuer && {
            el: <p className="font-semibold break-words" style={{ fontSize: 13.5, color: C.cyan600 }}>{c.issuer}</p>,
            gap: 6,
            head: true,
          },
          c.link && { el: <p className="break-all" style={{ fontSize: 12, color: SLATE_500 }}>{c.link}</p>, gap: 6, head: true },
          ...bodyRows(c.description, `${id}-desc`),
        ]);
      }),
    ] : [],

    references: references?.enabled && (references.availableUponRequest || referenceItems.length > 0) ? [
      mainHeading('references', 'References'),
      ...(references.availableUponRequest
        ? [<p key="references-note" className="mb-5" style={{ fontSize: 13.5, color: SLATE_600 }}>Available upon request.</p>]
        : referenceItems.map((r) => (
          // Two cards per row. inline-block keeps every card a plain element of the flat list.
          <div
            key={`reference-${r.id}`}
            className="relative pl-4 border-l-2 mb-5"
            style={{ display: 'inline-block', verticalAlign: 'top', width: '50%', boxSizing: 'border-box', paddingRight: 16, borderColor: C.indigo100 }}
          >
            {dot(false)}
            <p className="font-bold break-words" style={{ fontSize: 14, color: C.ink, lineHeight: 1.4 }}>{r.name}</p>
            {r.relationship && <p className="font-semibold break-words" style={{ fontSize: 12, color: C.cyan600, marginTop: 2 }}>{r.relationship}</p>}
            {r.contact && <p className="break-all" style={{ fontSize: 12, color: SLATE_500, marginTop: 4 }}>{r.contact}</p>}
          </div>
        ))),
    ] : [],
  };

  const mainOrder = (sectionOrder || []).filter((key) => !SIDEBAR_KEYS.includes(key));
  // Summary has no heading in this design, so it is clickable in edit mode but gets no pencil / bin on top of its text.
  const mainBlocks = mainOrder.flatMap((key) => markSection(edit, key, mainMap[key] || mainExtras[key] || [], key !== 'summary'));

  /* ----------------------------- SIDEBAR column ---------------------------- */
  const languageItems = (languages?.items || []).filter((l) => l.name);
  const hobbyBlocks = hobbies?.enabled && hobbies.text ? parseBlocks(hobbies.text) : [];

  const sideMap = {
    skills: namedSkills.length > 0 ? padLast([
      sideHeading('skills', 'Core Expertise'),
      ...namedSkills.map((s) => {
        const rating = skillRating(s);
        return (
          <div key={`skill-${s.id}`} className="mb-4" title={rating > 0 ? getSkillLevelLabel(rating) : undefined}>
            <div className="font-medium break-words" style={{ fontSize: 13, color: SLATE_700, lineHeight: 1.45 }}>{s.text}</div>
            {rating > 0 && (
              <div
                className="w-full overflow-hidden rounded-full"
                style={{ height: 6, marginTop: 4, padding: 1, backgroundColor: C.skyTrack, border: `1px solid ${C.skyTrackLine}` }}
              >
                <div className="rounded-full" style={{ height: '100%', width: `${(rating / 5) * 100}%`, backgroundColor: C.sky500, boxShadow: `0 0 6px ${C.glowBar}` }} />
              </div>
            )}
          </div>
        );
      }),
    ], 'mb-9') : [],

    languages: languages?.enabled && languageItems.length > 0 ? padLast([
      sideHeading('languages', 'Languages'),
      ...languageItems.map((l) => {
        const { label } = languageLevelInfo(l);
        return (
          <div key={`language-${l.id}`} className="flex justify-between items-center gap-2 mb-4" style={{ fontSize: 13 }}>
            <span className="font-medium break-words" style={{ color: SLATE_700 }}>{l.name}</span>
            {label && (
              <span
                className="shrink-0 font-bold uppercase rounded"
                style={{ fontSize: 10, color: C.sky700, backgroundColor: C.sky100, border: `1px solid ${C.skyBadgeLine}`, padding: '2px 8px', letterSpacing: '0.1em' }}
              >
                {label}
              </span>
            )}
          </div>
        );
      }),
    ], 'mb-9') : [],

    hobbies: hobbyBlocks.length > 0 ? padLast([
      sideHeading('hobbies', 'Interests'),
      ...hobbyBlocks.map((block, i) => (
        <div key={`hobby-${i}`} className="flex items-start gap-3 mb-4" style={{ fontSize: 13, color: SLATE_600, lineHeight: 1.45 }}>
          <span
            aria-hidden="true"
            className="shrink-0 rounded-sm"
            style={{ width: 6, height: 6, marginTop: 7, backgroundColor: C.sky500, transform: 'rotate(45deg)', boxShadow: `0 0 4px ${C.glowDiamond}` }}
          />
          <span className="min-w-0 break-words">{renderInline(block.text, `hobby-${i}`)}</span>
        </div>
      )),
    ], 'mb-9') : [],
  };

  const sideOrder = (sectionOrder || []).filter((key) => SIDEBAR_KEYS.includes(key));
  const sideBlocks = sideOrder.flatMap((key) => markSection(edit, key, sideMap[key] || []));

  // Page 1 only: photo, contact lines and personal details. This block is not paginated; the sections
  // below it use whatever height is left on page 1 (firstBodyRef), then continue on the next pages.
  const allLines = (contactList || []).filter((c) => typeof c === 'string' && c.trim());
  const details = [];
  const contacts = [];
  allLines.forEach((line) => {
    const d = parseDetail(line);
    if (d) details.push(d); else contacts.push(line);
  });
  const contactKinds = resolveContactKinds(contacts);
  const hasPhoto = Boolean(personal && personal.photo);
  const hasSideHead = hasPhoto || contacts.length > 0 || details.length > 0;

  /* ------------------------------- Main header ------------------------------ */
  const name = (fullName || 'Your Name').trim();
  const nameSize = name.length <= 16 ? 36 : name.length <= 20 ? 30 : name.length <= 26 ? 26 : 22;
  const professionParts = ((personal && personal.profession) || '').split('|').map((p) => p.trim()).filter(Boolean);

  /* ------------------------------ Pagination ------------------------------- */
  const main = usePaginatedBlocks(mainBlocks, MAIN_MAX_HEIGHT);
  const side = usePaginatedBlocks(sideBlocks, SIDE_MAX_HEIGHT);
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
            style={{ fontFamily: FONT, color: SLATE_700, backgroundColor: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
          >
            {/* ------------------------------ Sidebar ------------------------------ */}
            <div
              className="shrink-0 h-full flex flex-col"
              style={{ width: SIDEBAR_W, padding: SIDE_PAD, backgroundColor: C.sky50, borderRight: `1px solid ${C.sky100}`, color: SLATE_700 }}
            >
              {index === 0 && hasSideHead && (
                <div {...editAttrs(edit, 'personal')} className="shrink-0" style={{ marginBottom: sideBlocks.length > 0 ? 32 : 0 }}>
                  {hasPhoto && (
                    <div className="flex justify-center" style={{ marginBottom: contacts.length || details.length ? 28 : 0 }}>
                      <div
                        className="rounded-2xl"
                        style={{ width: 144, height: 144, padding: 4, border: `2px solid ${C.sky400}`, boxShadow: `0 4px 15px ${C.glowFrame}`, transform: 'rotate(3deg)' }}
                      >
                        <div
                          className="w-full h-full overflow-hidden rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: C.sky100, transform: 'rotate(-3deg)' }}
                        >
                          <ResumePhoto src={personal.photo} style={{ ...(personal.photoStyle || {}), shape: 'square', border: 'none' }} sizePx={132} />
                        </div>
                      </div>
                    </div>
                  )}

                  {contacts.length > 0 && (
                    <div style={{ marginBottom: details.length ? 32 : 0 }}>
                      {sideHeading('contact', 'Contact')}
                      <div className="flex flex-col" style={{ gap: 16 }}>
                        {contacts.map((c, i) => (
                          <div key={`contact-${i}`} className="flex items-start gap-3" style={{ fontSize: 13, color: SLATE_600, lineHeight: 1.45 }}>
                            <ContactIcon name={contactKinds[i]} color={C.sky600} />
                            <span className="min-w-0 break-words">{c}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {details.length > 0 && (
                    <div>
                      {sideHeading('details', 'Details')}
                      <div className="flex flex-col" style={{ gap: 16 }}>
                        {details.map((d) => (
                          <div key={d.label} className="flex flex-col" style={{ gap: 2 }}>
                            <span className="font-bold uppercase" style={{ fontSize: 10, color: C.sky600, letterSpacing: '0.05em' }}>{d.label}</span>
                            <span className="break-words" style={{ fontSize: 13, color: SLATE_700 }}>{d.value}</span>
                          </div>
                        ))}
                      </div>
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
              style={{ width: MAIN_W, padding: MAIN_PAD, backgroundColor: '#ffffff' }}
            >
              {index === 0 && (
                <div
                  {...editAttrs(edit, 'personal')}
                  className="flex flex-col shrink-0 border-b-2"
                  style={{ borderColor: SLATE_100, gap: 8, paddingBottom: 20, marginBottom: 20 }}
                >
                  <h1
                    className="font-black uppercase break-words"
                    style={{ fontSize: nameSize, lineHeight: 1.15, letterSpacing: '-0.025em', color: C.ink }}
                  >
                    {name}
                  </h1>
                  {professionParts.length > 0 && (
                    <p
                      className="flex flex-wrap items-center font-bold uppercase"
                      style={{ columnGap: 12, rowGap: 4, fontSize: 14, color: C.cyan600, letterSpacing: '0.15em', lineHeight: 1.4 }}
                    >
                      {professionParts.map((part, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <span aria-hidden="true" style={{ width: 1, height: 12, backgroundColor: SLATE_400 }} />}
                          <span>{part}</span>
                        </React.Fragment>
                      ))}
                    </p>
                  )}
                </div>
              )}

              <div
                ref={index === 0 ? main.firstBodyRef : undefined}
                className="flex-1 min-h-0 overflow-hidden"
                style={{ marginLeft: -MARKER_GUTTER, paddingLeft: MARKER_GUTTER }}
              >
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

export default VisionaryTemplate;
