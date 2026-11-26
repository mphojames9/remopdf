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
// BASIC SPLIT: a plain starting point, ready to be styled.
//  - ONE column, but every entry is split in two: the dates sit in a narrow gutter on the left,
//    the title, details and bullets line up in the wide column on the right
//  - header: the name on the left, the contact lines stacked on the right
//  - no photo, no icons, no rating dots: everything is real text (reads cleanly to an ATS)
// Change the tokens below first; then the class names / styles in the blocks further down.
const INK = '#111827';          // names, headings, main text
const MUTED = '#4B5563';        // dates, second lines, contact lines
const PAPER = '#FFFFFF';        // page background
const FONT = 'Helvetica, Arial, sans-serif';
const PAD_X = 44;               // px, left and right page padding
const PAD_Y = 36;               // px, top and bottom page padding
const MAIN_W = 794 - PAD_X * 2; // px, content width. The hidden measuring box must match the real page body.
const GUTTER = 130;             // px, the left gutter (dates) including the gap before the right column
const GAP = 16;                 // px, space between the gutter and the right column

// Moves one element into the right-hand column.
const indent = (node) => React.cloneElement(node, { style: { ...(node.props.style || {}), marginLeft: GUTTER } });
// Moves every element of a block into the right-hand column, except its heading (the <h3>).
const indentBody = (nodes = []) => nodes.map((node) => (React.isValidElement(node) && node.type !== 'h3' ? indent(node) : node));

const BasicSplitTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, certificates, isEmpty, accentColor, sectionOrder, edit } = props;

  const accentText = tint(accentColor, -0.2); // the accent, darkened a little so text stays readable on white

  // Every entry is a FLAT list of elements: no <section>, no wrapper divs, so the paginator can break between them.
  // The shared renderers (projects, references, certificates) use this same class, so their headings match.
  const headingClass = 'text-[11px] font-bold uppercase tracking-[0.16em] pb-1 mb-3 border-b';
  const headingStyle = { color: accentText, borderColor: accentColor };
  const heading = (key, text) => (
    <h3 key={`${key}-h`} className={headingClass} style={headingStyle}>{text}</h3>
  );

  // One job or education entry: dates in the gutter; title and second line in the right column; bullets under them.
  const entry = (kind, item, title, subtitle, dates) => padLast([
    <div key={`${kind}-${item.id}-top`} className="flex mb-1" style={{ gap: GAP }}>
      <p className="shrink-0 text-[11px] leading-snug" style={{ width: GUTTER - GAP, color: MUTED, paddingTop: 2 }}>{dates}</p>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold leading-snug" style={{ color: INK }}>{title}</p>
        {subtitle && <p className="text-[12px] leading-snug mt-0.5" style={{ color: MUTED }}>{subtitle}</p>}
      </div>
    </div>,
    ...renderAchievements(item.achievements, `${kind}-${item.id}-ach`).map(indent),
  ], 'mb-4');

  // Skills and languages are plain comma-separated text in the right column, with the level in brackets.
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
    <p key={key} className="text-[12px] leading-relaxed" style={{ color: INK, marginLeft: GUTTER }}>{items.join(', ')}</p>
  );

  const mainMap = {
    summary: summary ? endGroup([
      heading('summary', 'Summary'),
      ...renderAchievements(summary, 'summary').map(indent),
    ]) : [],
    experience: jobs.length > 0 ? endGroup([
      heading('experience', 'Experience'),
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
      ...renderAchievements(hobbies.text, 'hobbies').map(indent),
    ]) : [],
  };

  // Projects, references and certificates come from the shared renderers, which draw their own heading.
  // Their rows are moved into the right-hand column so they line up with everything else.
  const extraBlocks = {
    ...renderExtraSections({ projects, references, headingClass, headingStyle }),
    ...renderCertificates({ certificates, headingClass, headingStyle }),
  };
  const extras = Object.fromEntries(Object.entries(extraBlocks).map(([key, nodes]) => [key, indentBody(nodes)]));

  /* ------------------------------- Page header ------------------------------ */
  // Name and profession on the left, contact lines on the right, as one flat block at the top of page 1.
  const displayName = (fullName || 'Your Name').trim();
  const nameSize = displayName.length <= 16 ? 30 : displayName.length <= 22 ? 26 : 22;
  const professionParts = (personal.profession || '').split('|').map((p) => p.trim()).filter(Boolean);

  const headerBlocks = markSection(edit, 'personal', [
    <div key="page-header" className="flex justify-between items-end gap-6 pb-3 mb-6 border-b-2" style={{ borderColor: accentColor }}>
      <div className="min-w-0 flex-1">
        <h1 className="break-words" style={{ fontSize: nameSize, fontWeight: 700, lineHeight: 1.1, color: INK }}>
          {displayName}
        </h1>
        {professionParts.length > 0 && (
          <p className="mt-1.5 text-[13px] leading-snug" style={{ color: accentText }}>
            {professionParts.join(' | ')}
          </p>
        )}
      </div>
      {contactList.length > 0 && (
        <div className="shrink-0 text-right text-[11px] leading-relaxed" style={{ color: MUTED, maxWidth: 250 }}>
          {contactList.map((line, i) => (
            <p key={`contact-${i}`} className="break-words">{line}</p>
          ))}
        </div>
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

export default BasicSplitTemplate;
