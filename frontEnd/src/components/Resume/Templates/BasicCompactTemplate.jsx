import React from 'react';
import { renderAchievements, renderInline, parseBlocks } from '../Sections/richText';
import { languageLevelInfo } from '../Sections/LanguageLevelSelect';
import { getSkillLevelLabel } from '../Sections/SkillsField';
import { formatRange } from '../Sections/dateFormat';
import ResumePhoto from '../Sections/ResumePhoto';
import {
  tint,
  jobDates,
  usePaginatedBlocks,
  A4Page,
  padLast,
  stripMb,
  markSection,
  skillRating,
} from './templateShared';

/* ------------------------------ Design tokens ------------------------------ */
// GRAPHITE PRO: a near-black page with a faint grid, emerald and violet highlights.
//  - TWO columns. Sidebar: photo, name and profession, contact, personal details, about me, languages, interests.
//    Main: numbered sections (01. Experience, 02. ...) for experience, education, skills, projects, certificates, references.
//  - the accent colour picked in the builder is the PAGE colour (default near-black); emerald and violet stay fixed
//  - skills are drawn as a thin bar with the level word next to it; a skill with no level shows its name only
//  - each column is measured and split into pages on its own, so a long column simply continues on the next page
//  - the glow behind the photo is a soft radial gradient (not a CSS blur), so the PDF export draws it the same way
// Change the tokens below first; then the blocks further down.
const DEFAULT_PAGE = '#030712';   // used only if no accent colour is passed in
const TEXT = '#E2E8F0';           // names of skills and languages, main text
const SLATE_400 = '#94A3B8';      // company names, contact lines, about me
const SLATE_500 = '#64748B';      // descriptions and bullets
const EMERALD = '#10B981';        // job title, bullet markers, section numbers, language levels
const VIOLET = '#8B5CF6';         // dates, small dots, labels
const WHITE = '#FFFFFF';
const SOFT_FILL = 'rgba(255, 255, 255, 0.02)'; // sidebar and card background
const TILE_FILL = 'rgba(255, 255, 255, 0.05)'; // icon tiles and chips
const HAIRLINE = 'rgba(255, 255, 255, 0.1)';   // borders
const CARD_LINE = 'rgba(255, 255, 255, 0.05)'; // card borders
const GRID = 'linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)';
const SIDEBAR_W = 278;           // px, the whole sidebar (35% of the page), border included
const SIDE_PAD = { top: 48, right: 40, bottom: 32, left: 40 }; // px
const MAIN_PAD = { top: 48, right: 48, bottom: 32, left: 48 }; // px
const SIDE_CONTENT_W = SIDEBAR_W - SIDE_PAD.left - SIDE_PAD.right - 1; // px -> 197 (1px border). The hidden measuring boxes must match the real columns.
const MAIN_W = 794 - SIDEBAR_W - MAIN_PAD.left - MAIN_PAD.right;       // px -> 420

// These sections live in the sidebar. Every other section goes in the main column.
const SIDE_SECTIONS = ['summary', 'languages', 'hobbies'];

/* --------------------------------- Colours -------------------------------- */
// 0 (black) to 1 (white). The text is light, so a bright page colour is darkened until it is readable.
const luminance = (hex) => {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return 0;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

/* ---------------------------------- Icons --------------------------------- */
const ICON_PATHS = {
  mail: ['M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'],
  phone: ['M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z'],
  pin: ['M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z', 'M15 11a3 3 0 11-6 0 3 3 0 016 0z'],
  globe: ['M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-3.6-9m3.6 9a9 9 0 003.6-9m-3.6-9a9 9 0 00-3.6 9m3.6-9a9 9 0 013.6 9'],
  linkedin: ['M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z'],
  dot: [],
};

const Icon = ({ name, size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
    {(ICON_PATHS[name] || []).map((d) => <path key={d} d={d} />)}
    {name === 'linkedin' && <circle cx="4" cy="4" r="2" />}
    {name === 'dot' && <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />}
  </svg>
);

/* ------------------------------ Text helpers ------------------------------ */
// The contact list is plain text, so the icon is picked from what the line looks like.
// An email typed without its "@" (e.g. "name9gmail.com") still gets the mail icon.
const MAIL_HOST = /^(?!www\.)[^\s@/]+(gmail|googlemail|yahoo|outlook|hotmail|live|icloud|proton|protonmail)\.(com|me|co\.za|co\.uk)$/;
const contactIcon = (c) => {
  if (typeof c !== 'string') return 'dot';
  const s = c.trim().toLowerCase();
  // Split off a leading "Label:" (but not the "https:" of a URL) so "Tel: +27 ..." is still recognised.
  const m = s.match(/^([a-z][a-z .\/&-]{1,28}):(?!\/\/)\s*/);
  const label = m ? m[1] : '';
  const value = m ? s.slice(m[0].length) : s;

  if (s.includes('linkedin')) return 'linkedin';
  if (value.includes('@') || /e-?mail/.test(label) || MAIL_HOST.test(value)) return 'mail';
  if (/^(tel|telephone|phone|mobile|cell|whatsapp|fax)\b/.test(label) || /^[+()\d\s.-]{7,}$/.test(value)) return 'phone';
  if (/web|site|portfolio|url|link/.test(label) || /(https?:\/\/|www\.|\.(com|dev|io|net|org|me|site|co|app)\b)/.test(value)) return 'globe';
  if (/address|location|city|based|residen/.test(label)
    || /\d+\s+.*\b(street|st|road|rd|avenue|ave|drive|dr|lane|ln|blvd|boulevard|close|crescent|way)\b/.test(value)
    || /\bp\.?o\.?\s*box\b/.test(value)
    || value.includes(',')) return 'pin';
  return 'dot';
};

// Lines the builder adds for the personal details. They get their own "Details" block with a label on top.
const DETAIL_LINE = /^(born|dob|date of birth|nationality|citizenship|gender|sex|marital status|civil status)\s*:|^driver['’]?s?\s+licen[cs]e/i;
const titleCase = (s) => s.trim().toLowerCase().replace(/(^|\s)\w/g, (c) => c.toUpperCase());
const detailLabel = (raw) => (/^(born|dob|date of birth)$/i.test(raw.trim()) ? 'Date of Birth' : titleCase(raw));

// "Rock climbing, chess (blitz, rapid), painting" -> three items. Commas inside brackets do not split.
const splitList = (text) => {
  const out = [];
  let depth = 0;
  let current = '';
  Array.from(String(text || '')).forEach((ch) => {
    if (ch === '(') depth += 1;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if ((ch === ',' || ch === ';') && depth === 0) {
      out.push(current);
      current = '';
    } else {
      current += ch;
    }
  });
  out.push(current);
  return out.map((s) => s.trim()).filter(Boolean);
};

const GraphiteProTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, certificates, isEmpty, accentColor, sectionOrder, edit } = props;

  const accent = accentColor || DEFAULT_PAGE;
  const pageBg = luminance(accent) > 0.2 ? tint(accent, -0.85) : accent; // dark enough for the light text

  /* -------------------------------- Headings -------------------------------- */
  // Every entry is a FLAT list of elements: no <section>, no wrapper divs, so the paginator can break between them.
  // Headings (and entry headers) are <h3>, which the paginator never leaves alone at the bottom of a page.
  const sideHeading = (key, text) => (
    <h3 key={`${key}-h`} className="flex items-center gap-2 mb-3 text-[11px] font-bold uppercase" style={{ letterSpacing: '0.2em', color: 'rgba(255, 255, 255, 0.5)' }}>
      <span className="rounded-full shrink-0" style={{ width: 4, height: 4, backgroundColor: VIOLET }} />
      {text}
    </h3>
  );
  const mainHeading = (key, number, text) => (
    <h3 key={`${key}-h`} className="flex items-center gap-3 mb-6 text-[14px] font-bold uppercase" style={{ letterSpacing: '0.2em', color: WHITE }}>
      <span style={{ color: EMERALD }}>{number}.</span>
      <span>{text}</span>
    </h3>
  );
  const sideGroup = (nodes) => padLast(nodes, 'mb-6');
  const mainGroup = (nodes) => padLast(nodes, 'mb-8');

  // Formatted (bold / italic / bullet) lines in this template's colours. Same atoms; the bullet becomes an emerald arrow.
  // The gap under each line is a class (not inline style), because padLast() swaps the last line's mb-* for the group spacing.
  const bodyText = (text, keyPrefix, { size = 12, color = SLATE_500 } = {}) =>
    renderAchievements(text, keyPrefix).map((node) => {
      const className = `${stripMb(node.props.className)} mb-1.5`;
      const style = { fontSize: size, lineHeight: 1.625, color };
      const kids = node.props.children;
      if (node.type === 'div' && Array.isArray(kids) && kids.length === 2) {
        return React.cloneElement(
          node,
          { className, style },
          <span key="marker" aria-hidden="true" className="shrink-0 select-none" style={{ color: EMERALD, fontSize: 8, marginTop: 6 }}>▶</span>,
          kids[1],
        );
      }
      return React.cloneElement(node, { className, style });
    });

  /* --------------------------- MAIN: entries with a dot --------------------------- */
  // An entry header: the title on the left and the dates (mono, violet) on the right, with a glowing dot in the margin.
  const entryHeader = ({ key, title, dates, line, place, filled }) => (
    <h3 key={key} className="relative mb-2">
      <span
        aria-hidden="true"
        className="absolute rounded-full"
        style={filled
          ? { left: -24, top: 6, width: 6, height: 6, backgroundColor: EMERALD, boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)' }
          : { left: -24, top: 6, width: 6, height: 6, border: `1px solid ${VIOLET}` }}
      />
      <span className="flex justify-between items-baseline gap-4">
        <span className="text-[14px] font-bold" style={{ color: WHITE }}>{title}</span>
        {dates && <span className="text-[11px] font-mono whitespace-nowrap" style={{ color: VIOLET }}>{dates}</span>}
      </span>
      {(line || place) && (
        <span className="block mt-1 text-[12px] font-medium" style={{ color: SLATE_400 }}>
          {line}
          {place && <span style={{ opacity: 0.6 }}>{line ? ` • ${place}` : place}</span>}
        </span>
      )}
    </h3>
  );

  const projectItems = (projects?.items || []).filter((p) => p.title || p.description);
  const referenceItems = (references?.items || []).filter((r) => r.name);
  const certificateItems = (certificates?.items || []).filter((c) => c.name || c.issuer);
  const pairs = (items) => items.reduce((rows, item, i) => {
    if (i % 2 === 0) rows.push([item]);
    else rows[rows.length - 1].push(item);
    return rows;
  }, []);

  // Which main sections have something to show, in the user's order. The numbers (01., 02., ...) count only these.
  const mainPresent = {
    experience: jobs.length > 0,
    education: educations.length > 0,
    skills: namedSkills.length > 0,
    projects: Boolean(projects?.enabled && projectItems.length > 0),
    references: Boolean(references?.enabled && (references.availableUponRequest || referenceItems.length > 0)),
    certificates: Boolean(certificates?.enabled && certificateItems.length > 0),
  };
  const mainKeys = sectionOrder.filter((key) => !SIDE_SECTIONS.includes(key) && mainPresent[key]);
  const numberOf = (key) => String(mainKeys.indexOf(key) + 1).padStart(2, '0');

  const cardStyle = { backgroundColor: SOFT_FILL, border: `1px solid ${CARD_LINE}` };

  const mainMap = {
    experience: mainPresent.experience ? mainGroup([
      mainHeading('experience', numberOf('experience'), 'Experience'),
      ...jobs.flatMap((job) => {
        const place = [job.location, job.remote ? 'Remote' : ''].filter(Boolean).join(', ');
        // Job title first when there is one; otherwise the employer takes the bold position.
        return padLast([
          entryHeader({
            key: `job-${job.id}-h`,
            title: job.title || job.employer,
            dates: jobDates(job),
            line: job.title ? job.employer : '',
            place,
            filled: true,
          }),
          ...bodyText(job.achievements, `job-${job.id}-ach`),
        ], 'mb-6');
      }),
    ]) : [],
    education: mainPresent.education ? mainGroup([
      mainHeading('education', numberOf('education'), 'Education'),
      ...educations.flatMap((ed) => {
        const degree = [ed.degree, ed.field].filter(Boolean).join(', ');
        return padLast([
          entryHeader({
            key: `education-${ed.id}-h`,
            title: degree || ed.institution,
            dates: ed.date,
            line: degree ? ed.institution : '',
            place: ed.location,
            filled: false,
          }),
          ...bodyText(ed.achievements, `education-${ed.id}-ach`),
        ], 'mb-6');
      }),
    ]) : [],
    skills: mainPresent.skills ? mainGroup([
      mainHeading('skills', numberOf('skills'), 'Skills'),
      // Two skills side by side, one row at a time (rows are the blocks the paginator can break between).
      ...pairs(namedSkills).map((row, rowIndex) => (
        <div key={`skills-row-${rowIndex}`} className="grid grid-cols-2 gap-x-6 mb-4">
          {row.map((s, i) => {
            const rating = skillRating(s);
            const label = rating ? getSkillLevelLabel(rating) : '';
            return (
              <div key={`skill-${s.id || i}`} className="min-w-0">
                <div className="flex justify-between items-baseline gap-2">
                  <span className="text-[12px] font-medium" style={{ color: TEXT }}>{s.text}</span>
                  {label && <span className="text-[10px] font-mono whitespace-nowrap" style={{ color: SLATE_500 }}>{label}</span>}
                </div>
                {rating > 0 && (
                  <div className="mt-1.5 w-full overflow-hidden rounded-full" style={{ height: 3, backgroundColor: HAIRLINE }}>
                    <div className="h-full rounded-full" style={{ width: `${(rating / 5) * 100}%`, backgroundImage: `linear-gradient(to right, ${EMERALD}, ${VIOLET})` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )),
    ]) : [],
    projects: mainPresent.projects ? mainGroup([
      mainHeading('projects', numberOf('projects'), 'Projects'),
      // A card is one block, so a project is never split across two pages.
      ...projectItems.map((p) => (
        <div key={`project-${p.id}`} className="rounded-lg p-4 mb-6" style={cardStyle}>
          {(p.title || p.link) && (
            <div className="flex justify-between items-baseline gap-4 mb-2">
              <span className="text-[14px] font-bold" style={{ color: WHITE }}>{p.title}</span>
              {p.link && <span className="text-[11px] font-mono text-right break-all" style={{ color: VIOLET, maxWidth: 150 }}>{p.link}</span>}
            </div>
          )}
          {padLast(bodyText(p.description, `project-${p.id}-desc`), 'mb-0')}
        </div>
      )),
    ]) : [],
    certificates: mainPresent.certificates ? mainGroup([
      mainHeading('certificates', numberOf('certificates'), 'Certifications'),
      ...certificateItems.flatMap((c) => padLast([
        <div key={`certificate-${c.id}-title`} className="flex justify-between items-baseline gap-2">
          <span className="text-[13px] font-bold" style={{ color: WHITE }}>{c.name || c.issuer}</span>
          {c.date && <span className="text-[11px] font-mono whitespace-nowrap" style={{ color: VIOLET }}>{formatRange(c.date)}</span>}
        </div>,
        c.name && c.issuer && <p key={`certificate-${c.id}-issuer`} className="mt-1 text-[12px]" style={{ color: SLATE_400 }}>{c.issuer}</p>,
        c.link && <p key={`certificate-${c.id}-link`} className="mt-1 text-[11px] font-mono break-all" style={{ color: SLATE_500 }}>{c.link}</p>,
        ...bodyText(c.description, `certificate-${c.id}-desc`, { size: 11 }).map((node, i) => (i === 0 ? React.cloneElement(node, { style: { ...node.props.style, marginTop: 6 } }) : node)),
      ], 'mb-5')),
    ]) : [],
    references: mainPresent.references ? mainGroup([
      mainHeading('references', numberOf('references'), 'References'),
      ...(references.availableUponRequest
        ? [<p key="references-note" className="text-[12px]" style={{ color: SLATE_500 }}>Available upon request.</p>]
        : pairs(referenceItems).map((row, rowIndex) => (
          <div key={`reference-row-${rowIndex}`} className="grid grid-cols-2 gap-6 mb-6">
            {row.map((r) => (
              <div key={`reference-${r.id}`} className="min-w-0 rounded-lg p-4" style={cardStyle}>
                <p className="text-[13px] font-bold" style={{ color: WHITE }}>{r.name}</p>
                {r.relationship && <p className="mt-1 text-[11px]" style={{ color: EMERALD }}>{r.relationship}</p>}
                {r.contact && <p className="mt-2 text-[11px] font-mono break-words" style={{ color: SLATE_500 }}>{r.contact}</p>}
              </div>
            ))}
          </div>
        ))),
    ]) : [],
  };

  /* ------------------------------- SIDEBAR column ------------------------------- */
  const languageItems = (languages?.items || []).filter((l) => l.name);
  const hasLanguages = Boolean(languages?.enabled && languageItems.length > 0);
  const hasHobbies = Boolean(hobbies?.enabled && hobbies.text && String(hobbies.text).trim());
  const hobbyItems = hasHobbies ? parseBlocks(hobbies.text).flatMap((block) => splitList(block.text)) : [];

  const sideMap = {
    summary: summary ? sideGroup([
      sideHeading('summary', 'About Me'),
      ...bodyText(summary, 'summary', { color: SLATE_400 }),
    ]) : [],
    languages: hasLanguages ? sideGroup([
      sideHeading('languages', 'Languages'),
      ...languageItems.map((l, i) => {
        const { label } = languageLevelInfo(l);
        return (
          <div key={`language-${l.id || i}`} className="flex justify-between items-baseline gap-2 mb-2">
            <span className="text-[12px] font-medium" style={{ color: TEXT }}>{l.name}</span>
            {label && <span className="text-[10px] font-mono uppercase text-right" style={{ letterSpacing: '0.1em', color: EMERALD }}>{label}</span>}
          </div>
        );
      }),
    ]) : [],
    hobbies: hobbyItems.length > 0 ? sideGroup([
      sideHeading('hobbies', 'Interests'),
      <div key="hobbies-chips" className="flex flex-wrap gap-2">
        {hobbyItems.map((item, i) => (
          <span key={`hobby-${i}`} className="px-3 py-1 rounded-full text-[11px]" style={{ backgroundColor: TILE_FILL, border: `1px solid ${HAIRLINE}`, color: SLATE_400 }}>
            {renderInline(item, `hobby-${i}`)}
          </span>
        ))}
      </div>,
    ]) : [],
  };

  // Photo, name, profession, contact and personal details open the sidebar, as flat blocks at the top of page 1.
  const lines = (contactList || []).filter((line) => typeof line === 'string' && line.trim());
  const detailLines = lines.filter((line) => DETAIL_LINE.test(line.trim()));
  const contactLines = lines.filter((line) => !DETAIL_LINE.test(line.trim()));

  // A resume has one location, so only the first address-like line gets the pin; any later one gets a dot.
  const contactIcons = (() => {
    let pinUsed = false;
    return contactLines.map((line) => {
      const icon = contactIcon(line);
      if (icon !== 'pin') return icon;
      if (pinUsed) return 'dot';
      pinUsed = true;
      return 'pin';
    });
  })();

  const displayName = (fullName || 'Your Name').trim();
  // The sidebar is narrow, so a long first or last name gets a smaller size instead of breaking in the middle of a word.
  const longestWord = Math.max(...displayName.split(/\s+/).map((w) => w.length), 1);
  const nameSize = longestWord <= 9 ? 28 : longestWord <= 11 ? 24 : longestWord <= 13 ? 21 : 18;
  const professionParts = (personal?.profession || '').split('|').map((p) => p.trim()).filter(Boolean);

  const photoBlocks = personal?.photo ? [
    <div key="side-photo" className="flex justify-center mb-6">
      <div className="relative">
        {/* The glow is a soft radial gradient, which the PDF export draws the same way as the screen. */}
        <div
          aria-hidden="true"
          className="absolute rounded-full"
          style={{ top: -16, right: -16, bottom: -16, left: -16, backgroundImage: 'radial-gradient(circle, rgba(16,185,129,0.35) 0%, rgba(139,92,246,0.22) 55%, rgba(139,92,246,0) 72%)' }}
        />
        <div className="relative">
          <ResumePhoto src={personal.photo} style={personal.photoStyle} borderColor={EMERALD} />
        </div>
      </div>
    </div>,
  ] : [];

  const nameBlocks = [
    <h1 key="side-name" className="font-bold text-center break-words" style={{ fontSize: nameSize, lineHeight: 1.2, letterSpacing: '0.05em', color: WHITE }}>
      {displayName}
    </h1>,
    professionParts.length > 0 && (
      <p key="side-profession" className="mt-2 text-[12px] font-medium text-center uppercase" style={{ letterSpacing: '0.3em', color: EMERALD }}>
        {professionParts.join(' | ')}
      </p>
    ),
  ].filter(Boolean);

  const contactBlocks = contactLines.length > 0 ? [
    sideHeading('contact', 'Contact'),
    ...contactLines.map((line, i) => (
      <div key={`contact-${i}`} className="flex items-center gap-3 mb-3 text-[12px]">
        <span className="shrink-0 rounded flex items-center justify-center" style={{ width: 24, height: 24, backgroundColor: TILE_FILL, border: `1px solid ${HAIRLINE}`, color: EMERALD }}>
          <Icon name={contactIcons[i]} size={12} />
        </span>
        <span className="min-w-0 break-words" style={{ color: SLATE_400 }}>{line.replace(/^https?:\/\//i, '')}</span>
      </div>
    )),
  ] : [];

  const detailBlocks = detailLines.length > 0 ? [
    sideHeading('details', 'Details'),
    ...detailLines.map((line, i) => {
      const m = line.trim().match(/^([^:]+):\s*(.+)$/);
      return (
        <div key={`detail-${i}`} className="mb-2.5">
          {m && <span className="block mb-0.5 text-[9px] font-mono uppercase" style={{ letterSpacing: '0.15em', color: VIOLET }}>{detailLabel(m[1])}</span>}
          <span className="block text-[12px] leading-snug" style={{ color: SLATE_400 }}>{m ? m[2] : line.trim()}</span>
        </div>
      );
    }),
  ] : [];

  const sideHead = [
    ...photoBlocks,
    ...padLast(nameBlocks, 'mb-8'),
    ...(contactBlocks.length > 0 ? sideGroup(contactBlocks) : []),
    ...(detailBlocks.length > 0 ? sideGroup(detailBlocks) : []),
  ];

  const mainBlocks = mainKeys.flatMap((key) => markSection(edit, key, mainMap[key] || []));
  const sideBlocks = [
    ...markSection(edit, 'personal', sideHead, false),
    ...sectionOrder
      .filter((key) => SIDE_SECTIONS.includes(key))
      .flatMap((key) => markSection(edit, key, sideMap[key] || [])),
  ];

  /* ------------------------------- Pagination ------------------------------- */
  // Each column is measured and split on its own; the page count is the larger of the two.
  const main = usePaginatedBlocks(mainBlocks, 1020);
  const side = usePaginatedBlocks(sideBlocks, 1020);
  const pageCount = Math.max(main.pages.length, side.pages.length);

  return (
    <>
      <div ref={main.measureContainerRef} className="absolute top-[-9999px] left-[-9999px] pointer-events-none font-sans" style={{ width: MAIN_W }}>
        {main.measureContent}
      </div>
      <div ref={side.measureContainerRef} className="absolute top-[-9999px] left-[-9999px] pointer-events-none font-sans" style={{ width: SIDE_CONTENT_W }}>
        {side.measureContent}
      </div>

      {Array.from({ length: pageCount }, (_, index) => (
        <A4Page key={index} pageNum={index + 1} totalPages={pageCount}>
          <div className="relative flex w-full h-full text-left font-sans overflow-hidden" style={{ color: TEXT, backgroundColor: pageBg }}>
            {/* The faint grid across the whole page */}
            <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ backgroundImage: GRID, backgroundSize: '32px 32px' }} />

            <div
              ref={index === 0 ? side.firstBodyRef : undefined}
              className="relative shrink-0 h-full overflow-hidden"
              style={{
                width: SIDEBAR_W,
                padding: `${SIDE_PAD.top}px ${SIDE_PAD.right}px ${SIDE_PAD.bottom}px ${SIDE_PAD.left}px`,
                backgroundColor: SOFT_FILL,
                borderRight: `1px solid ${HAIRLINE}`,
              }}
            >
              {side.pages[index]}
            </div>

            <div
              ref={index === 0 ? main.firstBodyRef : undefined}
              className="relative flex-1 min-w-0 h-full overflow-hidden"
              style={{ padding: `${MAIN_PAD.top}px ${MAIN_PAD.right}px ${MAIN_PAD.bottom}px ${MAIN_PAD.left}px` }}
            >
              {main.pages[index]}
              {isEmpty && index === 0 && (
                <p className="text-xs italic mt-10" style={{ color: SLATE_500 }}>Nothing entered yet — fill in a few steps to see them appear here.</p>
              )}
            </div>
          </div>
        </A4Page>
      ))}
    </>
  );
};

export default GraphiteProTemplate;
