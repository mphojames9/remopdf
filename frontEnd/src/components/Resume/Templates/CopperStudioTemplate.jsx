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
import { formatRange, withFormattedDates } from '../Sections/dateFormat';

/* ------------------------------ Design tokens ------------------------------ */
// ATS-friendly "bar" layout:
//  - ONE column, read top to bottom, left-aligned
//  - no photo, no icons, no rating dots/bars: everything that carries meaning is real text
//  - standard section names, each on a soft shaded bar with an accent edge
//  - one line per entry: "Role | Organisation | Place" with the dates on the right
//  - the accent strip down the left edge is a decorative shape and holds no text
const INK = '#1C2733';        // headings, names, main text
const MUTED = '#5F6B78';      // secondary text
const PAPER = '#FFFFFF';      // page background
const STRIP_W = 10;           // px, decorative accent strip on the left edge of every page
const MAIN_W = 708;           // px  -> 794 - 46 - 40
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

const BarATSTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, certificates, isEmpty, accentColor, sectionOrder, edit } = props;

  const accentText = darken(accentColor, 0.2);    // accent used for text

  // Every entry is a FLAT list of elements: no <section>, no wrapper divs.
  // The shared renderers (projects, references, certificates) use this same class and style, so their headings match.
  const headingClass = 'flex items-center px-2.5 py-1 mb-3 text-[11.5px] font-bold uppercase tracking-[0.12em]';
  const headingStyle = { color: INK, backgroundColor: tint(accentColor, 0.88), borderLeft: `3px solid ${accentColor}` };
  const heading = (key, text) => (
    <h3 key={`${key}-h`} className={headingClass} style={headingStyle}>{text}</h3>
  );

  // One entry (job or education): "Title | Organisation | Place" on a single line with the dates on the
  // right, then the bullets.
  const entry = (kind, item, title, org, date) => {
    const primary = title || org;
    const secondary = title ? org : '';
    return padLast([
      <div key={`${kind}-${item.id}-title`} className="flex justify-between items-baseline gap-3 mb-2">
        <p className="min-w-0 text-[12.5px] leading-snug" style={{ color: MUTED }}>
          <span className="font-bold" style={{ color: INK }}>{primary}</span>
          {secondary && <span>{' | '}{secondary}</span>}
        </p>
        {date && <p className="text-[11px] font-semibold whitespace-nowrap" style={{ color: INK }}>{date}</p>}
      </div>,
      ...renderAchievements(item.achievements, `${kind}-${item.id}-ach`),
    ], 'mb-4');
  };

  // Skills and languages are plain bullet-separated text, with the level written out in brackets.
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
    <p key={key} className="text-[11.5px] leading-relaxed" style={{ color: INK }}>{items.join(' • ')}</p>
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
        return entry('job', job, job.title, [job.employer, place].filter(Boolean).join(' | '), formatRange(jobDates(job)));
      }),
    ]) : [],
    education: educations.length > 0 ? endGroup([
      heading('education', 'Education'),
      ...educations.flatMap((ed) => {
        const degree = [ed.degree, ed.field].filter(Boolean).join(', ');
        const org = degree ? [ed.institution, ed.location].filter(Boolean).join(' | ') : ed.location;
        return entry('education', ed, degree || ed.institution, org, formatRange(ed.date));
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
    ...renderExtraSections({ projects: withFormattedDates(projects), references, headingClass, headingStyle }),
    ...renderCertificates({ certificates, headingClass, headingStyle }),
  };

  /* ------------------------------- Page header ------------------------------ */
  // Name, profession and contact line are plain, left-aligned text at the top of page 1, as one flat block.
  const displayName = (fullName || 'Your Name').trim();
  const nameSize = displayName.length <= 18 ? 36 : displayName.length <= 26 ? 31 : 26;
  const professionParts = (personal.profession || '').split('|').map((p) => p.trim()).filter(Boolean);
  const contacts = (contactList || []).filter((c) => typeof c === 'string' && c.trim());

  const headerBlocks = markSection(edit, 'personal', [
    <div key="page-header" className="mb-6">
      <h1 className="break-words" style={{ fontFamily: NAME_FONT, fontSize: nameSize, fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.02em', color: INK }}>
        {displayName}
      </h1>
      {professionParts.length > 0 && (
        <p className="mt-1.5 text-[13px] font-semibold leading-relaxed" style={{ color: accentText }}>
          {professionParts.join(' • ')}
        </p>
      )}
      {contacts.length > 0 && (
        // One horizontal row that wraps to the next line when it runs out of width. Each detail starts with a real
        // text bullet, so the row reads the same to an ATS as it does on screen.
        <p className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-[11px] leading-snug" style={{ color: MUTED }}>
          {contacts.map((c, i) => (
            <span key={i} className="break-words">
              <span aria-hidden="true" style={{ color: accentColor }}>•</span>{' '}{c}
            </span>
          ))}
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
            {/* accent strip down the left edge of every page (decorative, holds no text) */}
            <div className="absolute top-0 bottom-0 left-0 z-10" style={{ width: STRIP_W, backgroundColor: accentColor }} aria-hidden="true" />

            <div
              ref={index === 0 ? main.firstBodyRef : undefined}
              className="w-full h-full overflow-hidden"
              style={{ padding: '32px 40px 32px 46px' }}
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

export default BarATSTemplate;
