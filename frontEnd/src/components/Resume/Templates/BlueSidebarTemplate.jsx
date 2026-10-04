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
const INK = '#1F2D3A';      // headings, names, main text
const MUTED = '#5B6672';    // secondary text
const PAPER = '#FCFAF6';    // page background
const HEADER_H = 216;       // full-width header band (page 1 only), px
const SIDEBAR_W = 250;      // px  -> content width 198 (28px left / 24px right padding)
const MAIN_W = 492;         // px  -> 794 - 250 - 24 - 28
const SIDE_CONTENT_W = 198;
// The header is drawn over the top of page 1, so page 1 of both columns starts with a spacer
// that pushes the real content below it. The spacer is an ordinary flat block, so the
// pagination maths (column height, block measuring) stays exactly as it was.
const HEADER_SPACER_H = HEADER_H - 32 + 24;
const SERIF = '"Cormorant Garamond", "Playfair Display", Georgia, "Times New Roman", serif';
// Sections that live in the left sidebar. Every other section goes in the main column on the right.
const SIDEBAR_KEYS = ['skills', 'languages', 'certificates', 'hobbies'];

/* --------------------------------- Icons ---------------------------------- */
const Svg = ({ size = 16, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const BriefcaseIcon = (p) => <Svg {...p}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></Svg>;
const CodeIcon = (p) => <Svg {...p}><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></Svg>;
const CapIcon = (p) => <Svg {...p}><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></Svg>;
const TargetIcon = (p) => <Svg {...p}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></Svg>;
const UserIcon = (p) => <Svg {...p}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></Svg>;
const AwardIcon = (p) => <Svg {...p}><circle cx="12" cy="8" r="6" /><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11" /></Svg>;
const GearIcon = (p) => (
  <Svg {...p}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);
const GlobeIcon = (p) => <Svg {...p}><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></Svg>;
const MailIcon = (p) => <Svg {...p}><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></Svg>;
const PhoneIcon = (p) => <Svg {...p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></Svg>;
const PinIcon = (p) => <Svg {...p}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></Svg>;
const LinkedinIcon = (p) => <Svg {...p}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect width="4" height="12" x="2" y="9" /><circle cx="4" cy="4" r="2" /></Svg>;
const DotIcon = (p) => <Svg {...p}><circle cx="12" cy="12" r="3" /></Svg>;
const GithubIcon = (p) => <Svg {...p}><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></Svg>;
const CalendarIcon = (p) => <Svg {...p}><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Svg>;
const FlagIcon = (p) => <Svg {...p}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><path d="M4 22v-7" /></Svg>;
const CarIcon = (p) => <Svg {...p}><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" /><circle cx="7" cy="17" r="2" /><path d="M9 17h6" /><circle cx="17" cy="17" r="2" /></Svg>;

const HeartIcon = (p) => <Svg {...p}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></Svg>;
// An email typed without its "@" (e.g. "name9gmail.com") still gets the mail icon.
const MAIL_HOST = /^(?!www\.)[^\s@/]+(gmail|googlemail|yahoo|outlook|hotmail|live|icloud|proton|protonmail)\.(com|me|co\.za|co\.uk)$/;

// The contact list is plain text, so the icon is picked from what the line looks like.
// Order matters: the specific kinds are checked first, and the pin is only used for lines that really
// look like an address. Anything unrecognised gets a neutral dot instead of a (wrong) location pin.
const contactIcon = (c) => {
  if (typeof c !== 'string') return DotIcon;
  const s = c.trim().toLowerCase();
  // Split off a leading "Label:" (but not the "https:" of a URL) so "Tel: +27 ..." is still recognised.
  const m = s.match(/^([a-z][a-z .\/&-]{1,28}):(?!\/\/)\s*/);
  const label = m ? m[1] : '';
  const value = m ? s.slice(m[0].length) : s;

  if (s.includes('linkedin')) return LinkedinIcon;
  if (s.includes('github')) return GithubIcon;
  if (value.includes('@') || /e-?mail/.test(label) || MAIL_HOST.test(value)) return MailIcon;
  if (/birth|\bdob\b|\bborn\b|\bage\b/.test(label) || /^born\b/.test(s)
    || /^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}$/.test(value)
    || /^\d{1,2}(st|nd|rd|th)?\s+[a-z]{3,9},?\s+\d{4}$/.test(value)) return CalendarIcon;
  if (/^(tel|telephone|phone|mobile|cell|whatsapp|fax)\b/.test(label) || /^[+()\d\s.-]{7,}$/.test(value)) return PhoneIcon;
  if (/national|citizen/.test(label)) return FlagIcon;
  if (/gender|\bsex\b/.test(label)) return UserIcon;
  if (/marital|civil status|relationship/.test(label)) return HeartIcon;
  if (/licen[cs]e/.test(s)) return CarIcon;
  if (/web|site|portfolio|url|link/.test(label) || /(https?:\/\/|www\.|\.(com|dev|io|net|org|me|site|co|app)\b)/.test(value)) return GlobeIcon;
  if (/address|location|city|based|residen/.test(label)
    || /\d+\s+.*\b(street|st|road|rd|avenue|ave|drive|dr|lane|ln|blvd|boulevard|close|crescent|way)\b/.test(value)
    || /\bp\.?o\.?\s*box\b/.test(value)
    || value.includes(',')) return PinIcon;
  return DotIcon;
};

const BlueSidebarTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, certificates, isEmpty, accentColor, sectionOrder, edit } = props;

  const lineColor = tint(accentColor, 0.5);      // hairlines
  const sidebarBg = tint(accentColor, 0.86);     // soft tint of the accent behind the sidebar
  const barOff = tint(accentColor, 0.7);         // unfilled rating segments
  const spacer = () => <div key="header-spacer" aria-hidden="true" style={{ height: HEADER_SPACER_H }} />;

  // Formatted (bold / italic / bullet) lines for the sidebar: same atoms, recoloured for the light background.
  const sideRichText = (text, keyPrefix) =>
    renderAchievements(text, keyPrefix).map((node) => React.cloneElement(node, { style: { color: MUTED, fontSize: '10.5px' } }));

  /* ------------------------------ MAIN column ------------------------------ */
  // Every entry is a FLAT list of elements: no <section>, no wrapper divs.
  const headingClass = 'flex items-center gap-3 text-[11.5px] font-bold uppercase tracking-[0.22em] mb-3 pb-1.5 border-b';
  const headingStyle = { color: INK, borderColor: lineColor };
  const headingIcon = (Icon) => (
    <span key="icon" className="shrink-0" style={{ color: accentColor }}><Icon size={18} /></span>
  );
  const heading = (key, text, Icon) => (
    
    <h3 key={`${key}-h`} className={headingClass} style={headingStyle}>
      {headingIcon(Icon)}
      <span>{text}</span>
    </h3>
    
  );
  // Sections built by renderExtraSections draw their own heading; add the icon to it when we can recognise it.
  const withHeadingIcon = (blocks, Icon) => {
    const [first, ...rest] = blocks;
    if (!React.isValidElement(first) || first.props.className !== headingClass) return blocks;
    return [React.cloneElement(first, undefined, headingIcon(Icon), <span key="text">{first.props.children}</span>), ...rest];
  };
  const extraIcons = { projects: CodeIcon, references: UserIcon };

  const mainMap = {
    summary: summary ? endGroup([
      heading('summary', 'Professional Summary', BriefcaseIcon),
      ...renderAchievements(summary, 'summary'),
    ]) : [],
    experience: jobs.length > 0 ? endGroup([
      heading('experience', 'Work Experience', BriefcaseIcon),
      ...jobs.flatMap((job) => {
        const place = [job.location, job.remote ? 'Remote' : ''].filter(Boolean).join(' · ');
        const hasMeta = Boolean(job.employer || place);
        return padLast([
          <div key={`job-${job.id}-title`} className={`flex justify-between items-baseline gap-3 ${hasMeta ? 'mb-0.5' : 'mb-2'}`}>
            <p className="font-bold text-[13px] leading-snug" style={{ color: INK }}>{job.title}</p>
            {jobDates(job) && <p className="text-[11px] whitespace-nowrap" style={{ color: INK }}>{jobDates(job)}</p>}
          </div>,
          hasMeta && (
            <div key={`job-${job.id}-meta`} className="flex justify-between items-baseline gap-3 mb-2">
              <p className="text-xs" style={{ color: MUTED }}>{job.employer}</p>
              {place && <p className="text-[11px] italic whitespace-nowrap" style={{ color: MUTED }}>{place}</p>}
            </div>
          ),
          ...renderAchievements(job.achievements, `job-${job.id}-ach`),
        ], 'mb-4');
      }),
    ]) : [],
    education: educations.length > 0 ? endGroup([
      heading('education', 'Education', CapIcon),
      ...educations.flatMap((ed) => {
        const degree = [ed.degree, ed.field].filter(Boolean).join(', ');
        const title = degree || ed.institution;
        const school = degree ? ed.institution : '';
        const hasMeta = Boolean(school || ed.location);
        return padLast([
          <div key={`education-${ed.id}-title`} className={`flex justify-between items-baseline gap-3 ${hasMeta ? 'mb-0.5' : 'mb-2'}`}>
            <p className="font-bold text-[13px] leading-snug" style={{ color: INK }}>{title}</p>
            {ed.date && <p className="text-[11px] whitespace-nowrap" style={{ color: INK }}>{ed.date}</p>}
          </div>,
          hasMeta && (
            <div key={`education-${ed.id}-meta`} className="flex justify-between items-baseline gap-3 mb-2">
              <p className="text-xs" style={{ color: MUTED }}>{school}</p>
              {ed.location && <p className="text-[11px] italic whitespace-nowrap" style={{ color: MUTED }}>{ed.location}</p>}
            </div>
          ),
          ...renderAchievements(ed.achievements, `education-${ed.id}-ach`),
        ], 'mb-4');
      }),
    ]) : [],
  };

  // Skills, Languages, Certificates and Hobbies live in the sidebar (sideMap), so they are not passed in here.
  const extras = {
    ...renderExtraSections({ projects, references, headingClass, headingStyle }),
  };
  const mainOrder = sectionOrder.filter((key) => !SIDEBAR_KEYS.includes(key));
  const sideOrder = sectionOrder.filter((key) => SIDEBAR_KEYS.includes(key));
  const mainBlocks = [
    spacer(),
    ...mainOrder.flatMap((key) => markSection(
      edit,
      key,
      mainMap[key] || (extras[key] ? withHeadingIcon(extras[key], extraIcons[key] || AwardIcon) : []),
    )),
  ];

  /* ----------------------------- SIDEBAR column ---------------------------- */
  const languageItems = (languages?.items || []).filter((l) => l.name);
  const hasLanguages = Boolean(languages?.enabled && languageItems.length > 0);
  const hasHobbies = Boolean(hobbies?.enabled && hobbies.text && String(hobbies.text).trim());
  const sideHeadClass = 'flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.2em] mb-3';
  const sideHeadStyle = { color: INK, borderColor: lineColor };
  // Certificates come from the shared renderer, which draws its own heading. It is rendered here with the
  // sidebar heading style so it matches the other sidebar sections.
  const rawCertificates = renderCertificates({ certificates, headingClass: sideHeadClass, headingStyle: sideHeadStyle })?.certificates || [];
  const hasCertificates = rawCertificates.length > 0;

  // The first sidebar section has no divider above it; every later one does.
  const sideHas = { skills: namedSkills.length > 0, languages: hasLanguages, certificates: hasCertificates, hobbies: hasHobbies };
  const firstSideKey = sideOrder.find((k) => sideHas[k]);
  const sideHeadClassFor = (key) => `${sideHeadClass} ${key === firstSideKey ? '' : 'pt-4 border-t'}`;

  const sideHeading = (key, text, Icon) => (
    <h3 key={`${key}-h`} className={sideHeadClassFor(key)} style={sideHeadStyle}>
      <span className="shrink-0" style={{ color: accentColor }}><Icon size={16} /></span>
      <span>{text}</span>
    </h3>
  );

  // Add the award icon and the right divider to the heading the renderer drew (recognised by its class).
  const certificateBlocks = (() => {
    const [first, ...rest] = rawCertificates;
    if (!React.isValidElement(first) || first.props.className !== sideHeadClass) return rawCertificates;
    return [
      React.cloneElement(
        first,
        { className: sideHeadClassFor('certificates') },
        <span key="icon" className="shrink-0" style={{ color: accentColor }}><AwardIcon size={16} /></span>,
        <span key="text">{first.props.children}</span>,
      ),
      ...rest,
    ];
  })();

  const ratingBars = (rating) => (
    <div className="flex gap-1 mt-1 pl-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="h-[3px] flex-1 rounded-full" style={{ backgroundColor: i <= rating ? accentColor : barOff }} />
      ))}
    </div>
  );

  // One layout for every rated item in the sidebar (skills and languages): dot, name, level word, then the bars.
  const levelItem = (key, name, label, rating) => (
    <div key={key} className="mb-1.5">
      <div className="flex items-start gap-2 text-[11px]">
        <span className="w-1 h-1 rounded-full shrink-0 mt-[6px]" style={{ backgroundColor: accentColor }} />
        <span className="break-words flex-1">{name}</span>
        {label && <span className="text-[10px] italic shrink-0" style={{ color: MUTED }}>{label}</span>}
      </div>
      {rating > 0 && ratingBars(rating)}
    </div>
  );

  const languageBlocks = hasLanguages ? endGroup([
    sideHeading('languages', 'Languages', GlobeIcon),
    ...languageItems.map((l) => {
      const { label, rating } = languageLevelInfo(l);
      return levelItem(`language-${l.id}`, l.name, label, rating);
    }),
  ]) : [];

  const sideMap = {
    skills: namedSkills.length > 0 ? endGroup([
      sideHeading('skills', 'Skills', GearIcon),
      ...namedSkills.map((s) => {
        const rating = skillRating(s);
        return levelItem(`skill-${s.id}`, s.text, rating > 0 ? getSkillLevelLabel(rating) : '', rating);
      }),
    ]) : [],
    languages: languageBlocks,
    certificates: certificateBlocks,
    hobbies: hasHobbies ? endGroup([
      sideHeading('hobbies', 'Hobbies & Interests', TargetIcon),
      ...sideRichText(hobbies.text, 'hobbies'),
    ]) : [],
  };

  const sideBlocks = [
    spacer(),
    ...sideOrder.flatMap((key) => markSection(edit, key, sideMap[key] || [])),
  ];

/* ------------------------------- Page header ------------------------------ */
  // Name, profession, and contact details live in a full-width band drawn on page 1.
  const nameParts = (fullName || 'Your Name').trim().split(/\s+/);
  const lastName = nameParts.length > 1 ? nameParts.pop() : '';
  const firstName = nameParts.join(' ');
  const longest = Math.max(firstName.length, lastName.length);
  const nameSize = longest <= 7 ? 42 : longest <= 9 ? 36 : longest <= 11 ? 30 : longest <= 13 ? 26 : 22;
  const professionParts = (personal.profession || '').split('|').map((p) => p.trim()).filter(Boolean);

  // Automatically switch to a 2-column grid when contact/meta list is long (> 5 items)
  const isMultiColumn = contactList.length > 5;

  // A resume has one location, so only the first address-like line gets the pin; any later one gets a dot.
  const contactIcons = (() => {
    let pinUsed = false;
    return contactList.map((c) => {
      const Icon = contactIcon(c);
      if (Icon !== PinIcon) return Icon;
      if (pinUsed) return DotIcon;
      pinUsed = true;
      return PinIcon;
    });
  })();

  const headerBlocks = markSection(edit, 'personal', [
    <div key="page-header" className="flex items-center w-full h-full" style={{ padding: '0 28px', gap: 20 }}>
      {personal.photo && (
        <div className="shrink-0" style={{ width: 140 }}>
          <ResumePhoto src={personal.photo} style={personal.photoStyle} borderColor={accentColor} />
        </div>
      )}

      <div className="flex-1 min-w-0 pr-2">
        <h1 className="font-medium uppercase break-words" style={{ fontFamily: SERIF, fontSize: nameSize, lineHeight: 1.02, letterSpacing: '0.02em' }}>
          <span className="block" style={{ color: INK }}>{firstName}</span>
          {lastName && <span className="block" style={{ color: accentColor }}>{lastName}</span>}
        </h1>
        {professionParts.length > 0 && (
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] leading-relaxed" style={{ color: INK }}>
            {professionParts.map((part, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="mx-2" style={{ color: accentColor }}>|</span>}
                {part}
              </React.Fragment>
            ))}
          </p>
        )}
      </div>

      {contactList.length > 0 && (
        <div
          className="shrink-0 self-stretch flex flex-col justify-center"
          style={{
            width: isMultiColumn ? 320 : 214,
            margin: '20px 0',
            paddingLeft: 18,
            borderLeft: `1px solid ${lineColor}`,
          }}
        >
          <div className={isMultiColumn ? "grid grid-cols-2 gap-x-3 gap-y-2" : "flex flex-col gap-2.5"}>
            {contactList.map((c, i) => {
              const Icon = contactIcons[i];
              return (
                <div key={`contact-${i}`} className="flex items-center gap-2 text-[10px] leading-tight" style={{ color: INK }}>
                  <span className="shrink-0" style={{ color: accentColor }}><Icon size={13} /></span>
                  <span className="min-w-0 break-words line-clamp-2" title={c}>{c}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>,
  ], false);

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
            {index === 0 && (
              <div
                className="absolute top-0 left-0 right-0 z-10 overflow-hidden"
                style={{ height: HEADER_H, background: 'linear-gradient(135deg, #FFFCF5 0%, #FAF7F0 100%)' }}
              >
                {headerBlocks}
              </div>
            )}

            <div
              ref={index === 0 ? side.firstBodyRef : undefined}
              className="shrink-0 h-full overflow-hidden"
              style={{ width: SIDEBAR_W, padding: '32px 24px 32px 28px', backgroundColor: sidebarBg }}
            >
              {side.pages[index]}
            </div>

            <div
              ref={index === 0 ? main.firstBodyRef : undefined}
              className="flex-1 min-w-0 h-full overflow-hidden"
              style={{ padding: '32px 28px 32px 24px' }}
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

export default BlueSidebarTemplate;