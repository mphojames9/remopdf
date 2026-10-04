import React from 'react';
import { renderAchievements } from '../Sections/richText';
import ResumePhoto from '../Sections/ResumePhoto';
import {
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
 * Chronicle — a timeline template.
 *
 * A tinted rail runs down the left of every page with a solid accent line on its
 * edge. Dates sit in the rail, each role/degree is a node on the line, and each
 * section heading is a square marker. The rail, line and top bar are page-level
 * decoration; every paginated block is still a flat, direct child of the body
 * (no wrappers). Dates and nodes are absolutely positioned out of the block's own
 * left edge, so they never change a block's height.
 *
 * Geometry (A4 = 794px wide):  rail 200px | gutter 24px | content 530px | right pad 40px
 */
const RAIL = 200;

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

const ContactIcon = ({ kind, color }) => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-[2px] shrink-0">
    {(ICONS[kind] || []).map((d, i) => <path key={i} d={d} />)}
  </svg>
);

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

const ChronicleTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, certificates, isEmpty, accentColor, sectionOrder, edit } = props;

  // Accent is exposed as a CSS variable so the heading marker/underline also work
  // on headings rendered by the shared extra-section helpers.
  const headingStyle = { '--accent': accentColor };
  const headingClass = `relative mb-3 pb-1.5 text-[13px] font-bold tracking-tight text-slate-900 border-b border-slate-200 before:content-[''] before:absolute before:left-[-30px] before:top-[4px] before:h-[11px] before:w-[11px] before:rounded-[2px] before:bg-[var(--accent,#0f172a)] after:content-[''] after:absolute after:left-0 after:-bottom-px after:h-[2px] after:w-10 after:bg-[var(--accent,#0f172a)]`;
  const heading = (key, text) => (
    <h3 key={`${key}-h`} className={headingClass} style={headingStyle}>{text}</h3>
  );

  // Title row: node on the timeline line + date in the rail + bold title.
  const entryHead = (key, title, date) => (
    <div key={key} className="relative mb-0.5">
      <span className="absolute h-[9px] w-[9px] rounded-full border-2 bg-white" style={{ left: -28.5, top: 4, borderColor: accentColor }} />
      {date && (
        <span className="absolute w-[150px] text-right text-[11px] leading-4 tabular-nums text-slate-500" style={{ right: 'calc(100% + 40px)', top: 2 }}>{date}</span>
      )}
      <p className="text-[14px] font-bold leading-tight text-slate-900">{title}</p>
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

  // Two cells per row, each a name with its level on the right and a hairline underneath.
  const levelRows = (items, prefix, cell) => chunk(items, 2).map((pair, i) => (
    <div key={`${prefix}-row-${i}`} className="mb-1.5 flex gap-8">
      {pair.map((item) => cell(item))}
      {pair.length === 1 && <div className="flex-1" />}
    </div>
  ));
  const levelCellClass = 'flex min-w-0 flex-1 items-center justify-between gap-3 border-b border-slate-200 pb-1.5 text-[11.5px] font-medium text-slate-800';

  // Languages use the same layout as skills (the shared renderer draws them inline, so this template draws its own).
  // The level word sits just before the dots so the level is still readable as text.
  const languageList = (languages && languages.enabled !== false
    ? (Array.isArray(languages) ? languages : languages.items || [])
    : []
  ).filter((l) => l && l.name && String(l.name).trim());
  const languageBlocks = languageList.length > 0 ? endGroup([
    heading('languages', 'Languages'),
    ...levelRows(languageList, 'languages', (l) => {
      const level = String(l.level || '').trim();
      const rating = languageRating(level);
      return (
        <div key={`lang-${l.id ?? l.name}`} className={levelCellClass}>
          <span className="truncate">{l.name}</span>
          <span className="flex shrink-0 items-center gap-2">
            {level && <span className="text-[10px] font-normal text-slate-500">{level}</span>}
            {rating > 0 && skillDots(rating, accentColor, '#cbd5e1')}
          </span>
        </div>
      );
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
      ...levelRows(namedSkills, 'skills', (s) => (
        <div key={`skill-${s.id}`} className={levelCellClass}>
          <span className="truncate">{s.text}</span>
          {skillDots(skillRating(s), accentColor, '#cbd5e1')}
        </div>
      )),
    ]) : [],
  };

  const extras = {
    ...renderExtraSections({ projects, languages, hobbies, references, headingClass, headingStyle, accentColor }),
    ...renderCertificates({ certificates, headingClass, headingStyle }),
    languages: languageBlocks,
  };
  const allBlocks = sectionOrder.flatMap((key) => markSection(edit, key, sectionMap[key] || extras[key] || []));
  const { pages, measureContainerRef, firstBodyRef, measureContent } = usePaginatedBlocks(allBlocks, 880);

  const words = (fullName || '').trim().split(/\s+/).filter(Boolean);
  const initials = words.length ? (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase() : 'YN';

  return (
    <>
      {/* Must match the body's content width: 794 - 224 (rail + gutter) - 40 (right padding) */}
      <div ref={measureContainerRef} className="absolute top-[-9999px] left-[-9999px] w-[530px] pointer-events-none">
        {measureContent}
      </div>

      {pages.map((pageBlocks, index) => (
        <A4Page key={index} pageNum={index + 1} totalPages={pages.length}>
          <div className="relative w-full h-full bg-white text-slate-800 text-left flex flex-col">
            {/* Page-level decoration: tint, timeline line, top bar. Absolute, so no effect on pagination. */}
            <div className="absolute left-0 top-0 bottom-0" style={{ width: RAIL, backgroundColor: accentColor, opacity: 0.07, zIndex: 0 }} />
            <div className="absolute top-0 bottom-0" style={{ left: RAIL - 1, width: 2, backgroundColor: accentColor }} />
            <div className="absolute left-0 right-0 top-0 h-2" style={{ backgroundColor: accentColor }} />

            {index === 0 && (
              <div {...editAttrs(edit, 'personal')} className="relative z-10 flex pt-12 pb-8 pr-10">
                <div className="flex shrink-0 justify-center" style={{ width: RAIL }}>
                  {personal.photo ? (
                    <ResumePhoto src={personal.photo} style={personal.photoStyle} borderColor={accentColor} />
                  ) : (
                    <div className="flex h-[92px] w-[92px] items-center justify-center rounded-full border-2 bg-white text-[30px] font-semibold" style={{ color: accentColor, borderColor: accentColor }}>
                      {initials}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 pl-6">
                  <h1 className="text-[40px] font-bold leading-[1.05] tracking-tight text-slate-900 break-words">{fullName || 'Your Name'}</h1>
                  {personal.profession && (
                    <p className="mt-2 text-[15px] font-medium" style={{ color: accentColor }}>{personal.profession}</p>
                  )}
                  {contactList.length > 0 && (
                    <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11px] text-slate-600">
                      {contactList.map((c, i) => (
                        <div key={i} className="flex min-w-0 items-start gap-2">
                          {contactKind(c) ? (
                            <ContactIcon kind={contactKind(c)} color={accentColor} />
                          ) : (
                            <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: accentColor }} />
                          )}
                          <span className="min-w-0 [overflow-wrap:anywhere]">{c}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div ref={index === 0 ? firstBodyRef : undefined} className="relative z-10 flex-1 overflow-hidden pl-[224px] pr-10 py-8">
              {pageBlocks}
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

export default ChronicleTemplate;
