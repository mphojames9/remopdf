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
// BASIC CLASSIC: a plain starting point, ready to be styled.
//  - ONE column, left aligned, read top to bottom
//  - no photo, no icons, no rating dots: everything is real text (reads cleanly to an ATS)
//  - the accent colour (picked in the builder) is only used for the header rule, the headings and the profession
// Change the tokens below first; then the class names / styles in the blocks further down.
const INK = '#111827';          // names, headings, main text
const MUTED = '#4B5563';        // dates, second lines, contact line
const PAPER = '#FFFFFF';        // page background
const FONT = 'Arial, Helvetica, sans-serif';
const PAD_X = 44;               // px, left and right page padding
const PAD_Y = 36;               // px, top and bottom page padding
const MAIN_W = 794 - PAD_X * 2; // px, content width. The hidden measuring box must match the real page body.

const BasicClassicTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, certificates, isEmpty, accentColor, sectionOrder, edit } = props;

  const accentText = tint(accentColor, -0.2); // the accent, darkened a little so text stays readable on white

  // Every entry is a FLAT list of elements: no <section>, no wrapper divs, so the paginator can break between them.
  // The shared renderers (projects, references, certificates) use this same class, so their headings match.
  const headingClass = 'text-[12px] font-bold uppercase tracking-[0.12em] pb-1 mb-3 border-b';
  const headingStyle = { color: accentText, borderColor: accentColor };
  const heading = (key, text) => (
    <h3 key={`${key}-h`} className={headingClass} style={headingStyle}>{text}</h3>
  );

  // One job or education entry: bold title with the dates on the right, a muted second line, then the bullets.
  const entry = (kind, item, title, subtitle, dates) => padLast([
    <div key={`${kind}-${item.id}-top`} className="flex justify-between items-baseline gap-3 mb-0.5">
      <p className="text-[13px] font-bold leading-snug" style={{ color: INK }}>{title}</p>
      {dates && <p className="text-[11px] whitespace-nowrap" style={{ color: MUTED }}>{dates}</p>}
    </div>,
    subtitle && (
      <p key={`${kind}-${item.id}-sub`} className="text-[12px] leading-snug mb-1.5" style={{ color: MUTED }}>{subtitle}</p>
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
    <p key={key} className="text-[12px] leading-relaxed" style={{ color: INK }}>{items.join(', ')}</p>
  );

  const mainMap = {
    summary: summary ? endGroup([
      heading('summary', 'Professional Summary'),
      ...renderAchievements(summary, 'summary'),
    ]) : [],
    experience: jobs.length > 0 ? endGroup([
      heading('experience', 'Work Experience'),
      ...jobs.flatMap((job) => {
        const employer = [job.employer, job.location, job.remote ? 'Remote' : ''].filter(Boolean).join(' · ');
        // Job title first when there is one; otherwise the employer takes the bold line.
        return job.title
          ? entry('job', job, job.title, employer, jobDates(job))
          : entry('job', job, employer, '', jobDates(job));
      }),
    ]) : [],
    education: educations.length > 0 ? endGroup([
      heading('education', 'Education'),
      ...educations.flatMap((ed) => {
        const degree = [ed.degree, ed.field].filter(Boolean).join(', ');
        const school = [ed.institution, ed.location].filter(Boolean).join(' · ');
        return degree
          ? entry('education', ed, degree, school, ed.date)
          : entry('education', ed, school, '', ed.date);
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
  // Name, profession and contact line are plain text at the top of page 1, as one flat block.
  const displayName = (fullName || 'Your Name').trim();
  const nameSize = displayName.length <= 18 ? 30 : displayName.length <= 26 ? 26 : 22;
  const professionParts = (personal.profession || '').split('|').map((p) => p.trim()).filter(Boolean);

  const headerBlocks = markSection(edit, 'personal', [
    <div key="page-header" className="pb-3 mb-5 border-b-2" style={{ borderColor: accentColor }}>
      <h1 className="break-words" style={{ fontSize: nameSize, fontWeight: 700, lineHeight: 1.1, color: INK }}>
        {displayName}
      </h1>
      {professionParts.length > 0 && (
        <p className="mt-1.5 text-[14px] leading-snug" style={{ color: accentText }}>
          {professionParts.join(' | ')}
        </p>
      )}
      {contactList.length > 0 && (
        <p className="mt-2 text-[11px] leading-relaxed break-words" style={{ color: MUTED }}>
          {contactList.join('  |  ')}
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
      <div ref={main.measureContainerRef} className="absolute top-[-9999px] left-[-9999px] pointer-events-none" style={{ width: MAIN_W, fontFamily: FONT }}>
        {main.measureContent}
      </div>

      {Array.from({ length: pageCount }, (_, index) => (
        <A4Page key={index} pageNum={index + 1} totalPages={pageCount}>
          <div className="relative w-full h-full text-left" style={{ color: INK, backgroundColor: PAPER, fontFamily: FONT }}>
            <div
              ref={index === 0 ? main.firstBodyRef : undefined}
              className="w-full h-full overflow-hidden"
              style={{ padding: `${PAD_Y}px ${PAD_X}px` }}
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

export default BasicClassicTemplate;
