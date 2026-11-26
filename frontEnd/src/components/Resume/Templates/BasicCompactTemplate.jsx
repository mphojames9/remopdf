import React from 'react';
import { renderAchievements } from '../Sections/richText';
import { languageLevelInfo } from '../Sections/LanguageLevelSelect';
import {
  tint,
  jobDates,
  usePaginatedBlocks,
  A4Page,
  padLast,
  stripMb,
  markSection,
  renderExtraSections,
} from './templateShared';
import renderCertificates from '../Sections/renderCertificates';

/* ------------------------------ Design tokens ------------------------------ */
// BASIC COMPACT: a plain starting point, ready to be styled.
//  - ONE column, small type and tight spacing, so a long career still fits on one or two pages
//  - header: the name on the left, the profession on the right, the contact line underneath
//  - entries use a single line: bold title, employer and place, with the dates on the right
//  - skills are plain text with no levels; languages show their level in brackets
//  - no photo, no icons, no rating dots: everything is real text (reads cleanly to an ATS)
// Change the tokens below first; then the class names / styles in the blocks further down.
const INK = '#111827';          // names, headings, main text
const MUTED = '#4B5563';        // dates, places, contact line
const PAPER = '#FFFFFF';        // page background
const FONT = 'Arial, Helvetica, sans-serif';
const PAD_X = 32;               // px, left and right page padding
const PAD_Y = 28;               // px, top and bottom page padding
const MAIN_W = 794 - PAD_X * 2; // px, content width. The hidden measuring box must match the real page body.
const BODY_SIZE = '11px';       // body text size for bullets and paragraphs
const BODY_LINE = 1.4;          // body line height

// Closes a group (heading + rows) with a tighter gap than the standard templates.
const group = (nodes) => padLast(nodes, 'mb-4');

const BasicCompactTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, certificates, isEmpty, accentColor, sectionOrder, edit } = props;

  const accentText = tint(accentColor, -0.2); // the accent, darkened a little so text stays readable
  const soft = tint(accentColor, 0.9);        // very light tint behind the headings

  // Every entry is a FLAT list of elements: no <section>, no wrapper divs, so the paginator can break between them.
  // The shared renderers (projects, references, certificates) use this same class, so their headings match.
  const headingClass = 'text-[10.5px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 mb-2';
  const headingStyle = { color: accentText, backgroundColor: soft, borderLeft: `3px solid ${accentColor}` };
  const heading = (key, text) => (
    <h3 key={`${key}-h`} className={headingClass} style={headingStyle}>{text}</h3>
  );

  // Body text (bullets and paragraphs) a little smaller and tighter than the standard size.
  // The gap under each line is a class (not inline style), because padLast() swaps the last line's mb-* for the group spacing.
  const body = (text, keyPrefix) =>
    renderAchievements(text, keyPrefix).map((node) => React.cloneElement(node, {
      className: `${stripMb(node.props.className)} mb-0.5`,
      style: { fontSize: BODY_SIZE, lineHeight: BODY_LINE },
    }));

  // One job or education entry, on a single line: bold title, then the details, with the dates on the right.
  const entry = (kind, item, title, details, dates) => padLast([
    <div key={`${kind}-${item.id}-top`} className="flex justify-between items-baseline gap-3 mb-0.5">
      <p className="text-[11.5px] leading-snug min-w-0" style={{ color: INK }}>
        <span className="font-bold">{title}</span>
        {details && <span style={{ color: MUTED }}>{`  ·  ${details}`}</span>}
      </p>
      {dates && <p className="text-[10.5px] whitespace-nowrap" style={{ color: MUTED }}>{dates}</p>}
    </div>,
    ...body(item.achievements, `${kind}-${item.id}-ach`),
  ], 'mb-3');

  // Skills: plain text, no levels. Languages: the level in brackets.
  const skillItems = namedSkills.map((s) => s.text);
  const languageItems = (languages?.items || []).filter((l) => l.name).map((l) => {
    const { label } = languageLevelInfo(l);
    return label ? `${l.name} (${label})` : l.name;
  });
  const hasHobbies = Boolean(hobbies?.enabled && hobbies.text && String(hobbies.text).trim());
  const listLine = (key, items) => (
    <p key={key} style={{ color: INK, fontSize: BODY_SIZE, lineHeight: BODY_LINE }}>{items.join(', ')}</p>
  );

  const mainMap = {
    summary: summary ? group([
      heading('summary', 'Summary'),
      ...body(summary, 'summary'),
    ]) : [],
    experience: jobs.length > 0 ? group([
      heading('experience', 'Experience'),
      ...jobs.flatMap((job) => {
        const place = [job.location, job.remote ? 'Remote' : ''].filter(Boolean).join(', ');
        // Job title first when there is one; otherwise the employer takes the bold position.
        return job.title
          ? entry('job', job, job.title, [job.employer, place].filter(Boolean).join(', '), jobDates(job))
          : entry('job', job, job.employer, place, jobDates(job));
      }),
    ]) : [],
    education: educations.length > 0 ? group([
      heading('education', 'Education'),
      ...educations.flatMap((ed) => {
        const degree = [ed.degree, ed.field].filter(Boolean).join(', ');
        return degree
          ? entry('education', ed, degree, [ed.institution, ed.location].filter(Boolean).join(', '), ed.date)
          : entry('education', ed, ed.institution, ed.location, ed.date);
      }),
    ]) : [],
    skills: skillItems.length > 0 ? group([
      heading('skills', 'Skills'),
      listLine('skills-list', skillItems),
    ]) : [],
    languages: languageItems.length > 0 ? group([
      heading('languages', 'Languages'),
      listLine('languages-list', languageItems),
    ]) : [],
    hobbies: hasHobbies ? group([
      heading('hobbies', 'Hobbies & Interests'),
      ...body(hobbies.text, 'hobbies'),
    ]) : [],
  };

  // Projects, references and certificates come from the shared renderers, which draw their own heading.
  const extras = {
    ...renderExtraSections({ projects, references, headingClass, headingStyle }),
    ...renderCertificates({ certificates, headingClass, headingStyle }),
  };

  /* ------------------------------- Page header ------------------------------ */
  // Name on the left, profession on the right, the contact line underneath: one flat block at the top of page 1.
  const displayName = (fullName || 'Your Name').trim();
  const nameSize = displayName.length <= 22 ? 24 : 20;
  const professionParts = (personal.profession || '').split('|').map((p) => p.trim()).filter(Boolean);

  const headerBlocks = markSection(edit, 'personal', [
    <div key="page-header" className="pb-2 mb-4 border-b-2" style={{ borderColor: accentColor }}>
      <div className="flex justify-between items-baseline gap-4">
        <h1 className="break-words min-w-0" style={{ fontSize: nameSize, fontWeight: 700, lineHeight: 1.15, color: INK }}>
          {displayName}
        </h1>
        {professionParts.length > 0 && (
          <p className="text-[12px] text-right leading-snug" style={{ color: accentText, maxWidth: 300 }}>
            {professionParts.join(' | ')}
          </p>
        )}
      </div>
      {contactList.length > 0 && (
        <p className="mt-1.5 text-[10.5px] leading-snug break-words" style={{ color: MUTED }}>
          {contactList.join('  ·  ')}
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

export default BasicCompactTemplate;
