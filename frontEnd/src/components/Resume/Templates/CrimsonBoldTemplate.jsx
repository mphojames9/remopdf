import React, { useEffect } from 'react';
import { parseBlocks, renderInline } from '../Sections/richText';
import { languageLevelInfo } from '../Sections/LanguageLevelSelect';
import { formatRange } from '../Sections/dateFormat';
import {
  PAGE_HEIGHT_PX,
  PAGE_WIDTH_PX,
  DEFAULT_ACCENT,
  jobDates,
  usePaginatedBlocks,
  A4Page,
  padLast,
  editAttrs,
  markSection,
  SectionControls,
} from './templateShared';

/**
 * Architect (id: architect). A single-column page built on a "label rail": every section has its title in a
 * narrow left column (28%) and its content in the wide right column (72%), with a fine two-tone rule between
 * sections. Serif (Playfair Display) name with the surname in the accent colour, contact lines in boxed icons
 * at the top right, and Skills / Hobbies / Languages side by side in one three-column block.
 *
 *   header   name + profession | contact lines (page 1 only)
 *   rows     Details, Profile, Experience, Projects, Education, Certifications, References (in the user's order)
 *   grid     Skills | Hobbies | Languages, placed where the first of those three sections sits in the order
 *
 * The accent colour (navy by default) drives the surname, the rules, the diamond markers, company / school /
 * issuer lines, bullets, language bars and the contact icon boxes.
 *
 * Everything is a FLAT list of rows (plain elements), so long sections split cleanly across pages. The rule
 * above a section is its own element that travels with the section's first row; if a page happens to start on
 * a rule, that rule is not drawn.
 *
 * Register: id 'architect' in Templates/index.js, DEFAULT_ACCENT (suggested #164179), TEMPLATE_CARDS in
 * TemplateThumbs.jsx and in TemplateShowcase.jsx. A missing accent key falls back to FALLBACK_ACCENT.
 */

/* ------------------------------ Design tokens ------------------------------ */
const INTER = `'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif`;
const PLAYFAIR = `'Playfair Display', Georgia, 'Times New Roman', serif`;
const FONT_LINK_ID = 'architect-font-link';
const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap';

const FALLBACK_ACCENT = '#164179';
const INK = '#0B1325'; // names, titles, section labels
const TEXT = '#2c3545'; // body copy
const SLATE_500 = '#64748b'; // dates
const SLATE_400 = '#94a3b8'; // locations
const SLATE_200 = '#e2e8f0'; // rules
const SLATE_100 = '#f1f5f9'; // hairline under an entry title

// Geometry (px). The hidden measuring box must be exactly as wide as the real page body.
const PAD_X = 56;
const PAD_TOP = 48;
const PAD_BOTTOM = 32; // the paginator keeps a further 48px clear above it for the page number
const CONTENT_W = PAGE_WIDTH_PX - PAD_X * 2;
const MAX_HEIGHT = PAGE_HEIGHT_PX - PAD_TOP - PAD_BOTTOM; // pages 2+
const LABEL_W = '28%';
const BODY_W = '72%';

// Skills, Hobbies and Languages share one three-column block, in this column order.
const GRID_KEYS = ['skills', 'hobbies', 'languages'];

/* ------------------------------ Colour helper ------------------------------ */
const alpha = (hex, a) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

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

// The design lists phone, email, website, location, then the social links.
const KIND_ORDER = ['phone', 'mail', 'globe', 'pin', 'linkedin', 'github', 'dot'];

const ICON_PATHS = {
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  pin: <><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
  github: <><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></>,
  dot: <circle cx="12" cy="12" r="3" />,
};
const LINKEDIN_FILLED = 'M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z';

// Icon inside a small outlined box, as in the original header.
const ContactIcon = ({ name, accent }) => (
  <span
    className="flex shrink-0 items-center justify-center rounded"
    style={{ width: 20, height: 20, border: `1px solid ${alpha(accent, 0.5)}`, color: accent }}
    aria-hidden="true"
  >
    {name === 'linkedin' ? (
      <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d={LINKEDIN_FILLED} /></svg>
    ) : (
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {ICON_PATHS[name] || ICON_PATHS.dot}
      </svg>
    )}
  </span>
);

// Language level (1-5 in the app) -> bar length, matching the original design's steps.
const BAR_WIDTH = { 1: '35%', 2: '60%', 3: '80%', 4: '100%', 5: '100%' };

/* -------------------------------- Template -------------------------------- */
const ArchitectTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, certificates, isEmpty, sectionOrder, edit } = props;
  const accent = props.accentColor || DEFAULT_ACCENT.architect || FALLBACK_ACCENT;

  // Inter (text) and Playfair Display (name, italic company / school lines). Added once, shared by every Architect on the page.
  useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById(FONT_LINK_ID)) return;
    const link = document.createElement('link');
    link.id = FONT_LINK_ID;
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    document.head.appendChild(link);
  }, []);

  /* ----------------------------- Small helpers ----------------------------- */
  // Section title in the label rail. With `key`, edit mode shows the pencil / bin next to it.
  const label = (text, key) => (
    <div role="heading" aria-level={2} className="relative text-[12.5px] font-bold uppercase" style={{ color: INK, letterSpacing: '0.25em', lineHeight: 1.3 }}>
      {text}
      {key && edit && edit.enabled && (
        <SectionControls label={text} onEdit={() => edit.onEdit(key)} onRemove={() => edit.onRemove(key)} />
      )}
    </div>
  );

  // One row = label rail + content. Rows are the atoms the paginator moves between pages.
  // `keepWithNext` makes the row an <h3>, which is what the paginator treats as "never alone at the bottom of a
  // page": the row moves to the next page together with the line that follows it.
  const row = (key, head, content, className = '', keepWithNext = false) => {
    const Tag = keepWithNext ? 'h3' : 'div';
    return (
      <Tag key={key} className={`flex w-full shrink-0 text-left font-normal ${className}`.trim()}>
        <div className="shrink-0 pr-4" style={{ width: LABEL_W }}>{head}</div>
        <div className="min-w-0" style={{ width: BODY_W }}>{content}</div>
      </Tag>
    );
  };

  // The two-tone rule above a section. It is an <h3> so the paginator keeps it with the row that follows;
  // data-divider lets a page that starts on a rule leave it out.
  const divider = (id) => (
    <h3 key={`divider-${id}`} data-divider="true" aria-hidden="true" className="flex w-full shrink-0 items-center my-6">
      <span className="block shrink-0" style={{ width: LABEL_W, height: 1, backgroundColor: alpha(accent, 0.4) }} />
      <span className="block flex-1" style={{ height: 1, backgroundColor: SLATE_200 }} />
    </h3>
  );

  const diamond = (
    <span
      aria-hidden="true"
      className="shrink-0 bg-white"
      style={{ width: 6, height: 6, marginTop: 5, border: `1px solid ${accent}`, transform: 'rotate(45deg)' }}
    />
  );

  // Title line (+ dates) and an optional italic serif line (company / school / issuer) with a place on the right.
  const entryHead = ({ title, date, sub, place, line }) => (
    <div className="flex items-start gap-4">
      {diamond}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-1.5 flex items-baseline justify-between border-b pb-1" style={{ borderColor: SLATE_100 }}>
          <p className="min-w-0 break-words font-bold uppercase" style={{ fontSize: 12, color: INK, letterSpacing: '0.025em', lineHeight: 1.3 }}>{title}</p>
          {date && (
            <span className="ml-2 shrink-0 text-right font-semibold uppercase" style={{ fontSize: 10, color: SLATE_500, letterSpacing: '0.1em' }}>{date}</span>
          )}
        </div>
        {(sub || place) && (
          <div className="flex items-baseline justify-between gap-3">
            <p className="min-w-0 break-words italic" style={{ fontFamily: PLAYFAIR, fontSize: 12, color: accent }}>{sub}</p>
            {place && <p className="shrink-0" style={{ fontSize: 10, color: SLATE_400 }}>{place}</p>}
          </div>
        )}
        {line && <p className="break-all" style={{ fontSize: 10, color: SLATE_400, marginTop: 2 }}>{line}</p>}
      </div>
    </div>
  );

  // A line of detail text under an entry: indented to the title, with a small bullet when the text is a bullet.
  const detailRow = (key, block) => (
    <div key={key} className="mb-1.5 flex w-full shrink-0">
      <div className="shrink-0" style={{ width: LABEL_W }} />
      <div
        className="flex min-w-0 items-start gap-2.5"
        style={{ width: BODY_W, paddingLeft: 22, fontSize: 11, lineHeight: 1.7, color: TEXT, textAlign: 'justify' }}
      >
        {block.bullet && <span aria-hidden="true" className="shrink-0 leading-none" style={{ color: accent, fontSize: 14 }}>•</span>}
        <span className="min-w-0 flex-1 break-words" style={{ paddingTop: 1 }}>{renderInline(block.text, key)}</span>
      </div>
    </div>
  );

  // One entry: head row (+ the section label on the first entry) and its detail rows. The last row carries the gap.
  const entry = (id, head, headProps, text) => {
    const blocks = parseBlocks(text);
    return padLast([
      row(`${id}-h`, head, entryHead(headProps), 'mb-2', blocks.length > 0),
      ...blocks.map((block, i) => detailRow(`${id}-d${i}`, block)),
    ], 'mb-4');
  };

  /* ------------------------------ Row sections ----------------------------- */
  const projectItems = (projects?.items || []).filter((p) => p.title || p.description);
  const certificateItems = (certificates?.items || []).filter((c) => c.name || c.issuer);
  const referenceItems = (references?.items || []).filter((r) => r.name);

  const sectionMap = {
    summary: summary ? [
      divider('summary'),
      ...parseBlocks(summary).map((block, i, all) => row(
        `summary-${i}`,
        i === 0 ? label('Profile', 'summary') : null,
        <p
          className="break-words"
          style={{ fontSize: 11, lineHeight: 1.85, color: TEXT, textAlign: 'justify' }}
        >
          {block.bullet && <span aria-hidden="true" style={{ color: accent, marginRight: 8 }}>•</span>}
          {renderInline(block.text, `summary-${i}`)}
        </p>,
        i < all.length - 1 ? 'mb-2' : '',
        i === 0 && all.length > 1,
      )),
    ] : [],

    experience: jobs.length > 0 ? [
      divider('experience'),
      ...jobs.flatMap((job, i) => entry(
        `job-${job.id}`,
        i === 0 ? label('Experience', 'experience') : null,
        {
          title: job.title || job.employer,
          date: jobDates(job),
          sub: job.title ? job.employer : '',
          place: [job.location, job.remote ? 'Remote' : ''].filter(Boolean).join(' · '),
        },
        job.achievements,
      )),
    ] : [],

    projects: projects?.enabled && projectItems.length > 0 ? [
      divider('projects'),
      ...projectItems.flatMap((p, i) => entry(
        `project-${p.id}`,
        i === 0 ? label('Projects', 'projects') : null,
        { title: p.title || 'Project', line: p.link },
        p.description,
      )),
    ] : [],

    education: educations.length > 0 ? [
      divider('education'),
      ...educations.flatMap((ed, i) => {
        const degree = [ed.degree, ed.field].filter(Boolean).join(', ');
        return entry(
          `education-${ed.id}`,
          i === 0 ? label('Education', 'education') : null,
          { title: ed.institution || degree, date: ed.date, sub: ed.institution ? degree : '', place: ed.location },
          ed.achievements,
        );
      }),
    ] : [],

    certificates: certificates?.enabled && certificateItems.length > 0 ? [
      divider('certificates'),
      ...certificateItems.flatMap((c, i) => entry(
        `certificate-${c.id}`,
        i === 0 ? label('Certifications', 'certificates') : null,
        { title: c.name || c.issuer, date: c.date ? formatRange(c.date) : '', sub: c.name ? c.issuer : '', line: c.link },
        c.description,
      )),
    ] : [],

    references: references?.enabled && (references.availableUponRequest || referenceItems.length > 0) ? [
      divider('references'),
      ...(references.availableUponRequest
        ? [row('references-note', label('References', 'references'), <p style={{ fontSize: 11, lineHeight: 1.7, color: TEXT }}>Available upon request.</p>)]
        : referenceItems.map((r, i) => row(
          `reference-${r.id}`,
          i === 0 ? label('References', 'references') : null,
          <div className="flex items-start gap-4">
            {diamond}
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="break-words font-bold uppercase" style={{ fontSize: 12, color: INK, letterSpacing: '0.025em', lineHeight: 1.3 }}>{r.name}</p>
              {r.relationship && (
                <p className="break-words italic" style={{ fontFamily: PLAYFAIR, fontSize: 12, color: accent, marginTop: 2 }}>{r.relationship}</p>
              )}
              {r.contact && (
                <p className="break-all font-medium" style={{ fontSize: 10.5, color: SLATE_500, letterSpacing: '0.025em', marginTop: 4 }}>{r.contact}</p>
              )}
            </div>
          </div>,
          'mb-4',
        ))),
    ] : [],
  };

  /* ------------------------------ Details block ---------------------------- */
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
    divider('details'),
    row(
      'details-row',
      label('Details'),
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        {details.map((d) => (
          <div key={d.label} className="flex flex-col">
            <span className="font-bold uppercase" style={{ fontSize: 9, color: accent, letterSpacing: '0.2em' }}>{d.label}</span>
            <span className="break-words" style={{ fontSize: 11, color: TEXT, marginTop: 2 }}>{d.value}</span>
          </div>
        ))}
      </div>,
    ),
  ], false) : [];

  /* ------------------------ Skills | Hobbies | Languages ------------------------ */
  const languageItems = (languages?.items || []).filter((l) => l.name);
  const hobbyBlocks = hobbies?.enabled && hobbies.text ? parseBlocks(hobbies.text) : [];
  const visibleGridKeys = GRID_KEYS.filter((key) => (sectionOrder || []).includes(key));
  const columnItems = {
    skills: namedSkills.map((s) => ({ id: `skill-${s.id}`, text: s.text })),
    hobbies: hobbyBlocks.map((b, i) => ({ id: `hobby-${i}`, text: b.text })),
    languages: languageItems.map((l) => ({ id: `language-${l.id}`, name: l.name, ...languageLevelInfo(l) })),
  };
  const columnTitles = { skills: 'Skills', hobbies: 'Hobbies', languages: 'Languages' };
  const activeCols = Object.fromEntries(GRID_KEYS.map((key) => [key, visibleGridKeys.includes(key) ? columnItems[key] : []]));
  const gridRows = Math.max(...GRID_KEYS.map((key) => activeCols[key].length));

  const dot = <span aria-hidden="true" className="shrink-0" style={{ width: 4, height: 4, backgroundColor: accent, transform: 'rotate(45deg)' }} />;
  const plainCell = (item) => (
    <div className="flex items-center gap-3">
      {dot}
      <span className="min-w-0 break-words font-medium" style={{ fontSize: 11, color: TEXT, letterSpacing: '0.025em' }}>{renderInline(item.text, item.id)}</span>
    </div>
  );
  const languageCell = (item) => (
    <div className="flex items-center gap-3" title={item.label}>
      {dot}
      <span className="shrink-0 break-words font-medium" style={{ width: 72, fontSize: 11, lineHeight: 1.3, color: TEXT, letterSpacing: '0.025em' }}>{item.name}</span>
      <span className="block flex-1 overflow-hidden rounded-full" style={{ height: 4, minWidth: 40, backgroundColor: SLATE_100 }}>
        <span className="block h-full rounded-full" style={{ width: BAR_WIDTH[item.rating] || '55%', backgroundColor: accent }} />
      </span>
    </div>
  );
  const cell = (key, item) => (
    <div {...editAttrs(edit, key)} className="min-w-0">
      {item ? (key === 'languages' ? languageCell(item) : plainCell(item)) : null}
    </div>
  );

  const gridBlocks = gridRows > 0 ? [
    divider('grid'),
    // Heading row: an <h3> keeps it with the first data row. Titles are spans so no heading sits inside another.
    <h3 key="grid-head" className="mb-5 mt-1 grid w-full shrink-0 grid-cols-3 gap-8">
      {GRID_KEYS.map((key) => (
        <div key={key} {...editAttrs(edit, key)} className="min-w-0">
          {activeCols[key].length > 0 && (
            <span className="relative block text-[12.5px] font-bold uppercase" style={{ color: INK, letterSpacing: '0.25em', lineHeight: 1.3 }}>
              {columnTitles[key]}
              {edit && edit.enabled && (
                <SectionControls label={columnTitles[key]} onEdit={() => edit.onEdit(key)} onRemove={() => edit.onRemove(key)} />
              )}
            </span>
          )}
        </div>
      ))}
    </h3>,
    ...Array.from({ length: gridRows }, (_, i) => (
      <div key={`grid-row-${i}`} className="mb-3 grid w-full shrink-0 grid-cols-3 gap-8">
        {GRID_KEYS.map((key) => <React.Fragment key={key}>{cell(key, activeCols[key][i])}</React.Fragment>)}
      </div>
    )),
  ] : [];

  /* ---------------------------- Put it in order ---------------------------- */
  const allBlocks = [...detailBlocks];
  let gridPlaced = false;
  (sectionOrder || []).forEach((key) => {
    if (GRID_KEYS.includes(key)) {
      if (!gridPlaced) { gridPlaced = true; allBlocks.push(...gridBlocks); }
      return;
    }
    // The section label carries its own pencil / bin, so the rows are only tagged as clickable here.
    allBlocks.push(...markSection(edit, key, sectionMap[key] || [], false));
  });

  const main = usePaginatedBlocks(allBlocks, MAX_HEIGHT);
  const { pages, measureContainerRef, firstBodyRef, measureContent } = main;

  // A page that starts on a section rule leaves it out (the rule only separates sections on the same page).
  const visibleAtoms = (nodes, pageIndex) => (
    pageIndex > 0 && nodes[0] && nodes[0].props && nodes[0].props['data-divider'] ? nodes.slice(1) : nodes
  );

  /* ---------------------------------- Header ---------------------------------- */
  const nameParts = (fullName || 'Your Name').trim().split(/\s+/);
  const lastName = nameParts.length > 1 ? nameParts.pop() : '';
  const firstName = nameParts.join(' ');
  const longest = Math.max(firstName.length, lastName.length);
  const nameSize = longest <= 8 ? 52 : longest <= 10 ? 46 : longest <= 12 ? 40 : longest <= 15 ? 34 : longest <= 19 ? 28 : 24;
  const professionParts = ((personal && personal.profession) || '').split('|').map((p) => p.trim()).filter(Boolean);

  return (
    <>
      {/* Hidden copy of every row, as wide as the real page body. A flex column, like the real body, so margins add up the same way. */}
      <div
        ref={measureContainerRef}
        className="pointer-events-none absolute flex flex-col"
        style={{ top: -9999, left: -9999, width: CONTENT_W, fontFamily: INTER }}
      >
        {measureContent}
      </div>

      {pages.map((pageBlocks, index) => (
        <A4Page key={index} pageNum={index + 1} totalPages={pages.length}>
          <div
            className="relative flex h-full w-full flex-col bg-white text-left"
            style={{ padding: `${PAD_TOP}px ${PAD_X}px ${PAD_BOTTOM}px`, fontFamily: INTER, color: TEXT, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
          >
            {index === 0 && (
              <div {...editAttrs(edit, 'personal')} className="mb-8 flex w-full shrink-0 items-start justify-between gap-6">
                <div className="flex min-w-0 flex-col">
                  <h1
                    className="break-words font-bold uppercase"
                    style={{ fontFamily: PLAYFAIR, fontSize: nameSize, lineHeight: 1.05, letterSpacing: '0.025em', color: INK }}
                  >
                    {firstName}
                    {lastName && (<><br /><span style={{ color: accent }}>{lastName}</span></>)}
                  </h1>
                  {professionParts.length > 0 && (
                    <div className="flex flex-wrap items-center" style={{ marginTop: 16, columnGap: 16, rowGap: 4 }}>
                      <span aria-hidden="true" className="shrink-0" style={{ width: 32, height: 1, backgroundColor: accent }} />
                      <h2 className="flex flex-wrap items-center font-bold uppercase" style={{ fontSize: 11.5, color: TEXT, letterSpacing: '0.3em', lineHeight: 1.5, columnGap: 12 }}>
                        {professionParts.map((part, i) => (
                          <React.Fragment key={i}>
                            {i > 0 && <span aria-hidden="true" style={{ width: 1, height: 10, backgroundColor: SLATE_200 }} />}
                            <span>{part}</span>
                          </React.Fragment>
                        ))}
                      </h2>
                    </div>
                  )}
                </div>

                {contacts.length > 0 && (
                  <div className="flex shrink-0 flex-col" style={{ gap: 10, paddingTop: 8, fontSize: 10.5, fontWeight: 500, color: TEXT }}>
                    {contacts.map((c, i) => (
                      <div key={`contact-${i}`} className="flex items-center gap-3">
                        <ContactIcon name={c.kind} accent={accent} />
                        <span className="break-words" style={{ maxWidth: 240, letterSpacing: '0.025em', lineHeight: 1.35 }}>{c.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div ref={index === 0 ? firstBodyRef : undefined} className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {visibleAtoms(pageBlocks, index)}
              {isEmpty && index === 0 && (
                <p className="text-xs italic text-slate-400">Nothing entered yet — fill in a few steps to see them appear here.</p>
              )}
            </div>
          </div>
        </A4Page>
      ))}
    </>
  );
};

export default ArchitectTemplate;
