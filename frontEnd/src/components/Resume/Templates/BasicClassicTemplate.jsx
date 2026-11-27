import React from 'react';
import { parseBlocks, renderInline } from '../Sections/richText';
import ResumePhoto from '../Sections/ResumePhoto';
import { languageLevelInfo } from '../Sections/LanguageLevelSelect';
import { getSkillLevelLabel } from '../Sections/SkillsField';
import { formatRange } from '../Sections/dateFormat';
import {
  PAGE_HEIGHT_PX,
  PAGE_WIDTH_PX,
  tint,
  jobDates,
  skillRating,
  DEFAULT_ACCENT,
  usePaginatedBlocks,
  A4Page,
  padLast,
  editAttrs,
  markSection,
  SectionControls,
} from './templateShared';

/**
 * Quantum Obsidian (id: quantum-obsidian). A single-column page under a full-width obsidian header band: square
 * photo with an offset cyan shadow, name with the surname(s) in cyan, a monospace "> profession" line and the
 * contact lines in a row. Below the band: personal details, a summary card with a cyan edge, and sections whose
 * entries hang on a thin timeline with diamond markers and boxed date tags. Skills sit in two columns with
 * square bars; Languages and Interests share one two-column block.
 *
 *   header   photo, name, profession, contact lines (page 1 only)
 *   body     Details, Summary, Experience, Education, Skills, Projects, Certifications, Languages | Interests,
 *            References (in the user's order; Languages | Interests sit where the first of the two is)
 *
 * Colours: with the default accent the page uses the original cyan / zinc / slate palette exactly. When the
 * user picks another accent, a matching cyan-family palette is derived from it, and on the dark header a
 * lightened copy is used when the accent is too dark to read there.
 *
 * Decorative text ("// INIT_SUMMARY", the "> " before the profession, the "#" on interest chips) is drawn with CSS
 * pseudo-elements. The PDF export builds its invisible text layer from the page's text nodes, so real text here
 * would end up in the text that applicant tracking systems read.
 *
 * Everything in the body is a FLAT list of plain elements, so long sections split cleanly across pages. The
 * timeline line is drawn per element (border-left), so it stays continuous when an entry continues on the next page.
 *
 * Register: id 'quantum-obsidian' in Templates/index.js, DEFAULT_ACCENT (#06b6d4), TEMPLATE_CARDS in
 * TemplateThumbs.jsx and in TemplateShowcase.jsx. A missing accent key falls back to BASE_ACCENT.
 */

/* ------------------------------ Design tokens ------------------------------ */
const FONT = `ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`;
const MONO = `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace`;
const BASE_ACCENT = '#06b6d4'; // cyan-500

const ZINC_950 = '#09090b';
const ZINC_900 = '#18181b';
const ZINC_800 = '#27272a';
const SLATE_50_HALF = 'rgba(248, 250, 252, 0.5)';
const SLATE_100 = '#f1f5f9';
const SLATE_200 = '#e2e8f0';
const SLATE_200_SOFT = 'rgba(226, 232, 240, 0.8)';
const SLATE_300 = '#cbd5e1';
const SLATE_400 = '#94a3b8';
const SLATE_500 = '#64748b';
const SLATE_600 = '#475569';
const SLATE_700 = '#334155';
const SLATE_800 = '#1e293b';

// The original cyan family.
const BASE_PALETTE = {
  c400: '#22d3ee', c500: '#06b6d4', c600: '#0891b2', c700: '#0e7490', c50: '#ecfeff', c100: '#cffafe',
  onDark: '#0891b2', // header icons
  photoShadow: 'rgba(6, 182, 212, 0.2)',
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

const alpha = (hex, a) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

// tint(hex, +x) mixes with white, tint(hex, -x) mixes with black.
const buildPalette = (accent) => {
  if (!accent || String(accent).toLowerCase() === BASE_ACCENT) return BASE_PALETTE;
  const dark = luminance(accent) < 0.25;
  return {
    c400: dark ? tint(accent, 0.55) : tint(accent, 0.2), // name on the dark header
    c500: accent,
    c600: tint(accent, -0.15),
    c700: tint(accent, -0.3),
    c50: tint(accent, 0.93),
    c100: tint(accent, 0.85),
    onDark: dark ? tint(accent, 0.45) : tint(accent, -0.1), // icons on the dark header
    photoShadow: alpha(accent, 0.2),
  };
};

// Geometry (px). The hidden measuring box must be exactly as wide as the real page body.
const PAD_X = 40;
const PAD_TOP = 40;
const PAD_BOTTOM = 32; // the paginator keeps a further 48px clear above it for the page number
const CONTENT_W = PAGE_WIDTH_PX - PAD_X * 2;
const MAX_HEIGHT = PAGE_HEIGHT_PX - PAD_TOP - PAD_BOTTOM; // pages 2+
const TIMELINE_INDENT = 6; // ml-1.5

// Languages and Interests share one two-column block.
const PAIR_KEYS = ['languages', 'hobbies'];

/* ------------------------------ Contact lines ------------------------------ */
// The builder hands over one flat list of strings. Personal details ("Born: ...", "Nationality: ...")
// go to the Details row under the header; everything else is a contact line with an icon in the header.
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

// The design lists email, phone, location, LinkedIn, then the website.
const KIND_ORDER = ['mail', 'phone', 'pin', 'linkedin', 'globe', 'github', 'dot'];

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
    <svg viewBox="0 0 24 24" width="16" height="16" fill={color} className="shrink-0" aria-hidden="true"><path d={LINKEDIN_FILLED} /></svg>
  ) : (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true">
      {CONTACT_ICONS[name] || CONTACT_ICONS.dot}
    </svg>
  )
);

// Small outlined triangle in front of achievement lines (drawn, not a text glyph, so it never reaches the PDF text layer).
const Arrow = ({ color }) => (
  <svg viewBox="0 0 10 10" width="8" height="8" fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" className="shrink-0" style={{ marginTop: 7 }} aria-hidden="true">
    <path d="M2 1.2 8 5 2 8.8z" />
  </svg>
);

/* -------------------------------- Template -------------------------------- */
const QuantumObsidianTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, certificates, isEmpty, sectionOrder, edit } = props;
  const accent = props.accentColor || DEFAULT_ACCENT['quantum-obsidian'] || BASE_ACCENT;
  const C = buildPalette(accent);

  /* ----------------------------- Small helpers ----------------------------- */
  const heading = (key, text) => (
    <h3
      key={`${key}-h`}
      className="mb-5 mt-2 flex shrink-0 items-center gap-3 text-lg font-black uppercase"
      style={{ color: ZINC_900, letterSpacing: '0.15em' }}
    >
      <span aria-hidden="true" className="shrink-0" style={{ width: 6, height: 6, backgroundColor: C.c500, transform: 'rotate(45deg)' }} />
      <span>{text}</span>
    </h3>
  );

  // One element of a timeline entry. Each element draws its own piece of the vertical line (border-left), so the
  // line carries on across a page break. The first element of an entry also carries the diamond.
  // `keepWithNext` makes it an <h3>, which the paginator never leaves alone at the bottom of a page.
  const timeline = (key, content, isFirst, pt, pb, keepWithNext) => {
    const Tag = keepWithNext ? 'h3' : 'div';
    return (
      <Tag
        key={key}
        className="relative shrink-0 border-l pl-6 text-left"
        style={{ marginLeft: TIMELINE_INDENT, borderColor: SLATE_200, paddingTop: pt, paddingBottom: pb, fontWeight: 'normal' }}
      >
        {isFirst && (
          <span
            aria-hidden="true"
            className="absolute"
            style={{ width: 8, height: 8, left: -4.5, top: 7, backgroundColor: C.c500, transform: 'rotate(45deg)', boxShadow: '0 0 0 4px #ffffff' }}
          />
        )}
        {content}
      </Tag>
    );
  };

  // rows = [{ el, pt, head }]. The last row carries 8px of line below it and the 24px gap before the next entry.
  const entry = (id, rows) => {
    const list = rows.filter(Boolean);
    return padLast(
      list.map(({ el, pt = 0, head }, i) => timeline(`${id}-${i}`, el, i === 0, pt, i === list.length - 1 ? 8 : 0, Boolean(head) && i < list.length - 1)),
      'mb-6',
    );
  };

  const dateTag = (text) => (
    <span
      className="shrink-0 whitespace-nowrap border font-bold uppercase"
      style={{ fontSize: 10, color: SLATE_600, backgroundColor: SLATE_100, borderColor: SLATE_200, padding: '2px 10px', letterSpacing: '0.1em' }}
    >
      {text}
    </span>
  );

  const titleRow = (title, date, size) => (
    <div className="flex items-baseline justify-between gap-4">
      <p className="min-w-0 break-words font-black" style={{ fontSize: size, color: ZINC_900, letterSpacing: '-0.025em', lineHeight: 1.4 }}>{title}</p>
      {date && dateTag(date)}
    </div>
  );

  // Second line of an entry. kind 'company': uppercase cyan. kind 'school': normal case, darker cyan.
  const metaRow = (primary, secondary, kind = 'company') => (
    <div className="flex items-baseline justify-between gap-4">
      {primary ? (
        <p
          className={`min-w-0 break-words font-bold${kind === 'company' ? ' uppercase' : ''}`}
          style={{ fontSize: 13, color: kind === 'company' ? C.c600 : C.c700, letterSpacing: kind === 'company' ? '0.05em' : '0.025em', lineHeight: 1.5 }}
        >
          {primary}
        </p>
      ) : <span />}
      {secondary && <p className="shrink-0 whitespace-nowrap font-semibold uppercase" style={{ fontSize: 11, color: SLATE_400, letterSpacing: '0.1em' }}>{secondary}</p>}
    </div>
  );

  // Detail line: a bullet line gets the triangle, a plain line stays a paragraph.
  const detailLine = (block, key) => (
    <div className="flex items-start gap-2.5" style={{ fontSize: 13.5, lineHeight: 1.625, color: SLATE_600 }}>
      {block.bullet && <Arrow color={C.c500} />}
      <span className="min-w-0 break-words">{renderInline(block.text, key)}</span>
    </div>
  );
  const bodyRows = (text, keyPrefix) => parseBlocks(text).map((block, i) => ({ el: detailLine(block, `${keyPrefix}-${i}`), pt: 6 }));

  /* ------------------------------ Details row ------------------------------ */
  const allLines = (contactList || []).filter((c) => typeof c === 'string' && c.trim());
  const details = [];
  const contacts = [];
  allLines.forEach((line) => {
    const d = parseDetail(line);
    if (d) details.push(d); else contacts.push({ text: line });
  });
  const kinds = resolveContactKinds(contacts.map((c) => c.text));
  contacts.forEach((c, i) => { c.kind = kinds[i]; });
  contacts.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)); // stable: same kind keeps the user's order

  const detailBlocks = details.length > 0 ? markSection(edit, 'personal', [
    <div key="details" className="mb-8 flex shrink-0 flex-wrap border-b pb-6" style={{ columnGap: 40, rowGap: 16, borderColor: SLATE_200_SOFT }}>
      {details.map((d) => (
        <div key={d.label} className="flex flex-col" style={{ gap: 2 }}>
          <span className="font-bold uppercase" style={{ fontSize: 10, color: C.c600, letterSpacing: '0.1em' }}>{d.label}</span>
          <span className="break-words font-bold" style={{ fontSize: 13, color: SLATE_800 }}>{d.value}</span>
        </div>
      ))}
    </div>,
  ], false) : [];

  /* ------------------------------ Row sections ----------------------------- */
  const projectItems = (projects?.items || []).filter((p) => p.title || p.description);
  const certificateItems = (certificates?.items || []).filter((c) => c.name || c.issuer);
  const referenceItems = (references?.items || []).filter((r) => r.name);
  const summaryBlocks = summary ? parseBlocks(summary) : [];

  const sectionMap = {
    // No heading, exactly like the original design: one card with a cyan edge. A single element so the card stays whole.
    summary: summaryBlocks.length > 0 ? [
      <div
        key="summary-card"
        className="qo-summary-tag relative mb-8 shrink-0"
        style={{ fontSize: 14, lineHeight: 1.625, color: SLATE_700, fontWeight: 500, backgroundColor: SLATE_50_HALF, padding: 24, borderLeft: `4px solid ${C.c500}` }}
      >
        <style>{`.qo-summary-tag::after{content:"// INIT_SUMMARY";position:absolute;top:0;right:8px;font-size:10px;line-height:1.6;color:${C.c500};opacity:.4;font-family:${MONO};font-weight:400;pointer-events:none;user-select:none}`}</style>
        {summaryBlocks.map((block, i) => (
          <div key={`summary-${i}`} className="flex items-start gap-2.5 break-words" style={{ marginBottom: i < summaryBlocks.length - 1 ? 8 : 0 }}>
            {block.bullet && <Arrow color={C.c500} />}
            <span className="min-w-0">{renderInline(block.text, `summary-${i}`)}</span>
          </div>
        ))}
      </div>,
    ] : [],

    experience: jobs.length > 0 ? [
      heading('experience', 'Professional Experience'),
      ...jobs.flatMap((job) => {
        const id = `job-${job.id}`;
        const place = [job.location, job.remote ? 'Remote' : ''].filter(Boolean).join(' · ');
        const head = job.title || job.employer;
        const sub = job.title ? job.employer : '';
        return entry(id, [
          { el: titleRow(head, jobDates(job), 15), pt: 4, head: true },
          (sub || place) && { el: metaRow(sub, place, 'company'), pt: 2, head: true },
          ...bodyRows(job.achievements, `${id}-ach`),
        ]);
      }),
    ] : [],

    education: educations.length > 0 ? [
      heading('education', 'Education History'),
      ...educations.flatMap((ed) => {
        const id = `education-${ed.id}`;
        const title = [ed.degree, ed.field].filter(Boolean).join(', ') || ed.institution;
        const school = title === ed.institution ? '' : ed.institution;
        return entry(id, [
          { el: titleRow(title, ed.date, 15), pt: 4, head: true },
          (school || ed.location) && { el: metaRow(school, ed.location, 'school'), pt: 2, head: true },
          ...bodyRows(ed.achievements, `${id}-ach`),
        ]);
      }),
    ] : [],

    projects: projects?.enabled && projectItems.length > 0 ? [
      heading('projects', 'Featured Projects'),
      ...projectItems.flatMap((p) => {
        const id = `project-${p.id}`;
        return entry(id, [
          { el: titleRow(p.title || 'Project', '', 15), pt: 4, head: true },
          p.link && { el: <p className="break-all" style={{ fontSize: 12, color: SLATE_500 }}>{p.link}</p>, pt: 2, head: true },
          ...bodyRows(p.description, `${id}-desc`),
        ]);
      }),
    ] : [],

    certificates: certificates?.enabled && certificateItems.length > 0 ? [
      heading('certificates', 'Certifications'),
      ...certificateItems.flatMap((c) => {
        const id = `certificate-${c.id}`;
        return entry(id, [
          { el: titleRow(c.name || c.issuer, c.date ? formatRange(c.date) : '', 14), pt: 4, head: true },
          c.name && c.issuer && {
            el: <p className="break-words font-bold uppercase" style={{ fontSize: 12.5, color: C.c600, letterSpacing: '0.05em' }}>{c.issuer}</p>,
            pt: 2,
            head: true,
          },
          c.link && { el: <p className="break-all" style={{ fontSize: 12, color: SLATE_500 }}>{c.link}</p>, pt: 2, head: true },
          ...bodyRows(c.description, `${id}-desc`),
        ]);
      }),
    ] : [],

    references: references?.enabled && (references.availableUponRequest || referenceItems.length > 0) ? [
      heading('references', 'References'),
      ...(references.availableUponRequest
        ? entry('references-note', [{ el: <p style={{ fontSize: 13.5, color: SLATE_600 }}>Available upon request.</p>, pt: 4 }])
        : referenceItems.flatMap((r) => entry(`reference-${r.id}`, [
          { el: <p className="break-words font-black" style={{ fontSize: 14, color: ZINC_900, letterSpacing: '-0.025em', lineHeight: 1.4 }}>{r.name}</p>, pt: 4, head: true },
          r.relationship && {
            el: <p className="break-words font-bold uppercase" style={{ fontSize: 12.5, color: C.c600, letterSpacing: '0.05em' }}>{r.relationship}</p>,
            pt: 2,
            head: true,
          },
          r.contact && { el: <p className="break-all" style={{ fontFamily: MONO, fontSize: 12.5, color: SLATE_500, letterSpacing: '-0.025em' }}>{r.contact}</p>, pt: 4 },
        ]))),
    ] : [],
  };

  /* --------------------------------- Skills --------------------------------- */
  const skillItems = namedSkills.map((s) => ({ id: s.id, text: s.text, rating: skillRating(s) }));
  const skillRows = [];
  for (let i = 0; i < skillItems.length; i += 2) skillRows.push(skillItems.slice(i, i + 2));

  const skillCell = (s) => (
    <div className="flex w-full flex-col gap-1.5" title={s.rating > 0 ? getSkillLevelLabel(s.rating) : undefined}>
      <div className="break-words font-bold" style={{ fontSize: 13, color: SLATE_800, letterSpacing: '-0.025em', lineHeight: 1.4 }}>{s.text}</div>
      {s.rating > 0 && (
        <div className="relative w-full" style={{ height: 4, backgroundColor: SLATE_200 }}>
          <div className="absolute left-0 top-0" style={{ height: '100%', width: `${(s.rating / 5) * 100}%`, backgroundColor: C.c500 }} />
        </div>
      )}
    </div>
  );

  sectionMap.skills = skillItems.length > 0 ? [
    heading('skills', 'Core Expertise'),
    // Two skills per row, as in the original two-column grid. The left padding lines the grid up with the timeline text.
    ...padLast(skillRows.map((row, i) => (
      <div key={`skill-row-${i}`} className="mb-4 grid shrink-0 grid-cols-2" style={{ columnGap: 40, paddingLeft: 18 }}>
        {skillCell(row[0])}
        {row[1] ? skillCell(row[1]) : <div />}
      </div>
    )), 'mb-8'),
  ] : [];

  /* ------------------------- Languages | Interests block ------------------------ */
  const languageItems = (languages?.items || []).filter((l) => l.name);
  const hobbyBlocks = hobbies?.enabled && hobbies.text ? parseBlocks(hobbies.text) : [];
  const visiblePairKeys = PAIR_KEYS.filter((key) => (sectionOrder || []).includes(key));
  const showLanguages = visiblePairKeys.includes('languages') && languages?.enabled && languageItems.length > 0;
  const showHobbies = visiblePairKeys.includes('hobbies') && hobbyBlocks.length > 0;

  const columnHeading = (key, text) => (
    <div
      role="heading"
      aria-level={2}
      className="relative flex items-center gap-2.5 text-base font-black uppercase"
      style={{ color: ZINC_900, letterSpacing: '0.15em' }}
    >
      <span aria-hidden="true" className="shrink-0" style={{ width: 6, height: 6, backgroundColor: C.c500, transform: 'rotate(45deg)' }} />
      <span>{text}</span>
      {edit && edit.enabled && <SectionControls label={text} onEdit={() => edit.onEdit(key)} onRemove={() => edit.onRemove(key)} />}
    </div>
  );

  const pairBlocks = (showLanguages || showHobbies) ? [
    <div key="pair-block" className="mb-8 mt-2 flex shrink-0 flex-row pb-2" style={{ gap: 40 }}>
      <style>{`.qo-chip::before{content:"#";color:${C.c500};font-size:10px}`}</style>
      {showLanguages && (
        <div {...editAttrs(edit, 'languages')} className="flex min-w-0 flex-1 flex-col gap-4">
          {columnHeading('languages', 'Languages')}
          <div className="flex flex-col border-l" style={{ gap: 10, paddingLeft: 16, marginLeft: 4, borderColor: SLATE_100 }}>
            {languageItems.map((l) => {
              const { label } = languageLevelInfo(l);
              return (
                <div key={`language-${l.id}`} className="flex items-center justify-between gap-2 border-b" style={{ fontSize: 13.5, paddingBottom: 6, borderColor: SLATE_200_SOFT }}>
                  <span className="break-words font-bold" style={{ color: SLATE_800 }}>{l.name}</span>
                  {label && (
                    <span
                      className="shrink-0 border font-bold uppercase"
                      style={{ fontSize: 10, color: C.c700, backgroundColor: C.c50, borderColor: C.c100, padding: '2px 8px', letterSpacing: '0.1em' }}
                    >
                      {label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {showHobbies && (
        <div {...editAttrs(edit, 'hobbies')} className="flex min-w-0 flex-1 flex-col gap-4">
          {columnHeading('hobbies', 'Interests')}
          <div className="flex flex-wrap border-l" style={{ gap: 10, paddingLeft: 16, marginLeft: 4, borderColor: SLATE_100 }}>
            {hobbyBlocks.map((block, i) => (
              <div
                key={`hobby-${i}`}
                className="qo-chip inline-flex items-center gap-2 border bg-white font-bold"
                style={{ fontSize: 12.5, color: SLATE_600, borderColor: SLATE_200, padding: '4px 12px', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)' }}
              >
                {renderInline(block.text, `hobby-${i}`)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>,
  ] : [];

  /* ---------------------------- Put it in order ---------------------------- */
  const allBlocks = [...detailBlocks];
  let pairPlaced = false;
  (sectionOrder || []).forEach((key) => {
    if (PAIR_KEYS.includes(key)) {
      if (!pairPlaced) { pairPlaced = true; allBlocks.push(...pairBlocks); }
      return;
    }
    // Summary has no heading in this design, so it is clickable in edit mode but gets no pencil / bin on top of its text.
    allBlocks.push(...markSection(edit, key, sectionMap[key] || [], key !== 'summary'));
  });

  const main = usePaginatedBlocks(allBlocks, MAX_HEIGHT);
  const { pages, measureContainerRef, firstBodyRef, measureContent } = main;

  /* ---------------------------------- Header ---------------------------------- */
  const name = (fullName || 'Your Name').trim();
  const nameWords = name.split(/\s+/);
  const nameSize = name.length <= 14 ? 48 : name.length <= 18 ? 40 : name.length <= 24 ? 32 : 26;
  const professionParts = ((personal && personal.profession) || '').split('|').map((p) => p.trim()).filter(Boolean);
  const hasPhoto = Boolean(personal && personal.photo);

  return (
    <>
      {/* Hidden copy of every element, as wide as the real page body. A flex column, like the real body, so margins add up the same way. */}
      <div
        ref={measureContainerRef}
        className="pointer-events-none absolute flex flex-col"
        style={{ top: -9999, left: -9999, width: CONTENT_W, fontFamily: FONT }}
      >
        {measureContent}
      </div>

      {pages.map((pageBlocks, index) => (
        <A4Page key={index} pageNum={index + 1} totalPages={pages.length}>
          <div
            className="relative flex h-full w-full flex-col bg-white text-left"
            style={{ fontFamily: FONT, color: SLATE_800, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
          >
            {index === 0 && (
              <div
                {...editAttrs(edit, 'personal')}
                className="relative z-10 flex shrink-0 items-center border-b-4"
                style={{
                  padding: '40px 48px',
                  gap: 40,
                  color: SLATE_300,
                  borderColor: C.c500,
                  backgroundColor: ZINC_950,
                  backgroundImage: `radial-gradient(ellipse at top right, ${ZINC_900}, ${ZINC_950})`,
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                }}
              >
                <style>{`.qo-title::before{content:"> "}`}</style>
                {hasPhoto && (
                  <div
                    className="shrink-0"
                    style={{ width: 144, height: 144, padding: 4, backgroundColor: ZINC_900, borderLeft: `2px solid ${C.c500}`, borderBottom: `2px solid ${C.c500}`, boxShadow: `4px 4px 0 ${C.photoShadow}` }}
                  >
                    <div className="h-full w-full overflow-hidden" style={{ backgroundColor: ZINC_800 }}>
                      <ResumePhoto src={personal.photo} style={{ ...(personal.photoStyle || {}), shape: 'square', border: 'none' }} sizePx={134} />
                    </div>
                  </div>
                )}

                <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 20 }}>
                  <div className="flex flex-col border-b" style={{ gap: 4, paddingBottom: 20, borderColor: ZINC_800 }}>
                    <h1
                      className="flex flex-wrap font-black uppercase"
                      style={{ fontSize: nameSize, lineHeight: 1, letterSpacing: '-0.05em', color: '#ffffff', columnGap: 12, rowGap: 4 }}
                    >
                      {nameWords.map((word, i) => (
                        <span key={i} className="break-words" style={{ color: i >= 1 ? C.c400 : '#ffffff' }}>{word}</span>
                      ))}
                    </h1>
                    {professionParts.length > 0 && (
                      <p
                        className="qo-title break-words font-bold uppercase"
                        style={{ marginTop: 12, fontFamily: MONO, fontSize: 12, color: SLATE_400, letterSpacing: '0.4em', lineHeight: 1.5 }}
                      >
                        {professionParts.join('  /  ')}
                      </p>
                    )}
                  </div>

                  {contacts.length > 0 && (
                    <div className="flex flex-wrap" style={{ columnGap: 32, rowGap: 12, color: SLATE_400 }}>
                      {contacts.map((c, i) => (
                        <div key={`contact-${i}`} className="flex items-center gap-2">
                          <ContactIcon name={c.kind} color={C.onDark} />
                          <span className="break-words font-medium" style={{ fontSize: 13, color: SLATE_300 }}>{c.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex min-h-0 flex-1 flex-col" style={{ padding: `${PAD_TOP}px ${PAD_X}px ${PAD_BOTTOM}px` }}>
              <div ref={index === 0 ? firstBodyRef : undefined} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {pageBlocks}
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

export default QuantumObsidianTemplate;
