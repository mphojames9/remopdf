import React from 'react';
import { renderAchievements } from '../Sections/richText';
import ResumePhoto from '../Sections/ResumePhoto';
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
// Layout: wide main column on the LEFT (name header sits inline at the top of page 1),
// narrow tinted rail on the RIGHT. A thin accent strip runs across the top of every page.
const INK = '#1E2530';        // headings, names, main text
const MUTED = '#667085';      // secondary text
const PAPER = '#FFFFFF';      // page background
const SIDEBAR_W = 244;        // px  -> content width 198 (22px left / 24px right padding)
const SIDE_CONTENT_W = 198;
const MAIN_W = 486;           // px  -> 794 - 244 - 36 - 28
const NAME_FONT = '"Plus Jakarta Sans", "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
// Sections that live in the right rail. Every other section goes in the main column on the left.
const SIDEBAR_KEYS = ['skills', 'languages', 'certificates', 'hobbies'];

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

const SlateRailTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, certificates, isEmpty, accentColor, sectionOrder, edit } = props;

  const lineColor = tint(accentColor, 0.6);       // hairlines
  const sidebarBg = tint(accentColor, 0.92);      // soft tint of the accent behind the rail
  const dotOff = tint(accentColor, 0.7);          // unfilled rating dots
  const accentText = darken(accentColor, 0.2);    // accent used for text

  // Formatted (bold / italic / bullet) lines for the rail: same atoms, recoloured and slightly smaller.
  const sideRichText = (text, keyPrefix) =>
    renderAchievements(text, keyPrefix).map((node) => React.cloneElement(node, { style: { color: MUTED, fontSize: '10.5px' } }));

  const marker = <span key="marker" className="shrink-0" style={{ width: 8, height: 8, backgroundColor: accentColor }} />;
  const rule = <span key="rule" className="flex-1" style={{ height: 1, backgroundColor: lineColor }} />;

  /* ------------------------------ MAIN column ------------------------------ */
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
  // Sections built by renderExtraSections draw their own heading; give it the marker and the rule.
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

  const mainMap = {
    summary: summary ? endGroup([
      heading('summary', 'Profile'),
      ...renderAchievements(summary, 'summary'),
    ]) : [],
    experience: jobs.length > 0 ? endGroup([
      heading('experience', 'Work experience'),
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
  };

  // Skills, Languages, Certificates and Hobbies live in the rail (sideMap), so they are not passed in here.
  const extras = {
    ...renderExtraSections({ projects, references, headingClass, headingStyle }),
  };
  const mainOrder = sectionOrder.filter((key) => !SIDEBAR_KEYS.includes(key));
  const sideOrder = sectionOrder.filter((key) => SIDEBAR_KEYS.includes(key));

  /* ------------------------------- Page header ------------------------------ */
  // Name, profession, contact line and photo sit inline at the top of page 1 as one flat block.
  const nameParts = (fullName || 'Your Name').trim().split(/\s+/);
  const lastName = nameParts.length > 1 ? nameParts.pop() : '';
  const firstName = nameParts.join(' ');
  const nameLength = (fullName || 'Your Name').trim().length;
  const nameSize = nameLength <= 14 ? 38 : nameLength <= 18 ? 33 : nameLength <= 24 ? 28 : 24;
  const professionParts = (personal.profession || '').split('|').map((p) => p.trim()).filter(Boolean);

  const headerBlocks = markSection(edit, 'personal', [
    <div key="page-header" className="flex items-start justify-between gap-5 pb-5 mb-6 border-b" style={{ borderColor: lineColor }}>
      <div className="min-w-0 flex-1">
        <h1 className="break-words" style={{ fontFamily: NAME_FONT, fontSize: nameSize, lineHeight: 1.08, letterSpacing: '-0.015em', color: INK }}>
          <span style={{ fontWeight: lastName ? 300 : 700 }}>{firstName}</span>
          {lastName && <span style={{ fontWeight: 700 }}>{' '}{lastName}</span>}
        </h1>
        {professionParts.length > 0 && (
          <p className="mt-2 text-[12px] font-semibold leading-relaxed" style={{ color: accentText }}>
            {professionParts.map((part, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="mx-2" style={{ color: MUTED }}>/</span>}
                {part}
              </React.Fragment>
            ))}
          </p>
        )}
        {contactList.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {contactList.map((c, i) => (
              <div key={`contact-${i}`} className="flex items-center gap-1.5 text-[10.5px] leading-snug" style={{ color: MUTED }}>
                <span className="shrink-0" style={{ width: 4, height: 4, backgroundColor: accentColor }} />
                <span className="break-words">{c}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {personal.photo && (
        <div className="shrink-0" style={{ width: 92 }}>
          <ResumePhoto src={personal.photo} style={personal.photoStyle} borderColor={accentColor} />
        </div>
      )}
    </div>,
  ]);

  const mainBlocks = [
    ...headerBlocks,
    ...mainOrder.flatMap((key) => markSection(
      edit,
      key,
      mainMap[key] || (extras[key] ? withHeadingMarker(extras[key]) : []),
    )),
  ];

  /* ------------------------------ RIGHT rail ------------------------------- */
  const languageItems = (languages?.items || []).filter((l) => l.name);
  const hasLanguages = Boolean(languages?.enabled && languageItems.length > 0);
  const hasHobbies = Boolean(hobbies?.enabled && hobbies.text && String(hobbies.text).trim());

  const sideHeadClass = 'flex items-center gap-2 text-[12.5px] font-semibold mb-2.5';
  const sideHeadStyle = { color: INK };
  // Certificates come from the shared renderer, which draws its own heading. It is rendered here with the
  // rail heading style so it matches the other rail sections.
  const rawCertificates = renderCertificates({ certificates, headingClass: sideHeadClass, headingStyle: sideHeadStyle })?.certificates || [];
  const hasCertificates = rawCertificates.length > 0;

  // The first rail section has no extra space above it; every later one does.
  const sideHas = { skills: namedSkills.length > 0, languages: hasLanguages, certificates: hasCertificates, hobbies: hasHobbies };
  const firstSideKey = sideOrder.find((k) => sideHas[k]);
  const sideHeadClassFor = (key) => `${sideHeadClass} ${key === firstSideKey ? '' : 'pt-5'}`;

  const sideHeading = (key, text) => (
    <h3 key={`${key}-h`} className={sideHeadClassFor(key)} style={sideHeadStyle}>
      {marker}
      <span>{text}</span>
    </h3>
  );

  // Give the heading the renderer drew (recognised by its class) the marker and the right spacing.
  const certificateBlocks = (() => {
    const [first, ...rest] = rawCertificates;
    if (!React.isValidElement(first) || first.props.className !== sideHeadClass) return rawCertificates;
    return [
      React.cloneElement(first, { className: sideHeadClassFor('certificates') }, marker, <span key="text">{first.props.children}</span>),
      ...rest,
    ];
  })();

  const ratingDots = (rating) => (
    <div className="flex gap-1 shrink-0">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="rounded-full" style={{ width: 5, height: 5, backgroundColor: i <= rating ? accentColor : dotOff }} />
      ))}
    </div>
  );

  const sideMap = {
    skills: namedSkills.length > 0 ? endGroup([
      sideHeading('skills', 'Skills'),
      ...namedSkills.map((s) => {
        const rating = skillRating(s);
        return (
          <div key={`skill-${s.id}`} className="flex items-center justify-between gap-2 text-[11px] mb-1.5">
            <span className="break-words min-w-0 flex-1">{s.text}</span>
            {rating > 0 && <span title={getSkillLevelLabel(rating)} className="flex">{ratingDots(rating)}</span>}
          </div>
        );
      }),
    ]) : [],
    languages: hasLanguages ? endGroup([
      sideHeading('languages', 'Languages'),
      ...languageItems.map((l) => {
        const { label, rating } = languageLevelInfo(l);
        return (
          <div key={`language-${l.id}`} className="mb-2">
            <div className="flex items-baseline justify-between gap-2 text-[11px]">
              <span className="font-semibold break-words flex-1">{l.name}</span>
              <span className="text-[10px] shrink-0" style={{ color: MUTED }}>{label}</span>
            </div>
            {rating > 0 && <div className="mt-1">{ratingDots(rating)}</div>}
          </div>
        );
      }),
    ]) : [],
    certificates: certificateBlocks,
    hobbies: hasHobbies ? endGroup([
      sideHeading('hobbies', 'Hobbies & interests'),
      ...sideRichText(hobbies.text, 'hobbies'),
    ]) : [],
  };

  const sideBlocks = sideOrder.flatMap((key) => markSection(edit, key, sideMap[key] || []));

  /* ------------------------------ Pagination ------------------------------- */
  // Each column is measured and split on its own; the page count is the larger of the two.
  const main = usePaginatedBlocks(mainBlocks, 1020);
  const side = usePaginatedBlocks(sideBlocks, 1020);
  const pageCount = Math.max(main.pages.length, side.pages.length);

  return (
    <>
      <div ref={main.measureContainerRef} className="absolute top-[-9999px] left-[-9999px] pointer-events-none" style={{ width: MAIN_W }}>
        {main.measureContent}
      </div>
      <div ref={side.measureContainerRef} className="absolute top-[-9999px] left-[-9999px] pointer-events-none" style={{ width: SIDE_CONTENT_W }}>
        {side.measureContent}
      </div>

      {Array.from({ length: pageCount }, (_, index) => (
        <A4Page key={index} pageNum={index + 1} totalPages={pageCount}>
          <div className="relative flex w-full h-full text-left" style={{ color: INK, backgroundColor: PAPER }}>
            {/* accent strip across the top of every page */}
            <div className="absolute top-0 left-0 right-0 z-10" style={{ height: 6, backgroundColor: accentColor }} aria-hidden="true" />

            <div
              ref={index === 0 ? main.firstBodyRef : undefined}
              className="flex-1 min-w-0 h-full overflow-hidden"
              style={{ padding: '32px 28px 32px 36px' }}
            >
              {main.pages[index]}
              {isEmpty && index === 0 && (
                <p className="text-xs text-slate-400 italic mt-10">Nothing entered yet — fill in a few steps to see them appear here.</p>
              )}
            </div>

            <div
              ref={index === 0 ? side.firstBodyRef : undefined}
              className="shrink-0 h-full overflow-hidden"
              style={{ width: SIDEBAR_W, padding: '32px 24px 32px 22px', backgroundColor: sidebarBg }}
            >
              {side.pages[index]}
            </div>
          </div>
        </A4Page>
      ))}
    </>
  );
};

export default SlateRailTemplate;
