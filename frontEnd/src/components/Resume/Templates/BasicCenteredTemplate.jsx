import React, { useEffect } from 'react';
import { parseBlocks, renderInline } from '../Sections/richText';
import { languageLevelInfo } from '../Sections/LanguageLevelSelect';
import { formatRange } from '../Sections/dateFormat';
import {
  PAGE_HEIGHT_PX,
  PAGE_WIDTH_PX,
  tint,
  jobDates,
  DEFAULT_ACCENT,
  usePaginatedBlocks,
  A4Page,
  padLast,
  editAttrs,
  markSection,
} from './templateShared';

/**
 * SA Standard (id: sa-standard). The South African standard CV: a framed page in Times New Roman, the title
 * "CURRICULUM-VITAE" in bold and underlined, centred spaced-capital headings over a double rule, and "Label : value"
 * tables. Personal Details is a table (Surname, First names, Cell Phone Number, Date of Birth, ... E-mail Address);
 * Education is split into TERTIARY: and SECONDARY: with Institution / Qualification / Subjects rows and the years on
 * the right; Work Experience, Certificates, Projects and References use the same table style.
 *
 *   header   CURRICULUM-VITAE (page 1 only)
 *   rows     Career Objective, Personal Details, Work Experience, Education, Skills, Certificates, Projects,
 *            Interests, References (Career Objective, then Personal Details, then the rest in the user's order)
 *   frame    a thin rectangle inset from the page edge, on every page
 *
 * Personal Details is built from what the builder holds: the name is split into surname and first names; phone,
 * email and address lines, the date of birth, nationality, gender, marital status and licence become rows. Home Language
 * and Other languages come from the Languages section. Lines labelled "ID number" / "Identity document", "Race" or
 * "Home language" in the contact list are shown too, in their own rows, if the builder ever provides them.
 *
 * The default accent is the original dark teal of the heading rules (everything else is black). A different accent
 * colours the frame, headings and rules.
 *
 * Everything in the body is a FLAT list of plain elements, so long sections split cleanly across pages.
 *
 * Register: id 'sa-standard' in Templates/index.js, DEFAULT_ACCENT (#124b53), TEMPLATE_CARDS in TemplateThumbs.jsx
 * and in TemplateShowcase.jsx. A missing accent key falls back to BASE_RULE.
 */

/* ------------------------------ Design tokens ------------------------------ */
// Times New Roman where it exists; Tinos, a metric-compatible web font, everywhere else (Android).
const SERIF = `'Times New Roman', Tinos, 'Liberation Serif', Times, serif`;
const FONT_LINK_ID = 'sa-standard-font-link';
const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Tinos:ital,wght@0,400;0,700;1,400;1,700&display=swap';

const BASE_RULE = '#124b53'; // the dark teal of the heading rules
const BASE_PALETTE = { ink: '#000000', heading: '#000000', frame: '#000000', rule: '#124b53', ruleSoft: '#a3b4b6' };

// tint(hex, +x) mixes with white.
const buildPalette = (accent) => {
  if (!accent || String(accent).toLowerCase() === BASE_RULE) return BASE_PALETTE;
  return { ink: '#000000', heading: accent, frame: accent, rule: accent, ruleSoft: tint(accent, 0.65) };
};

// Geometry (px). Margins and frame measured from the original; the hidden measuring box must be exactly as wide as the body.
const PAD_X = 94;
const PAD_TOP = 96;
const PAD_BOTTOM = 48; // the paginator keeps a further 48px clear above it: content ends at 1027px, inside the frame
const CONTENT_W = PAGE_WIDTH_PX - PAD_X * 2;
const MAX_HEIGHT = PAGE_HEIGHT_PX - PAD_TOP - PAD_BOTTOM; // pages 2+
const FRAME_INSET = 32;
const LINE = 21; // row height of the tables
const PERSONAL_LABEL_W = 243; // label column of Personal Details
const TABLE_LABEL_W = 142; // label column of Education, Work Experience and the other tables
const DATE_W = 94; // right-hand column holding the years

/* --------------------------- Personal Details data --------------------------- */
// The builder hands over one flat list of strings: contact lines and "Label: value" lines.
const DETAIL_RULES = [
  [/^(born|date of birth|dob)\s*:/i, 'Date of Birth'],
  [/^(nationality|citizenship)\s*:/i, 'Nationality'],
  [/^(gender|sex)\s*:/i, 'Gender'],
  [/^(marital status|civil status)\s*:/i, 'Marital Status'],
  [/^(driver'?s?|driving)\s+licen[cs]e\b/i, 'Drivers License'],
  [/^(id number|id no\.?|id|identity( document| number| no\.?)?)\s*:/i, 'Identity Document'],
  [/^race\s*:/i, 'Race'],
  [/^home language\s*:/i, 'Home Language'],
];

const parseDetail = (line) => {
  const text = String(line).trim();
  const rule = DETAIL_RULES.find(([re]) => re.test(text));
  if (!rule) return null;
  const m = /^[^:]+:\s*(.+)$/.exec(text);
  return { label: rule[1], value: m ? m[1].trim() : 'Yes' };
};

// An email typed without its "@" (e.g. "name9gmail.com") still counts as an email.
const MAIL_HOST = /^(?!www\.)[^\s@/]+(gmail|googlemail|yahoo|outlook|hotmail|live|icloud|proton|protonmail)\.(com|me|co\.za|co\.uk)$/;

const contactKind = (raw) => {
  const s = String(raw).trim().toLowerCase();
  const m = s.match(/^([a-z][a-z .\/&-]{1,28}):(?!\/\/)\s*/); // a leading "Label:" (not the "https:" of a URL)
  const label = m ? m[1] : '';
  const value = m ? s.slice(m[0].length) : s;

  if (s.includes('linkedin')) return 'linkedin';
  if (s.includes('github')) return 'github';
  if (value.includes('@') || /e-?mail/.test(label) || MAIL_HOST.test(value)) return 'mail';
  if (/^(tel|telephone|phone|mobile|cell|whatsapp|fax)\b/.test(label) || (/^[+()\d\s.\/,;-]+$/.test(value) && value.replace(/\D/g, '').length >= 7)) return 'phone';
  if (/web|site|portfolio|url|link/.test(label) || /(https?:\/\/|www\.|\.(com|dev|io|net|org|me|site|co|app)\b)/.test(value)) return 'globe';
  if (/address|location|city|based|residen/.test(label)
    || /\d+\s+.*\b(street|st|road|rd|avenue|ave|drive|dr|lane|ln|blvd|boulevard|close|crescent|way)\b/.test(value)
    || /\bp\.?o\.?\s*box\b/.test(value)
    || value.includes(',')) return 'pin';
  return 'dot';
};

// A resume has one address: only the first address-like line is the address. If nothing looked like one, the first
// unrecognised line without a "Label:" is the most likely one. Every other unknown line keeps its own label.
const resolveKinds = (lines) => {
  const kinds = lines.map(contactKind);
  let pinSeen = false;
  const out = kinds.map((k) => {
    if (k !== 'pin') return k;
    if (pinSeen) return 'dot';
    pinSeen = true;
    return 'pin';
  });
  if (!pinSeen) {
    const i = out.findIndex((k, idx) => k === 'dot' && !/^[^:]+:\s*\S/.test(lines[idx]));
    if (i >= 0) out[i] = 'pin';
  }
  return out;
};

const joinNames = (names) => (names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0] || '');
const stripLabel = (line) => String(line).trim().replace(/^[^:]+:\s*/, '');

/* -------------------------------- Template -------------------------------- */
const SAStandardTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, certificates, isEmpty, sectionOrder, edit } = props;
  const accent = props.accentColor || DEFAULT_ACCENT['sa-standard'] || BASE_RULE;
  const P = buildPalette(accent);

  // Tinos (Times New Roman look-alike for devices without it). Added once, shared by every instance.
  useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById(FONT_LINK_ID)) return;
    const link = document.createElement('link');
    link.id = FONT_LINK_ID;
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    document.head.appendChild(link);
  }, []);

  /* ----------------------------- Building blocks ----------------------------- */
  // Centred section heading over the double rule. An <h3>, so the paginator keeps it with the element that follows.
  const heading = (key, text) => (
    <h3
      key={`${key}-h`}
      className="shrink-0 text-center uppercase"
      style={{
        fontWeight: 700, fontSize: 16, lineHeight: `${LINE}px`, letterSpacing: '1px', color: P.heading,
        paddingBottom: 4, marginTop: 16, marginBottom: 10,
        borderBottom: `2px solid ${P.rule}`, boxShadow: `0 2px 0 0 ${P.ruleSoft}`,
      }}
    >
      {text}
    </h3>
  );

  // TERTIARY: / SECONDARY: (bold, underlined, left).
  const subheading = (key, text) => (
    <h3
      key={key}
      className="shrink-0 uppercase"
      style={{ fontWeight: 700, fontSize: 16, lineHeight: `${LINE}px`, color: P.ink, textDecoration: 'underline', textUnderlineOffset: 3, marginTop: 6, marginBottom: 15 }}
    >
      {text}
    </h3>
  );

  // "Label : value" row. The colon sits in its own narrow column so a wrapped value hangs under its first line.
  // `bold` makes the whole row bold; `boldValue` only the colon and the value (the phone number). `dateText` adds the
  // right-hand column (years), `first` is false on continuation rows (no label, no colon).
  const tableRow = ({ label, value, labelW, bold = false, boldValue = false, dateText = '', first = true, justify = false }) => (
    <div className="flex" style={{ fontSize: 16, lineHeight: `${LINE}px`, color: P.ink }}>
      <div className="shrink-0" style={{ width: labelW, fontWeight: bold ? 700 : 400 }}>{first ? label : null}</div>
      <div className="shrink-0" style={{ width: 9, fontWeight: bold || boldValue ? 700 : 400 }}>{first ? ':' : null}</div>
      <div className="min-w-0 flex-1 break-words" style={{ fontWeight: bold || boldValue ? 700 : 400, textAlign: justify ? 'justify' : 'left' }}>{value}</div>
      {dateText ? <div className="shrink-0 whitespace-nowrap" style={{ minWidth: DATE_W + 12, paddingLeft: 12, fontWeight: 700 }}>{dateText}</div> : null}
    </div>
  );

  // One block of rich text as a table row: the first row carries the label, a bullet line gets a small round bullet.
  const textRow = (key, block, { label, first, labelW }) => (
    <div key={key} className="shrink-0" style={{ marginTop: first ? 13 : 0 }}>
      {tableRow({
        label,
        first,
        labelW,
        justify: !block.bullet,
        value: block.bullet ? (
          <span className="relative block" style={{ paddingLeft: 14 }}>
            <span aria-hidden="true" className="absolute rounded-full" style={{ left: 3, top: 8, width: 5, height: 5, backgroundColor: P.ink }} />
            {renderInline(block.text, key)}
          </span>
        ) : renderInline(block.text, key),
      })}
    </div>
  );

  // An entry of a table section (Education, Work Experience, Certificates, Projects, References):
  // head rows (an <h3> when text rows follow, so it never sits alone at the bottom of a page), then the text rows.
  const tableEntry = (id, headRows, text, textLabel, labelW = TABLE_LABEL_W) => {
    const blocks = parseBlocks(text);
    const rows = headRows.filter(Boolean);
    const Tag = blocks.length > 0 ? 'h3' : 'div';
    return padLast([
      <Tag key={`${id}-head`} className="shrink-0" style={{ fontWeight: 'normal' }}>
        {rows.map((row, i) => <React.Fragment key={i}>{tableRow({ ...row, labelW })}</React.Fragment>)}
      </Tag>,
      ...blocks.map((block, i) => textRow(`${id}-t${i}`, block, { label: textLabel, first: i === 0, labelW })),
    ], 'mb-5');
  };

  // Bullet list in two columns (Skills, Interests): two items per row, so the rows can break across pages.
  const bulletCell = (text, key) => (
    <div className="relative min-w-0 break-words" style={{ paddingLeft: 22, fontSize: 16, lineHeight: `${LINE}px`, color: P.ink }}>
      <span aria-hidden="true" className="absolute rounded-full" style={{ left: 8, top: 8, width: 5, height: 5, backgroundColor: P.ink }} />
      {renderInline(text, key)}
    </div>
  );
  const bulletRows = (keyPrefix, items) => {
    const rows = [];
    for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
    return rows.map((row, i) => (
      <div key={`${keyPrefix}-row-${i}`} className="grid shrink-0" style={{ gridTemplateColumns: '1fr 1fr', columnGap: 16 }}>
        {bulletCell(row[0], `${keyPrefix}-${i * 2}`)}
        {row[1] ? bulletCell(row[1], `${keyPrefix}-${i * 2 + 1}`) : <div />}
      </div>
    ));
  };

  /* ------------------------------ Personal Details ------------------------------ */
  const nameParts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  const surname = nameParts.length > 0 ? nameParts[nameParts.length - 1] : '';
  const firstNames = nameParts.slice(0, -1).join(' ');

  const lines = (contactList || []).filter((c) => typeof c === 'string' && c.trim());
  const kinds = resolveKinds(lines);
  const found = {}; // label -> value(s)
  const extras = []; // [label, value] for lines that are not part of the standard list
  const phones = [];
  lines.forEach((line, i) => {
    const d = parseDetail(line);
    if (d) { found[d.label] = d.value; return; }
    const kind = kinds[i];
    if (kind === 'phone') phones.push(stripLabel(line));
    else if (kind === 'mail') found['E-mail Address'] = stripLabel(line);
    else if (kind === 'pin') found['Physical & Postal Address'] = line.trim();
    else if (kind === 'linkedin') extras.push(['LinkedIn', stripLabel(line)]);
    else if (kind === 'github') extras.push(['GitHub', stripLabel(line)]);
    else if (kind === 'globe') extras.push(['Website', stripLabel(line)]);
    else {
      const m = /^([^:]{2,30}):\s*(\S.*)$/.exec(line.trim());
      extras.push(m ? [m[1].trim(), m[2].trim()] : ['Other', line.trim()]);
    }
  });

  // Home Language / Other languages come from the Languages section (when it is switched on).
  const languageItems = (languages?.items || []).filter((l) => l.name);
  const languagesOn = (sectionOrder || []).includes('languages') && languages?.enabled && languageItems.length > 0;
  let homeLanguage = found['Home Language'] || '';
  let otherLanguages = '';
  if (languagesOn) {
    const native = languageItems.filter((l) => languageLevelInfo(l).rating >= 5);
    const home = native.length > 0 ? native : [languageItems[0]];
    if (!homeLanguage) homeLanguage = home.map((l) => l.name).join(', ');
    otherLanguages = joinNames(languageItems.filter((l) => !home.includes(l)).map((l) => l.name));
  }

  const personalRows = [
    surname && ['Surname', surname],
    firstNames && ['First names', firstNames],
    phones.length > 0 && ['Cell Phone Number', phones.join('/'), true],
    found['Date of Birth'] && ['Date of Birth', found['Date of Birth']],
    found['Identity Document'] && ['Identity Document', found['Identity Document']],
    found.Race && ['Race', found.Race],
    found['Marital Status'] && ['Marital Status', found['Marital Status']],
    found.Gender && ['Gender', found.Gender],
    found.Nationality && ['Nationality', found.Nationality],
    homeLanguage && ['Home Language', homeLanguage],
    found['Drivers License'] && ['Drivers License', found['Drivers License']],
    otherLanguages && ['Other languages', otherLanguages],
    found['Physical & Postal Address'] && ['Physical & Postal Address', found['Physical & Postal Address']],
    found['E-mail Address'] && ['E-mail Address', found['E-mail Address']],
    ...extras.map(([label, value]) => [label, value]),
  ].filter(Boolean);

  const personalBlocks = personalRows.length > 0 ? markSection(edit, 'personal', [
    heading('personal', 'Personal Details'),
    ...personalRows.map(([label, value, bold], i) => (
      <div key={`personal-${i}`} className="shrink-0">
        {tableRow({ label, value, labelW: PERSONAL_LABEL_W, boldValue: Boolean(bold) })}
      </div>
    )),
  ], false) : [];

  /* -------------------------------- Sections -------------------------------- */
  const summaryBlocks = summary ? parseBlocks(summary) : [];
  const projectItems = (projects?.items || []).filter((p) => p.title || p.description);
  const certificateItems = (certificates?.items || []).filter((c) => c.name || c.issuer);
  const referenceItems = (references?.items || []).filter((r) => r.name);
  const hobbyBlocks = hobbies?.enabled && hobbies.text ? parseBlocks(hobbies.text) : [];

  // Education is grouped as TERTIARY: then SECONDARY: (a matric / school certificate is secondary).
  const isSecondary = (ed) => /national senior certificate|\bnsc\b|matric|grade\s*1[0-2]|senior certificate|high school|secondary school/i.test(
    [ed.degree, ed.field, ed.institution].filter(Boolean).join(' '),
  );
  const educationItems = educations.filter((ed) => ed.degree || ed.field || ed.institution);
  const eduGroups = [
    ['TERTIARY:', 'Majors', educationItems.filter((ed) => !isSecondary(ed))],
    ['SECONDARY:', 'Subjects', educationItems.filter(isSecondary)],
  ].filter(([, , items]) => items.length > 0);

  const sectionMap = {
    summary: summaryBlocks.length > 0 ? [
      heading('summary', 'Career Objective'),
      ...summaryBlocks.map((block, i) => (
        <div
          key={`summary-${i}`}
          className="relative shrink-0"
          style={{ paddingLeft: block.bullet ? 14 : 0, fontSize: 16, lineHeight: `${LINE}px`, color: P.ink, textAlign: 'justify', marginBottom: i < summaryBlocks.length - 1 ? 8 : 0 }}
        >
          {block.bullet && <span aria-hidden="true" className="absolute rounded-full" style={{ left: 3, top: 8, width: 5, height: 5, backgroundColor: P.ink }} />}
          <span className="break-words">{renderInline(block.text, `summary-${i}`)}</span>
        </div>
      )),
    ] : [],

    experience: jobs.length > 0 ? [
      heading('experience', 'Work Experience'),
      ...jobs.flatMap((job) => tableEntry(
        `job-${job.id}`,
        [
          { label: 'Employer', value: job.employer || job.title, bold: true, dateText: jobDates(job) },
          job.employer && job.title && { label: 'Position', value: job.title },
          (job.location || job.remote) && { label: 'Location', value: [job.location, job.remote ? 'Remote' : ''].filter(Boolean).join(', ') },
        ],
        job.achievements,
        'Duties',
      )),
    ] : [],

    education: eduGroups.length > 0 ? [
      heading('education', 'Education'),
      ...eduGroups.flatMap(([title, textLabel, items]) => [
        subheading(`education-${title}`, title),
        ...items.flatMap((ed) => tableEntry(
          `education-${ed.id}`,
          [
            { label: 'Institution', value: ed.institution || [ed.degree, ed.field].filter(Boolean).join(', '), bold: true, dateText: ed.date },
            ed.institution && (ed.degree || ed.field) && { label: 'Qualification', value: [ed.degree, ed.field].filter(Boolean).join(', ') },
            ed.location && { label: 'Location', value: ed.location },
          ],
          ed.achievements,
          textLabel,
        )),
      ]),
    ] : [],

    skills: namedSkills.length > 0 ? [
      heading('skills', 'Skills'),
      ...bulletRows('skill', namedSkills.map((s) => s.text)),
    ] : [],

    certificates: certificates?.enabled && certificateItems.length > 0 ? [
      heading('certificates', 'Certificates'),
      ...certificateItems.flatMap((c) => tableEntry(
        `certificate-${c.id}`,
        [
          { label: 'Certificate', value: c.name || c.issuer, bold: true, dateText: c.date ? formatRange(c.date) : '' },
          c.name && c.issuer && { label: 'Institution', value: c.issuer },
          c.link && { label: 'Link', value: c.link },
        ],
        c.description,
        'Details',
      )),
    ] : [],

    projects: projects?.enabled && projectItems.length > 0 ? [
      heading('projects', 'Projects'),
      ...projectItems.flatMap((p) => tableEntry(
        `project-${p.id}`,
        [
          { label: 'Project', value: p.title || 'Project', bold: true },
          p.link && { label: 'Link', value: p.link },
        ],
        p.description,
        'Description',
      )),
    ] : [],

    hobbies: hobbyBlocks.length > 0 ? [
      heading('hobbies', 'Interests'),
      ...bulletRows('hobby', hobbyBlocks.map((b) => b.text)),
    ] : [],

    references: references?.enabled && (references.availableUponRequest || referenceItems.length > 0) ? [
      heading('references', 'References'),
      ...(references.availableUponRequest
        ? [<p key="references-note" className="shrink-0" style={{ fontSize: 16, lineHeight: `${LINE}px`, color: P.ink }}>Available on request.</p>]
        : referenceItems.flatMap((r) => tableEntry(
          `reference-${r.id}`,
          [
            { label: 'Name', value: r.name, bold: true },
            r.relationship && { label: 'Position', value: r.relationship },
            r.contact && { label: 'Contact Number', value: r.contact },
          ],
          '',
          '',
        ))),
    ] : [],
  };

  /* ---------------------------- Put it in order ---------------------------- */
  // Career Objective first, then Personal Details, then the other sections in the user's order.
  // 'education' is listed as is; Languages feed Personal Details and have no section of their own.
  const order = (sectionOrder || []).filter((key) => key !== 'languages');
  const allBlocks = [];
  let personalPlaced = false;
  const placePersonal = () => { if (!personalPlaced) { personalPlaced = true; allBlocks.push(...personalBlocks); } };
  order.forEach((key) => {
    if (key !== 'summary') placePersonal();
    allBlocks.push(...markSection(edit, key, sectionMap[key] || []));
  });
  placePersonal();

  const main = usePaginatedBlocks(allBlocks, MAX_HEIGHT);
  const { pages, measureContainerRef, firstBodyRef, measureContent } = main;

  return (
    <>
      {/* Hidden copy of every element, as wide as the real page body. A flex column, like the real body, so margins add up the same way. */}
      <div
        ref={measureContainerRef}
        className="pointer-events-none absolute flex flex-col"
        style={{ top: -9999, left: -9999, width: CONTENT_W, fontFamily: SERIF }}
      >
        {measureContent}
      </div>

      {pages.map((pageBlocks, index) => (
        <A4Page key={index} pageNum={index + 1} totalPages={pages.length}>
          <div
            className="relative flex h-full w-full flex-col bg-white text-left"
            style={{ padding: `${PAD_TOP}px ${PAD_X}px ${PAD_BOTTOM}px`, fontFamily: SERIF, color: P.ink, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
          >
            {/* The thin frame around the page. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute"
              style={{ top: FRAME_INSET, left: FRAME_INSET, right: FRAME_INSET, bottom: FRAME_INSET + 1, border: `1px solid ${P.frame}` }}
            />

            {index === 0 && (
              <div {...editAttrs(edit, 'personal')} className="shrink-0 text-center" style={{ marginBottom: 8 }}>
                <h1
                  style={{ fontWeight: 700, fontSize: 28, lineHeight: 1.2, color: P.ink, textDecoration: 'underline', textDecorationThickness: 2, textUnderlineOffset: 4 }}
                >
                  CURRICULUM-VITAE
                </h1>
              </div>
            )}

            <div ref={index === 0 ? firstBodyRef : undefined} className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {pageBlocks}
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

export default SAStandardTemplate;
