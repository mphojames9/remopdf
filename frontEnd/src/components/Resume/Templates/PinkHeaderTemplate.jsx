import React from 'react';
import { renderAchievements } from '../Sections/richText';
import ResumePhoto from '../Sections/ResumePhoto';
import {
  tint,
  jobDates,
  skillRating,
  skillDots,
  usePaginatedBlocks,
  A4Page,
  padLast,
  endGroup,
  editAttrs,
  markSection,
  renderExtraSections,
} from './templateShared';
import renderCertificates from '../Sections/renderCertificates';

/**
 * Atelier — a header-forward template (premium take on PinkHeader).
 *
 * Page 1: solid accent header with soft geometric shapes and the photo, and a white
 * contact card that overlaps the header's lower edge. Later pages: a slim accent bar.
 * The page itself is white — no card-on-tint wrapper.
 *
 * Body padding is applied as margins on the measured element, so the height the
 * pagination hook reads from firstBodyRef is the real usable content height.
 */
const ICONS = {
  mail: ['M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z', 'M22 6l-10 7L2 6'],
  phone: ['M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z'],
  web: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M2 12h20', 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'],
  pin: ['M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z', 'M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  calendar: ['M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z', 'M16 2v4', 'M8 2v4', 'M3 10h18'],
  flag: ['M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z', 'M4 22v-7'],
  user: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
  heart: ['M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'],
  car: ['M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2', 'M9 17h6', 'M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', 'M17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'],
  info: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 16v-4', 'M12 8h.01'],
};

// Pick an icon for a contact line (contact items are plain strings).
// "Label: value" lines use the label (Born, Nationality, Gender, ...); everything else uses the shape of the text.
const DETAIL_ICONS = [
  [/born|birth|dob|\bage\b/, 'calendar'],
  [/national|citizen/, 'flag'],
  [/gender|\bsex\b/, 'user'],
  [/marital|married|single/, 'heart'],
  [/driv|licen[cs]e/, 'car'],
];
const LABEL_KINDS = [
  [/^e-?mail$/, 'mail'],
  [/^(phone|tel|telephone|mobile|cell)$/, 'phone'],
  [/^(web|website|site|portfolio|linkedin|github|behance|dribbble)$/, 'web'],
  [/^(location|address|city)$/, 'pin'],
];
// An email typed without its "@" (e.g. "name9gmail.com") still gets the mail icon.
const MAIL_HOST = /^(?!www\.)[^\s@/]+(gmail|googlemail|yahoo|outlook|hotmail|live|icloud|proton|protonmail)\.(com|me|co\.za|co\.uk)$/;

const contactKind = (c) => {
  if (typeof c !== 'string') return null;
  const s = c.trim().toLowerCase();
  const labelled = /^([a-z][a-z '’/-]{1,28}):\s*(?!\/\/)(.+)$/.exec(s);
  if (labelled) {
    const label = labelled[1].trim();
    const known = LABEL_KINDS.find(([re]) => re.test(label)) || DETAIL_ICONS.find(([re]) => re.test(label));
    return known ? known[1] : 'info';
  }
  if (s.includes('@') || MAIL_HOST.test(s)) return 'mail';
  if (/^[+()\d\s.\-–]{7,}$/.test(s)) return 'phone';
  if (/licen[cs]e/.test(s)) return 'car';
  if (!s.includes(' ') && /^(https?:\/\/|www\.)|linkedin|github|behance|dribbble|\.(com|io|dev|me|net|org|co|za)(\/|$)/.test(s)) return 'web';
  return 'pin';
};

const ContactBadge = ({ kind, accentColor }) => (
  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: tint(accentColor, 0.9) }}>
    {kind && ICONS[kind] ? (
      <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke={accentColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {ICONS[kind].map((d, i) => <path key={i} d={d} />)}
      </svg>
    ) : (
      <span className="h-1 w-1 rounded-full" style={{ backgroundColor: accentColor }} />
    )}
  </span>
);

// Skills and Languages sit in a horizontal grid of equal columns: grid-template-columns: repeat(LEVEL_COLUMNS, 1fr).
const LEVEL_COLUMNS = 3;

const chunk = (arr, n) => arr.reduce((rows, item, i) => {
  if (i % n === 0) rows.push([]);
  rows[rows.length - 1].push(item);
  return rows;
}, []);

// Language levels are words (Native, Fluent, ...), so the dot count comes from the word.
// Anything unrecognised still shows its word, just without dots.
const LANGUAGE_RANK = [
  [/native|mother|bilingual/i, 5],
  [/fluent|proficien/i, 4],
  [/advanced|upper|professional|working/i, 3],
  [/intermediate|conversation/i, 2],
  [/beginner|basic|elementary|novice|a1|a2/i, 1],
];
const languageRating = (level) => {
  const hit = LANGUAGE_RANK.find(([re]) => re.test(String(level || '')));
  return hit ? hit[1] : 0;
};

const AtelierTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, certificates, isEmpty, accentColor, sectionOrder, edit } = props;

  // Accent + hairline colour travel as CSS variables so headings rendered by the
  // shared extra-section helpers get the same bar-and-rule treatment.
  const headingStyle = { '--accent': accentColor, '--line': tint(accentColor, 0.8) };
  const headingClass = `flex items-center gap-3 mb-4 text-[18px] font-bold tracking-tight text-slate-900 before:content-[''] before:h-6 before:w-1.5 before:shrink-0 before:rounded-sm before:bg-[color:var(--accent,#0f172a)] after:content-[''] after:h-px after:flex-1 after:bg-[color:var(--line,#e2e8f0)]`;
  const heading = (key, text) => <h3 key={`${key}-h`} className={headingClass} style={headingStyle}>{text}</h3>;

  // Title on the left, dates in a soft pill on the right.
  const entryHead = (key, title, date) => (
    <div key={key} className="mb-0.5 flex items-center justify-between gap-3">
      <p className="text-[13.5px] font-bold leading-tight text-slate-900">{title}</p>
      {date && (
        <span className="shrink-0 text-[11px] font-medium tabular-nums text-slate-600">{date}</span>
      )}
    </div>
  );

  // Accent-coloured primary line with a quieter secondary detail beside it.
  const metaLine = (key, primary, secondary) => (primary || secondary) && (
    <p key={key} className="mb-2 flex flex-wrap items-center text-xs">
      {primary && <span className="font-semibold" style={{ color: accentColor }}>{primary}</span>}
      {secondary && (
        <span className={`text-[11px] text-slate-500 ${primary ? 'ml-3 pl-3 border-l border-slate-300' : ''}`}>{secondary}</span>
      )}
    </p>
  );

  // One atom per grid row: equal-width columns across the page, so a long list can still split across pages.
  const levelRows = (items, prefix, cell) => chunk(items, LEVEL_COLUMNS).map((row, i) => (
    <div
      key={`${prefix}-row-${i}`}
      className="mb-3 grid gap-x-6 pl-3"
      style={{ gridTemplateColumns: `repeat(${LEVEL_COLUMNS}, 1fr)` }}
    >
      {row.map((item) => cell(item))}
    </div>
  ));

  // A cell: the name, then the level dots (and the level word for languages) underneath.
  const levelCell = (key, name, rating, levelText) => (
    <div key={key} className="min-w-0">
      <p className="text-[11.5px] font-semibold leading-snug text-slate-800 [overflow-wrap:anywhere]">{name}</p>
      {(rating > 0 || levelText) && (
        <div className="mt-1 flex items-center gap-2">
          {rating > 0 && skillDots(rating, accentColor, tint(accentColor, 0.7))}
          {levelText && <span className="text-[10px] leading-none text-slate-500">{levelText}</span>}
        </div>
      )}
    </div>
  );

  // Languages use the same grid as skills (the shared renderer draws them its own way, so this template draws its own).
  const languageList = (languages && languages.enabled !== false
    ? (Array.isArray(languages) ? languages : languages.items || [])
    : []
  ).filter((l) => l && l.name && String(l.name).trim());
  const languageBlocks = languageList.length > 0 ? endGroup([
    heading('languages', 'Languages'),
    ...levelRows(languageList, 'languages', (l) => {
      const level = String(l.level || '').trim();
      return levelCell(`lang-${l.id ?? l.name}`, l.name, languageRating(level), level);
    }),
  ]) : [];

  const sectionMap = {
    summary: summary ? endGroup([
      heading('summary', 'Profile'),
      ...renderAchievements(summary, 'summary'),
    ]) : [],
    experience: jobs.length > 0 ? endGroup([
      heading('experience', 'Experience'),
      ...jobs.flatMap((job) => padLast([
        entryHead(`job-${job.id}-title`, job.title, jobDates(job)),
        metaLine(`job-${job.id}-meta`, job.employer, [job.location, job.remote ? 'Remote' : ''].filter(Boolean).join(', ')),
        ...renderAchievements(job.achievements, `job-${job.id}-ach`),
      ], 'mb-5')),
    ]) : [],
    education: educations.length > 0 ? endGroup([
      heading('education', 'Education'),
      ...educations.flatMap((ed) => padLast([
        entryHead(`education-${ed.id}-title`, [ed.degree, ed.field].filter(Boolean).join(', '), ed.date),
        metaLine(`education-${ed.id}-meta`, ed.institution, ed.location),
        ...renderAchievements(ed.achievements, `education-${ed.id}-ach`),
      ], 'mb-4')),
    ]) : [],
    skills: namedSkills.length > 0 ? endGroup([
      heading('skills', 'Skills'),
      ...levelRows(namedSkills, 'skills', (s) => levelCell(`skill-${s.id}`, s.text, skillRating(s), '')),
    ]) : [],
  };

  const extras = {
    ...renderExtraSections({ projects, languages, hobbies, references, headingClass, headingStyle, accentColor }),
    ...renderCertificates({ certificates, headingClass, headingStyle }),
    languages: languageBlocks,
  };
  const allBlocks = sectionOrder.flatMap((key) => markSection(edit, key, sectionMap[key] || extras[key] || []));
  const { pages, measureContainerRef, firstBodyRef, measureContent } = usePaginatedBlocks(allBlocks, 880);

  return (
    <>
      {/* Matches the body's content width: 794 - 2 x 40 */}
      <div ref={measureContainerRef} className="absolute top-[-9999px] left-[-9999px] w-[714px] pointer-events-none">
        {measureContent}
      </div>

      {pages.map((pageBlocks, index) => (
        <A4Page key={index} pageNum={index + 1} totalPages={pages.length}>
          <div className="relative w-full h-full bg-white text-slate-800 text-left flex flex-col">
            {index === 0 ? (
              <>
                <div {...editAttrs(edit, 'personal')} className="relative flex items-center justify-between gap-6 overflow-hidden px-10 pb-14 pt-9 text-white" style={{ backgroundColor: accentColor }}>
                  {/* Soft geometry (white at low opacity, so it works on any accent colour) */}
                  <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white" style={{ opacity: 0.08 }} />
                  <div className="absolute -bottom-20 right-28 h-44 w-44 rounded-full bg-white" style={{ opacity: 0.06 }} />
                  <div className="relative min-w-0 flex-1">
                    <h1 className="text-[42px] font-extrabold leading-[1.05] tracking-tight break-words">{fullName || 'Your Name'}</h1>
                    {personal.profession && (
                      <p className="mt-2 text-[17px] font-medium" style={{ color: tint(accentColor, 0.7) }}>{personal.profession}</p>
                    )}
                  </div>
                  <div className="relative shrink-0">
                    <ResumePhoto src={personal.photo} style={personal.photoStyle} borderColor="#ffffff" />
                  </div>
                </div>

                {contactList.length > 0 && (
                  <div
                    {...editAttrs(edit, 'personal')}
                    className="relative z-10 -mt-7 mx-10 flex flex-wrap gap-x-6 gap-y-2 rounded-lg border bg-white px-5 py-3 text-[11px] text-slate-700"
                    style={{ borderColor: tint(accentColor, 0.82) }}
                  >
                    {contactList.map((c, i) => (
                      <div key={i} className="flex min-w-0 items-center gap-2">
                        <ContactBadge kind={contactKind(c)} accentColor={accentColor} />
                        <span className="min-w-0 [overflow-wrap:anywhere]">{c}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="absolute left-0 right-0 top-0 h-2" style={{ backgroundColor: accentColor }} />
            )}

            <div ref={index === 0 ? firstBodyRef : undefined} className={`mx-10 mb-8 flex-1 overflow-hidden ${index === 0 ? 'mt-6' : 'mt-9'}`}>
              {pageBlocks}
              {isEmpty && index === 0 && (
                <p className="text-xs text-slate-400 italic">Nothing entered yet — fill in a few steps to see them appear here.</p>
              )}
            </div>
          </div>
        </A4Page>
      ))}
    </>
  );
};

export default AtelierTemplate;
