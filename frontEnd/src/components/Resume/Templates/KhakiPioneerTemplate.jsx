import React from 'react';
import { renderAchievements } from '../Sections/richText';
import renderCertificates from '../Sections/renderCertificates';
import {
  PAGE_WIDTH_PX,
  PAGE_HEIGHT_PX,
  tint,
  jobDates,
  DEFAULT_ACCENT,
  usePaginatedBlocks,
  A4Page,
  endGroup,
  editAttrs,
  markSection,
  renderExtraSections,
} from './templateShared';

/**
 * Advanced ATS (id: ats-advanced). A single-column, text-only résumé laid out the way applicant tracking systems
 * expect to read it, dressed with a botanical background and a few quiet details.
 *
 *   header   (page 1 only) the name on one line, the profession under it, then the contact details as a
 *            horizontal row of bullets, one detail per bullet, wrapping onto more rows as needed. Everything
 *            is plain text; nothing sits in a side panel. A small flower divider closes the header.
 *   body     one column, top to bottom, in sectionOrder order. Standard section names (Professional Summary,
 *            Work Experience, Education, Skills, Languages ...) each with a thin rule under the heading and a
 *            short accent tick on the rule.
 *            Experience and Education put the title and the dates on one line (dates right-aligned), the
 *            employer or school under it.
 *   skills   plain comma-separated text, so every keyword is a real word in reading order.
 *   languages  plain comma-separated text, with the level written as a word: "English (Native), Spanish (B2)".
 *
 * What is left out on purpose: sidebars, tables, text in columns, icons, level dots or bars, chips, text inside
 * images, and anything that carries meaning only through colour. The accent strip along the top and the rules
 * under the headings are CSS only, so they add nothing to the extracted text. Pages 2+ carry no name.
 *
 * Background: faint botanicals on every page, drawn in your accent colour: a large spray of daisies, blossoms and
 * leafy branches in the top-right corner, a second spray in the bottom-left and a small sprig in the bottom-right.
 * They are vector shapes with no text, sit behind everything and stay light (about 15% of the accent), so the
 * extracted text is unchanged and the résumé stays easy to read. Leaves are placed along each branch by code, so a
 * new branch needs only its four curve points. Set FLOWER_BACKGROUND to false to switch the flowers and the header
 * divider off.
 *
 * Everything is flat: every heading, row and line is its own direct node, so the paginator can break between
 * any two of them. Gaps are padding (never margin) on the atoms, so the hidden measuring box matches the real
 * column.
 *
 * Type: Fraunces (a soft, modern serif) for the name and the section headings, Manrope for everything else. If the
 * app does not load them yet, add:
 *   <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Manrope:wght@400;500;600;700&display=swap" />
 * Until they load, headings fall back to Georgia and the body to Inter / Segoe UI / Arial, which still read well.
 * Headings are large and semibold so each section stands out at a glance. Small coloured text uses a darkened
 * accent; the pure accent is used for shapes only.
 *
 * To register: add 'ats-advanced' to DEFAULT_ACCENT (suggested #2F6B5B) and to your template list. A missing key
 * falls back to FALLBACK_ACCENT. Use a #rrggbb accent.
 *
 * Note: this only helps if the exported PDF keeps real, selectable text. A PDF made from a screenshot of the page
 * has no text for an ATS to read.
 */

const FONT = `'Manrope', 'Inter', 'Segoe UI', Arial, Helvetica, sans-serif`;
const DISPLAY_FONT = `'Fraunces', Georgia, 'Times New Roman', serif`;
const FALLBACK_ACCENT = '#2F6B5B';
const INK = '#0E1116';
const TEXT = '#2F3744';
const MUTED = '#5B6472';

// Geometry (px).
const STRIP_H = 5; // accent strip along the top of every page
const PAD_X = 52; // left and right page margin
const TOP = 34; // top padding inside the header
const MARGIN_TOP_FIRST = 24; // body on page 1, under the header
const MARGIN_TOP_NEXT = 40; // body on pages 2+, under the strip
const MARGIN_BOTTOM = 40;

const CONTENT_W = PAGE_WIDTH_PX - PAD_X * 2; // the hidden measuring box must match
const NEXT_PAGE_MAX_HEIGHT = PAGE_HEIGHT_PX - STRIP_H - MARGIN_TOP_NEXT - MARGIN_BOTTOM; // pages 2+

const FLOWER_BACKGROUND = true; // faint flowers behind every page and the header divider; false switches them off

// Contact entries shown as the value alone ("name@mail.com"). Anything else keeps its label ("Nationality: South African").
const VALUE_ONLY_LABELS = new Set(['email', 'phone', 'tel', 'telephone', 'mobile', 'cell', 'website', 'linkedin', 'github', 'portfolio', 'location', 'address', 'other']);

// Heading: plain text with a thin rule under it. The rule is a CSS border, so the heading stays plain text.
// The shared renderers receive the same class and style, so their headings match.
const HEADING = 'relative mb-3 border-b pb-1.5 text-[22px] font-semibold leading-tight tracking-[-0.01em] after:absolute after:-bottom-[2px] after:left-0 after:h-[3px] after:w-14 after:rounded-full after:bg-[var(--tick)]';

// Decorative botanicals: vector shapes only (no text, no images), faint, and behind everything. A spray is drawn
// around a page corner (x <= 0, y >= 0, in px) and placed with a transform. Leaves are placed along each branch by
// code, so a branch only needs its four curve points; a leaf points toward the bloom the branch ends in.
const bez = (p, t) => {
  const u = 1 - t;
  return [
    u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0],
    u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1],
  ];
};
const bezAngle = (p, t) => {
  const [x1, y1] = bez(p, Math.max(0, t - 0.01));
  const [x2, y2] = bez(p, Math.min(1, t + 0.01));
  return (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
};
const round1 = (n) => Math.round(n * 10) / 10;
const leafPath = (len) => `M0 0 C${len * 0.25} ${-len * 0.3} ${len * 0.75} ${-len * 0.3} ${len} 0 C${len * 0.75} ${len * 0.3} ${len * 0.25} ${len * 0.3} 0 0Z`;

const prepareBranch = ({ p, leaves, len }) => ({
  d: `M${p[0][0]} ${p[0][1]} C${p[1][0]} ${p[1][1]} ${p[2][0]} ${p[2][1]} ${p[3][0]} ${p[3][1]}`,
  leaves: Array.from({ length: leaves }, (_, i) => {
    const t = (i + 1) / (leaves + 1);
    const [x, y] = bez(p, t);
    const side = i % 2 === 0 ? 1 : -1; // alternate left and right of the stem
    return { x: round1(x), y: round1(y), rot: round1(bezAngle(p, t) + side * 50), len: round1(len * (0.7 + 0.3 * Math.sin(Math.PI * t))) };
  }),
});
const prepareSpray = (spray) => ({ ...spray, branches: spray.branches.map(prepareBranch) });

const BIG_SPRAY = prepareSpray({
  branches: [
    { p: [[20, 290], [-6, 235], [-42, 150], [-72, 72]], leaves: 6, len: 40 },
    { p: [[-10, 152], [-58, 176], [-108, 166], [-132, 130]], leaves: 3, len: 28 },
    { p: [[-132, 130], [-166, 118], [-192, 98], [-206, 70]], leaves: 3, len: 24 },
    { p: [[-72, 72], [-100, 52], [-130, 40], [-160, 26]], leaves: 3, len: 26 },
  ],
  daisies: [{ x: -72, y: 72, r: 62, rot: 8 }, { x: -132, y: 130, r: 28, rot: 30 }],
  blossoms: [{ x: -10, y: 152, r: 42, rot: 20 }, { x: -160, y: 26, r: 36, rot: -10 }, { x: -206, y: 70, r: 15, rot: 0 }],
  dots: [[-100, 196, 5], [-48, 232, 4], [-186, 122, 4], [-34, 24, 5], [-212, 128, 3]],
});

const SMALL_SPRAY = prepareSpray({
  branches: [
    { p: [[16, 250], [-10, 200], [-36, 130], [-60, 62]], leaves: 5, len: 34 },
    { p: [[-60, 62], [-84, 46], [-108, 36], [-134, 22]], leaves: 3, len: 22 },
    { p: [[-6, 124], [-46, 144], [-84, 140], [-108, 112]], leaves: 3, len: 24 },
  ],
  daisies: [{ x: -108, y: 112, r: 24, rot: 10 }],
  blossoms: [{ x: -60, y: 62, r: 46, rot: -14 }, { x: -6, y: 124, r: 32, rot: 25 }, { x: -134, y: 22, r: 26, rot: 0 }],
  dots: [[-90, 168, 4], [-30, 190, 4], [-30, 14, 4]],
});

const FlowerSpray = ({ spray, color, transform }) => (
  <g transform={transform} fill={color}>
    <g fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" opacity="0.14">
      {spray.branches.map((b) => <path key={b.d} d={b.d} />)}
    </g>
    <g opacity="0.15">
      {spray.branches.flatMap((b, bi) => b.leaves.map((l, i) => (
        <path key={`${bi}-${i}`} d={leafPath(l.len)} transform={`translate(${l.x} ${l.y}) rotate(${l.rot})`} />
      )))}
    </g>
    <g opacity="0.17">
      {spray.daisies.map((f, i) => (
        <g key={i} transform={`translate(${f.x} ${f.y}) rotate(${f.rot})`}>
          {Array.from({ length: 12 }, (_, p) => (
            <ellipse key={p} cx="0" cy={-f.r * 0.6} rx={f.r * 0.1} ry={f.r * 0.4} transform={`rotate(${p * 30})`} />
          ))}
        </g>
      ))}
    </g>
    <g opacity="0.15">
      {spray.blossoms.map((f, i) => (
        <g key={i} transform={`translate(${f.x} ${f.y}) rotate(${f.rot})`}>
          {Array.from({ length: 5 }, (_, p) => (
            <ellipse key={p} cx="0" cy={-f.r * 0.5} rx={f.r * 0.3} ry={f.r * 0.36} transform={`rotate(${p * 72})`} />
          ))}
        </g>
      ))}
    </g>
    <g opacity="0.3">
      {spray.daisies.map((f, i) => <circle key={`d${i}`} cx={f.x} cy={f.y} r={f.r * 0.2} />)}
      {spray.blossoms.map((f, i) => <circle key={`b${i}`} cx={f.x} cy={f.y} r={f.r * 0.15} />)}
    </g>
    <g opacity="0.22">
      {spray.dots.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} />)}
    </g>
  </g>
);

const FlowerBackdrop = ({ color }) => (
  <svg
    aria-hidden="true"
    focusable="false"
    className="pointer-events-none absolute inset-0"
    width="100%"
    height="100%"
    viewBox={`0 0 ${PAGE_WIDTH_PX} ${PAGE_HEIGHT_PX}`}
    preserveAspectRatio="xMidYMid slice"
  >
    <FlowerSpray spray={BIG_SPRAY} color={color} transform={`translate(${PAGE_WIDTH_PX} 0) scale(0.92)`} />
    <FlowerSpray spray={SMALL_SPRAY} color={color} transform={`translate(0 ${PAGE_HEIGHT_PX}) rotate(180)`} />
    <FlowerSpray spray={SMALL_SPRAY} color={color} transform={`translate(${PAGE_WIDTH_PX} ${PAGE_HEIGHT_PX}) scale(0.5 -0.5)`} />
  </svg>
);

// Closes the header: a hairline either side of a small blossom with two pairs of leaves. Shapes only, no text.
const OrnamentDivider = ({ color, line }) => (
  <div aria-hidden="true" className="mt-5 flex items-center gap-3">
    <span className="h-px flex-1" style={{ background: line }} />
    <svg width="74" height="22" viewBox="0 0 74 22" fill={color} focusable="false">
      <g opacity="0.55">
        {[158, 202].map((a) => <path key={`l${a}`} d={leafPath(24)} transform={`translate(30 11) rotate(${a})`} />)}
        {[-22, 22].map((a) => <path key={`r${a}`} d={leafPath(24)} transform={`translate(44 11) rotate(${a})`} />)}
      </g>
      <g opacity="0.85">
        {Array.from({ length: 5 }, (_, p) => (
          <ellipse key={p} cx="37" cy="5.5" rx="2.6" ry="3.4" transform={`rotate(${p * 72} 37 11)`} />
        ))}
      </g>
      <circle cx="37" cy="11" r="1.7" fill="#FFFFFF" />
    </svg>
    <span className="h-px flex-1" style={{ background: line }} />
  </div>
);

// Darken a #rrggbb colour toward black (used for small accent-coloured text).
const shade = (hex, amount) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  const n = m ? parseInt(m[1], 16) : 0x1f3a5f;
  const f = 1 - amount;
  return `rgb(${Math.round(((n >> 16) & 255) * f)}, ${Math.round(((n >> 8) & 255) * f)}, ${Math.round((n & 255) * f)})`;
};

// Normalise any month/year in a string to "Jan 2025". Handles "08 2025", "08/2025", "2025-08",
// "2025-08-15", "August 2025" and "Sept, 2025". Plain years and words like "Present" are left alone.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAME_RE = /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?,?\s+(\d{4})\b/gi;
const formatDates = (text, { numeric = true } = {}) => {
  if (!text) return text;
  const fromNumber = (all, m, y) => (+m >= 1 && +m <= 12 ? `${MONTHS[+m - 1]} ${y}` : all);
  let out = String(text);
  if (numeric) {
    out = out
      .replace(/\b(\d{4})[/.-](\d{1,2})(?:[/.-]\d{1,2})?\b/g, (all, y, m) => fromNumber(all, m, y))
      .replace(/\b(\d{1,2})[/.\s-]+(\d{4})\b/g, fromNumber);
  }
  return out.replace(MONTH_NAME_RE, (all, name, y) => `${MONTHS[MONTHS.findIndex((m) => m.toLowerCase() === name.slice(0, 3).toLowerCase())]} ${y}`);
};

// The shared renderers (Certificates, Projects) print whatever was stored, so "06 2020" can slip through. Walk what
// they return and rewrite every text node that is only a date, whichever field it came from: "06 2020" -> "Jun 2020".
const isDateOnly = (text) => {
  const t = String(text).trim();
  if (!t || t.length > 40 || !/\d{4}/.test(t)) return false;
  const rest = t.replace(MONTH_NAME_RE, '').replace(/present|current|now|ongoing/gi, '');
  return /^[\d\s/.,–—-]*$/.test(rest);
};
const unifyDates = (node) => {
  if (typeof node === 'string') return isDateOnly(node) ? formatDates(node) : node;
  if (Array.isArray(node)) return node.map((child) => unifyDates(child));
  if (!React.isValidElement(node) || node.props.children === undefined || node.props.children === null) return node;
  return React.cloneElement(node, undefined, React.Children.map(node.props.children, (child) => unifyDates(child)));
};

// Run formatDates over the date fields (date, issueDate, expiryDate, startDate, year ...) of a list of entries,
// for sections whose shared renderer prints the raw value (Certificates, Projects).
const DATE_KEY_RE = /date|issued|expir|year/i;
const withFormattedDates = (items) => (Array.isArray(items) ? items.map((item) => {
  if (!item || typeof item !== 'object') return item;
  const next = { ...item };
  Object.keys(next).forEach((k) => {
    if (DATE_KEY_RE.test(k) && typeof next[k] === 'string') next[k] = formatDates(next[k]);
  });
  return next;
}) : items);

// A language as one plain-text phrase. Objects ({ language | text | name, level | proficiency }) become
// "Spanish (Intermediate)"; a numeric level is written as a word, a text level is kept as typed. Plain strings
// such as "English - Fluent" are kept as typed.
const LEVEL_NAMES = ['', 'Beginner', 'Basic', 'Intermediate', 'Advanced', 'Fluent'];
const languageText = (item) => {
  if (item === null || item === undefined) return '';
  if (typeof item !== 'object') return String(item).trim();
  const name = String(item.text ?? item.language ?? item.name ?? item.label ?? '').trim();
  if (!name) return '';
  const raw = item.level ?? item.proficiency ?? item.rating ?? item.value;
  if (raw === undefined || raw === null || raw === '') return name;
  const n = Number(raw);
  let level = String(raw).trim();
  if (Number.isFinite(n)) {
    const dots = n > 5 ? Math.min(5, Math.max(1, Math.round(n / 20))) : Math.min(5, Math.max(0, Math.round(n)));
    level = LEVEL_NAMES[dots];
  }
  return level ? `${name} (${level})` : name;
};

// Split a contact entry into a label and a value. "Born: 10 Sep 2026" -> Born / 10 Sep 2026, so personal details
// keep their own label. Email, phone, website and address entries without a "Label:" get a label from their shape.
const parseContact = (raw) => {
  const text = String(raw).trim();
  const t = text.toLowerCase();
  const labelled = /^(?!https?:)([^:\d,]{2,28}):\s*(.+)$/.exec(text);
  if (labelled) return { label: labelled[1].trim(), value: labelled[2].trim() };
  if (t.includes('@')) return { label: 'Email', value: text };
  if (t.includes('linkedin')) return { label: 'LinkedIn', value: text };
  if (/^\+?[\d\s().-]{7,}$/.test(t)) return { label: 'Phone', value: text };
  if (/^(https?:\/\/|www\.)/.test(t) || /\.(com|dev|io|net|org|co|me|app|site)(\/|$)/.test(t)) return { label: 'Website', value: text };
  if (/\d|,/.test(text)) return { label: 'Location', value: text };
  if (/licen[cs]e/i.test(text)) return { label: 'Licence', value: text };
  return { label: 'Other', value: text };
};

const unifyDatesIn = (sections) => Object.fromEntries(
  Object.entries(sections || {}).map(([key, blocks]) => [
    key,
    Array.isArray(blocks) && blocks.length > 0 ? endGroup(blocks.map((block) => unifyDates(block))) : blocks,
  ]),
);

const AtsAdvancedTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects: rawProjects, references, certificates: rawCertificates, isEmpty, sectionOrder, edit } = props;
  const projects = withFormattedDates(rawProjects);
  const certificates = withFormattedDates(rawCertificates);
  const accentColor = props.accentColor || DEFAULT_ACCENT['ats-advanced'] || FALLBACK_ACCENT;
  const accentText = shade(accentColor, 0.3);

  const headingStyle = { fontFamily: DISPLAY_FONT, color: INK, borderColor: tint(accentColor, 0.55), '--tick': accentColor };
  const heading = (key, text) => <h3 key={`${key}-h`} className={HEADING} style={headingStyle}>{text}</h3>;

  // Head of an entry: title with the dates on the same line, employer / school under it.
  const entryHead = (title, date, primary, secondary) => (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[15px] font-bold leading-snug" style={{ color: INK }}>{title}</p>
        {date && <span className="shrink-0 whitespace-nowrap text-[11.5px] tabular-nums" style={{ color: TEXT }}>{date}</span>}
      </div>
      {(primary || secondary) && (
        <p className="mt-0.5 text-[12.5px] leading-snug">
          {primary && <span className="font-medium" style={{ color: accentText }}>{primary}</span>}
          {secondary && <span style={{ color: MUTED }}>{primary ? ', ' : ''}{secondary}</span>}
        </p>
      )}
    </div>
  );

  // One entry = the head plus one atom per body line. The gap between entries is padding.
  const entry = (id, head, bodyNodes, isLastEntry) => {
    const body = (bodyNodes || []).filter(Boolean);
    return [
      <div key={`${id}-0`} style={{ paddingBottom: body.length === 0 ? (isLastEntry ? 0 : 14) : 4 }}>{head}</div>,
      ...body.map((node, i) => (
        <div key={`${id}-${i + 1}`} style={{ paddingBottom: i === body.length - 1 ? (isLastEntry ? 0 : 14) : 3 }}>{node}</div>
      )),
    ];
  };

  const richLines = (text, prefix) => (
    text ? renderAchievements(text, prefix).map((el, i) => <div key={`${prefix}-w${i}`}>{el}</div>) : []
  );

  // Skills and languages are one plain paragraph each: real words, in reading order, no graphics.
  const skillNames = (namedSkills || []).map((s) => String(s.text ?? '').trim()).filter(Boolean);
  const languageNames = (Array.isArray(languages) ? languages : []).map(languageText).filter(Boolean);

  const sectionMap = {
    summary: summary ? endGroup([
      heading('summary', 'Professional Summary'),
      ...renderAchievements(summary, 'summary').map((el, i) => (
        <div key={`summary-w${i}`} className="[&_*]:!text-[12.5px] [&_*]:!leading-[1.65] [&_*]:!text-[#1F2937]">{el}</div>
      )),
    ]) : [],

    experience: jobs.length > 0 ? endGroup([
      heading('experience', 'Work Experience'),
      ...jobs.flatMap((job, i) => entry(
        `job-${job.id ?? i}`,
        entryHead(
          job.title,
          formatDates(jobDates(job)),
          job.employer,
          [job.location, job.remote ? 'Remote' : ''].filter(Boolean).join(', '),
        ),
        richLines(job.achievements, `job-${job.id ?? i}-ach`),
        i === jobs.length - 1,
      )),
    ]) : [],

    education: educations.length > 0 ? endGroup([
      heading('education', 'Education'),
      ...educations.flatMap((ed, i) => {
        const title = [ed.degree, ed.field].filter(Boolean).join(', ') || ed.institution;
        const school = title === ed.institution ? '' : ed.institution;
        return entry(
          `education-${ed.id ?? i}`,
          entryHead(title, formatDates(ed.date), school, ed.location),
          richLines(ed.achievements, `education-${ed.id ?? i}-ach`),
          i === educations.length - 1,
        );
      }),
    ]) : [],

    skills: skillNames.length > 0 ? endGroup([
      heading('skills', 'Skills'),
      <p key="skills-list" className="text-[12.5px] leading-[1.7]" style={{ color: TEXT }}>{skillNames.join(', ')}</p>,
    ]) : [],

    languages: languageNames.length > 0 ? endGroup([
      heading('languages', 'Languages'),
      <p key="languages-list" className="text-[12.5px] leading-[1.7]" style={{ color: TEXT }}>{languageNames.join(', ')}</p>,
    ]) : [],
  };

  // Extras come from the shared helpers and take this template's heading; their dates are normalised too.
  const extras = unifyDatesIn(renderExtraSections({ projects, languages, hobbies, references, headingClass: HEADING, headingStyle, accentColor }));
  const certs = unifyDatesIn(renderCertificates({ certificates, headingClass: HEADING, headingStyle }));

  const blocks = sectionOrder.flatMap((key) => markSection(edit, key, sectionMap[key] || extras[key] || certs[key] || []));
  const body = usePaginatedBlocks(blocks, NEXT_PAGE_MAX_HEIGHT);
  const pageCount = Math.max(1, body.pages.length);

  // Header pieces. The name stays one text run on one line; each contact detail is one plain-text bullet.
  const name = (fullName || 'Your Name').trim();
  const nameSize = name.length > 26 ? 32 : name.length > 18 ? 40 : 50;
  const profession = (personal.profession || '').split('|').map((s) => s.trim()).filter(Boolean).join(' | ');
  const contactItems = (contactList || [])
    .filter((c) => typeof c === 'string' && c.trim())
    .map((c) => parseContact(formatDates(c, { numeric: false })))
    .map(({ label, value }) => (VALUE_ONLY_LABELS.has(label.toLowerCase()) ? value : `${label}: ${value}`));

  return (
    <>
      {/* Hidden copy of every atom, as wide as the real column body. */}
      <div
        ref={body.measureContainerRef}
        className="absolute pointer-events-none"
        style={{ top: -9999, left: -9999, width: CONTENT_W, fontFamily: FONT }}
      >
        {body.measureContent}
      </div>

      {Array.from({ length: pageCount }, (_, index) => (
        <A4Page key={index} pageNum={index + 1} totalPages={pageCount}>
          <div
            className="relative flex h-full w-full flex-col overflow-hidden bg-white text-left antialiased"
            style={{ fontFamily: FONT, color: TEXT, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
          >
            {/* Flowers: behind everything, on every page. */}
            {FLOWER_BACKGROUND && <FlowerBackdrop color={accentColor} />}

            {/* Accent strip: CSS only, on every page. */}
            <div aria-hidden="true" className="relative shrink-0" style={{ height: STRIP_H, background: accentColor }} />

            {/* Header: page 1 only, so the name is never repeated on later pages. */}
            {index === 0 && (
              <div {...editAttrs(edit, 'personal')} className="relative shrink-0" style={{ padding: `${TOP}px ${PAD_X}px 6px` }}>
                <h1 className="break-words font-semibold leading-[1.05] tracking-[-0.02em]" style={{ fontFamily: DISPLAY_FONT, fontSize: nameSize, color: INK }}>{name}</h1>
                {profession && (
                  <p className="mt-2 text-[17px] font-semibold leading-snug" style={{ color: accentText }}>{profession}</p>
                )}
                {contactItems.length > 0 && (
                  <ul className="mt-3.5 flex flex-wrap gap-x-5 gap-y-1 text-[12px] leading-[1.6]" style={{ color: TEXT }}>
                    {contactItems.map((item, i) => (
                      <li key={i} className="flex min-w-0 items-baseline gap-1.5 [overflow-wrap:anywhere]">
                        <span style={{ color: accentText }}>•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {FLOWER_BACKGROUND && <OrnamentDivider color={accentColor} line={tint(accentColor, 0.6)} />}
              </div>
            )}

            <div
              ref={index === 0 ? body.firstBodyRef : undefined}
              className="relative min-h-0 flex-1 overflow-hidden"
              style={{ marginLeft: PAD_X, marginRight: PAD_X, marginTop: index === 0 ? MARGIN_TOP_FIRST : MARGIN_TOP_NEXT, marginBottom: MARGIN_BOTTOM }}
            >
              {body.pages[index] || null}
              {isEmpty && index === 0 && (
                <p className="text-xs italic" style={{ color: MUTED }}>Nothing entered yet — fill in a few steps to see them appear here.</p>
              )}
            </div>
          </div>
        </A4Page>
      ))}
    </>
  );
};

export default AtsAdvancedTemplate;
