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
// Layout: a full-width dark banner on page 1 (photo, big name, profession, and a contact strip with icons),
// then a wide main column on the left and a narrow tinted rail on the right.
const INK = '#1E2733';        // headings, names, main text
const MUTED = '#5F6B78';      // secondary text
const PAPER = '#FFFFFF';      // page background
const SIDEBAR_W = 236;        // px  -> content width 190 (22px left / 24px right padding)
const SIDE_CONTENT_W = 190;
const MAIN_W = 494;           // px  -> 794 - 236 - 36 - 28
const TOP_H = 156;            // banner: photo + name zone, px
const CONTACT_COLS = 3;       // contact items per row in the banner strip
const CONTACT_ROW_H = 16;     // px
const CONTACT_GAP = 6;        // px between contact rows
const CONTACT_PAD = 12;       // px above and below the contact rows
const BOTTOM_LINE_H = 4;      // px, bright accent line closing the banner
const NAME_FONT = '"Plus Jakarta Sans", "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
// Sections that live in the right rail. Every other section goes in the main column on the left.
const SIDEBAR_KEYS = ['skills', 'languages', 'certificates', 'hobbies'];

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

/* --------------------------------- Icons ---------------------------------- */
const Svg = ({ size = 16, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
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
  if (value.includes('@') || /e-?mail/.test(label)) return MailIcon;
  if (/birth|\bdob\b|\bborn\b/.test(label) || /^born\b/.test(s)
    || /^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}$/.test(value)
    || /^\d{1,2}(st|nd|rd|th)?\s+[a-z]{3,9},?\s+\d{4}$/.test(value)) return CalendarIcon;
  if (/^(tel|telephone|phone|mobile|cell|whatsapp|fax)\b/.test(label) || /^[+()\d\s.-]{7,}$/.test(value)) return PhoneIcon;
  if (/national|citizen/.test(label)) return FlagIcon;
  if (/licen[cs]e/.test(s)) return CarIcon;
  if (/web|site|portfolio|url|link/.test(label) || /(https?:\/\/|www\.|\.(com|dev|io|net|org|me|site|co|app)\b)/.test(value)) return GlobeIcon;
  if (/address|location|city|based|residen/.test(label)
    || /\d+\s+.*\b(street|st|road|rd|avenue|ave|drive|dr|lane|ln|blvd|boulevard|close|crescent|way)\b/.test(value)
    || /\bp\.?o\.?\s*box\b/.test(value)
    || value.includes(',')) return PinIcon;
  return DotIcon;
};

const BannerRailTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, certificates, isEmpty, accentColor, sectionOrder, edit } = props;

  const lineColor = tint(accentColor, 0.6);       // hairlines
  const railBg = tint(accentColor, 0.93);         // soft tint of the accent behind the rail
  const pillBg = tint(accentColor, 0.88);         // date pills
  const barOff = tint(accentColor, 0.72);         // unfilled language bars
  const accentText = darken(accentColor, 0.2);    // accent used for text on white
  const bandBg = darken(accentColor, 0.62);       // banner background

  // The banner is drawn over the top of page 1, so page 1 of both columns starts with a spacer
  // that pushes the real content below it. The spacer is an ordinary flat block, so the
  // pagination maths (column height, block measuring) stays exactly as it was.
  const contactRows = Math.ceil(contactList.length / CONTACT_COLS);
  const stripH = contactRows > 0 ? contactRows * CONTACT_ROW_H + (contactRows - 1) * CONTACT_GAP + CONTACT_PAD * 2 : 0;
  const headerH = TOP_H + stripH + BOTTOM_LINE_H;
  const headerSpacerH = headerH - 32 + 24;
  const spacer = () => <div key="header-spacer" aria-hidden="true" style={{ height: headerSpacerH }} />;

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

  // Formatted (bold / italic / bullet) lines for the rail: same atoms, recoloured and slightly smaller.
  const sideRichText = (text, keyPrefix) =>
    renderAchievements(text, keyPrefix).map((node) => React.cloneElement(node, { style: { color: MUTED, fontSize: '10.5px' } }));

  /* ------------------------------ MAIN column ------------------------------ */
  // Every entry is a FLAT list of elements: no <section>, no wrapper divs.
  // The shared renderers (projects, references) use this same class and style, so their headings match.
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
  };

  // Skills, Languages, Certificates and Hobbies live in the rail (sideMap), so they are not passed in here.
  const extras = {
    ...renderExtraSections({ projects, references, headingClass, headingStyle }),
  };
  const mainOrder = sectionOrder.filter((key) => !SIDEBAR_KEYS.includes(key));
  const sideOrder = sectionOrder.filter((key) => SIDEBAR_KEYS.includes(key));
  const mainBlocks = [
    spacer(),
    ...mainOrder.flatMap((key) => markSection(edit, key, mainMap[key] || extras[key] || [])),
  ];

  /* ------------------------------ RIGHT rail ------------------------------- */
  const languageItems = (languages?.items || []).filter((l) => l.name);
  const hasLanguages = Boolean(languages?.enabled && languageItems.length > 0);
  const hasHobbies = Boolean(hobbies?.enabled && hobbies.text && String(hobbies.text).trim());

  const sideHeadClass = 'text-[11px] font-bold uppercase tracking-[0.18em] pb-1.5 mb-3 border-b';
  const sideHeadStyle = { color: accentText, borderColor: lineColor };
  // Certificates come from the shared renderer, which draws its own heading. It is rendered here with the
  // rail heading style so it matches the other rail sections.
  const rawCertificates = renderCertificates({ certificates, headingClass: sideHeadClass, headingStyle: sideHeadStyle })?.certificates || [];
  const hasCertificates = rawCertificates.length > 0;

  // The first rail section has no extra space above it; every later one does.
  const sideHas = { skills: namedSkills.length > 0, languages: hasLanguages, certificates: hasCertificates, hobbies: hasHobbies };
  const firstSideKey = sideOrder.find((k) => sideHas[k]);
  const sideHeadClassFor = (key) => `${sideHeadClass} ${key === firstSideKey ? '' : 'pt-5'}`;

  const sideHeading = (key, text) => (
    <h3 key={`${key}-h`} className={sideHeadClassFor(key)} style={sideHeadStyle}>{text}</h3>
  );

  // Give the heading the renderer drew (recognised by its class) the right spacing.
  const certificateBlocks = (() => {
    const [first, ...rest] = rawCertificates;
    if (!React.isValidElement(first) || first.props.className !== sideHeadClass) return rawCertificates;
    return [React.cloneElement(first, { className: sideHeadClassFor('certificates') }), ...rest];
  })();

  const sideMap = {
    skills: namedSkills.length > 0 ? endGroup([
      sideHeading('skills', 'Skills'),
      <div key="skills-chips" className="flex flex-wrap gap-1.5">
        {namedSkills.map((s) => {
          const rating = skillRating(s);
          return (
            <span
              key={`skill-${s.id}`}
              className="px-2 py-1 rounded text-[10.5px] leading-tight break-words border"
              style={{ borderColor: lineColor, backgroundColor: PAPER, color: INK }}
            >
              {s.text}
              {rating > 0 && <span style={{ color: MUTED }}>{' · '}{getSkillLevelLabel(rating)}</span>}
            </span>
          );
        })}
      </div>,
    ]) : [],
    languages: hasLanguages ? endGroup([
      sideHeading('languages', 'Languages'),
      ...languageItems.map((l) => {
        const { label, rating } = languageLevelInfo(l);
        return (
          <div key={`language-${l.id}`} className="mb-2.5">
            <div className="flex items-baseline justify-between gap-2 text-[11px]">
              <span className="font-semibold break-words flex-1">{l.name}</span>
              <span className="text-[10px] shrink-0" style={{ color: MUTED }}>{label}</span>
            </div>
            {rating > 0 && (
              <div className="mt-1" style={{ height: 3, borderRadius: 2, backgroundColor: barOff }}>
                <div style={{ width: `${Math.min(rating, 5) * 20}%`, height: '100%', borderRadius: 2, backgroundColor: accentColor }} />
              </div>
            )}
          </div>
        );
      }),
    ]) : [],
    certificates: certificateBlocks,
    hobbies: hasHobbies ? endGroup([
      sideHeading('hobbies', 'Hobbies & Interests'),
      ...sideRichText(hobbies.text, 'hobbies'),
    ]) : [],
  };

  const sideBlocks = [
    spacer(),
    ...sideOrder.flatMap((key) => markSection(edit, key, sideMap[key] || [])),
  ];

  /* ------------------------------- Page header ------------------------------ */
  // Photo, name and profession in the top zone; contact details in a strip underneath; a bright accent
  // line closes the banner.
  const nameParts = (fullName || 'Your Name').trim().split(/\s+/);
  const lastName = nameParts.length > 1 ? nameParts.pop() : '';
  const firstName = nameParts.join(' ');
  const longest = Math.max(firstName.length, lastName.length);
  const nameSize = longest <= 7 ? 42 : longest <= 9 ? 36 : longest <= 11 ? 31 : longest <= 13 ? 27 : 23;
  const professionParts = (personal.profession || '').split('|').map((p) => p.trim()).filter(Boolean);

  const headerBlocks = markSection(edit, 'personal', [
    <div key="page-header" className="relative flex flex-col w-full h-full">
      {/* decorative shapes (no text) */}
      <div aria-hidden="true" className="absolute rounded-full" style={{ width: 260, height: 260, right: -70, top: -110, backgroundColor: 'rgba(255,255,255,0.05)' }} />
      <div aria-hidden="true" className="absolute rounded-full" style={{ width: 150, height: 150, right: 90, top: -80, border: '1px solid rgba(255,255,255,0.12)' }} />

      <div className="relative flex items-center shrink-0" style={{ height: TOP_H, padding: '0 36px', gap: 22 }}>
        {personal.photo && (
          <div className="shrink-0" style={{ width: 108 }}>
            <ResumePhoto src={personal.photo} style={personal.photoStyle} borderColor={tint(accentColor, 0.6)} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="break-words" style={{ fontFamily: NAME_FONT, fontSize: nameSize, lineHeight: 1.04, letterSpacing: '-0.01em', color: '#FFFFFF' }}>
            <span className="block" style={{ fontWeight: 300 }}>{firstName}</span>
            {lastName && <span className="block" style={{ fontWeight: 800, color: tint(accentColor, 0.55) }}>{lastName}</span>}
          </h1>
          {professionParts.length > 0 && (
            <p className="mt-3 text-[10.5px] font-semibold uppercase tracking-[0.2em] leading-relaxed" style={{ color: tint(accentColor, 0.8) }}>
              {professionParts.map((part, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="mx-2" style={{ color: tint(accentColor, 0.5) }}>•</span>}
                  {part}
                </React.Fragment>
              ))}
            </p>
          )}
        </div>
      </div>

      {contactList.length > 0 && (
        <div
          className="relative shrink-0"
          style={{ height: stripH, padding: `${CONTACT_PAD}px 36px`, backgroundColor: 'rgba(255,255,255,0.08)', borderTop: '1px solid rgba(255,255,255,0.16)' }}
        >
          <div className="grid" style={{ gridTemplateColumns: `repeat(${CONTACT_COLS}, minmax(0, 1fr))`, columnGap: 16, rowGap: CONTACT_GAP }}>
            {contactList.map((c, i) => {
              const Icon = contactIcons[i];
              return (
                <div key={`contact-${i}`} className="flex items-center gap-1.5 text-[10px] leading-none min-w-0" style={{ height: CONTACT_ROW_H, color: '#FFFFFF' }}>
                  <span className="shrink-0" style={{ color: tint(accentColor, 0.55) }}><Icon size={13} /></span>
                  <span className="truncate" title={c}>{c}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="shrink-0 mt-auto" style={{ height: BOTTOM_LINE_H, backgroundColor: accentColor }} />
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
              style={{ width: SIDEBAR_W, padding: '32px 24px 32px 22px', backgroundColor: railBg }}
            >
              {side.pages[index]}
            </div>
          </div>
        </A4Page>
      ))}
    </>
  );
};

export default BannerRailTemplate;
