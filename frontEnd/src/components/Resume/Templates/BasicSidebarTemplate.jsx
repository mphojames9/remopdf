import React from 'react';
import { renderAchievements } from '../Sections/richText';
import { languageLevelInfo } from '../Sections/LanguageLevelSelect';
import { getSkillLevelLabel } from '../Sections/SkillsField';
import ResumePhoto from '../Sections/ResumePhoto';
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
// BASIC SIDEBAR: a plain starting point, ready to be styled.
//  - TWO columns: a narrow left sidebar (photo, contact, skills, languages, hobbies) and a wide main column
//    (name, summary, experience, education, projects, references, certificates)
//  - the photo shows only when the person added one; no icons, no rating dots: skills and languages are real text
//  - each column is measured and split into pages on its own, so a long column simply continues on the next page
// Change the tokens below first; then the class names / styles in the blocks further down.
const INK = '#111827';          // names, headings, main text
const MUTED = '#4B5563';        // dates, second lines, sidebar text
const PAPER = '#FFFFFF';        // main column background
const SIDE_BG = '#F3F4F6';      // sidebar background
const FONT = 'Arial, Helvetica, sans-serif';
const SIDEBAR_W = 240;          // px, the whole sidebar
const SIDE_PAD = { top: 36, right: 22, bottom: 32, left: 28 };   // px, padding inside the sidebar
const MAIN_PAD = { top: 36, right: 36, bottom: 32, left: 30 };   // px, padding inside the main column
const SIDE_CONTENT_W = SIDEBAR_W - SIDE_PAD.left - SIDE_PAD.right;            // px -> 190
const MAIN_CONTENT_W = 794 - SIDEBAR_W - MAIN_PAD.left - MAIN_PAD.right;      // px -> 488

// These sections live in the sidebar. Every other section goes in the main column.
const SIDE_SECTIONS = ['skills', 'languages', 'hobbies'];

const BasicSidebarTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, certificates, isEmpty, accentColor, sectionOrder, edit } = props;

  const accentText = tint(accentColor, -0.2); // the accent, darkened a little so text stays readable

  // Headings. Every entry is a FLAT list of elements: no <section>, no wrapper divs, so the paginator can break between them.
  const mainHeadingClass = 'text-[12px] font-bold uppercase tracking-[0.12em] pb-1 mb-3 border-b';
  const mainHeadingStyle = { color: accentText, borderColor: accentColor };
  const mainHeading = (key, text) => (
    <h3 key={`${key}-h`} className={mainHeadingClass} style={mainHeadingStyle}>{text}</h3>
  );
  const sideHeadingClass = 'text-[11px] font-bold uppercase tracking-[0.14em] pb-1 mb-2 border-b';
  const sideHeadingStyle = { color: INK, borderColor: accentColor };
  const sideHeading = (key, text) => (
    <h3 key={`${key}-h`} className={sideHeadingClass} style={sideHeadingStyle}>{text}</h3>
  );

  // Formatted (bold / italic / bullet) lines for the sidebar: same atoms, a little smaller.
  const sideRichText = (text, keyPrefix) =>
    renderAchievements(text, keyPrefix).map((node) => React.cloneElement(node, { style: { fontSize: '11.5px', color: MUTED } }));

  /* ------------------------------ MAIN column ------------------------------ */
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

  const mainMap = {
    summary: summary ? endGroup([
      mainHeading('summary', 'Summary'),
      ...renderAchievements(summary, 'summary'),
    ]) : [],
    experience: jobs.length > 0 ? endGroup([
      mainHeading('experience', 'Experience'),
      ...jobs.flatMap((job) => {
        const employer = [job.employer, job.location, job.remote ? 'Remote' : ''].filter(Boolean).join(' · ');
        // Job title first when there is one; otherwise the employer takes the bold line.
        return job.title
          ? entry('job', job, job.title, employer, jobDates(job))
          : entry('job', job, employer, '', jobDates(job));
      }),
    ]) : [],
    education: educations.length > 0 ? endGroup([
      mainHeading('education', 'Education'),
      ...educations.flatMap((ed) => {
        const degree = [ed.degree, ed.field].filter(Boolean).join(', ');
        const school = [ed.institution, ed.location].filter(Boolean).join(' · ');
        return degree
          ? entry('education', ed, degree, school, ed.date)
          : entry('education', ed, school, '', ed.date);
      }),
    ]) : [],
  };

  // Projects, references and certificates come from the shared renderers, which draw their own heading.
  const extras = {
    ...renderExtraSections({ projects, references, headingClass: mainHeadingClass, headingStyle: mainHeadingStyle }),
    ...renderCertificates({ certificates, headingClass: mainHeadingClass, headingStyle: mainHeadingStyle }),
  };

  /* ------------------------------ SIDEBAR column ----------------------------- */
  const hasHobbies = Boolean(hobbies?.enabled && hobbies.text && String(hobbies.text).trim());
  const languageItems = (languages?.items || []).filter((l) => l.name);

  const sideMap = {
    skills: namedSkills.length > 0 ? endGroup([
      sideHeading('skills', 'Skills'),
      ...namedSkills.map((s, i) => {
        const rating = skillRating(s);
        return (
          <p key={`skill-${i}`} className="text-[11.5px] leading-snug mb-1.5" style={{ color: INK }}>
            {s.text}
            {rating > 0 && <span style={{ color: MUTED }}>{` (${getSkillLevelLabel(rating)})`}</span>}
          </p>
        );
      }),
    ]) : [],
    languages: languageItems.length > 0 ? endGroup([
      sideHeading('languages', 'Languages'),
      ...languageItems.map((l, i) => {
        const { label } = languageLevelInfo(l);
        return (
          <p key={`language-${l.id || i}`} className="text-[11.5px] leading-snug mb-1.5" style={{ color: INK }}>
            {l.name}
            {label && <span style={{ color: MUTED }}>{` (${label})`}</span>}
          </p>
        );
      }),
    ]) : [],
    hobbies: hasHobbies ? endGroup([
      sideHeading('hobbies', 'Hobbies & Interests'),
      ...sideRichText(hobbies.text, 'hobbies'),
    ]) : [],
  };

  // Photo (when there is one) and the contact lines open the sidebar, as flat blocks at the top of page 1.
  const contactBlocks = [
    personal.photo && (
      <div key="side-photo" className="mb-5">
        <ResumePhoto src={personal.photo} style={personal.photoStyle} borderColor={accentColor} />
      </div>
    ),
    ...(contactList.length > 0 ? [
      sideHeading('contact', 'Contact'),
      ...contactList.map((line, i) => (
        <p key={`contact-${i}`} className="text-[11.5px] leading-snug mb-1.5 break-words" style={{ color: INK }}>{line}</p>
      )),
    ] : []),
  ].filter(Boolean);
  const sideHead = contactBlocks.length > 0 ? markSection(edit, 'personal', endGroup(contactBlocks), false) : [];

  /* ------------------------------- Main header ------------------------------ */
  // Name and profession open the main column, as one flat block at the top of page 1.
  const displayName = (fullName || 'Your Name').trim();
  const nameSize = displayName.length <= 14 ? 32 : displayName.length <= 20 ? 27 : 22;
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
    </div>,
  ], false);

  const mainBlocks = [
    ...headerBlocks,
    ...sectionOrder
      .filter((key) => !SIDE_SECTIONS.includes(key))
      .flatMap((key) => markSection(edit, key, mainMap[key] || extras[key] || [])),
  ];
  const sideBlocks = [
    ...sideHead,
    ...sectionOrder
      .filter((key) => SIDE_SECTIONS.includes(key))
      .flatMap((key) => markSection(edit, key, sideMap[key] || [])),
  ];

  /* ------------------------------ Pagination ------------------------------- */
  // Each column is measured and split on its own; the page count is the larger of the two.
  const main = usePaginatedBlocks(mainBlocks, 1020);
  const side = usePaginatedBlocks(sideBlocks, 1020);
  const pageCount = Math.max(main.pages.length, side.pages.length);

  return (
    <>
      <div ref={main.measureContainerRef} className="absolute top-[-9999px] left-[-9999px] pointer-events-none" style={{ width: MAIN_CONTENT_W, fontFamily: FONT }}>
        {main.measureContent}
      </div>
      <div ref={side.measureContainerRef} className="absolute top-[-9999px] left-[-9999px] pointer-events-none" style={{ width: SIDE_CONTENT_W, fontFamily: FONT }}>
        {side.measureContent}
      </div>

      {Array.from({ length: pageCount }, (_, index) => (
        <A4Page key={index} pageNum={index + 1} totalPages={pageCount}>
          <div className="relative flex w-full h-full text-left" style={{ color: INK, backgroundColor: PAPER, fontFamily: FONT }}>
            <div
              ref={index === 0 ? side.firstBodyRef : undefined}
              className="shrink-0 h-full overflow-hidden"
              style={{ width: SIDEBAR_W, padding: `${SIDE_PAD.top}px ${SIDE_PAD.right}px ${SIDE_PAD.bottom}px ${SIDE_PAD.left}px`, backgroundColor: SIDE_BG }}
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

export default BasicSidebarTemplate;
