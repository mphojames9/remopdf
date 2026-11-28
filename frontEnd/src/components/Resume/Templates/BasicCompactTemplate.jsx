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
// PRESTIGE IVORY: a clean black and white page with a light grey sidebar and a heavy header.
//  - TWO columns. Sidebar: photo, contact, personal details, core skills, languages, interests.
//    Main: name and profession over a thick rule, then summary, experience, projects, education, certifications, references.
//  - the accent colour picked in the builder is the INK colour (default near-black): the name, the thick rule, the
//    section headings, the job and degree titles and the skill bars. Every grey stays fixed.
//  - skills are a thin bar (no words); a skill with no level shows its name only
//  - each column is measured and split into pages on its own, so a long column simply continues on the next page
// Change the tokens below first; then the blocks further down.
const DEFAULT_INK = '#171717';  // used only if no accent colour is passed in
const PAPER = '#FFFFFF';        // main column background
const SIDE_BG = '#FAFAFA';      // sidebar background
const LINE = '#E5E5E5';         // hairlines and the empty part of a skill bar
const N800 = '#262626';         // sidebar values and skill names
const N700 = '#404040';         // sidebar contact lines
const N600 = '#525252';         // main paragraphs, bullets and company names
const N500 = '#737373';         // dates, sidebar headings, language levels
const N400 = '#8A8A8A';         // icons, small labels, places
const N300 = '#D4D4D4';         // bullet squares
const SIDEBAR_W = 254;          // px, the whole sidebar (32% of the page), border included
const SIDE_PAD = 32;            // px, padding inside the sidebar
const MAIN_PAD = 40;            // px, padding inside the main column
const SIDE_CONTENT_W = SIDEBAR_W - SIDE_PAD * 2 - 1; // px -> 189 (1px border). The hidden measuring boxes must match the real columns.
const MAIN_W = 794 - SIDEBAR_W - MAIN_PAD * 2;       // px -> 460

// These sections live in the sidebar. Every other section goes in the main column.
const SIDE_SECTIONS = ['skills', 'languages', 'hobbies'];

/* --------------------------------- Colours -------------------------------- */
// 0 (black) to 1 (white). The ink is used as text on white, so a bright accent is darkened until it is readable.
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
  mail: ['M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75'],
  phone: ['M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3'],
  pin: ['M15 10.5a3 3 0 11-6 0 3 3 0 016 0z', 'M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z'],
  link: ['M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244'],
  dot: [],
};

const Icon = ({ name, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
    {(ICON_PATHS[name] || []).map((d) => <path key={d} d={d} />)}
    {name === 'dot' && <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />}
  </svg>
);

/* ------------------------------ Text helpers ------------------------------ */
// The contact list is plain text, so the icon is picked from what the line looks like.
// This template draws websites and social links with the same link icon, as the original did.
// An email typed without its "@" (e.g. "name9gmail.com") still gets the mail icon.
const MAIL_HOST = /^(?!www\.)[^\s@/]+(gmail|googlemail|yahoo|outlook|hotmail|live|icloud|proton|protonmail)\.(com|me|co\.za|co\.uk)$/;
const contactIcon = (c) => {
  if (typeof c !== 'string') return 'dot';
  const s = c.trim().toLowerCase();
  // Split off a leading "Label:" (but not the "https:" of a URL) so "Tel: +27 ..." is still recognised.
  const m = s.match(/^([a-z][a-z .\/&-]{1,28}):(?!\/\/)\s*/);
  const label = m ? m[1] : '';
  const value = m ? s.slice(m[0].length) : s;

  if (s.includes('linkedin')) return 'link';
  if (value.includes('@') || /e-?mail/.test(label) || MAIL_HOST.test(value)) return 'mail';
  if (/^(tel|telephone|phone|mobile|cell|whatsapp|fax)\b/.test(label) || /^[+()\d\s.-]{7,}$/.test(value)) return 'phone';
  if (/web|site|portfolio|url|link/.test(label) || /(https?:\/\/|www\.|\.(com|dev|io|net|org|me|site|co|app)\b)/.test(value)) return 'link';
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

// Lets an email or link wrap after "@" and "/" (instead of in the middle of a word) when it is too long for the line.
const withBreaks = (text) => String(text).split(/([@/])/).map((part, i) => (
  i % 2 === 1 ? <React.Fragment key={`b-${i}`}>{part}<wbr /></React.Fragment> : part
));

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

const PrestigeIvoryTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, certificates, isEmpty, accentColor, sectionOrder, edit } = props;

  const accent = accentColor || DEFAULT_INK;
  const INK = luminance(accent) > 0.25 ? tint(accent, -0.6) : accent; // dark enough to read as text on white

  /* -------------------------------- Headings -------------------------------- */
  // Every entry is a FLAT list of elements: no <section>, no wrapper divs, so the paginator can break between them.
  // Headings (and entry headers) are <h3>, which the paginator never leaves alone at the bottom of a page.
  const sideHeading = (key, text) => (
    <h3 key={`${key}-h`} className="text-[11px] font-bold uppercase pb-2 mb-4" style={{ letterSpacing: '0.3em', color: N500, borderBottom: `1px solid ${LINE}` }}>
      {text}
    </h3>
  );
  const mainHeading = (key, text) => (
    <h3 key={`${key}-h`} className="text-[14px] font-black uppercase mb-4" style={{ letterSpacing: '0.2em', color: INK }}>
      {text}
    </h3>
  );
  const sideGroup = (nodes) => padLast(nodes, 'mb-8');

  // Formatted (bold / italic / bullet) lines in this template's colours. Same atoms; the bullet becomes a small grey square.
  // The gap under each line is a class (not inline style), because padLast() swaps the last line's mb-* for the group spacing.
  const richText = (text, keyPrefix, { size = 13.5, line = 1.625, color = N600, spacing = 'mb-2', style = {} } = {}) =>
    renderAchievements(text, keyPrefix).map((node) => {
      const className = `${stripMb(node.props.className)} ${spacing}`;
      const nodeStyle = { fontSize: size, lineHeight: line, color, ...style };
      const kids = node.props.children;
      if (node.type === 'div' && Array.isArray(kids) && kids.length === 2) {
        return React.cloneElement(
          node,
          { className, style: nodeStyle },
          <span key="marker" aria-hidden="true" className="shrink-0 select-none" style={{ color: N300, fontSize: 10, marginTop: 6 }}>■</span>,
          kids[1],
        );
      }
      return React.cloneElement(node, { className, style: nodeStyle });
    });

  /* ------------------------------- MAIN: entries ------------------------------- */
  // The first row of an entry: the title on the left and the date (or link) on the right.
  const entryHeader = ({ key, title, side, titleSize = 15, sideClass = 'uppercase tracking-widest' }) => (
    <h3 key={key} className="flex justify-between items-baseline gap-2">
      <span className="min-w-0 font-bold" style={{ fontSize: titleSize, color: INK }}>{title}</span>
      {side && <span className={`shrink-0 ml-2 text-[12px] font-bold ${sideClass}`} style={{ color: N500 }}>{side}</span>}
    </h3>
  );

  // The second row: the company or school on the left, the place on the right.
  // It is an <h3> like the first row, so the paginator carries both to the next page together with the first bullet.
  const entrySubRow = (key, main, place, mainClass) => (
    <h3 key={key} className="flex justify-between items-baseline gap-2 pt-1 pb-2">
      <span className={`min-w-0 ${mainClass}`} style={{ color: N600 }}>{main}</span>
      {place && <span className="shrink-0 text-[11px] font-medium uppercase" style={{ color: N400 }}>{place}</span>}
    </h3>
  );

  const projectItems = (projects?.items || []).filter((p) => p.title || p.description);
  const referenceItems = (references?.items || []).filter((r) => r.name);
  const certificateItems = (certificates?.items || []).filter((c) => c.name || c.issuer);
  const referenceRows = referenceItems.reduce((rows, r, i) => {
    if (i % 2 === 0) rows.push([r]);
    else rows[rows.length - 1].push(r);
    return rows;
  }, []);

  const mainMap = {
    summary: summary ? padLast(
      richText(summary, 'summary', { size: 14, color: N600, style: { textAlign: 'justify', fontWeight: 500 } }),
      'mb-6',
    ) : [],
    experience: jobs.length > 0 ? [
      mainHeading('experience', 'Experience'),
      ...jobs.flatMap((job) => {
        const place = [job.location, job.remote ? 'Remote' : ''].filter(Boolean).join(', ');
        // Job title first when there is one; otherwise the employer takes the bold position.
        const hasTitle = Boolean(job.title);
        return padLast([
          entryHeader({ key: `job-${job.id}-h`, title: job.title || job.employer, side: jobDates(job), titleSize: 16 }),
          (hasTitle ? job.employer : place) && entrySubRow(`job-${job.id}-sub`, hasTitle ? job.employer : place, hasTitle ? place : '', 'text-[12px] font-semibold uppercase tracking-wide'),
          ...richText(job.achievements, `job-${job.id}-ach`),
        ], 'mb-6');
      }),
    ] : [],
    projects: projects?.enabled && projectItems.length > 0 ? [
      mainHeading('projects', 'Projects'),
      ...projectItems.flatMap((p) => padLast([
        entryHeader({ key: `project-${p.id}-h`, title: p.title || p.link, side: p.title ? p.link : '', sideClass: 'tracking-wide break-all text-right' }),
        ...richText(p.description, `project-${p.id}-desc`).map((node, i) => (i === 0 ? React.cloneElement(node, { style: { ...node.props.style, marginTop: 4 } }) : node)),
      ], 'mb-6')),
    ] : [],
    education: educations.length > 0 ? [
      mainHeading('education', 'Education'),
      ...educations.flatMap((ed) => {
        const degree = [ed.degree, ed.field].filter(Boolean).join(', ');
        return padLast([
          entryHeader({ key: `education-${ed.id}-h`, title: degree || ed.institution, side: ed.date }),
          ((degree ? ed.institution : '') || ed.location) && entrySubRow(`education-${ed.id}-sub`, degree ? ed.institution : '', ed.location, 'text-[14px] font-medium'),
          ...richText(ed.achievements, `education-${ed.id}-ach`),
        ], 'mb-6');
      }),
    ] : [],
    certificates: certificates?.enabled && certificateItems.length > 0 ? [
      mainHeading('certificates', 'Certifications'),
      ...certificateItems.flatMap((c) => padLast([
        entryHeader({ key: `certificate-${c.id}-h`, title: c.name || c.issuer, side: c.date ? formatRange(c.date) : '', titleSize: 14, sideClass: 'tracking-widest text-[11px]' }),
        c.name && c.issuer && <h3 key={`certificate-${c.id}-issuer`} className="pt-1 pb-1 text-[13px] font-normal" style={{ color: N600 }}>{c.issuer}</h3>,
        c.link && <p key={`certificate-${c.id}-link`} className="pb-1 text-[12px] break-all" style={{ color: N400 }}>{c.link}</p>,
        ...richText(c.description, `certificate-${c.id}-desc`).map((node, i) => (i === 0 ? React.cloneElement(node, { style: { ...node.props.style, marginTop: 4 } }) : node)),
      ], 'mb-6')),
    ] : [],
    references: references?.enabled && (references.availableUponRequest || referenceItems.length > 0) ? [
      mainHeading('references', 'References'),
      ...(references.availableUponRequest
        ? [<p key="references-note" className="mb-6 text-[13.5px]" style={{ color: N600 }}>Available upon request.</p>]
        : referenceRows.map((row, rowIndex) => (
          <div key={`reference-row-${rowIndex}`} className="grid grid-cols-2 gap-6 mb-6">
            {row.map((r) => (
              <div key={`reference-${r.id}`} className="min-w-0 flex flex-col gap-0.5">
                <p className="text-[14px] font-bold" style={{ color: INK }}>{r.name}</p>
                {r.relationship && <p className="mt-0.5 text-[12px] font-semibold uppercase tracking-wide" style={{ color: N500 }}>{r.relationship}</p>}
                {r.contact && <p className="mt-1 text-[12px] font-medium break-words" style={{ color: N600 }}>{r.contact}</p>}
              </div>
            ))}
          </div>
        ))),
    ] : [],
  };

  /* ------------------------------- SIDEBAR column ------------------------------- */
  const languageItems = (languages?.items || []).filter((l) => l.name);
  const hasLanguages = Boolean(languages?.enabled && languageItems.length > 0);
  const hasHobbies = Boolean(hobbies?.enabled && hobbies.text && String(hobbies.text).trim());
  const hobbyItems = hasHobbies ? parseBlocks(hobbies.text).flatMap((block) => splitList(block.text)) : [];

  const sideMap = {
    skills: namedSkills.length > 0 ? sideGroup([
      sideHeading('skills', 'Core Skills'),
      ...namedSkills.map((s, i) => {
        const rating = skillRating(s);
        return (
          <div key={`skill-${s.id || i}`} className="mb-4" title={rating ? getSkillLevelLabel(rating) : undefined}>
            <p className="text-[13px] font-semibold" style={{ color: N800 }}>{s.text}</p>
            {rating > 0 && (
              <div className="mt-1.5 w-full overflow-hidden rounded-full" style={{ height: 3, backgroundColor: LINE }}>
                <div className="h-full rounded-full" style={{ width: `${(rating / 5) * 100}%`, backgroundColor: INK }} />
              </div>
            )}
          </div>
        );
      }),
    ]) : [],
    languages: hasLanguages ? sideGroup([
      sideHeading('languages', 'Languages'),
      ...languageItems.map((l, i) => {
        const { label } = languageLevelInfo(l);
        return (
          <div key={`language-${l.id || i}`} className="flex justify-between items-baseline gap-2 pb-1 mb-4" style={{ borderBottom: `1px dashed ${LINE}` }}>
            <span className="text-[13px] font-semibold" style={{ color: N800 }}>{l.name}</span>
            {label && <span className="text-[11px] uppercase tracking-widest text-right" style={{ color: N500 }}>{label}</span>}
          </div>
        );
      }),
    ]) : [],
    hobbies: hobbyItems.length > 0 ? sideGroup([
      sideHeading('hobbies', 'Interests'),
      ...hobbyItems.map((item, i) => (
        <div key={`hobby-${i}`} className="flex items-center gap-3 mb-4 text-[13px]" style={{ color: N700 }}>
          <span className="rounded-full shrink-0" style={{ width: 3, height: 3, backgroundColor: N400 }} />
          <span className="min-w-0 break-words">{renderInline(item, `hobby-${i}`)}</span>
        </div>
      )),
    ]) : [],
  };

  // Photo, contact and personal details open the sidebar, as flat blocks at the top of page 1.
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

  const photoBlocks = personal?.photo ? [
    <div key="side-photo" className="flex justify-center mb-6">
      <ResumePhoto src={personal.photo} style={personal.photoStyle} borderColor="#D4D4D4" />
    </div>,
  ] : [];

  const contactBlocks = contactLines.length > 0 ? [
    sideHeading('contact', 'Contact'),
    ...contactLines.map((line, i) => (
      <div key={`contact-${i}`} className="flex items-center gap-3 mb-4 text-[13px]">
        <span style={{ color: N400 }}><Icon name={contactIcons[i]} size={16} /></span>
        <span className="min-w-0 break-words font-medium" style={{ color: N700 }}>{withBreaks(line.replace(/^https?:\/\//i, ''))}</span>
      </div>
    )),
  ] : [];

  const detailBlocks = detailLines.length > 0 ? [
    sideHeading('details', 'Details'),
    ...detailLines.map((line, i) => {
      const m = line.trim().match(/^([^:]+):\s*(.+)$/);
      return (
        <div key={`detail-${i}`} className="flex flex-col gap-0.5 mb-4">
          {m && <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: N400 }}>{detailLabel(m[1])}</span>}
          <span className="text-[13px]" style={{ color: N800 }}>{m ? m[2] : line.trim()}</span>
        </div>
      );
    }),
  ] : [];

  const sideHead = [
    ...photoBlocks,
    ...(contactBlocks.length > 0 ? sideGroup(contactBlocks) : []),
    ...(detailBlocks.length > 0 ? sideGroup(detailBlocks) : []),
  ];

  /* ------------------------------- Main header ------------------------------- */
  // Name and profession open the main column over a thick rule, as one flat block at the top of page 1.
  const displayName = (fullName || 'Your Name').trim();
  // Heavy capitals: a longer name gets a smaller size, and may wrap onto a second line.
  const nameSize = displayName.length <= 12 ? 48 : displayName.length <= 16 ? 40 : displayName.length <= 20 ? 34 : displayName.length <= 26 ? 30 : 26;
  const professionParts = (personal?.profession || '').split('|').map((p) => p.trim()).filter(Boolean);

  const headerBlocks = markSection(edit, 'personal', [
    <div key="page-header" className="flex flex-col gap-2 pb-6 mb-6" style={{ borderBottom: `2px solid ${INK}` }}>
      <h1 className="font-black uppercase break-words" style={{ fontSize: nameSize, lineHeight: 1.05, letterSpacing: '-0.05em', color: INK }}>
        {displayName}
      </h1>
      {professionParts.length > 0 && (
        <p className="mt-1 text-[14px] font-bold uppercase" style={{ letterSpacing: '0.25em', color: N500 }}>
          {professionParts.join(' | ')}
        </p>
      )}
    </div>,
  ], false);

  const mainBlocks = [
    ...headerBlocks,
    ...sectionOrder
      .filter((key) => !SIDE_SECTIONS.includes(key))
      .flatMap((key) => markSection(edit, key, mainMap[key] || [])),
  ];
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
          <div className="relative flex w-full h-full text-left font-sans" style={{ color: N600, backgroundColor: PAPER }}>
            <div
              ref={index === 0 ? side.firstBodyRef : undefined}
              className="shrink-0 h-full overflow-hidden"
              style={{ width: SIDEBAR_W, padding: SIDE_PAD, backgroundColor: SIDE_BG, borderRight: `1px solid ${LINE}` }}
            >
              {side.pages[index]}
            </div>

            <div
              ref={index === 0 ? main.firstBodyRef : undefined}
              className="flex-1 min-w-0 h-full overflow-hidden"
              style={{ padding: MAIN_PAD }}
            >
              {main.pages[index]}
              {isEmpty && index === 0 && (
                <p className="text-xs text-slate-400 italic mt-10">Nothing entered yet — fill in a few steps to see them appear here.</p>
              )}
            </div>
          </div>
        </A4Page>
      ))}
    </>
  );
};

export default PrestigeIvoryTemplate;
