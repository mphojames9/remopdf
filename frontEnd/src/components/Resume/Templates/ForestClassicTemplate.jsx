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
  endGroup,
  editAttrs,
  markSection,
} from './templateShared';

/**
 * Apex Executive (id: apex-executive). A dark obsidian sidebar with a gold accent beside an off-white main
 * column whose experience, projects, education and certificates sit on a thin timeline with diamond markers.
 *
 *   sidebar  photo, Contact, Details, Expertise (skill bars), Languages, Interests
 *   main     name + profession, Summary, Experience, Projects, Education, Certifications, References
 *
 * The accent colour (gold by default) drives every coloured detail: heading badges (Experience / Projects),
 * timeline diamonds, company names, bullets, skill bars, the rule above the name, the photo frame and the
 * sidebar headings and icons. The sidebar itself stays obsidian; when the accent is too dark to read on it
 * (e.g. navy), the sidebar uses a lightened copy of the accent so text and bars never disappear.
 *
 * Both columns are paginated on their own with usePaginatedBlocks and the page count is whichever needs
 * more. Everything inside a column is a FLAT list of plain elements (no section wrappers); the timeline line
 * is drawn per element (border-left), so it stays continuous when an entry continues on the next page.
 *
 * Register: id 'apex-executive' in Templates/index.js, DEFAULT_ACCENT (suggested #C5A059), TEMPLATE_CARDS in
 * TemplateThumbs.jsx and in TemplateShowcase.jsx. A missing accent key falls back to FALLBACK_ACCENT.
 */

/* ------------------------------ Design tokens ------------------------------ */
const FONT = `ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`;

const FALLBACK_ACCENT = '#C5A059';
const OBSIDIAN = '#1A1D20'; // sidebar background, main headings
const PHOTO_BG = '#111214';
const SIDE_TEXT = '#E8E9EA';
const SIDE_MUTED = '#B0B3B8';
const SIDE_LINE = 'rgba(255, 255, 255, 0.1)';
const SIDE_TRACK = '#2C3035'; // empty part of a skill bar
const PAPER = '#FAFAFA'; // main column
const BODY = '#4A4F55';
const MUTED = '#8A8F96';
const LINE = '#E0E0E0'; // header rule and timeline

// Geometry (px). The hidden measuring boxes must be exactly as wide as the real column bodies.
const SIDEBAR_W = 270; // 34% of the A4 width
const SIDE_PAD = 32;
const SIDE_CONTENT_W = SIDEBAR_W - SIDE_PAD * 2;
const MAIN_W = PAGE_WIDTH_PX - SIDEBAR_W;
const MAIN_PAD_X = 40;
const MAIN_PAD_Y = 40;
const MAIN_CONTENT_W = MAIN_W - MAIN_PAD_X * 2;
const MARKER_GUTTER = 6; // room left of the main column for the timeline diamonds (they sit 5px outside it)
const SIDE_MAX_HEIGHT = PAGE_HEIGHT_PX - SIDE_PAD * 2; // pages 2+
const MAIN_MAX_HEIGHT = PAGE_HEIGHT_PX - MAIN_PAD_Y * 2; // pages 2+

// Sections that live in the sidebar. Everything else goes in the main column.
const SIDEBAR_KEYS = ['skills', 'languages', 'hobbies'];

/* ------------------------------ Colour helpers ----------------------------- */
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
// The accent as it appears on the dark sidebar: unchanged when it is bright enough, lightened when it is not.
const onDark = (hex) => (luminance(hex) < 0.2 ? tint(hex, 0.55) : hex);

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

const ICON_PATHS = {
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  pin: <><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
  linkedin: <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 11v6M8 7.5v.01M12 17v-6M12 13.5a2.5 2.5 0 0 1 5 0V17" /></>,
  github: <><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></>,
  dot: <circle cx="12" cy="12" r="3" />,
};

const ContactIcon = ({ name, color }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" style={{ marginTop: 1 }} aria-hidden="true">
    {ICON_PATHS[name] || ICON_PATHS.dot}
  </svg>
);

/* -------------------------------- Template -------------------------------- */
const ApexExecutiveTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, certificates, isEmpty, sectionOrder, edit } = props;
  const accent = props.accentColor || DEFAULT_ACCENT['apex-executive'] || FALLBACK_ACCENT;
  const sideAccent = onDark(accent);

  /* ----------------------------- Small helpers ----------------------------- */
  // Bold / italic / bullet text. Bullets use a small accent diamond, plain lines stay paragraphs.
  // `spaced` adds the gap between blocks as an mb-* class (so padLast / endGroup can replace it on the last one);
  // blocks inside a timeline entry get their gap from the entry instead.
  const richBlocks = (text, keyPrefix, { size = 13, leading = 1.625, weight, justify = false, spaced = false } = {}) =>
    parseBlocks(text).map((block, i) => {
      const key = `${keyPrefix}-${i}`;
      const style = {
        fontSize: size,
        lineHeight: leading,
        color: BODY,
        ...(weight ? { fontWeight: weight } : {}),
        ...(justify ? { textAlign: 'justify' } : {}),
      };
      const gap = spaced ? 'mb-2' : '';
      return block.bullet ? (
        <div key={key} className={`flex items-start gap-3 ${gap}`.trim()} style={style}>
          <span
            aria-hidden="true"
            className="shrink-0"
            style={{ width: 6, height: 6, marginTop: Math.round((size * leading) / 2 - 3), backgroundColor: accent, transform: 'rotate(45deg)' }}
          />
          <span className="min-w-0 break-words">{renderInline(block.text, key)}</span>
        </div>
      ) : (
        <p key={key} className={`break-words ${gap}`.trim()} style={style}>{renderInline(block.text, key)}</p>
      );
    });

  const sideHeading = (key, text) => (
    <h3
      key={`${key}-h`}
      className="text-[10px] font-black uppercase border-b pb-2 mb-4"
      style={{ color: sideAccent, borderColor: SIDE_LINE, letterSpacing: '0.4em' }}
    >
      {text}
    </h3>
  );

  // `badge`: the square behind the letter. Experience and Projects use the accent, the rest use obsidian.
  const mainHeading = (key, text, letter, badge) => (
    <h3
      key={`${key}-h`}
      className="flex items-center gap-3 text-sm font-black uppercase mb-5"
      style={{ color: OBSIDIAN, letterSpacing: '0.25em' }}
    >
      <span
        className="w-4 h-4 shrink-0 flex items-center justify-center text-white text-[10px]"
        style={{ backgroundColor: badge, letterSpacing: 0 }}
      >
        {letter}
      </span>
      <span>{text}</span>
    </h3>
  );

  // One element of a timeline entry. Each element draws its own piece of the vertical line (border-left),
  // so the line carries on across a page break. The first element of an entry also carries the diamond.
  const timeline = (key, content, isFirst, gap, markerColor) => (
    <div key={key} className="relative pl-5 border-l" style={{ borderColor: LINE, paddingBottom: gap }}>
      {isFirst && (
        <span
          aria-hidden="true"
          className="absolute"
          style={{ width: 9, height: 9, left: -5, top: 6, backgroundColor: PAPER, border: `2px solid ${markerColor}`, transform: 'rotate(45deg)' }}
        />
      )}
      {content}
    </div>
  );

  // rows = [{ el, gap }]. gap = space under that row inside the entry; the entry's last row gets mb-4 instead.
  const entry = (id, rows, markerColor) => {
    const list = rows.filter(Boolean);
    return padLast(
      list.map(({ el, gap }, i) => timeline(`${id}-${i}`, el, i === 0, i === list.length - 1 ? 0 : gap, markerColor)),
      'mb-4',
    );
  };

  const titleRow = (title, date, size, dateSize = 12) => (
    <div className="flex items-baseline justify-between gap-3">
      <p className="font-bold uppercase break-words" style={{ fontSize: size, color: OBSIDIAN, letterSpacing: '0.025em', lineHeight: 1.3 }}>{title}</p>
      {date && (
        <span className="shrink-0 font-bold uppercase whitespace-nowrap" style={{ fontSize: dateSize, color: MUTED, letterSpacing: '0.1em' }}>{date}</span>
      )}
    </div>
  );

  // Second line of an entry. kind 'company' (experience): gold, black weight, uppercase. kind 'school': dark grey, bold.
  const metaRow = (primary, secondary, kind = 'company') => (
    <div className="flex items-baseline justify-between gap-3">
      {primary ? (
        kind === 'company' ? (
          <p className="font-black uppercase break-words" style={{ fontSize: 13, color: accent, letterSpacing: '0.05em' }}>{primary}</p>
        ) : (
          <p className="font-bold break-words" style={{ fontSize: 14, color: BODY }}>{primary}</p>
        )
      ) : <span />}
      {secondary && <p className="shrink-0 font-semibold uppercase whitespace-nowrap" style={{ fontSize: 11, color: MUTED }}>{secondary}</p>}
    </div>
  );

  const bodyRows = (text, keyPrefix) => richBlocks(text, keyPrefix).map((el) => ({ el, gap: 8 }));

  /* ------------------------------ MAIN column ------------------------------ */
  const projectItems = (projects?.items || []).filter((p) => p.title || p.description);
  const certificateItems = (certificates?.items || []).filter((c) => c.name || c.issuer);
  const referenceItems = (references?.items || []).filter((r) => r.name);

  const mainMap = {
    // No heading, exactly like the original design: the summary opens the page under the name.
    summary: summary ? endGroup(richBlocks(summary, 'summary', { size: 13, leading: 1.8, weight: 500, justify: true, spaced: true })) : [],

    experience: jobs.length > 0 ? endGroup([
      mainHeading('experience', 'Experience', 'E', accent),
      ...jobs.flatMap((job) => {
        const id = `job-${job.id}`;
        const place = [job.location, job.remote ? 'Remote' : ''].filter(Boolean).join(' · ');
        const head = job.title || job.employer;
        const sub = job.title ? job.employer : '';
        return entry(id, [
          { el: titleRow(head, jobDates(job), 16), gap: 2 },
          (sub || place) && { el: metaRow(sub, place, 'company'), gap: 8 },
          ...bodyRows(job.achievements, `${id}-ach`),
        ], accent);
      }),
    ]) : [],

    education: educations.length > 0 ? endGroup([
      mainHeading('education', 'Education', 'A', OBSIDIAN),
      ...educations.flatMap((ed) => {
        const id = `education-${ed.id}`;
        const title = [ed.degree, ed.field].filter(Boolean).join(', ') || ed.institution;
        const school = title === ed.institution ? '' : ed.institution;
        return entry(id, [
          { el: titleRow(title, ed.date, 15), gap: 2 },
          (school || ed.location) && { el: metaRow(school, ed.location, 'school'), gap: 8 },
          ...bodyRows(ed.achievements, `${id}-ach`),
        ], OBSIDIAN);
      }),
    ]) : [],
  };

  const mainExtras = {
    projects: projects?.enabled && projectItems.length > 0 ? endGroup([
      mainHeading('projects', 'Projects', 'P', accent),
      ...projectItems.flatMap((p) => {
        const id = `project-${p.id}`;
        return entry(id, [
          { el: titleRow(p.title || 'Project', '', 15), gap: 2 },
          p.link && { el: <p className="break-all" style={{ fontSize: 11, color: MUTED }}>{p.link}</p>, gap: 8 },
          ...bodyRows(p.description, `${id}-desc`),
        ], accent);
      }),
    ]) : [],

    certificates: certificates?.enabled && certificateItems.length > 0 ? endGroup([
      mainHeading('certificates', 'Certifications', 'C', OBSIDIAN),
      ...certificateItems.flatMap((c) => {
        const id = `certificate-${c.id}`;
        return entry(id, [
          { el: titleRow(c.name || c.issuer, c.date ? formatRange(c.date) : '', 14, 11), gap: 2 },
          c.name && c.issuer && {
            el: <p className="font-bold uppercase break-words" style={{ fontSize: 13, color: accent }}>{c.issuer}</p>,
            gap: 6,
          },
          c.link && { el: <p className="break-all" style={{ fontSize: 11, color: MUTED }}>{c.link}</p>, gap: 6 },
          ...bodyRows(c.description, `${id}-desc`),
        ], OBSIDIAN);
      }),
    ]) : [],

    references: references?.enabled && (references.availableUponRequest || referenceItems.length > 0) ? endGroup([
      mainHeading('references', 'References', 'R', OBSIDIAN),
      ...(references.availableUponRequest
        ? [<p key="references-note" style={{ fontSize: 13, color: BODY }}>Available upon request.</p>]
        : referenceItems.map((r) => (
          // Two cards per row. inline-block keeps every card a plain element of the flat list.
          <div
            key={`reference-${r.id}`}
            className="relative pl-5 border-l mb-4"
            style={{ display: 'inline-block', verticalAlign: 'top', width: '50%', boxSizing: 'border-box', paddingRight: 20, borderColor: LINE }}
          >
            <span
              aria-hidden="true"
              className="absolute"
              style={{ width: 9, height: 9, left: -5, top: 6, backgroundColor: PAPER, border: `2px solid ${OBSIDIAN}`, transform: 'rotate(45deg)' }}
            />
            <p className="font-bold uppercase break-words" style={{ fontSize: 14, color: OBSIDIAN, letterSpacing: '0.025em', lineHeight: 1.3 }}>{r.name}</p>
            {r.relationship && (
              <p className="font-bold break-words" style={{ fontSize: 12, color: accent, marginTop: 2 }}>{r.relationship}</p>
            )}
            {r.contact && <p className="font-medium break-all" style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>{r.contact}</p>}
          </div>
        ))),
    ]) : [],
  };

  const mainOrder = (sectionOrder || []).filter((key) => !SIDEBAR_KEYS.includes(key));
  // Summary has no heading in this design, so it is clickable in edit mode but gets no pencil / bin on top of its text.
  const mainBlocks = mainOrder.flatMap((key) => markSection(edit, key, mainMap[key] || mainExtras[key] || [], key !== 'summary'));

  /* ----------------------------- SIDEBAR column ---------------------------- */
  const languageItems = (languages?.items || []).filter((l) => l.name);
  const hobbyBlocks = hobbies?.enabled && hobbies.text ? parseBlocks(hobbies.text) : [];

  const sideMap = {
    skills: namedSkills.length > 0 ? endGroup([
      sideHeading('skills', 'Expertise'),
      ...namedSkills.map((s) => {
        const rating = skillRating(s);
        return (
          <div key={`skill-${s.id}`} className="mb-4" title={rating > 0 ? getSkillLevelLabel(rating) : undefined}>
            <div className="font-semibold break-words" style={{ fontSize: 13, color: SIDE_TEXT, letterSpacing: '0.025em', lineHeight: 1.35 }}>{s.text}</div>
            {rating > 0 && (
              <div className="w-full overflow-hidden" style={{ height: 4, marginTop: 6, backgroundColor: SIDE_TRACK }}>
                <div style={{ height: '100%', width: `${(rating / 5) * 100}%`, backgroundColor: sideAccent }} />
              </div>
            )}
          </div>
        );
      }),
    ]) : [],

    languages: languages?.enabled && languageItems.length > 0 ? endGroup([
      sideHeading('languages', 'Languages'),
      ...languageItems.map((l) => {
        const { label } = languageLevelInfo(l);
        return (
          <div key={`language-${l.id}`} className="flex justify-between items-baseline gap-2 mb-4">
            <span className="font-semibold break-words" style={{ fontSize: 13, color: SIDE_TEXT, letterSpacing: '0.025em' }}>{l.name}</span>
            <span className="shrink-0 uppercase" style={{ fontSize: 11, color: SIDE_MUTED, letterSpacing: '0.1em' }}>{label}</span>
          </div>
        );
      }),
    ]) : [],

    hobbies: hobbyBlocks.length > 0 ? endGroup([
      sideHeading('hobbies', 'Interests'),
      ...hobbyBlocks.map((block, i) => (
        <div key={`hobby-${i}`} className="flex items-start gap-3 mb-4" style={{ fontSize: 13, fontWeight: 300, color: SIDE_TEXT, letterSpacing: '0.025em', lineHeight: 1.45 }}>
          <span aria-hidden="true" className="shrink-0" style={{ width: 6, height: 6, marginTop: 6, backgroundColor: sideAccent, transform: 'rotate(45deg)' }} />
          <span className="min-w-0 break-words">{renderInline(block.text, `hobby-${i}`)}</span>
        </div>
      )),
    ]) : [],
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
  const nameSize = name.length <= 8 ? 48 : name.length <= 10 ? 40 : name.length <= 13 ? 34 : name.length <= 17 ? 30 : name.length <= 24 ? 26 : 22;
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
            style={{ fontFamily: FONT, color: BODY, backgroundColor: PAPER, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
          >
            {/* ------------------------------ Sidebar ------------------------------ */}
            <div
              className="shrink-0 h-full flex flex-col"
              style={{ width: SIDEBAR_W, padding: SIDE_PAD, backgroundColor: OBSIDIAN, color: SIDE_TEXT }}
            >
              {index === 0 && hasSideHead && (
                <div {...editAttrs(edit, 'personal')} className="shrink-0" style={{ marginBottom: sideBlocks.length > 0 ? 28 : 0 }}>
                  {hasPhoto && (
                    <div className="flex justify-center" style={{ marginBottom: contacts.length || details.length ? 28 : 0 }}>
                      <div className="relative" style={{ width: 160, height: 160 }}>
                        <div aria-hidden="true" className="absolute inset-0 border" style={{ borderColor: sideAccent, transform: 'translate(8px, 8px)' }} />
                        <div
                          className="relative w-full h-full overflow-hidden border"
                          style={{ borderColor: SIDE_LINE, backgroundColor: PHOTO_BG, filter: 'grayscale(0.15)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.35)' }}
                        >
                          <ResumePhoto src={personal.photo} style={{ ...(personal.photoStyle || {}), shape: 'square', border: 'none' }} sizePx={158} />
                        </div>
                      </div>
                    </div>
                  )}

                  {contacts.length > 0 && (
                    <div style={{ marginBottom: details.length ? 28 : 0 }}>
                      {sideHeading('contact', 'Contact')}
                      <div className="flex flex-col" style={{ gap: 14 }}>
                        {contacts.map((c, i) => (
                          <div key={`contact-${i}`} className="flex items-start gap-3" style={{ fontSize: 13, fontWeight: 300, color: SIDE_MUTED, letterSpacing: '0.025em', lineHeight: 1.45 }}>
                            <ContactIcon name={contactKinds[i]} color={sideAccent} />
                            <span className="min-w-0 break-words">{c}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {details.length > 0 && (
                    <div>
                      {sideHeading('details', 'Details')}
                      <div className="flex flex-col" style={{ gap: 14 }}>
                        {details.map((d) => (
                          <div key={d.label} className="flex flex-col" style={{ gap: 2 }}>
                            <span className="font-bold uppercase" style={{ fontSize: 9, color: SIDE_MUTED, letterSpacing: '0.1em' }}>{d.label}</span>
                            <span className="break-words" style={{ fontSize: 13, fontWeight: 300, color: SIDE_TEXT }}>{d.value}</span>
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
              style={{ width: MAIN_W, padding: `${MAIN_PAD_Y}px ${MAIN_PAD_X}px`, backgroundColor: PAPER }}
            >
              {index === 0 && (
                <div
                  {...editAttrs(edit, 'personal')}
                  className="relative shrink-0 border-b"
                  style={{ borderColor: LINE, paddingBottom: 24, marginBottom: 24 }}
                >
                  <span aria-hidden="true" className="absolute top-0 right-0" style={{ width: 64, height: 4, backgroundColor: accent }} />
                  <h1
                    className="font-black uppercase break-words"
                    style={{ fontSize: nameSize, lineHeight: 1.05, letterSpacing: '-0.025em', color: OBSIDIAN, paddingRight: 72 }}
                  >
                    {name}
                  </h1>
                  {professionParts.length > 0 && (
                    <p
                      className="flex flex-wrap items-center font-bold uppercase"
                      style={{ marginTop: 10, columnGap: 12, rowGap: 4, fontSize: 14, color: accent, letterSpacing: '0.3em', lineHeight: 1.4 }}
                    >
                      {professionParts.map((part, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <span aria-hidden="true" style={{ width: 1, height: 12, backgroundColor: LINE }} />}
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

export default ApexExecutiveTemplate;
