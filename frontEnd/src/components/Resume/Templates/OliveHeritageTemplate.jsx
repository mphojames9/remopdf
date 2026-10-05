import React from 'react';
import { renderAchievements } from '../Sections/richText';
import { languageLevelInfo } from '../Sections/LanguageLevelSelect';
import { getSkillLevelLabel } from '../Sections/SkillsField';
import {
  tint,
  jobDates,
  skillRating,
  usePaginatedBlocks,
  A4Page,
  padLast,
  endGroup,
  markSection,
  renderExtraSections,
} from './templateShared';
import renderCertificates from '../Sections/renderCertificates';

/* ------------------------------ Design tokens ------------------------------ */
// ATS-friendly version of the banner template:
//  - the full-width dark banner stays, but everything in it is real, plain text in reading order:
//    name, then profession, then the contact details
//  - the contact details sit in one flowing strip; every entry has a small icon that matches its type.
//    The icons are plain SVG shapes with no text, and the wording ("Born: ...", "Nationality: ...") stays
//    real text, so a parser reads exactly what it did before
//  - ONE column below the banner, read top to bottom
//  - no photo, no rating bars or chips: skills and languages are plain comma-separated text
//  - standard section names
//  - circles, strips and lines are decorative shapes and hold no text
const INK = '#1E2733';        // headings, names, main text
const PAPER = '#FFFFFF';      // page background
const MAIN_W = 714;           // px  -> 794 - 40 - 40
const TOP_H = 118;            // banner: name zone, px
const CONTACT_FONT = 11;      // px, contact text
const CONTACT_LINE_H = 20;    // px, line height of one contact row (roomy, so wrapped rows breathe)
const CONTACT_PAD = 13;       // px above and below the contact rows
const CONTACT_GAP = 22;       // px between two contact entries
const CONTACT_ICON = 12;      // px, icon size
const CONTACT_ICON_GAP = 6;   // px between an icon and its text
// Used to estimate how many rows the contact entries need (the strip height is fixed). Set a bit wide on
// purpose: a strip that is slightly too tall is invisible, one that is too short would clip text.
const CONTACT_CHAR_W = CONTACT_FONT * 0.58;
const BOTTOM_LINE_H = 4;      // px, bright accent line closing the banner
const NAME_FONT = '"Plus Jakarta Sans", "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif';

// Darkens a #rgb / #rrggbb colour (banner background, and accent used as TEXT on white).
const darken = (color, amount) => {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(color || '').trim());
  if (!m) return '#1F2937';
  let hex = m[1];
  if (hex.length === 3) hex = hex.split('').map((ch) => ch + ch).join('');
  const n = parseInt(hex, 16);
  const channel = (v) => Math.round(v * (1 - amount)).toString(16).padStart(2, '0');
  return `#${channel((n >> 16) & 255)}${channel((n >> 8) & 255)}${channel(n & 255)}`;
};

/* ------------------------------ Contact icons ------------------------------ */
// Small stroke icons (24x24 grid). They are shapes only: aria-hidden, no text.
const CONTACT_ICON_PATHS = {
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
  phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />,
  location: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>,
  web: <><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>,
  born: <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
  nationality: <><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></>,
  gender: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  marital: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />,
  licence: <><rect x="2" y="5" width="20" height="14" rx="2" /><circle cx="8" cy="12" r="2" /><path d="M13 10h5M13 14h5" /></>,
};

// Which icon a contact entry gets. The entries are plain strings, so the type is read from the wording
// ("Born: ...") or the shape of the value (an @ for email, digits for a phone, a domain for a website).
// Anything left over is the postal address.
const contactKind = (raw) => {
  const text = String(raw || '').trim();
  if (/^born\b/i.test(text)) return 'born';
  if (/^nationality\b/i.test(text)) return 'nationality';
  if (/^gender\b/i.test(text)) return 'gender';
  if (/^marital\b/i.test(text)) return 'marital';
  if (/^driver'?s?\s+licen[cs]e/i.test(text)) return 'licence';
  if (/^[^\s@]+@[^\s@]+$/.test(text)) return 'mail';
  if (/^[+()\d\s.\-/]+$/.test(text) && (text.match(/\d/g) || []).length >= 6) return 'phone';
  if (/^(https?:\/\/|www\.)\S+$/i.test(text) || /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(\/\S*)?$/i.test(text)) return 'web';
  return 'location';
};

const ContactIcon = ({ kind }) => (
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 24 24"
    width={CONTACT_ICON}
    height={CONTACT_ICON}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: CONTACT_ICON_GAP, flexShrink: 0 }}
  >
    {CONTACT_ICON_PATHS[kind] || CONTACT_ICON_PATHS.location}
  </svg>
);

// How many rows the contact entries wrap onto (greedy, like the browser: an entry never splits unless it is
// wider than the whole row).
const estimateContactRows = (items) => {
  const room = MAIN_W + CONTACT_GAP; // the strip's right edge is let out by one gap, see the render below
  let rows = 1;
  let used = 0;
  items.forEach((text) => {
    const w = CONTACT_ICON + CONTACT_ICON_GAP + text.length * CONTACT_CHAR_W + CONTACT_GAP + 3;
    if (w > room) {
      rows += (used > 0 ? 1 : 0) + Math.ceil(w / MAIN_W) - 1;
      used = room; // the next entry starts on a fresh row
    } else if (used > 0 && used + w > room) {
      rows += 1;
      used = w;
    } else {
      used += w;
    }
  });
  return rows;
};

const BannerATSTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, certificates, isEmpty, accentColor, sectionOrder, edit } = props;

  const lineColor = tint(accentColor, 0.6);       // hairlines
  const pillBg = tint(accentColor, 0.88);         // date pills
  const accentText = darken(accentColor, 0.2);    // accent used for text on white
  const bandBg = darken(accentColor, 0.62);       // banner background

  // The banner is drawn over the top of page 1, so the column starts with a spacer that pushes the real
  // content below it. The spacer is an ordinary flat block, so the pagination maths (column height, block
  // measuring) stays exactly as it was.
  const contactItems = (contactList || []).map((text) => String(text || '').trim()).filter(Boolean)
    .map((text) => ({ text, kind: contactKind(text) }));
  const contactRows = contactItems.length > 0 ? estimateContactRows(contactItems.map((c) => c.text)) : 0;
  const stripH = contactRows > 0 ? contactRows * CONTACT_LINE_H + CONTACT_PAD * 2 + 1 : 0; // +1: the hairline above it
  const headerH = TOP_H + stripH + BOTTOM_LINE_H;
  const headerSpacerH = headerH - 32 + 24;
  const spacer = () => <div key="header-spacer" aria-hidden="true" style={{ height: headerSpacerH }} />;

  // Every entry is a FLAT list of elements: no <section>, no wrapper divs.
  // The shared renderers (projects, references, certificates) use this same class and style, so their headings match.
  const headingClass = 'text-[12px] font-bold uppercase tracking-[0.18em] pb-1.5 mb-3 border-b';
  const headingStyle = { color: accentText, borderColor: lineColor };
  const heading = (key, text) => (
    <h3 key={`${key}-h`} className={headingClass} style={headingStyle}>{text}</h3>
  );

  // One entry (job or education): title with a date pill, accent meta line, then the bullets.
  const entry = (kind, item, title, date, meta) => padLast([
    <div key={`${kind}-${item.id}-title`} className={`flex justify-between items-start gap-3 ${meta ? 'mb-0.5' : 'mb-2'}`}>
      <p className="font-bold text-[13px] leading-snug" style={{ color: INK }}>{title}</p>
      {date && (
        <span className="shrink-0 px-2 py-0.5 mt-px rounded-full text-[10px] font-semibold whitespace-nowrap" style={{ backgroundColor: pillBg, color: accentText }}>{date}</span>
      )}
    </div>,
    meta && (
      <p key={`${kind}-${item.id}-meta`} className="text-[11.5px] font-medium mb-2" style={{ color: accentText }}>{meta}</p>
    ),
    ...renderAchievements(item.achievements, `${kind}-${item.id}-ach`),
  ], 'mb-4');

  // Skills and languages are plain comma-separated text, with the level written out in brackets.
  const skillItems = namedSkills.map((s) => {
    const rating = skillRating(s);
    return rating > 0 ? `${s.text} (${getSkillLevelLabel(rating)})` : s.text;
  });
  const languageItems = (languages?.items || []).filter((l) => l.name).map((l) => {
    const { label } = languageLevelInfo(l);
    return label ? `${l.name} (${label})` : l.name;
  });
  const hasHobbies = Boolean(hobbies?.enabled && hobbies.text && String(hobbies.text).trim());
  const listLine = (key, items) => (
    <p key={key} className="text-[11.5px] leading-relaxed" style={{ color: INK }}>{items.join(', ')}</p>
  );

  const mainMap = {
    summary: summary ? endGroup([
      heading('summary', 'Professional Summary'),
      ...renderAchievements(summary, 'summary'),
    ]) : [],
    experience: jobs.length > 0 ? endGroup([
      heading('experience', 'Work Experience'),
      ...jobs.flatMap((job) => {
        const place = [job.location, job.remote ? 'Remote' : ''].filter(Boolean).join(' · ');
        const meta = [job.employer, place].filter(Boolean).join(' · ');
        return entry('job', job, job.title, jobDates(job), meta);
      }),
    ]) : [],
    education: educations.length > 0 ? endGroup([
      heading('education', 'Education'),
      ...educations.flatMap((ed) => {
        const degree = [ed.degree, ed.field].filter(Boolean).join(', ');
        const title = degree || ed.institution;
        const school = degree ? ed.institution : '';
        const meta = [school, ed.location].filter(Boolean).join(' · ');
        return entry('education', ed, title, ed.date, meta);
      }),
    ]) : [],
    skills: skillItems.length > 0 ? endGroup([
      heading('skills', 'Skills'),
      listLine('skills-list', skillItems),
    ]) : [],
    languages: languageItems.length > 0 ? endGroup([
      heading('languages', 'Languages'),
      listLine('languages-list', languageItems),
    ]) : [],
    hobbies: hasHobbies ? endGroup([
      heading('hobbies', 'Hobbies & Interests'),
      ...renderAchievements(hobbies.text, 'hobbies'),
    ]) : [],
  };

  // Projects, references and certificates come from the shared renderers, which draw their own heading.
  const extras = {
    ...renderExtraSections({ projects, references, headingClass, headingStyle }),
    ...renderCertificates({ certificates, headingClass, headingStyle }),
  };

  const mainBlocks = [
    spacer(),
    ...sectionOrder.flatMap((key) => markSection(edit, key, mainMap[key] || extras[key] || [])),
  ];

  /* ------------------------------- Page header ------------------------------ */
  // Name and profession in the top zone, contact details as one flowing strip underneath, a bright accent
  // line closing the banner. The name stays on ONE line so a parser reads it as one name.
  const displayName = (fullName || 'Your Name').trim();
  const nameParts = displayName.split(/\s+/);
  const lastName = nameParts.length > 1 ? nameParts.pop() : '';
  const firstName = nameParts.join(' ');
  const nameSize = displayName.length <= 18 ? 40 : displayName.length <= 26 ? 34 : 28;
  const professionParts = (personal.profession || '').split('|').map((p) => p.trim()).filter(Boolean);

  const headerBlocks = markSection(edit, 'personal', [
    <div key="page-header" className="relative flex flex-col w-full h-full">
      {/* decorative shapes (no text) */}
      <div aria-hidden="true" className="absolute rounded-full" style={{ width: 260, height: 260, right: -70, top: -110, backgroundColor: 'rgba(255,255,255,0.05)' }} />
      <div aria-hidden="true" className="absolute rounded-full" style={{ width: 150, height: 150, right: 90, top: -80, border: '1px solid rgba(255,255,255,0.12)' }} />

      <div className="relative flex flex-col justify-center shrink-0" style={{ height: TOP_H, padding: '0 40px' }}>
        <h1 className="break-words" style={{ fontFamily: NAME_FONT, fontSize: nameSize, lineHeight: 1.08, letterSpacing: '-0.01em', color: '#FFFFFF' }}>
          <span style={{ fontWeight: lastName ? 300 : 800 }}>{firstName}</span>
          {lastName && <span style={{ fontWeight: 800, color: tint(accentColor, 0.55) }}>{' '}{lastName}</span>}
        </h1>
        {professionParts.length > 0 && (
          <p className="mt-2 text-[12.5px] font-semibold leading-relaxed" style={{ color: tint(accentColor, 0.8) }}>
            {professionParts.join(' | ')}
          </p>
        )}
      </div>

      {contactItems.length > 0 && (
        <div
          className="relative shrink-0"
          style={{ height: stripH, padding: `${CONTACT_PAD}px 40px`, backgroundColor: 'rgba(255,255,255,0.08)', borderTop: '1px solid rgba(255,255,255,0.16)' }}
        >
          {/* One flowing line of entries. Each is an inline-block with a real space before it, so the text
              still reads as "email phone address ..." to a parser. The negative right margin lets the last
              entry's gap hang into the page padding instead of forcing an early wrap. */}
          <p className="break-words" style={{ fontSize: CONTACT_FONT, lineHeight: `${CONTACT_LINE_H}px`, color: '#FFFFFF', marginRight: -CONTACT_GAP }}>
            {contactItems.map((item, i) => (
              <React.Fragment key={`contact-${i}`}>
                {i > 0 && ' '}
                <span style={{ display: 'inline-block', marginRight: CONTACT_GAP }}>
                  <span style={{ color: tint(accentColor, 0.55) }}><ContactIcon kind={item.kind} /></span>
                  {item.text}
                </span>
              </React.Fragment>
            ))}
          </p>
        </div>
      )}

      <div className="shrink-0 mt-auto" style={{ height: BOTTOM_LINE_H, backgroundColor: accentColor }} />
    </div>,
  ], false);

  /* ------------------------------ Pagination ------------------------------- */
  const main = usePaginatedBlocks(mainBlocks, 1020);
  const pageCount = main.pages.length;

  return (
    <>
      <div ref={main.measureContainerRef} className="absolute top-[-9999px] left-[-9999px] pointer-events-none" style={{ width: MAIN_W }}>
        {main.measureContent}
      </div>

      {Array.from({ length: pageCount }, (_, index) => (
        <A4Page key={index} pageNum={index + 1} totalPages={pageCount}>
          <div className="relative w-full h-full text-left" style={{ color: INK, backgroundColor: PAPER }}>
            {index === 0 ? (
              <div className="absolute top-0 left-0 right-0 z-10 overflow-hidden" style={{ height: headerH, backgroundColor: bandBg }}>
                {headerBlocks}
              </div>
            ) : (
              /* slim accent strip on the continuation pages (decorative, holds no text) */
              <div aria-hidden="true" className="absolute top-0 left-0 right-0 z-10" style={{ height: 6, backgroundColor: accentColor }} />
            )}

            <div
              ref={index === 0 ? main.firstBodyRef : undefined}
              className="w-full h-full overflow-hidden"
              style={{ padding: '32px 40px' }}
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

export default BannerATSTemplate;
