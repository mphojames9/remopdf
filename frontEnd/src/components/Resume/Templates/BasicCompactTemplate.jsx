import React from 'react';
import { parseBlocks, renderInline } from '../Sections/richText';
import { languageLevelInfo } from '../Sections/LanguageLevelSelect';
import { getSkillLevelLabel } from '../Sections/SkillsField';
import { formatRange } from '../Sections/dateFormat';
import ResumePhoto, { normalizePhotoStyle, PHOTO_SIZES } from '../Sections/ResumePhoto';
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
} from './templateShared';

/**
 * Helios Zenith (id: helios-zenith). A near-black header band with a thick accent rule (amber by default), over
 * a warm stone page with ONE column of sections:
 *
 *   header      photo in a soft frame, the name (first word light, the rest heavy), the profession in spaced
 *               accent capitals, a hairline, then the contact lines with small icons
 *   page 1      personal details (date of birth, nationality ...) as labelled pairs, under the header
 *   sections    in the user's section order. Summary is a white quote card with an accent edge; Experience,
 *               Education, Projects, Certifications and References are timelines (a hairline with a dot on
 *               every entry); Skills are two columns of bars; Languages are two columns with a level tag;
 *               Interests are chips
 *
 * The accent drives the header rule and profession, the timeline dots, quote edge, arrows, bars and labels.
 * It is darkened a little where it is used as TEXT on the pale page, and lightened where it sits on the
 * near-black header, whenever the chosen colour would be hard to read there.
 *
 * The body is a FLAT list of plain elements, measured and split into pages by usePaginatedBlocks. Timeline
 * entries draw their hairline per element (padding, never margin, between the elements of one entry), so the
 * line is unbroken across a page break. Entry heads are <h3>, which the paginator keeps together with the line
 * below them. Page 1 measures the room it really has under the header.
 *
 * Register: id 'helios-zenith' in Templates/index.js, DEFAULT_ACCENT (#F59E0B), TEMPLATE_CARDS in
 * TemplateThumbs.jsx and in TemplateShowcase.jsx, SKILL_LEVEL_DISPLAY in templateSkillLevels.js. A missing
 * accent key falls back to FALLBACK_ACCENT.
 */

/* ------------------------------ Design tokens ------------------------------ */
const FALLBACK_ACCENT = '#F59E0B';
const PAPER = '#FAFAF9'; // stone-50
const HEADER_BG = '#0C0A09'; // stone-950
const S900 = '#1C1917';
const S800 = '#292524';
const S700 = '#44403C';
const S600 = '#57534E';
const S500 = '#78716C';
const S400 = '#A8A29E';
const S300 = '#D6D3D1';
const S200 = '#E7E5E4';
const BODY_FONT = `system-ui, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`;
const SERIF_FONT = `ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif`;
const MONO_FONT = `ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace`;

// Geometry (px). The hidden measuring box must be exactly as wide as the real body.
const PAGE_PAD = 40;
const BODY_W = 794 - PAGE_PAD * 2; // 714
const BODY_PAD_BOTTOM = 32; // the paginator keeps a further 48px clear above it for the page number
const MAX_HEIGHT = PAGE_HEIGHT_PX - PAGE_PAD - BODY_PAD_BOTTOM; // pages 2+; page 1 is measured for real
const HEADER_PAD_X = 48;
const HEADER_W = 794 - HEADER_PAD_X * 2; // 698
const HEADER_GAP = 40; // photo to text

// One entry of a timeline: a hairline down the left edge, content 24px in.
const TL = { marginLeft: 6, borderLeft: `1px solid ${S200}`, paddingLeft: 24 };

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

// The accent, moved step by step (darker on a light background, lighter on a dark one) until it reaches
// `min`:1 contrast. A colour that already reads well is returned untouched.
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
// label / value pairs on the details row; everything else is a contact line with an icon.
const DETAIL_RULES = [
  [/^(born|date of birth|dob)\s*:/i, 'Date of Birth'],
  [/^(nationality|citizenship)\s*:/i, 'Nationality'],
  [/^(gender|sex)\s*:/i, 'Gender'],
  [/^(marital status|civil status)\s*:/i, 'Marital Status'],
  [/^(driver'?s?|driving)\s+licen[cs]e\b/i, "Driver's License"],
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

  if (s.includes('linkedin')) return 'linkedin';
  if (s.includes('github')) return 'link';
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

// The header lists contact lines in this order, whatever order they were entered in.
const KIND_ORDER = ['mail', 'phone', 'pin', 'linkedin', 'globe', 'link', 'dot'];

/* ---------------------------------- Icons ---------------------------------- */
const ContactIcon = ({ kind }) => {
  const common = { 'aria-hidden': true, width: 16, height: 16, viewBox: '0 0 24 24', className: 'shrink-0' };
  if (kind === 'linkedin') {
    return (
      <svg {...common} fill="currentColor">
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
      </svg>
    );
  }
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  return (
    <svg {...common} {...stroke}>
      {kind === 'mail' && <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />}
      {kind === 'phone' && <><rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><path d="M12 18h.01" /></>}
      {kind === 'pin' && <><path d="M12 21s-8-4.5-8-11.8A8 8 0 0112 1.2a8 8 0 018 8C20 16.5 12 21 12 21z" /><circle cx="12" cy="9.2" r="3" /></>}
      {kind === 'globe' && <><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path d="M3.6 9h16.8M3.6 15h16.8" /><path d="M11.5 3a17 17 0 000 18M12.5 3a17 17 0 000 18" /></>}
      {kind === 'link' && <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />}
      {kind === 'dot' && <circle cx="12" cy="12" r="3" fill="currentColor" />}
    </svg>
  );
};

const chunk = (list, n) => list.reduce((rows, item, i) => {
  if (i % n === 0) rows.push([]);
  rows[rows.length - 1].push(item);
  return rows;
}, []);

// The little grey tag beside an entry's title (dates, a project link).
const Pill = ({ children, plain }) => (
  <span
    className="shrink-0"
    style={{
      fontSize: 10,
      fontWeight: 800,
      lineHeight: 1.4,
      letterSpacing: '0.05em',
      textTransform: plain ? 'none' : 'uppercase',
      color: S600,
      backgroundColor: 'rgba(231, 229, 228, 0.6)',
      border: '1px solid rgba(214, 211, 209, 0.5)',
      borderRadius: 6,
      padding: '2px 10px',
      ...(plain ? { maxWidth: '55%', overflowWrap: 'anywhere' } : null),
    }}
  >
    {children}
  </span>
);

/* -------------------------------- Template -------------------------------- */
const HeliosZenithTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, summary, hobbies, languages, projects, references, certificates, isEmpty, sectionOrder, edit } = props;
  const personal = props.personal || {};
  const accent = props.accentColor || DEFAULT_ACCENT['helios-zenith'] || FALLBACK_ACCENT;
  const accentText = readableOn(accent, PAPER, 3); // accent used as text on the pale page
  const accentOnDark = readableOn(accent, HEADER_BG, 4.5); // accent used as text on the header band
  const accentRule = readableOn(accent, HEADER_BG, 3); // the header rule and photo dot, so a dark accent still shows on the band
  const order = Array.isArray(sectionOrder) ? sectionOrder : [];

  /* ------------------------------- Shared bits ------------------------------ */
  const heading = (key, title) => (
    <h3
      key={`${key}-h`}
      className="mb-5 flex items-center"
      style={{ gap: 12, fontFamily: SERIF_FONT, fontSize: 18, fontWeight: 700, lineHeight: 1.4, letterSpacing: '0.05em', textTransform: 'uppercase', color: S900 }}
    >
      <span aria-hidden="true" className="shrink-0 rounded-full" style={{ width: 6, height: 6, backgroundColor: accent }} />
      {title}
    </h3>
  );

  // Head of a timeline entry: dot, title (+ tag on the right), then an accent line (+ small caps on the right).
  // `last` closes the entry's hairline when nothing follows it.
  const entryHead = ({ key, title, pill, plainPill, sub, subRight, titleSize = 15, subSize = 13, last = false }) => (
    <h3 key={key} className="relative font-normal" style={{ ...TL, paddingTop: 4, paddingBottom: last ? 8 : 0 }}>
      <span
        aria-hidden="true"
        className="absolute rounded-full"
        style={{ left: -4.5, top: 7, width: 8, height: 8, backgroundColor: accent, boxShadow: `0 0 0 4px ${PAPER}` }}
      />
      <div className="flex items-baseline justify-between" style={{ gap: 16 }}>
        <span className="min-w-0 break-words" style={{ fontSize: titleSize, fontWeight: 700, lineHeight: 1.4, letterSpacing: '-0.01em', color: S900 }}>{title}</span>
        {pill && <Pill plain={plainPill}>{pill}</Pill>}
      </div>
      {(sub || subRight) && (
        <div className="flex items-baseline justify-between" style={{ gap: 16, marginTop: 2 }}>
          <span className="min-w-0 break-words" style={{ fontSize: subSize, fontWeight: 600, lineHeight: 1.4, letterSpacing: '0.01em', color: accentText }}>{sub}</span>
          {subRight && <span className="ml-auto shrink-0" style={{ fontSize: 11, fontWeight: 500, lineHeight: 1.4, letterSpacing: '0.05em', textTransform: 'uppercase', color: S400 }}>{subRight}</span>}
        </div>
      )}
    </h3>
  );

  // The lines under an entry head: "- " lines get an accent arrow. The last one closes the hairline.
  const entryLines = (text, keyPrefix, lastOfEntry = true) => {
    const blocks = parseBlocks(text);
    return blocks.map((block, i) => {
      const key = `${keyPrefix}-${i}`;
      const closes = lastOfEntry && i === blocks.length - 1;
      return (
        <div key={key} className="flex items-start" style={{ ...TL, gap: 10, paddingTop: 6, paddingBottom: closes ? 8 : 0, fontSize: 13.5, lineHeight: 1.625, color: S600 }}>
          {block.bullet && <span aria-hidden="true" className="shrink-0 select-none" style={{ marginTop: 1, fontWeight: 700, color: accentText }}>→</span>}
          <span className="min-w-0 break-words">{renderInline(block.text, key)}</span>
        </div>
      );
    });
  };

  // One timeline entry (head + lines) followed by the space before the next entry.
  const entry = (head, lines) => padLast([head, ...lines], 'mb-6');

  // Section = heading + entries, closed with the space before the next section.
  const timelineSection = (key, title, entries) => (entries.length > 0 ? padLast([heading(key, title), ...entries.flat()], 'mb-8') : []);

  /* -------------------------------- Sections -------------------------------- */
  const summaryBlocks = () => {
    const lines = summary ? parseBlocks(summary) : [];
    if (lines.length === 0) return [];
    return padLast(lines.map((block, i) => {
      const first = i === 0;
      const last = i === lines.length - 1;
      const key = `summary-${i}`;
      return (
        <div
          key={key}
          className="relative flex items-start"
          style={{
            gap: 10,
            backgroundColor: '#FFFFFF',
            borderLeft: `3px solid ${accent}`,
            borderTopRightRadius: first ? 12 : 0,
            borderBottomRightRadius: last ? 12 : 0,
            padding: `${first ? 24 : 0}px 24px ${last ? 24 : 6}px 36px`,
            fontFamily: SERIF_FONT,
            fontStyle: 'italic',
            fontSize: 15,
            lineHeight: 1.625,
            color: S700,
          }}
        >
          {first && (
            <span aria-hidden="true" className="pointer-events-none absolute select-none" style={{ left: 10, top: 6, fontSize: 48, lineHeight: 1, color: alpha(accent, 0.3) }}>“</span>
          )}
          {block.bullet && <span aria-hidden="true" className="shrink-0 select-none" style={{ fontStyle: 'normal', fontWeight: 700, color: accentText }}>→</span>}
          <span className="min-w-0 break-words">{renderInline(block.text, key)}</span>
        </div>
      );
    }), 'mb-8');
  };

  const experienceBlocks = () => timelineSection('experience', 'Professional Experience', jobs.map((job) => {
    const place = [job.location, job.remote ? 'Remote' : ''].filter(Boolean).join(' · ');
    const hasLines = parseBlocks(job.achievements).length > 0;
    return entry(
      entryHead({ key: `job-${job.id}-head`, title: job.title || job.employer, pill: jobDates(job), sub: job.title ? job.employer : '', subRight: place, last: !hasLines }),
      entryLines(job.achievements, `job-${job.id}-ach`),
    );
  }));

  const educationBlocks = () => timelineSection('education', 'Education History', educations.map((ed) => {
    const degree = [ed.degree, ed.field].filter(Boolean).join(', ');
    const hasLines = parseBlocks(ed.achievements).length > 0;
    return entry(
      entryHead({ key: `education-${ed.id}-head`, title: degree || ed.institution, pill: ed.date, sub: degree ? ed.institution : '', subRight: ed.location, last: !hasLines }),
      entryLines(ed.achievements, `education-${ed.id}-ach`),
    );
  }));

  const projectItems = (projects?.items || []).filter((p) => p.title || p.description);
  const projectBlocks = () => (projects?.enabled ? timelineSection('projects', 'Featured Projects', projectItems.map((p) => {
    const hasLines = parseBlocks(p.description).length > 0;
    return entry(
      entryHead({ key: `project-${p.id}-head`, title: p.title || 'Project', pill: p.link, plainPill: true, last: !hasLines }),
      entryLines(p.description, `project-${p.id}-desc`),
    );
  })) : []);

  const certificateItems = (certificates?.items || []).filter((c) => c.name || c.issuer);
  const certificateBlocks = () => (certificates?.enabled ? timelineSection('certificates', 'Certifications', certificateItems.map((c) => {
    const hasLink = !!c.link;
    const hasLines = parseBlocks(c.description).length > 0;
    return entry(
      entryHead({
        key: `certificate-${c.id}-head`,
        title: c.name || c.issuer,
        pill: c.date ? formatRange(c.date) : '',
        sub: c.name ? c.issuer : '',
        titleSize: 14,
        subSize: 12.5,
        last: !hasLink && !hasLines,
      }),
      [
        ...(hasLink ? [(
          <div key={`certificate-${c.id}-link`} className="break-all" style={{ ...TL, paddingTop: 4, paddingBottom: hasLines ? 0 : 8, fontFamily: MONO_FONT, fontSize: 11.5, lineHeight: 1.5, color: S500 }}>{c.link}</div>
        )] : []),
        ...entryLines(c.description, `certificate-${c.id}-desc`),
      ],
    );
  })) : []);

  const referenceItems = (references?.items || []).filter((r) => r.name);
  const referenceBlocks = () => {
    if (!references?.enabled) return [];
    if (references.availableUponRequest) {
      return padLast([
        heading('references', 'References'),
        <p key="references-note" style={{ paddingLeft: 16, fontSize: 13.5, lineHeight: 1.625, color: S600 }}>Available upon request.</p>,
      ], 'mb-8');
    }
    return timelineSection('references', 'References', referenceItems.map((r) => entry(
      entryHead({ key: `reference-${r.id ?? r.name}-head`, title: r.name, sub: r.relationship, titleSize: 14, subSize: 12.5, last: !r.contact }),
      r.contact ? [(
        <div key={`reference-${r.id ?? r.name}-contact`} className="break-all" style={{ ...TL, paddingTop: 4, paddingBottom: 8, fontFamily: MONO_FONT, fontSize: 12.5, lineHeight: 1.5, letterSpacing: '-0.01em', color: S500 }}>{r.contact}</div>
      )] : [],
    )));
  };

  const skillBlocks = () => (namedSkills.length > 0 ? padLast([
    heading('skills', 'Core Expertise'),
    ...chunk(namedSkills, 2).map((pair, i) => (
      <div key={`skill-row-${i}`} className="mb-3 grid grid-cols-2" style={{ columnGap: 32, paddingLeft: 18 }}>
        {pair.map((s) => {
          const rating = skillRating(s);
          return (
            <div key={`skill-${s.id}`} className="min-w-0" title={rating > 0 ? getSkillLevelLabel(rating) : undefined}>
              <div className="break-words" style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.4, color: S800, marginBottom: rating > 0 ? 4 : 0 }}>{s.text}</div>
              {rating > 0 && (
                <div className="w-full overflow-hidden rounded-full" style={{ height: 4, backgroundColor: 'rgba(231, 229, 228, 0.7)' }}>
                  <div className="h-full rounded-full" style={{ width: `${(rating / 5) * 100}%`, backgroundImage: `linear-gradient(90deg, ${accent}, ${tint(accent, -0.12)})` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    )),
  ], 'mb-8') : []);

  const languageItems = (languages?.items || []).filter((l) => l.name);
  const languageBlocks = () => (languages?.enabled && languageItems.length > 0 ? padLast([
    heading('languages', 'Languages'),
    ...chunk(languageItems, 2).map((pair, i) => (
      <div key={`language-row-${i}`} className="mb-2 grid grid-cols-2" style={{ columnGap: 32, paddingLeft: 16 }}>
        {pair.map((l) => {
          const { label } = languageLevelInfo(l);
          return (
            <div key={`language-${l.id ?? l.name}`} className="flex min-w-0 items-center justify-between" style={{ gap: 8, paddingBottom: 4, borderBottom: `1px solid ${alpha(S300, 0.6)}`, fontSize: 13.5, lineHeight: 1.5 }}>
              <span className="min-w-0 break-words" style={{ fontWeight: 700, color: S800 }}>{l.name}</span>
              {label && (
                <span
                  className="shrink-0"
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    lineHeight: 1.4,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: accentText,
                    backgroundColor: alpha(accent, 0.1),
                    border: `1px solid ${alpha(accent, 0.25)}`,
                    borderRadius: 4,
                    padding: '2px 8px',
                  }}
                >
                  {label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    )),
  ], 'mb-8') : []);

  const hobbyLines = hobbies?.enabled && hobbies.text ? parseBlocks(hobbies.text) : [];
  const hobbyBlocks = () => (hobbyLines.length > 0 ? padLast([
    heading('hobbies', 'Interests'),
    <div key="hobby-chips" className="flex flex-wrap" style={{ gap: 8, paddingLeft: 16 }}>
      {hobbyLines.map((b, i) => (
        <span
          key={`hobby-${i}`}
          className="inline-flex items-center"
          style={{ gap: 8, padding: '6px 12px', fontSize: 13, fontWeight: 700, lineHeight: 1.4, color: S700, backgroundColor: '#FFFFFF', border: `1px solid ${S200}`, borderRadius: 8 }}
        >
          <span aria-hidden="true" className="shrink-0 rounded-full" style={{ width: 4, height: 4, backgroundColor: accent }} />
          <span className="break-words">{renderInline(b.text, `hobby-${i}`)}</span>
        </span>
      ))}
    </div>,
  ], 'mb-8') : []);

  /* ------------------------ Details, contact, ordering ----------------------- */
  const allLines = (contactList || []).filter((c) => typeof c === 'string' && c.trim());
  const details = [];
  const contacts = [];
  allLines.forEach((line) => {
    const d = parseDetail(line);
    if (d) details.push(d); else contacts.push(line);
  });
  const contactKinds = resolveContactKinds(contacts);
  const contactRows = contacts
    .map((text, i) => ({ text, kind: contactKinds[i], i }))
    .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.i - b.i);

  const detailBlocks = details.length > 0 ? padLast([(
    <div key="details" className="flex flex-wrap" style={{ columnGap: 40, rowGap: 16, paddingBottom: 24, borderBottom: `1px solid ${alpha(S200, 0.8)}` }}>
      {details.map((d) => (
        <div key={d.label} className="flex flex-col" style={{ gap: 2 }}>
          <span style={{ fontSize: 10, fontWeight: 700, lineHeight: 1.4, letterSpacing: '0.1em', textTransform: 'uppercase', color: accentText }}>{d.label}</span>
          <span className="break-words" style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.4, color: S800 }}>{d.value}</span>
        </div>
      ))}
    </div>
  )], 'mb-8') : [];

  const builders = {
    summary: summaryBlocks,
    experience: experienceBlocks,
    education: educationBlocks,
    certificates: certificateBlocks,
    skills: skillBlocks,
    projects: projectBlocks,
    languages: languageBlocks,
    hobbies: hobbyBlocks,
    references: referenceBlocks,
  };
  const blocks = [
    ...markSection(edit, 'personal', detailBlocks, false),
    ...order.filter((key) => builders[key]).flatMap((key) => markSection(edit, key, builders[key]())),
  ];

  /* ------------------------------ Pagination ------------------------------- */
  const { pages, measureContainerRef, firstBodyRef, measureContent } = usePaginatedBlocks(blocks, MAX_HEIGHT);
  const pageCount = Math.max(1, pages.length);

  /* --------------------------------- Header -------------------------------- */
  const nameWords = (fullName || 'Your Name').trim().split(/\s+/);

  // Size the name so the longest word fits the room beside the photo.
  const photoLook = normalizePhotoStyle(personal.photoStyle);
  const photoPx = (PHOTO_SIZES.find((s) => s.value === photoLook.size) || PHOTO_SIZES[1]).px;
  const photoBox = personal.photo ? photoPx + 14 + HEADER_GAP : 0; // frame (6px padding + 1px border each side) + gap
  const nameRoom = HEADER_W - photoBox;
  const longestWord = Math.max(1, ...nameWords.flatMap((w) => w.split('-')).map((w) => w.length));
  const nameSize = Math.max(26, Math.min(48, Math.floor(nameRoom / (longestWord * 0.8))));
  const hasContact = contactRows.length > 0;

  const header = (
    <header {...editAttrs(edit, 'personal')} className="flex w-full shrink-0 items-center" style={{ gap: HEADER_GAP, padding: `40px ${HEADER_PAD_X}px`, backgroundColor: HEADER_BG, borderBottom: `4px solid ${accentRule}`, color: S300 }}>
      {personal.photo && (
        <div className="relative shrink-0" style={{ padding: 6, borderRadius: 16, border: `1px solid ${S800}`, backgroundColor: 'rgba(28, 25, 23, 0.5)', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)' }}>
          <ResumePhoto src={personal.photo} style={personal.photoStyle} borderColor={accent} />
          <span aria-hidden="true" className="absolute rounded-full" style={{ right: -4, bottom: -4, width: 16, height: 16, backgroundColor: accentRule, border: `4px solid ${HEADER_BG}` }} />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 20 }}>
        <div className="flex flex-col" style={{ gap: 4, paddingBottom: hasContact ? 20 : 0, borderBottom: hasContact ? `1px solid ${alpha(S800, 0.8)}` : 'none' }}>
          <h1 className="flex flex-wrap uppercase" style={{ columnGap: 12, fontFamily: SERIF_FONT, fontSize: nameSize, fontWeight: 400, lineHeight: 1.05, letterSpacing: '-0.025em', color: '#FFFFFF' }}>
            {nameWords.map((word, i) => (
              <span key={i} className="break-words" style={i === 0 ? { fontWeight: 300 } : { fontWeight: 900, color: S300 }}>{word}</span>
            ))}
          </h1>
          {personal.profession && (
            <p className="break-words uppercase" style={{ marginTop: 8, marginLeft: 4, fontSize: 12, fontWeight: 900, lineHeight: 1.5, letterSpacing: '0.3em', color: accentOnDark }}>{personal.profession}</p>
          )}
        </div>

        {hasContact && (
          <div className="flex flex-wrap" style={{ columnGap: 32, rowGap: 12, paddingLeft: 4 }}>
            {contactRows.map(({ text, kind, i }) => (
              <div key={`contact-${i}`} className="flex items-center" style={{ gap: 8, color: S500 }}>
                <ContactIcon kind={kind} />
                <span className="[overflow-wrap:anywhere]" style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4, color: S300 }}>{text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </header>
  );

  return (
    <>
      {/* Hidden copy of every block, as wide as the real body. A plain block container, like the real body. */}
      <div ref={measureContainerRef} className="pointer-events-none absolute" style={{ top: -9999, left: -9999, width: BODY_W, fontFamily: BODY_FONT, lineHeight: 1.5 }}>
        {measureContent}
      </div>

      {Array.from({ length: pageCount }, (_, index) => (
        <A4Page key={index} pageNum={index + 1} totalPages={pageCount}>
          <div className="relative flex h-full w-full flex-col text-left" style={{ fontFamily: BODY_FONT, lineHeight: 1.5, color: S800, backgroundColor: PAPER, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            {index === 0 && header}

            <div className="flex min-h-0 flex-1 flex-col" style={{ padding: `${PAGE_PAD}px ${PAGE_PAD}px ${BODY_PAD_BOTTOM}px` }}>
              <div ref={index === 0 ? firstBodyRef : undefined} className="min-h-0 flex-1 overflow-hidden" style={{ width: BODY_W }}>
                {pages[index]}
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

export default HeliosZenithTemplate;
