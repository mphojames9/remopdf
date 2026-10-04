import React from 'react';
import { renderAchievements } from '../Sections/richText';
import { languageLevelInfo } from '../Sections/LanguageLevelSelect';
import { getSkillLevelLabel } from '../Sections/SkillsField';
import {
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
// ATS-friendly "classic" layout:
//  - ONE column, read top to bottom, centred name block
//  - no photo, no icons, no rating dots/bars: everything that carries meaning is real text
//  - standard section names, each with a rule underneath
//  - employer / institution on the first line, role / degree on the second, location and dates on the right
const INK = '#1B2430';        // headings, names, main text
const MUTED = '#5D6673';      // secondary text
const PAPER = '#FFFFFF';      // page background
const MAIN_W = 706;           // px  -> 794 - 44 - 44
const SERIF = '"Source Serif 4", "Merriweather", Georgia, "Times New Roman", serif';

// Darkens a #rgb / #rrggbb colour. Used so accent-coloured TEXT stays readable on white.
const darken = (color, amount) => {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(color || '').trim());
  if (!m) return '#334155';
  let hex = m[1];
  if (hex.length === 3) hex = hex.split('').map((ch) => ch + ch).join('');
  const n = parseInt(hex, 16);
  const channel = (v) => Math.round(v * (1 - amount)).toString(16).padStart(2, '0');
  return `#${channel((n >> 16) & 255)}${channel((n >> 8) & 255)}${channel(n & 255)}`;
};

const ClassicATSTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, certificates, isEmpty, accentColor, sectionOrder, edit } = props;

  const accentText = darken(accentColor, 0.2);    // accent used for text

  // Every entry is a FLAT list of elements: no <section>, no wrapper divs.
  // The shared renderers (projects, references, certificates) use this same class, so their headings match.
  const headingClass = 'text-[12px] font-bold uppercase tracking-[0.16em] pb-1 mb-3 border-b';
  const headingStyle = { color: INK, borderColor: accentColor, fontFamily: SERIF };
  const heading = (key, text) => (
    <h3 key={`${key}-h`} className={headingClass} style={headingStyle}>{text}</h3>
  );

  // One entry (job or education): a bold line with the location on the right, an italic line with the
  // dates on the right, then the bullets. With no second line, the dates join the first line.
  const row = (key, left, right, { bold = false, italic = false, last = false } = {}) => (
    <div key={key} className={`flex justify-between items-baseline gap-3 ${last ? 'mb-2' : 'mb-0.5'}`}>
      <p className={`text-[12.5px] leading-snug ${bold ? 'font-bold' : ''} ${italic ? 'italic' : ''}`} style={{ color: bold ? INK : MUTED }}>{left}</p>
      {right && <p className="text-[11px] whitespace-nowrap" style={{ color: bold ? MUTED : INK }}>{right}</p>}
    </div>
  );
  const entry = (kind, item, first, second, firstRight, secondRight) => padLast([
    second
      ? row(`${kind}-${item.id}-first`, first, firstRight, { bold: true })
      : row(`${kind}-${item.id}-first`, first, [secondRight, firstRight].filter(Boolean).join(' · '), { bold: true, last: true }),
    second && row(`${kind}-${item.id}-second`, second, secondRight, { italic: true, last: true }),
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
        // Employer first when there is one; otherwise the job title takes the bold line.
        return job.employer
          ? entry('job', job, job.employer, job.title, place, jobDates(job))
          : entry('job', job, job.title, '', place, jobDates(job));
      }),
    ]) : [],
    education: educations.length > 0 ? endGroup([
      heading('education', 'Education'),
      ...educations.flatMap((ed) => {
        const degree = [ed.degree, ed.field].filter(Boolean).join(', ');
        // Institution first when there is a degree; otherwise whichever one exists takes the bold line.
        return degree && ed.institution
          ? entry('education', ed, ed.institution, degree, ed.location, ed.date)
          : entry('education', ed, degree || ed.institution, '', ed.location, ed.date);
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

  /* ------------------------------- Page header ------------------------------ */
  // Name, profession and contact line are plain, centred text at the top of page 1, as one flat block.
  const displayName = (fullName || 'Your Name').trim();
  const nameSize = displayName.length <= 18 ? 30 : displayName.length <= 26 ? 26 : 22;
  const professionParts = (personal.profession || '').split('|').map((p) => p.trim()).filter(Boolean);

  const headerBlocks = markSection(edit, 'personal', [
    <div key="page-header" className="text-center pb-4 mb-6 border-b-2" style={{ borderColor: accentColor }}>
      <h1 className="break-words uppercase" style={{ fontFamily: SERIF, fontSize: nameSize, fontWeight: 600, lineHeight: 1.1, letterSpacing: '0.08em', color: INK }}>
        {displayName}
      </h1>
      {professionParts.length > 0 && (
        <p className="mt-2 text-[13px] italic leading-relaxed" style={{ fontFamily: SERIF, color: accentText }}>
          {professionParts.join(' | ')}
        </p>
      )}
      {contactList.length > 0 && (
        <p className="mt-3 text-[11px] leading-relaxed break-words" style={{ color: MUTED }}>
          {contactList.join(' • ')}
        </p>
      )}
    </div>,
  ]);

  const mainBlocks = [
    ...headerBlocks,
    ...sectionOrder.flatMap((key) => markSection(
      edit,
      key,
      mainMap[key] || extras[key] || [],
    )),
  ];

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
            <div
              ref={index === 0 ? main.firstBodyRef : undefined}
              className="w-full h-full overflow-hidden"
              style={{ padding: '32px 44px' }}
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

export default ClassicATSTemplate;
