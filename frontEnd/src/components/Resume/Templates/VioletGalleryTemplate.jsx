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
// ATS-friendly version of the Slate style:
//  - ONE column, read top to bottom, so a parser never has to guess the order of two columns
//  - no photo, no icons, no rating dots/bars: everything that carries meaning is real text
//  - standard section names (Professional Summary, Work Experience, Education, Skills, ...)
//  - the look comes only from empty decorative shapes (top strip, heading marker + rule), which add no text
const INK = '#1E2530';        // headings, names, main text
const MUTED = '#667085';      // secondary text
const PAPER = '#FFFFFF';      // page background
const MAIN_W = 714;           // px  -> 794 - 40 - 40
const NAME_FONT = '"Plus Jakarta Sans", "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif';

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

const SlateATSTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, certificates, isEmpty, accentColor, sectionOrder, edit } = props;

  const lineColor = tint(accentColor, 0.6);       // hairlines
  const accentText = darken(accentColor, 0.2);    // accent used for text

  const marker = <span key="marker" className="shrink-0" style={{ width: 8, height: 8, backgroundColor: accentColor }} />;
  const rule = <span key="rule" className="flex-1" style={{ height: 1, backgroundColor: lineColor }} />;

  // Every entry is a FLAT list of elements: no <section>, no wrapper divs.
  const headingClass = 'flex items-center gap-3 text-[13.5px] font-semibold mb-3';
  const headingStyle = { color: INK };
  const heading = (key, text) => (
    <h3 key={`${key}-h`} className={headingClass} style={headingStyle}>
      {marker}
      <span>{text}</span>
      {rule}
    </h3>
  );
  // Sections built by the shared renderers draw their own heading; give it the marker and the rule.
  const withHeadingMarker = (blocks) => {
    const [first, ...rest] = blocks;
    if (!React.isValidElement(first) || first.props.className !== headingClass) return blocks;
    return [React.cloneElement(first, undefined, marker, <span key="text">{first.props.children}</span>, rule), ...rest];
  };

  // One entry (job or education): title + date on one line, accent meta line, then the bullets.
  const entry = (kind, item, title, date, meta) => padLast([
    <div key={`${kind}-${item.id}-title`} className={`flex justify-between items-baseline gap-3 ${meta ? 'mb-0.5' : 'mb-2'}`}>
      <p className="font-semibold text-[13px] leading-snug" style={{ color: INK }}>{title}</p>
      {date && <p className="text-[10.5px] whitespace-nowrap" style={{ color: MUTED }}>{date}</p>}
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

  // Projects, references and certificates come from the shared renderers.
  const extras = {
    ...renderExtraSections({ projects, references, headingClass, headingStyle }),
    ...renderCertificates({ certificates, headingClass, headingStyle }),
  };

  /* ------------------------------- Page header ------------------------------ */
  // Name, profession and contact line are plain text at the top of page 1, as one flat block.
  const nameParts = (fullName || 'Your Name').trim().split(/\s+/);
  const lastName = nameParts.length > 1 ? nameParts.pop() : '';
  const firstName = nameParts.join(' ');
  const nameLength = (fullName || 'Your Name').trim().length;
  const nameSize = nameLength <= 18 ? 40 : nameLength <= 26 ? 34 : 28;
  const professionParts = (personal.profession || '').split('|').map((p) => p.trim()).filter(Boolean);

  const headerBlocks = markSection(edit, 'personal', [
    <div key="page-header" className="pb-5 mb-6 border-b" style={{ borderColor: lineColor }}>
      <h1 className="break-words" style={{ fontFamily: NAME_FONT, fontSize: nameSize, lineHeight: 1.08, letterSpacing: '-0.015em', color: INK }}>
        <span style={{ fontWeight: lastName ? 300 : 700 }}>{firstName}</span>
        {lastName && <span style={{ fontWeight: 700 }}>{' '}{lastName}</span>}
      </h1>
      {professionParts.length > 0 && (
        <p className="mt-2 text-[12.5px] font-semibold leading-relaxed" style={{ color: accentText }}>
          {professionParts.join(' | ')}
        </p>
      )}
      {contactList.length > 0 && (
        <p className="mt-3 text-[11px] leading-relaxed break-words" style={{ color: MUTED }}>
          {contactList.join(' | ')}
        </p>
      )}
    </div>,
  ]);

  const mainBlocks = [
    ...headerBlocks,
    ...sectionOrder.flatMap((key) => markSection(
      edit,
      key,
      mainMap[key] || (extras[key] ? withHeadingMarker(extras[key]) : []),
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
            {/* accent strip across the top of every page (decorative, holds no text) */}
            <div className="absolute top-0 left-0 right-0 z-10" style={{ height: 6, backgroundColor: accentColor }} aria-hidden="true" />

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

export default SlateATSTemplate;
