import React from 'react';
import { parseBlocks, renderInline } from '../Sections/richText';
import { languageLevelInfo } from '../Sections/LanguageLevelSelect';
import { getSkillLevelLabel } from '../Sections/SkillsField';
import { formatRange } from '../Sections/dateFormat';
import ResumePhoto from '../Sections/ResumePhoto';
import {
  PAGE_HEIGHT_PX,
  DEFAULT_ACCENT,
  tint,
  jobDates,
  skillRating,
  usePaginatedBlocks,
  A4Page,
  padLast,
  editAttrs,
  markSection,
  SectionControls,
} from './templateShared';

/**
 * Nova Standard (id: nova-standard). Two columns: a near-black "technical" sidebar (35%) and a white main column (65%).
 *
 *   sidebar   photo in a framed tile, CONTACT (icon rows), METRICS (date of birth, nationality, ...), then the
 *             Skills (bars + %), Languages (level badge) and Hobbies sections in the user's order
 *   main      name + profession header (page 1 only), then Summary, Experience, Education, Certificates, Projects
 *             and References in the user's order. Every heading carries a running SEC_01, SEC_02 ... counter and
 *             the sidebar headings a running // 01, // 02 ... counter, numbered in the order they appear.
 *
 * The accent colour (orange by default) drives the heading squares, markers, dates, bars and badges. It is
 * nudged lighter on the dark sidebar and darker on the white page when the chosen colour would be hard to read there,
 * so any swatch or custom colour stays legible.
 *
 * Both columns are FLAT lists of plain elements and are measured / split into pages on their own (like the Sidebar
 * template), so a long column simply continues on the next page. Entry heads are <h3>, which the paginator keeps
 * together with the line that follows. The section titles are in SECTION_TITLES below if you want plainer wording.
 *
 * Register: id 'nova-standard' in Templates/index.js, DEFAULT_ACCENT (#FF5A1F), TEMPLATE_CARDS in TemplateThumbs.jsx
 * and in TemplateShowcase.jsx, SKILL_LEVEL_DISPLAY in templateSkillLevels.js. A missing accent key falls back
 * to FALLBACK_ACCENT.
 */

/* ------------------------------ Design tokens ------------------------------ */
const FALLBACK_ACCENT = '#FF5A1F';
const SIDEBAR_BG = '#0F1113';
const SIDE_PANEL = '#17191C'; // photo frame
const SIDE_CHIP = '#1A1D20'; // contact icon boxes
const SIDE_TRACK = '#1F2326'; // empty skill bar, language badge
const SIDE_RULE = 'rgba(255, 255, 255, 0.1)';
const SIDE_TEXT = '#E4E6EB';
const SIDE_SOFT = '#A9AFA6';
const SIDE_LABEL = '#72787E';
const INK = '#0F1113'; // names, titles
const TEXT = '#485260'; // body copy
const MUTED = '#8E97A4'; // dates, locations
const RULE = '#E4E6EB';
const WASH = '#F3F4F6'; // section heading band

// Geometry (px). The hidden measuring boxes must be exactly as wide as the real column bodies.
const SIDEBAR_W = 278;
const MAIN_W = 794 - SIDEBAR_W; // 516
const SIDE_PAD_X = 32;
const SIDE_BORDER = 1;
const SIDE_PAD_TOP = 32;
const SIDE_PAD_BOTTOM = 32; // the paginator keeps a further 48px clear above it for the page number
const MAIN_PAD_X = 40;
const MAIN_PAD_TOP = 40;
const MAIN_PAD_BOTTOM = 32;
const SIDE_CONTENT_W = SIDEBAR_W - SIDE_PAD_X * 2 - SIDE_BORDER;
const MAIN_CONTENT_W = MAIN_W - MAIN_PAD_X * 2;
const SIDE_MAX_HEIGHT = PAGE_HEIGHT_PX - SIDE_PAD_TOP - SIDE_PAD_BOTTOM;
const MAIN_MAX_HEIGHT = PAGE_HEIGHT_PX - MAIN_PAD_TOP - MAIN_PAD_BOTTOM; // pages 2+; page 1 is measured for real

// Sections that live in the sidebar. Every other section goes in the main column.
const SIDEBAR_KEYS = ['skills', 'languages', 'hobbies'];

const SECTION_TITLES = {
  contact: 'CONTACT',
  metrics: 'METRICS',
  skills: 'EXPERTISE',
  languages: 'LINGUISTICS',
  hobbies: 'INTERESTS',
  experience: 'CHRONOLOGICAL DISPATCH',
  projects: 'DEPLOYED APPLICATIONS',
  education: 'ACADEMIC FOUNDATION',
  certificates: 'CREDENTIAL VERIFICATION',
  references: 'ATTRIBUTION VOUCHERS',
};

// Names shown on the edit-mode pencil / bin buttons.
const EDIT_LABELS = {
  summary: 'Summary',
  experience: 'Experience',
  education: 'Education',
  certificates: 'Certificates',
  skills: 'Skills',
  projects: 'Projects',
  languages: 'Languages',
  hobbies: 'Hobbies & Interests',
  references: 'References',
};

/* ------------------------------ Colour helpers ----------------------------- */
const rgbOf = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const alpha = (hex, a) => {
  const c = rgbOf(hex);
  return c ? `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})` : hex;
};

const luminance = (hex) => {
  const c = rgbOf(hex);
  if (!c) return 0;
  const [r, g, b] = c.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// The accent, moved toward white (on a dark background) or black (on a light one) until it reaches `min`:1 contrast.
// A colour that already reads well is returned untouched.
const readableOn = (hex, background, min) => {
  if (!rgbOf(hex)) return hex;
  const direction = luminance(background) > 0.5 ? -1 : 1;
  for (let step = 0; step <= 10; step += 1) {
    const candidate = tint(hex, direction * step * 0.1);
    if (contrast(candidate, background) >= min) return candidate;
  }
  return tint(hex, direction);
};

/* ------------------------------ Contact lines ------------------------------ */
// The builder hands over one flat list of strings. Personal details ("Born: ...", "Nationality: ...") become
// label / value pairs under METRICS; everything else is a contact line with an icon.
const DETAIL_RULES = [
  [/^(born|date of birth|dob)\s*:/i, 'INITIAL_DATE'],
  [/^(nationality|citizenship)\s*:/i, 'REGION_ORIGIN'],
  [/^(gender|sex)\s*:/i, 'GENDER_IDENT'],
  [/^(marital status|civil status)\s*:/i, 'CIVIL_STATUS'],
  [/^(driver'?s?|driving)\s+licen[cs]e\b/i, 'MOBILITY_AUTH'],
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
  const m = s.match(/^([a-z][a-z ./&-]{1,28}):(?!\/\/)\s*/); // a leading "Label:" (not the "https:" of a URL)
  const label = m ? m[1] : '';
  const value = m ? s.slice(m[0].length) : s;

  if (s.includes('linkedin') || s.includes('github')) return 'link';
  if (value.includes('@') || /e-?mail/.test(label) || MAIL_HOST.test(value)) return 'mail';
  if (/^(tel|telephone|phone|mobile|cell|whatsapp|fax)\b/.test(label) || /^[+()\d\s.-]{7,}$/.test(value)) return 'phone';
  if (/web|site|portfolio|url|link/.test(label) || /(https?:\/\/|www\.|\.(com|dev|io|net|org|me|site|co|app)\b)/.test(value)) return 'globe';
  if (/address|location|city|based|residen/.test(label)
    || /\d+\s+.*\b(street|st|road|rd|avenue|ave|drive|dr|lane|ln|blvd|boulevard|close|crescent|way)\b/.test(value)
    || /\bp\.?o\.?\s*box\b/.test(value)
    || value.includes(',')) return 'pin';
  return 'dot';
};

// A resume has one location: only the first address-like line gets the pin, any later one a neutral dot.
const resolveContactKinds = (lines) => {
  let pinSeen = false;
  return lines.map(contactKind).map((kind) => {
    if (kind !== 'pin') return kind;
    if (pinSeen) return 'dot';
    pinSeen = true;
    return 'pin';
  });
};

const ICON_PATHS = {
  mail: <path d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />,
  phone: <path d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />,
  pin: (
    <>
      <path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </>
  ),
  globe: <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-3.6-9m3.6 9a9 9 0 003.6-9m-3.6-9a9 9 0 00-3.6 9m3.6-9a9 9 0 013.6 9" />,
  link: <path d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />,
  dot: <circle cx="12" cy="12" r="3" />,
};

const ContactIcon = ({ kind, color }) => (
  <div
    aria-hidden="true"
    className="flex h-5 w-5 shrink-0 items-center justify-center"
    style={{ backgroundColor: SIDE_CHIP, border: '1px solid rgba(255, 255, 255, 0.05)' }}
  >
    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color }}>
      {ICON_PATHS[kind] || ICON_PATHS.dot}
    </svg>
  </div>
);

const chunk = (list, n) => list.reduce((rows, item, i) => {
  if (i % n === 0) rows.push([]);
  rows[rows.length - 1].push(item);
  return rows;
}, []);

const pad2 = (n) => String(n).padStart(2, '0');

/* -------------------------------- Template -------------------------------- */
const NovaStandardTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, summary, hobbies, languages, projects, references, certificates, isEmpty, sectionOrder, edit } = props;
  const personal = props.personal || {};
  const accent = props.accentColor || DEFAULT_ACCENT['nova-standard'] || FALLBACK_ACCENT;
  const accentDark = readableOn(accent, SIDEBAR_BG, 4.5); // accent on the dark sidebar
  const accentLight = readableOn(accent, '#ffffff', 3); // accent on the white page
  const order = Array.isArray(sectionOrder) ? sectionOrder : [];

  /* ------------------------------ Edit-mode UI ----------------------------- */
  // Pencil / bin placed beside a heading's counter label. It is absolute, so it never changes the layout.
  const controls = (key, right) => (edit && edit.enabled ? (
    <span className="edit-ui absolute bottom-0 top-0" style={{ right }}>
      <SectionControls label={EDIT_LABELS[key] || key} onEdit={() => edit.onEdit(key)} onRemove={() => edit.onRemove(key)} />
    </span>
  ) : null);

  /* ------------------------------ Main column ------------------------------ */
  // Each section heading is an <h3>: the paginator never leaves one alone at the bottom of a page.
  const mainHeading = (key, sec) => (
    <h3 key={`${key}-h`} className="relative mb-4 flex items-center justify-between p-2" style={{ backgroundColor: WASH }}>
      <span className="flex items-center gap-2 text-xs font-black uppercase" style={{ color: INK, letterSpacing: '0.3em' }}>
        <span aria-hidden="true" className="inline-block shrink-0" style={{ width: 7, height: 7, backgroundColor: accentLight }} />
        {SECTION_TITLES[key]}
      </span>
      <span className="font-mono text-[10px] font-normal" style={{ color: INK, opacity: 0.4 }}>{`SEC_${sec}`}</span>
      {controls(key, 56)}
    </h3>
  );

  // One line of detail text under an entry (bold / italic / "- " bullets), indented to the entry's title.
  const bodyLines = (text, keyPrefix) => parseBlocks(text).map((block, i) => {
    const key = `${keyPrefix}-${i}`;
    const style = { fontSize: 12.5, lineHeight: 1.625, color: TEXT };
    return block.bullet ? (
      <div key={key} className="mb-1.5 flex items-start gap-2.5 pl-4" style={style}>
        <span aria-hidden="true" className="shrink-0 font-mono" style={{ color: accentLight, fontSize: 10, marginTop: 2 }}>›</span>
        <span className="min-w-0 break-words text-justify">{renderInline(block.text, key)}</span>
      </div>
    ) : (
      <p key={key} className="mb-1.5 break-words pl-4 text-justify" style={style}>{renderInline(block.text, key)}</p>
    );
  });

  const SUB_STYLES = {
    company: { className: 'font-bold uppercase', style: { fontSize: 12.5, color: TEXT, letterSpacing: '0.05em' } },
    school: { className: 'font-medium', style: { fontSize: 12.5, color: TEXT } },
    issuer: { className: 'font-bold uppercase', style: { fontSize: 12, color: accentLight, letterSpacing: '0.05em' } },
  };

  // Title row (+ date), then the company / school / issuer line with a place on the right. One <h3>, so the whole
  // head stays together with the first line below it.
  const entryHead = (key, { title, date, chip = false, sub, subKind = 'company', place, line, marker = INK }) => {
    const subStyle = SUB_STYLES[subKind];
    return (
      <h3 key={key} className="relative mb-1.5 pl-4 font-normal">
        <span aria-hidden="true" className="absolute left-0" style={{ top: 6, width: 4, height: 12, backgroundColor: marker }} />
        <div className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 break-words font-black uppercase" style={{ fontSize: 15, lineHeight: 1.3, color: INK, letterSpacing: '0.025em' }}>{title}</span>
          {date && (chip ? (
            <span className="shrink-0 px-2 py-0.5 font-mono text-[11px] font-bold" style={{ color: accentLight, backgroundColor: alpha(accentLight, 0.06), letterSpacing: '0.05em' }}>{date}</span>
          ) : (
            <span className="shrink-0 font-mono text-[11px] font-bold" style={{ color: MUTED }}>{date}</span>
          ))}
        </div>
        {(sub || place) && (
          <div className="flex items-baseline justify-between gap-3" style={{ marginTop: 2 }}>
            <span className={`min-w-0 break-words ${subStyle.className}`} style={subStyle.style}>{sub}</span>
            {place && <span className="shrink-0 text-[10px] font-bold uppercase" style={{ color: MUTED, letterSpacing: '0.05em' }}>{place}</span>}
          </div>
        )}
        {line && <div className="break-all font-mono" style={{ fontSize: 10.5, color: MUTED, marginTop: 2 }}>{line}</div>}
      </h3>
    );
  };

  // One entry = head + its text lines. The last line carries the gap to the next entry.
  const entry = (head, lines) => padLast([head, ...lines], 'mb-7');

  const projectItems = (projects?.items || []).filter((p) => p.title || p.description);
  const certificateItems = (certificates?.items || []).filter((c) => c.name || c.issuer);
  const referenceItems = (references?.items || []).filter((r) => r.name);

  const referenceCell = (r) => (
    <div key={`reference-${r.id ?? r.name}`} className="relative flex min-w-0 flex-col pl-4">
      <span aria-hidden="true" className="absolute left-0" style={{ top: 6, width: 4, height: 12, backgroundColor: INK }} />
      <p className="break-words font-black uppercase" style={{ fontSize: 14, lineHeight: 1.3, color: INK, letterSpacing: '0.025em' }}>{r.name}</p>
      {r.relationship && <p className="break-words font-bold" style={{ fontSize: 11.5, color: accentLight, letterSpacing: '0.025em' }}>{r.relationship}</p>}
      {r.contact && <p className="mt-0.5 break-all font-mono" style={{ fontSize: 11, color: MUTED }}>{r.contact}</p>}
    </div>
  );

  // Every builder takes the section's running number and returns a flat list ([] when the section is off / empty).
  const mainBuilders = {
    summary: () => {
      if (!summary) return [];
      const style = { fontSize: 13, lineHeight: 1.75, color: TEXT, borderLeft: `2px solid ${INK}` };
      const blocks = parseBlocks(summary);
      // The left rule runs through every paragraph: spacing between them is padding (inside the rule), not margin.
      return padLast(blocks.map((block, i) => (block.bullet ? (
        <div key={`summary-${i}`} className="flex items-start gap-2.5 pb-1.5 pl-4" style={style}>
          <span aria-hidden="true" className="shrink-0 font-mono" style={{ color: accentLight, fontSize: 10, marginTop: 4 }}>›</span>
          <span className="min-w-0 break-words text-justify">{renderInline(block.text, `summary-${i}`)}</span>
        </div>
      ) : (
        <p key={`summary-${i}`} className="break-words pb-1.5 pl-4 text-justify" style={style}>{renderInline(block.text, `summary-${i}`)}</p>
      ))), 'mb-8');
    },

    experience: (sec) => (jobs.length > 0 ? padLast([
      mainHeading('experience', sec),
      ...jobs.flatMap((job) => entry(
        entryHead(`job-${job.id}-head`, {
          title: job.title || job.employer,
          date: jobDates(job),
          chip: true,
          sub: job.title ? job.employer : '',
          place: [job.location, job.remote ? 'Remote' : ''].filter(Boolean).join(' · '),
          marker: accentLight,
        }),
        bodyLines(job.achievements, `job-${job.id}-ach`),
      )),
    ], 'mb-10') : []),

    projects: (sec) => (projects?.enabled && projectItems.length > 0 ? padLast([
      mainHeading('projects', sec),
      ...projectItems.flatMap((p) => entry(
        entryHead(`project-${p.id}-head`, { title: p.title || 'Project', line: p.link }),
        bodyLines(p.description, `project-${p.id}-desc`),
      )),
    ], 'mb-10') : []),

    education: (sec) => (educations.length > 0 ? padLast([
      mainHeading('education', sec),
      ...educations.flatMap((ed) => {
        const degree = [ed.degree, ed.field].filter(Boolean).join(', ');
        return entry(
          entryHead(`education-${ed.id}-head`, {
            title: degree || ed.institution,
            date: ed.date,
            sub: degree ? ed.institution : '',
            subKind: 'school',
            place: ed.location,
          }),
          bodyLines(ed.achievements, `education-${ed.id}-ach`),
        );
      }),
    ], 'mb-10') : []),

    certificates: (sec) => (certificates?.enabled && certificateItems.length > 0 ? padLast([
      mainHeading('certificates', sec),
      ...certificateItems.flatMap((c) => entry(
        entryHead(`certificate-${c.id}-head`, {
          title: c.name || c.issuer,
          date: c.date ? formatRange(c.date) : '',
          sub: c.name ? c.issuer : '',
          subKind: 'issuer',
          line: c.link,
        }),
        bodyLines(c.description, `certificate-${c.id}-desc`),
      )),
    ], 'mb-10') : []),

    references: (sec) => (references?.enabled && (references.availableUponRequest || referenceItems.length > 0) ? padLast([
      mainHeading('references', sec),
      ...(references.availableUponRequest
        ? [<p key="references-note" style={{ fontSize: 12.5, lineHeight: 1.625, color: TEXT }}>Available upon request.</p>]
        : chunk(referenceItems, 2).map((pair, i) => (
          <div key={`reference-row-${i}`} className="mb-4 grid grid-cols-2 gap-x-6">{pair.map(referenceCell)}</div>
        ))),
    ], 'mb-10') : []),
  };

  let mainCount = 0;
  const mainBlocks = order.filter((key) => !SIDEBAR_KEYS.includes(key)).flatMap((key) => {
    const build = mainBuilders[key];
    if (!build) return [];
    const blocks = build(pad2(mainCount + 1));
    if (blocks.length > 0 && key !== 'summary') mainCount += 1; // the summary has no heading, so no number
    // Summary has no heading, so it carries its own pencil / bin; every other heading draws them itself.
    return markSection(edit, key, blocks, key === 'summary');
  });

  /* ------------------------------ Sidebar column --------------------------- */
  const sideHeading = (id, key, sec) => (
    <h3 key={`${id}-h`} className="relative mb-4 flex items-center justify-between border-b pb-2 uppercase" style={{ borderColor: SIDE_RULE }}>
      <span className="text-[10px] font-black" style={{ color: accentDark, letterSpacing: '0.4em' }}>{SECTION_TITLES[id]}</span>
      <span className="font-mono text-[8px] font-normal" style={{ color: 'rgba(255, 255, 255, 0.2)', letterSpacing: 'normal' }}>{`// ${sec}`}</span>
      {key ? controls(key, 34) : null}
    </h3>
  );

  const allLines = (contactList || []).filter((c) => typeof c === 'string' && c.trim());
  const details = [];
  const contacts = [];
  allLines.forEach((line) => {
    const d = parseDetail(line);
    if (d) details.push(d); else contacts.push(line);
  });
  const contactKinds = resolveContactKinds(contacts);

  const photoBlock = personal.photo ? [
    <div key="photo" className="mb-5 flex justify-center">
      {/* Framed tile with two technical corner accents */}
      <div className="relative p-2" style={{ backgroundColor: SIDE_PANEL, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <span aria-hidden="true" className="absolute left-0 top-0" style={{ width: 12, height: 1, backgroundColor: accentDark }} />
        <span aria-hidden="true" className="absolute left-0 top-0" style={{ width: 1, height: 12, backgroundColor: accentDark }} />
        <span aria-hidden="true" className="absolute bottom-0 right-0" style={{ width: 12, height: 1, backgroundColor: accentDark }} />
        <span aria-hidden="true" className="absolute bottom-0 right-0" style={{ width: 1, height: 12, backgroundColor: accentDark }} />
        <ResumePhoto src={personal.photo} style={personal.photoStyle} borderColor={accentDark} />
      </div>
    </div>,
  ] : [];

  const languageItems = (languages?.items || []).filter((l) => l.name);
  const hobbyBlocks = hobbies?.enabled && hobbies.text ? parseBlocks(hobbies.text) : [];

  const sideBuilders = {
    skills: (sec) => (namedSkills.length > 0 ? padLast([
      sideHeading('skills', 'skills', sec),
      ...namedSkills.map((s) => {
        const rating = skillRating(s);
        const pct = Math.round((rating / 5) * 100);
        return (
          <div key={`skill-${s.id}`} className="mb-3.5" title={rating > 0 ? getSkillLevelLabel(rating) : undefined}>
            <div className="flex items-baseline justify-between font-medium" style={{ fontSize: 12.5, lineHeight: 1.35, color: SIDE_TEXT, letterSpacing: '0.025em' }}>
              <span className="min-w-0 break-words pr-2">{s.text}</span>
              {rating > 0 && <span className="shrink-0 font-mono" style={{ fontSize: 9, color: accentDark, opacity: 0.7 }}>{pct}%</span>}
            </div>
            {rating > 0 && (
              <div className="relative w-full" style={{ marginTop: 6, height: 3, backgroundColor: SIDE_TRACK }}>
                <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${accentDark}, ${tint(accentDark, 0.24)})` }} />
              </div>
            )}
          </div>
        );
      }),
    ], 'mb-8') : []),

    languages: (sec) => (languages?.enabled && languageItems.length > 0 ? padLast([
      sideHeading('languages', 'languages', sec),
      ...languageItems.map((l) => {
        const { label } = languageLevelInfo(l);
        return (
          <div key={`language-${l.id ?? l.name}`} className="mb-3 flex items-baseline justify-between gap-2">
            <span className="min-w-0 break-words font-medium" style={{ fontSize: 13, lineHeight: 1.35, color: SIDE_TEXT, letterSpacing: '0.025em' }}>{l.name}</span>
            <span className="shrink-0 px-1.5 py-0.5 font-mono uppercase" style={{ fontSize: 10, lineHeight: 1.3, color: accentDark, backgroundColor: SIDE_TRACK, letterSpacing: '0.05em' }}>{label}</span>
          </div>
        );
      }),
    ], 'mb-8') : []),

    hobbies: (sec) => (hobbyBlocks.length > 0 ? padLast([
      sideHeading('hobbies', 'hobbies', sec),
      ...hobbyBlocks.map((b, i) => (
        <div key={`hobby-${i}`} className="mb-3 flex items-start gap-3 font-light" style={{ fontSize: 12.5, lineHeight: 1.5, color: SIDE_SOFT, letterSpacing: '0.025em' }}>
          <span aria-hidden="true" className="shrink-0" style={{ width: 6, height: 1, marginTop: 9, backgroundColor: accentDark }} />
          <span className="min-w-0 break-words">{renderInline(b.text, `hobby-${i}`)}</span>
        </div>
      )),
    ], 'mb-8') : []),
  };

  let sideCount = 0;
  const nextSideNumber = () => pad2(sideCount + 1);

  // CONTACT and METRICS always come first, then the sidebar sections in the user's order.
  const contactBlocks = contacts.length > 0 ? padLast([
    sideHeading('contact', null, nextSideNumber()),
    ...contacts.map((c, i) => (
      <div key={`contact-${i}`} className="mb-3 flex items-center gap-3" style={{ fontSize: 12.5, lineHeight: 1.4, color: SIDE_SOFT }}>
        <ContactIcon kind={contactKinds[i]} color={accentDark} />
        <span className="min-w-0 font-light [overflow-wrap:anywhere]" style={{ letterSpacing: '0.025em' }}>{c}</span>
      </div>
    )),
  ], 'mb-8') : [];
  if (contactBlocks.length > 0) sideCount += 1;

  const metricBlocks = details.length > 0 ? padLast([
    sideHeading('metrics', null, nextSideNumber()),
    ...details.map((d) => (
      <div key={`metric-${d.label}`} className="mb-3 flex flex-col gap-0.5">
        <span className="font-mono uppercase" style={{ fontSize: 8.5, lineHeight: 1.2, color: SIDE_LABEL, letterSpacing: '0.1em' }}>{d.label}</span>
        <span className="break-words font-light" style={{ fontSize: 13, lineHeight: 1.35, color: SIDE_TEXT }}>{d.value}</span>
      </div>
    )),
  ], 'mb-8') : [];
  if (metricBlocks.length > 0) sideCount += 1;

  const sideSections = order.filter((key) => SIDEBAR_KEYS.includes(key)).flatMap((key) => {
    const blocks = sideBuilders[key](nextSideNumber());
    if (blocks.length > 0) sideCount += 1;
    return markSection(edit, key, blocks, false); // the heading draws the pencil / bin itself
  });

  const sideBlocks = [
    ...markSection(edit, 'personal', [...photoBlock, ...contactBlocks, ...metricBlocks], false),
    ...sideSections,
  ];

  /* ------------------------------ Pagination ------------------------------- */
  // Each column is measured and split on its own; the page count is the larger of the two.
  const main = usePaginatedBlocks(mainBlocks, MAIN_MAX_HEIGHT);
  const side = usePaginatedBlocks(sideBlocks, SIDE_MAX_HEIGHT);
  const pageCount = Math.max(main.pages.length, side.pages.length);

  /* --------------------------------- Header -------------------------------- */
  const name = (fullName || 'Your Name').trim();
  const nameSize = name.length <= 13 ? 48 : name.length <= 17 ? 40 : 34;

  return (
    <>
      {/* Hidden copies of every block, as wide as the real column bodies. Plain block containers, like the real bodies. */}
      <div ref={main.measureContainerRef} className="pointer-events-none absolute" style={{ top: -9999, left: -9999, width: MAIN_CONTENT_W }}>
        {main.measureContent}
      </div>
      <div ref={side.measureContainerRef} className="pointer-events-none absolute" style={{ top: -9999, left: -9999, width: SIDE_CONTENT_W }}>
        {side.measureContent}
      </div>

      {Array.from({ length: pageCount }, (_, index) => (
        <A4Page key={index} pageNum={index + 1} totalPages={pageCount}>
          <div className="relative flex h-full w-full text-left" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            <div
              ref={index === 0 ? side.firstBodyRef : undefined}
              className="h-full shrink-0 overflow-hidden"
              style={{
                width: SIDEBAR_W,
                padding: `${SIDE_PAD_TOP}px ${SIDE_PAD_X}px ${SIDE_PAD_BOTTOM}px`,
                backgroundColor: SIDEBAR_BG,
                borderRight: `${SIDE_BORDER}px solid #1F2429`,
                color: SIDE_TEXT,
              }}
            >
              {side.pages[index]}
            </div>

            <div className="flex h-full shrink-0 flex-col overflow-hidden bg-white" style={{ width: MAIN_W, color: TEXT }}>
              {index === 0 && (
                <div
                  {...editAttrs(edit, 'personal')}
                  className="shrink-0 border-b"
                  style={{ margin: `${MAIN_PAD_TOP}px ${MAIN_PAD_X}px 24px`, paddingBottom: 24, borderColor: RULE }}
                >
                  <div className="mb-2 text-right font-mono" style={{ fontSize: 9, color: INK, opacity: 0.3, letterSpacing: '0.1em' }}>{'// CORE_ENGINE_BUILD'}</div>
                  <h1 className="break-words font-black uppercase" style={{ fontSize: nameSize, lineHeight: 1, letterSpacing: '-0.025em', color: INK }}>{name}</h1>
                  {personal.profession && (
                    <div className="flex items-center gap-3" style={{ marginTop: 12 }}>
                      <span aria-hidden="true" className="shrink-0" style={{ width: 8, height: 8, backgroundColor: accentLight }} />
                      <p className="min-w-0 break-words text-[13px] font-bold uppercase" style={{ color: accentLight, letterSpacing: '0.35em' }}>{personal.profession}</p>
                    </div>
                  )}
                </div>
              )}

              <div
                ref={index === 0 ? main.firstBodyRef : undefined}
                className="min-h-0 flex-1 overflow-hidden"
                style={{ padding: `${index === 0 ? 0 : MAIN_PAD_TOP}px ${MAIN_PAD_X}px ${MAIN_PAD_BOTTOM}px` }}
              >
                {main.pages[index]}
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

export default NovaStandardTemplate;
