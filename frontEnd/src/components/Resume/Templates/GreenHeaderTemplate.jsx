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
 * Regent — a serif-led, executive template (premium take on GreenHeader).
 *
 * White page. Serif name and section headings over a clean sans body, a vertical
 * contact column with icons, and a double rule (thick accent + hairline) closing the
 * header. Continuation pages open with the same double rule instead of repeating the name.
 * No shadows, no gradients.
 *
 * Body spacing is applied as margins on the measured element, so the height the
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

const ContactIcon = ({ kind, color }) => (kind && ICONS[kind] ? (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-[2px] shrink-0">
    {ICONS[kind].map((d, i) => <path key={i} d={d} />)}
  </svg>
) : (
  <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: color }} />
));

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

const RegentTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, certificates, isEmpty, accentColor, sectionOrder, edit } = props;

  const headingClass = 'mb-3 border-b pb-1 font-serif text-[17px] font-semibold tracking-tight';
  const headingStyle = { color: accentColor, borderColor: tint(accentColor, 0.75) };
  const heading = (key, text) => <h3 key={`${key}-h`} className={headingClass} style={headingStyle}>{text}</h3>;

  // Bold sans title on the left, italic serif dates on the right.
  const entryHead = (key, title, date) => (
    <div key={key} className="mb-0.5 flex items-baseline justify-between gap-4">
      <p className="text-[13.5px] font-bold leading-tight text-slate-900">{title}</p>
      {date && <span className="shrink-0 font-serif text-[12px] italic text-slate-500">{date}</span>}
    </div>
  );

  // Serif employer in the accent colour, with a quieter sans detail after a divider.
  const metaLine = (key, primary, secondary) => (primary || secondary) && (
    <p key={key} className="mb-2 flex flex-wrap items-center">
      {primary && <span className="font-serif text-[13.5px] font-semibold" style={{ color: accentColor }}>{primary}</span>}
      {secondary && (
        <span className={`text-[11px] text-slate-500 ${primary ? 'ml-3 pl-3 border-l border-slate-300' : ''}`}>{secondary}</span>
      )}
    </p>
  );

  // Rows of three cells; a short last row is padded so the cells keep their width.
  const levelRows = (items, prefix, cell) => chunk(items, 3).map((row, i) => (
    <div key={`${prefix}-row-${i}`} className="mb-3 flex gap-5">
      {row.map((item) => cell(item))}
      {Array.from({ length: 3 - row.length }).map((_, k) => <div key={`pad-${k}`} className="flex-1" />)}
    </div>
  ));

  // Languages use the same layout as skills: name over level dots, slim accent edge, three per row.
  // The shared renderer draws them inline, so this template draws its own.
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
        <div key={`lang-${l.id ?? l.name}`} className="min-w-0 flex-1 border-l-2 pl-2.5" style={{ borderColor: tint(accentColor, 0.5) }}>
          <p className="truncate text-[11.5px] font-semibold text-slate-800">{l.name}</p>
          {(rating > 0 || level) && (
            <div className="mt-1 flex items-center gap-2">
              {rating > 0 && skillDots(rating, accentColor, tint(accentColor, 0.75))}
              {level && <span className="text-[10px] leading-none text-slate-500">{level}</span>}
            </div>
          )}
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
      // Rows of three: skill name over its level dots, set off by a slim accent edge.
      ...levelRows(namedSkills, 'skills', (s) => (
        <div key={`skill-${s.id}`} className="min-w-0 flex-1 border-l-2 pl-2.5" style={{ borderColor: tint(accentColor, 0.5) }}>
          <p className="truncate text-[11.5px] font-semibold text-slate-800">{s.text}</p>
          <div className="mt-1">{skillDots(skillRating(s), accentColor, tint(accentColor, 0.75))}</div>
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
                <div {...editAttrs(edit, 'personal')} className="flex items-center gap-6 px-10 pb-7 pt-10">
                  <ResumePhoto src={personal.photo} style={personal.photoStyle} borderColor={accentColor} />
                  <div className="min-w-0 flex-1">
                    <h1 className="font-serif text-[40px] font-semibold leading-[1.05] tracking-tight text-slate-900 break-words">{fullName || 'Your Name'}</h1>
                    {personal.profession && (
                      <p className="mt-2 text-[14px] font-medium tracking-wide" style={{ color: accentColor }}>{personal.profession}</p>
                    )}
                  </div>
                  {contactList.length > 0 && (
                    <div className="w-[190px] shrink-0 space-y-1.5 border-l pl-5 text-[11px] text-slate-600" style={{ borderColor: tint(accentColor, 0.7) }}>
                      {contactList.map((c, i) => (
                        <div key={i} className="flex min-w-0 items-start gap-2">
                          <ContactIcon kind={contactKind(c)} color={accentColor} />
                          <span className="min-w-0 [overflow-wrap:anywhere]">{c}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Double rule closing the header */}
                <div className="mx-10 h-[3px]" style={{ backgroundColor: accentColor }} />
                <div className="mx-10 mt-[3px] h-px" style={{ backgroundColor: tint(accentColor, 0.6) }} />
              </>
            ) : (
              <>
                {/* Same double rule opens continuation pages (absolute, no effect on pagination) */}
                <div className="absolute left-10 right-10 top-0 h-[3px]" style={{ backgroundColor: accentColor }} />
                <div className="absolute left-10 right-10 top-[6px] h-px" style={{ backgroundColor: tint(accentColor, 0.6) }} />
              </>
            )}

            <div ref={index === 0 ? firstBodyRef : undefined} className={`mx-10 mb-8 flex-1 overflow-hidden ${index === 0 ? 'mt-6' : 'mt-12'}`}>
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

export default RegentTemplate;
