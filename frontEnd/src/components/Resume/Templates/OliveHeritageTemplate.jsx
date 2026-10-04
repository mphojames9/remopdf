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
//    name, then profession, then ONE contact line
//  - ONE column below the banner, read top to bottom
//  - no photo, no icons, no rating bars or chips: skills and languages are plain comma-separated text
//  - standard section names
//  - circles, strips and lines are decorative shapes and hold no text
const INK = '#1E2733';        // headings, names, main text
const PAPER = '#FFFFFF';      // page background
const MAIN_W = 714;           // px  -> 794 - 40 - 40
const TOP_H = 118;            // banner: name zone, px
const CONTACT_LINE_H = 15;    // px, line height of the contact line
const CONTACT_PAD = 12;       // px above and below the contact line
const CONTACT_CHARS_PER_LINE = 115; // conservative estimate, so the strip is never too short
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

const BannerATSTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, certificates, isEmpty, accentColor, sectionOrder, edit } = props;

  const lineColor = tint(accentColor, 0.6);       // hairlines
  const pillBg = tint(accentColor, 0.88);         // date pills
  const accentText = darken(accentColor, 0.2);    // accent used for text on white
  const bandBg = darken(accentColor, 0.62);       // banner background

  // The banner is drawn over the top of page 1, so the column starts with a spacer that pushes the real
  // content below it. The spacer is an ordinary flat block, so the pagination maths (column height, block
  // measuring) stays exactly as it was.
  const contactText = contactList.join(' | ');
  const contactLines = contactText ? Math.max(1, Math.ceil(contactText.length / CONTACT_CHARS_PER_LINE)) : 0;
  const stripH = contactLines > 0 ? contactLines * CONTACT_LINE_H + CONTACT_PAD * 2 : 0;
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
  // Name and profession in the top zone, contact details as one plain line underneath, a bright accent
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

      {contactText && (
        <div
          className="relative shrink-0"
          style={{ height: stripH, padding: `${CONTACT_PAD}px 40px`, backgroundColor: 'rgba(255,255,255,0.08)', borderTop: '1px solid rgba(255,255,255,0.16)' }}
        >
          <p className="break-words" style={{ fontSize: 10.5, lineHeight: `${CONTACT_LINE_H}px`, color: '#FFFFFF' }}>{contactText}</p>
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
