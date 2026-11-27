import React from 'react';
import { renderAchievements } from '../Sections/richText';
import { languageLevelInfo } from '../Sections/LanguageLevelSelect';
import { formatRange } from '../Sections/dateFormat';
import ResumePhoto from '../Sections/ResumePhoto';
import {
  tint,
  jobDates,
  usePaginatedBlocks,
  A4Page,
  padLast,
  stripMb,
  endGroup,
  markSection,
} from './templateShared';

/* ------------------------------ Design tokens ------------------------------ */
// PROFESSIONAL DARK: a dark blue sidebar with gold details, and a white main column with a timeline for experience.
//  - TWO columns. Sidebar: photo, contact, personal details, education, skills, languages, hobbies, certificates.
//    Main: name and profession, summary, experience (timeline), projects, references.
//  - the accent colour picked in the builder is the SIDEBAR colour; the gold details stay fixed (GOLD below)
//  - skills are plain text with no level; languages show their level in gold under the name
//  - each column is measured and split into pages on its own, so a long column simply continues on the next page
// Change the tokens below first; then the blocks further down.
const GOLD = '#c99c60';                      // icons, ring, dates dot, company names, last name
const GOLD_LINE = 'rgba(201, 156, 96, 0.4)'; // hairlines next to the section headings
const GOLD_TIMELINE = 'rgba(201, 156, 96, 0.5)'; // the vertical timeline
const INK = '#0f172a';                       // name, headings, role titles
const BODY = '#334155';                      // paragraphs and bullets
const SOFT = '#64748b';                      // dates, small print
const RULE = '#e2e8f0';                      // line under the profession
const PAPER = '#FFFFFF';                     // main column background
const SIDE_TEXT = '#cbd5e1';                 // sidebar text
const SIDE_SOFT = '#94a3b8';                 // sidebar dates and small print
const DEFAULT_SIDEBAR = '#1a2f5a';           // dark professional blue; used only if no accent colour is passed in
const SIDEBAR_W = 278;                       // px, the whole sidebar (35% of the page)
const SIDE_PAD = { top: 32, right: 32, bottom: 32, left: 32 }; // px, padding inside the sidebar
const MAIN_PAD = { top: 40, right: 40, bottom: 32, left: 40 }; // px, padding inside the main column
const SIDE_CONTENT_W = SIDEBAR_W - SIDE_PAD.left - SIDE_PAD.right;       // px -> 214. The hidden measuring boxes must match the real columns.
const MAIN_W = 794 - SIDEBAR_W - MAIN_PAD.left - MAIN_PAD.right;         // px -> 436
const INDENT = 52;   // px, main-column text lines up with the heading text (badge 36 + gap 16)
const LINE_X = 84;   // px, where the experience timeline sits inside the main column
const DATE_W = 70;   // px, width of the date label on the left of the timeline
const TEXT_GAP = 28; // px, space between the timeline and the text

// These sections live in the sidebar. Every other section goes in the main column.
const SIDE_SECTIONS = ['education', 'skills', 'languages', 'hobbies', 'certificates'];

/* --------------------------------- Colours -------------------------------- */
// 0 (black) to 1 (white). A very light accent would make the white sidebar text unreadable, so it is darkened.
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
  user: ['M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'],
  idcard: ['M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2'],
  phone: ['M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z'],
  mail: ['M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'],
  pin: ['M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z', 'M15 11a3 3 0 11-6 0 3 3 0 016 0z'],
  globe: ['M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-3.6-9m3.6 9a9 9 0 003.6-9m-3.6-9a9 9 0 00-3.6 9m3.6-9a9 9 0 013.6 9'],
  linkedin: ['M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z'],
  dot: [],
  cap: ['M12 14l9-5-9-5-9 5 9 5z', 'M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z'],
  code: ['M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4'],
  translate: ['M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129'],
  smile: ['M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'],
  badge: ['M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z'],
  briefcase: ['M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'],
  folder: ['M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z'],
  users: ['M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'],
};

const Icon = ({ name, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
    {(ICON_PATHS[name] || []).map((d) => <path key={d} d={d} />)}
    {name === 'linkedin' && <circle cx="4" cy="4" r="2" fill="currentColor" />}
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

// Lines the builder adds for the personal details. They get their own "Personal Details" block with a label on top.
const DETAIL_LINE = /^(born|dob|date of birth|nationality|citizenship|gender|sex|marital status|civil status)\s*:|^driver['’]?s?\s+licen[cs]e/i;
const titleCase = (s) => s.trim().toLowerCase().replace(/(^|\s)\w/g, (c) => c.toUpperCase());
const detailLabel = (raw) => (/^(born|dob|date of birth)$/i.test(raw.trim()) ? 'Date of Birth' : titleCase(raw));

// "Mar 2021 – Present" on two short lines, so the date label stays narrow.
const datesLines = (text) => {
  if (!text) return null;
  const parts = String(text).split(/\s+[–-]\s+/);
  return parts.length === 2 ? <>{parts[0]} –<br />{parts[1]}</> : text;
};

const ProfessionalDarkTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, certificates, isEmpty, accentColor, sectionOrder, edit } = props;

  const accent = accentColor || DEFAULT_SIDEBAR;
  const sideBg = luminance(accent) > 0.35 ? tint(accent, -0.65) : accent; // dark enough for the white sidebar text

  /* -------------------------------- Headings -------------------------------- */
  // Every entry is a FLAT list of elements: no <section>, no wrapper divs, so the paginator can break between them.
  // Headings are <h3>, which the paginator never leaves alone at the bottom of a page.
  const badge = (icon, size) => (
    <span key="badge" className="shrink-0 rounded-full flex items-center justify-center" style={{ width: size, height: size, border: `1px solid ${GOLD}`, color: GOLD }}>
      <Icon name={icon} size={Math.round(size * 0.5)} />
    </span>
  );
  const sideHeading = (key, text, icon) => (
    <h3 key={`${key}-h`} className="flex items-center gap-3 mb-3 text-[11px] font-bold tracking-widest uppercase" style={{ color: '#FFFFFF' }}>
      {badge(icon, 28)}
      <span>{text}</span>
      <span className="flex-1 h-px" style={{ backgroundColor: GOLD_LINE }} />
    </h3>
  );
  const mainHeading = (key, text, icon) => (
    <h3 key={`${key}-h`} className="flex items-center gap-4 mb-4 text-[13px] font-bold tracking-widest uppercase" style={{ color: INK }}>
      {badge(icon, 36)}
      <span>{text}</span>
      <span className="flex-1 h-px" style={{ backgroundColor: GOLD_LINE }} />
    </h3>
  );
  const sideGroup = (nodes) => padLast(nodes, 'mb-5');

  // Formatted (bold / italic / bullet) lines, recoloured for the dark sidebar. Same atoms, a little smaller.
  const sideRichText = (text, keyPrefix) =>
    renderAchievements(text, keyPrefix).map((node) => React.cloneElement(node, {
      className: `${stripMb(node.props.className)} mb-1`,
      style: { paddingLeft: 4, fontSize: 10, lineHeight: 1.5, color: SIDE_TEXT },
    }));

  // Formatted lines in the main column, indented to line up with the heading text.
  const indentedText = (text, keyPrefix) =>
    renderAchievements(text, keyPrefix).map((node) => React.cloneElement(node, {
      style: { paddingLeft: INDENT, fontSize: 11, lineHeight: 1.7, color: BODY },
    }));

  /* ------------------------------ MAIN: experience ------------------------------ */
  // The timeline is the left border of every block of an entry, so it stays unbroken from one block to the next.
  // That is why the gap after an entry is bottom PADDING on its last block (padding keeps the line; margin would break it).
  const timelineStyle = { marginLeft: LINE_X, paddingLeft: TEXT_GAP, borderLeft: `1px solid ${GOLD_TIMELINE}` };

  const jobHeader = (job, padBottom) => {
    const place = [job.location, job.remote ? 'Remote' : ''].filter(Boolean).join(', ');
    // Job title first when there is one; otherwise the employer takes the bold position.
    const title = job.title || job.employer;
    const company = job.title ? [job.employer, place].filter(Boolean).join(', ') : place;
    const dates = datesLines(jobDates(job));
    return (
      <h3 key={`job-${job.id}-h`} className={`relative pt-1 ${padBottom}`} style={timelineStyle}>
        <span aria-hidden="true" className="absolute rounded-full" style={{ width: 10, height: 10, left: -5.5, top: 6, border: `1.5px solid ${GOLD}`, backgroundColor: PAPER }} />
        {dates && (
          <span className="absolute text-right text-[10px] font-medium leading-snug" style={{ right: '100%', marginRight: 14, top: 4, width: DATE_W, color: SOFT }}>
            {dates}
          </span>
        )}
        {title && <span className="block text-[12px] font-bold uppercase tracking-wide" style={{ color: INK }}>{title}</span>}
        {company && <span className="block text-[11px] italic" style={{ color: GOLD }}>{company}</span>}
      </h3>
    );
  };

  const jobBullets = (job, lastPad) => {
    const nodes = renderAchievements(job.achievements, `job-${job.id}-ach`);
    return nodes.map((node, i) => React.cloneElement(node, {
      className: `${stripMb(node.props.className)} ${i === nodes.length - 1 ? lastPad : 'pb-1'}`,
      style: { ...timelineStyle, fontSize: 11, lineHeight: 1.7, color: BODY },
    }));
  };

  /* ------------------------------ MAIN: other sections ------------------------------ */
  const projectItems = (projects?.items || []).filter((p) => p.title || p.description);
  const referenceItems = (references?.items || []).filter((r) => r.name);
  const referenceRows = referenceItems.reduce((rows, r, i) => {
    if (i % 2 === 0) rows.push([r]);
    else rows[rows.length - 1].push(r);
    return rows;
  }, []);

  const mainMap = {
    summary: summary ? endGroup([
      mainHeading('summary', 'Professional Summary', 'user'),
      ...indentedText(summary, 'summary').map((node) => React.cloneElement(node, {
        style: { ...node.props.style, textAlign: 'justify', lineHeight: 1.8 },
      })),
    ]) : [],
    experience: jobs.length > 0 ? endGroup([
      mainHeading('experience', 'Experience', 'briefcase'),
      ...jobs.flatMap((job, index) => {
        // Every entry but the last keeps the timeline running down to the next one.
        const tail = index === jobs.length - 1 ? 'pb-0' : 'pb-5';
        const bullets = jobBullets(job, tail);
        return [jobHeader(job, bullets.length > 0 ? 'pb-2' : tail), ...bullets];
      }),
    ]) : [],
    projects: projects?.enabled && projectItems.length > 0 ? endGroup([
      mainHeading('projects', 'Projects', 'folder'),
      ...projectItems.flatMap((p) => padLast([
        (p.title || p.link) && (
          <div key={`project-${p.id}-title`} className="flex justify-between items-start gap-4 mb-1" style={{ paddingLeft: INDENT }}>
            <p className="text-[12px] font-bold uppercase tracking-wide" style={{ color: INK }}>{p.title}</p>
            {p.link && <span className="text-[10px] text-right shrink-0 mt-0.5 break-all" style={{ color: SOFT, maxWidth: 150 }}>{p.link}</span>}
          </div>
        ),
        ...indentedText(p.description, `project-${p.id}-desc`),
      ], 'mb-4')),
    ]) : [],
    references: references?.enabled && (references.availableUponRequest || referenceItems.length > 0) ? endGroup([
      mainHeading('references', 'References', 'users'),
      ...(references.availableUponRequest
        ? [<p key="references-note" className="text-[11px]" style={{ paddingLeft: INDENT, color: BODY }}>Available upon request.</p>]
        : referenceRows.map((row, rowIndex) => (
          <div key={`reference-row-${rowIndex}`} className="flex gap-8 mb-4" style={{ paddingLeft: INDENT }}>
            {row.map((r) => (
              <div key={`reference-${r.id}`} className="flex-1 min-w-0 text-[11px]">
                <p className="font-bold uppercase tracking-wide text-[11.5px]" style={{ color: INK }}>{r.name}</p>
                {r.relationship && <p className="font-medium my-0.5" style={{ color: GOLD }}>{r.relationship}</p>}
                {r.contact && <p className="font-medium mt-1 break-words" style={{ color: SOFT }}>{r.contact}</p>}
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
  const certificateItems = (certificates?.items || []).filter((c) => c.name || c.issuer);
  const hasCertificates = Boolean(certificates?.enabled && certificateItems.length > 0);

  const sideMap = {
    education: educations.length > 0 ? sideGroup([
      sideHeading('education', 'Education', 'cap'),
      ...educations.flatMap((ed) => {
        const degree = [ed.degree, ed.field].filter(Boolean).join(', ');
        const title = degree || ed.institution;
        const school = degree ? [ed.institution, ed.location].filter(Boolean).join(', ') : ed.location;
        return padLast([
          title && <p key={`education-${ed.id}-title`} className="text-[10px] font-bold uppercase leading-snug pl-1" style={{ color: '#FFFFFF' }}>{title}</p>,
          school && <p key={`education-${ed.id}-school`} className="text-[10px] italic leading-snug mt-0.5 pl-1" style={{ color: GOLD }}>{school}</p>,
          ed.date && <p key={`education-${ed.id}-date`} className="text-[10px] leading-snug mt-0.5 pl-1" style={{ color: SIDE_SOFT }}>{ed.date}</p>,
          ...sideRichText(ed.achievements, `education-${ed.id}-ach`),
        ], 'mb-3');
      }),
    ]) : [],
    skills: namedSkills.length > 0 ? sideGroup([
      sideHeading('skills', 'Skills', 'code'),
      ...namedSkills.map((s, i) => (
        <p key={`skill-${s.id || i}`} className="text-[10px] font-semibold tracking-wide uppercase pl-1 mb-2" style={{ color: '#FFFFFF' }}>{s.text}</p>
      )),
    ]) : [],
    languages: hasLanguages ? sideGroup([
      sideHeading('languages', 'Languages', 'translate'),
      ...languageItems.map((l, i) => {
        const { label } = languageLevelInfo(l);
        return (
          <div key={`language-${l.id || i}`} className="pl-1 mb-2.5">
            <p className="text-[10px] font-semibold tracking-wide uppercase" style={{ color: '#FFFFFF' }}>{l.name}</p>
            {label && <p className="text-[9px] font-medium mt-0.5" style={{ color: GOLD }}>{label}</p>}
          </div>
        );
      }),
    ]) : [],
    hobbies: hasHobbies ? sideGroup([
      sideHeading('hobbies', 'Hobbies', 'smile'),
      ...sideRichText(hobbies.text, 'hobbies'),
    ]) : [],
    certificates: hasCertificates ? sideGroup([
      sideHeading('certificates', 'Certifications', 'badge'),
      ...certificateItems.flatMap((c) => {
        const hasDescription = Boolean(c.description && String(c.description).trim());
        const metaRow = (c.name && c.issuer) || c.date;
        return padLast([
          <p key={`certificate-${c.id}-title`} className="text-[10px] font-bold uppercase leading-snug pl-1" style={{ color: '#FFFFFF' }}>{c.name || c.issuer}</p>,
          metaRow && (
            <div key={`certificate-${c.id}-meta`} className="flex justify-between items-start gap-2 mt-0.5 pl-1">
              <p className="text-[9px] font-medium" style={{ color: GOLD }}>{c.name && c.issuer ? c.issuer : ''}</p>
              {c.date && <p className="text-[9px] text-right shrink-0" style={{ color: SIDE_SOFT }}>{formatRange(c.date)}</p>}
            </div>
          ),
          c.link && <p key={`certificate-${c.id}-link`} className="text-[9px] mt-0.5 break-all pl-1" style={{ color: SIDE_SOFT }}>{c.link}</p>,
          ...(hasDescription ? sideRichText(c.description, `certificate-${c.id}-desc`).map((node) => React.cloneElement(node, {
            style: { ...node.props.style, fontSize: 9, marginTop: 4 },
          })) : []),
        ], 'mb-3');
      }),
    ]) : [],
  };

  // Photo (when there is one), the contact lines and the personal details open the sidebar, as flat blocks at the top of page 1.
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
      <ResumePhoto src={personal.photo} style={personal.photoStyle} borderColor={GOLD} />
    </div>,
  ] : [];

  const contactBlocks = contactLines.length > 0 ? [
    sideHeading('contact', 'Contact', 'user'),
    ...contactLines.map((line, i) => (
      <div key={`contact-${i}`} className="flex items-start gap-2 mb-1.5 pl-1">
        <span className="shrink-0 mt-px" style={{ color: GOLD }}><Icon name={contactIcons[i]} size={12} /></span>
        <span className="min-w-0 break-words text-[10px] font-medium leading-snug" style={{ color: SIDE_TEXT }}>{line}</span>
      </div>
    )),
  ] : [];

  const detailBlocks = detailLines.length > 0 ? [
    sideHeading('details', 'Personal Details', 'idcard'),
    ...detailLines.map((line, i) => {
      const m = line.trim().match(/^([^:]+):\s*(.+)$/);
      return (
        <div key={`detail-${i}`} className="pl-1 mb-2">
          {m && <span className="block mb-0.5 text-[9px] font-medium uppercase tracking-widest" style={{ color: GOLD }}>{detailLabel(m[1])}</span>}
          <span className="block text-[10px] font-medium leading-snug" style={{ color: SIDE_TEXT }}>{m ? m[2] : line.trim()}</span>
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
  // Name and profession open the main column, as one flat block at the top of page 1.
  const nameParts = (fullName || 'Your Name').trim().split(/\s+/);
  const lastName = nameParts.length > 1 ? nameParts.pop() : '';
  const firstName = nameParts.join(' ');
  const nameLength = (firstName + lastName).length + (lastName ? 1 : 0);
  // Wide, letter-spaced capitals: shrink the name so a long one still fits the column.
  const nameSize = Math.max(22, Math.min(40, Math.floor(520 / Math.max(nameLength, 1))));
  const professionParts = (personal?.profession || '').split('|').map((p) => p.trim()).filter(Boolean);

  const headerBlocks = markSection(edit, 'personal', [
    <div key="page-header" className="mb-6">
      <h1 className="font-serif uppercase tracking-widest break-words" style={{ fontSize: nameSize, lineHeight: 1.05, color: INK }}>
        {firstName}
        {lastName && <>{' '}<span style={{ color: GOLD }}>{lastName}</span></>}
      </h1>
      {professionParts.length > 0 && (
        <p className="mt-3 pb-4 text-[13px] font-bold uppercase border-b" style={{ letterSpacing: '0.2em', color: '#475569', borderColor: RULE }}>
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
          <div className="relative flex w-full h-full text-left font-sans" style={{ color: BODY, backgroundColor: PAPER }}>
            <div
              ref={index === 0 ? side.firstBodyRef : undefined}
              className="shrink-0 h-full overflow-hidden"
              style={{ width: SIDEBAR_W, padding: `${SIDE_PAD.top}px ${SIDE_PAD.right}px ${SIDE_PAD.bottom}px ${SIDE_PAD.left}px`, backgroundColor: sideBg }}
            >
              {side.pages[index]}
            </div>

            <div
              ref={index === 0 ? main.firstBodyRef : undefined}
              className="flex-1 min-w-0 h-full overflow-hidden"
              style={{ padding: `${MAIN_PAD.top}px ${MAIN_PAD.right}px ${MAIN_PAD.bottom}px ${MAIN_PAD.left}px` }}
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

export default ProfessionalDarkTemplate;
