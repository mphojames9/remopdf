import React from 'react';
import { renderAchievements } from '../Sections/richText';
import renderCertificates from '../Sections/renderCertificates';
import {
  PAGE_WIDTH_PX,
  PAGE_HEIGHT_PX,
  tint,
  jobDates,
  skillRating,
  DEFAULT_ACCENT,
  usePaginatedBlocks,
  A4Page,
  endGroup,
  editAttrs,
  markSection,
  renderExtraSections,
} from './templateShared';

/**
 * Atlas Sidebar (id: atlas-sidebar). The Atlas look with a right-hand sidebar.
 *
 *   header   (100% width) name and profession on top; contact details underneath in an
 *            aligned grid (email, phone, location, then links), each with an icon badge
 *   main     (left)  Summary, Work Experience on a timeline rail, Projects, Hobbies, References
 *   sidebar  (right) Skills and Languages with level dots, Education, Certificates, on a tinted panel
 *
 * Every section heading carries an icon badge and a hairline rule. Dates and locations in
 * entries get small icons too.
 *
 * Reading order stays sensible for parsers: contact details first, then the main column,
 * then the sidebar. Everything is real text. All icons are inline SVG marked aria-hidden
 * (no icon font, no extra characters), so extracted text is unchanged; the thin left rail
 * and the icons are the only decoration.
 *
 * Both columns are paginated on their own with usePaginatedBlocks and the page count is
 * whichever needs more, so the sidebar panel runs the full height of every later page.
 * Gaps are padding (never margin), display fonts are inline on the atoms, and all body
 * margins are inline px, so the hidden measuring boxes match the real columns.
 *
 * Type: Outfit for display, Inter for body (both must be loaded by the app). Small
 * coloured text uses a darkened accent; the pure accent is used for shapes only.
 *
 * To register: add 'atlas-sidebar' to DEFAULT_ACCENT (suggested #F26A21) and to your
 * template list. A missing key falls back to the 'atlas' accent, then FALLBACK_ACCENT.
 * Use a #rrggbb accent.
 */

const SKILL_STYLE = 'dots'; // how skills are shown: 'dots' (name with level dots) | 'chips' | 'text'

// Language levels in the app are Basic, Conversational and Fluent, so those levels have three dots.
const LANGUAGE_LEVELS = {
  basic: 1, beginner: 1, elementary: 1,
  conversational: 2, intermediate: 2,
  fluent: 3, advanced: 3, proficient: 3, native: 3,
};

const BODY_FONT = `'Inter', 'Segoe UI', system-ui, -apple-system, Arial, sans-serif`;
const DISPLAY_FONT = `'Outfit', 'Inter', 'Segoe UI', system-ui, -apple-system, Arial, sans-serif`;
const FALLBACK_ACCENT = '#F26A21';
const INK = '#0E1116';
const TEXT = '#3B4350';

// Which sections live in the sidebar. Everything else goes in the main column, in sectionOrder order.
const SIDEBAR_KEYS = new Set(['skills', 'education', 'certificates', 'languages']);

// Geometry (px).
const RAIL_W = 8; // accent strip on the left edge
const SIDEBAR_W = 236;
const SIDE_PAD_X = 22;
const MAIN_PAD_L = 60;
const MAIN_PAD_R = 28;
const TOP = 44; // top padding of the header
const MARGIN_TOP_FIRST = 28; // both column bodies on page 1, under the header
const MARGIN_TOP_NEXT = 44; // both column bodies on pages 2+
const MARGIN_BOTTOM = 40;

const SIDE_CONTENT_W = SIDEBAR_W - SIDE_PAD_X * 2; // the hidden sidebar measuring box must match
const MAIN_CONTENT_W = PAGE_WIDTH_PX - MAIN_PAD_L - MAIN_PAD_R - SIDEBAR_W; // the hidden main measuring box must match
const NEXT_PAGE_MAX_HEIGHT = PAGE_HEIGHT_PX - MARGIN_TOP_NEXT - MARGIN_BOTTOM; // pages 2+, both columns

// Darken a #rrggbb colour toward black (used for small accent-coloured text).
const shade = (hex, amount) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  const n = m ? parseInt(m[1], 16) : 0x1f3a5f;
  const f = 1 - amount;
  return `rgb(${Math.round(((n >> 16) & 255) * f)}, ${Math.round(((n >> 8) & 255) * f)}, ${Math.round((n & 255) * f)})`;
};

// Turn a rating into 0-5 filled dots. Accepts 0-5 or a 0-100 percentage; null when there is no usable level.
const levelSteps = (value) => {
  const n = Number(value);
  if (value === null || value === undefined || value === '' || !Number.isFinite(n)) return null;
  return Math.max(0, Math.min(5, n > 5 ? Math.round(n / 20) : Math.round(n)));
};

// Read a language entry tolerantly: a plain string, or an object whose name and level can sit under any
// reasonable key (name / language / text / label / title, and level / proficiency / rating).
const isLevelWord = (v) => typeof v === 'string' && Object.prototype.hasOwnProperty.call(LANGUAGE_LEVELS, v.trim().toLowerCase());
const hasText = (v) => v !== null && v !== undefined && String(v).trim() !== '';
const readLanguage = (l) => {
  if (typeof l === 'string') return { name: l.trim(), level: undefined };
  if (!l || typeof l !== 'object') return { name: '', level: undefined };
  const entries = Object.entries(l).filter(([k]) => !/^(id|key|uid|_id)$/i.test(k));
  const levelEntry = entries.find(([k, v]) => /level|proficien|rating/i.test(k) && hasText(v)) || entries.find(([, v]) => isLevelWord(v));
  const level = levelEntry ? levelEntry[1] : undefined;
  const nameEntry =
    entries.find(([k, v]) => typeof v === 'string' && hasText(v) && v !== level && /name|lang|text|label|title|value/i.test(k)) ||
    entries.find(([, v]) => typeof v === 'string' && hasText(v) && v !== level && !isLevelWord(v) && !/^\d+$/.test(v.trim()));
  return { name: nameEntry ? String(nameEntry[1]).trim() : '', level };
};

// Dots, filled up to the level. Shapes only; the name next to them is the text.
const LevelDots = ({ steps, total, color, offColor }) => (
  <span className="flex shrink-0 gap-[5px]" aria-hidden="true">
    {Array.from({ length: total }, (_, i) => (
      <span key={i} className="h-[7px] w-[7px] rounded-full" style={{ background: i < steps ? color : offColor }} />
    ))}
  </span>
);

// Icons: exact path data from Lucide (line icons, 24px grid) and Font Awesome Free (the filled LinkedIn and
// GitHub brand marks). Inline SVG, decorative only, so every svg is aria-hidden. `solid` icons are filled
// instead of stroked and carry their own viewBox.
const ICONS = {
  mail: { body: (<><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></>) },
  phone: { body: (<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />) },
  pin: { body: (<><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" /></>) },
  globe: { body: (<><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></>) },
  linkedin: { solid: true, viewBox: '0 0 448 512', body: (<path d="M100.28 448H7.4V148.9h92.88zM53.79 108.1C24.09 108.1 0 83.5 0 53.8a53.79 53.79 0 0 1 107.58 0c0 29.7-24.1 54.3-53.79 54.3zM447.9 448h-92.68V302.4c0-34.7-.7-79.2-48.29-79.2-48.29 0-55.69 37.7-55.69 76.7V448h-92.78V148.9h89.08v40.8h1.3c12.4-23.5 42.69-48.3 87.88-48.3 94 0 111.28 61.9 111.28 142.3V448z" />) },
  github: { solid: true, viewBox: '0 0 496 512', body: (<path d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3.3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3zm44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9.3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3.7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3.3 2.9 2.3 3.9 1.6 1 3.6.7 4.3-.7.7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3.7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3.7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z" />) },
  user: { body: (<><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>) },
  briefcase: { body: (<><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /><rect width="20" height="14" x="2" y="6" rx="2" /></>) },
  cap: { body: (<><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" /><path d="M22 10v6" /><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" /></>) },
  layers: { body: (<><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" /><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" /><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" /></>) },
  award: { body: (<><path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526" /><circle cx="12" cy="8" r="6" /></>) },
  languages: { body: (<><path d="m5 8 6 6" /><path d="m4 14 6-6 2-3" /><path d="M2 5h12" /><path d="M7 2h1" /><path d="m22 22-5-10-5 10" /><path d="M14 18h6" /></>) },
  folder: { body: (<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />) },
  heart: { body: (<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />) },
  users: { body: (<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>) },
  calendar: { body: (<><path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /></>) },
  flag: { body: (<><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" x2="4" y1="22" y2="15" /></>) },
  person: { body: (<><circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 0 0-16 0" /></>) },
  car: { body: (<><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" /><circle cx="7" cy="17" r="2" /><path d="M9 17h6" /><circle cx="17" cy="17" r="2" /></>) },
  idcard: { body: (<><path d="M16 10h2" /><path d="M16 14h2" /><path d="M6.17 15a3 3 0 0 1 5.66 0" /><circle cx="9" cy="11" r="2" /><rect x="2" y="5" width="20" height="14" rx="2" /></>) },
  clock: { body: (<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>) },
  info: { body: (<><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>) },
};

const Icon = ({ name, size = 12, className, style, strokeWidth = 2 }) => {
  const def = ICONS[name];
  if (!def) return null;
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox={def.viewBox || '0 0 24 24'}
      fill={def.solid ? 'currentColor' : 'none'}
      stroke={def.solid ? 'none' : 'currentColor'}
      strokeWidth={def.solid ? undefined : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {def.body}
    </svg>
  );
};

// A round tinted badge holding one icon. Used for contact details and section headings.
const IconBadge = ({ name, size, bg, color }) => (
  <span
    aria-hidden="true"
    className="flex shrink-0 items-center justify-center rounded-full"
    style={{ width: size, height: size, background: bg, color }}
  >
    <Icon name={name} size={Math.round(size * 0.52)} />
  </span>
);

// Heading: icon badge, title, then a hairline rule that fills the rest of the line.
// The rule is a CSS pseudo-element, so the heading text stays plain text.
const HEADING_BASE =
  `flex items-center font-semibold tracking-tight after:h-px after:flex-1 after:bg-[var(--rule)] after:content-['']`;
const MAIN_HEADING = `${HEADING_BASE} mb-3.5 gap-2.5 text-[17px]`;
const SIDE_HEADING = `${HEADING_BASE} mb-3 gap-2 text-[15px]`;
const MAIN_BADGE = 26;
const SIDE_BADGE = 22;

// Pick the icon for a heading from its title, so headings drawn by the shared helpers get one too.
const iconForTitle = (title) => {
  const t = String(title || '').toLowerCase();
  if (/summary|profile|about|objective/.test(t)) return 'user';
  if (/experience|employment|work history/.test(t)) return 'briefcase';
  if (/educat|academic/.test(t)) return 'cap';
  if (/skill|tool|technolog/.test(t)) return 'layers';
  if (/language/.test(t)) return 'languages';
  if (/certif|licen|award|achievement/.test(t)) return 'award';
  if (/project|portfolio/.test(t)) return 'folder';
  if (/hobb|interest|volunteer/.test(t)) return 'heart';
  if (/refer/.test(t)) return 'users';
  return null;
};

// Contact and personal details: work out what each one is, so it gets the right icon and a stable place in the grid.
// A "Label: value" line is read by its label first ("Born: ...", "Gender: ..."); anything else is read by its value.
const CONTACT_ICON = {
  email: 'mail', phone: 'phone', location: 'pin', website: 'globe', linkedin: 'linkedin', github: 'github',
  birthday: 'calendar', nationality: 'flag', gender: 'person', marital: 'heart', licence: 'car',
  idcard: 'idcard', availability: 'clock', other: 'info',
};
// Contact kinds keep a fixed order; personal details (and anything else) keep the order they were entered in,
// between the location and the links.
const CONTACT_RANK = { email: 0, phone: 1, location: 2, website: 3, linkedin: 4, github: 5 };
const contactRank = (kind) => (kind in CONTACT_RANK ? CONTACT_RANK[kind] : 2.5);

const CONTACT_LABELS = [
  [/^e-?mail\b/, 'email'],
  [/^(phone|tel|telephone|mobile|cell|cellphone|whatsapp)\b/, 'phone'],
  [/^(address|location|city|town|suburb|residen|province|country|postal)/, 'location'],
  [/^linkedin/, 'linkedin'],
  [/^github/, 'github'],
  [/^(website|web|site|portfolio|url|blog|behance|dribbble)\b/, 'website'],
  [/^(born|birth|date of birth|dob|age)\b/, 'birthday'],
  [/^(nationality|citizen)/, 'nationality'],
  [/^(gender|sex|male$|female$)/, 'gender'],
  [/^(marital|married|single|divorced|widow)/, 'marital'],
  [/^(driver|driving|licen[cs]e)/, 'licence'],
  [/^(id\b|identity|passport)/, 'idcard'],
  [/^(available|availability|notice)/, 'availability'],
];

const contactKind = (value) => {
  const t = String(value).trim().toLowerCase();
  const head = t.includes(':') ? t.split(':')[0].trim() : t;
  for (const [re, kind] of CONTACT_LABELS) if (re.test(head)) return kind;
  if (t.includes('@')) return 'email';
  if (t.includes('linkedin')) return 'linkedin';
  if (t.includes('github')) return 'github';
  if (/^(\+|\(\+)?[\d\s().-]{7,}$/.test(t)) return 'phone'; // also "(+27) 82 ..."
  // A web address is one token with a dot-separated domain (any ending, so .co.za and .design count); an address with spaces is not.
  if (/^(https?:\/\/|www\.)/.test(t) || /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(\/\S*)?$/.test(t)) return 'website';
  // Some other "Label: value" detail gets a neutral icon rather than a map pin.
  if (/^[a-z][a-z .'’/-]{1,28}:\s*\S/.test(t)) return 'other';
  return 'location';
};

const AtlasSidebarTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, certificates, isEmpty, sectionOrder, edit } = props;
  const accentColor = props.accentColor || DEFAULT_ACCENT['atlas-sidebar'] || DEFAULT_ACCENT.atlas || FALLBACK_ACCENT;
  const accentText = shade(accentColor, 0.3);
  const railColor = tint(accentColor, 0.78);
  const panelBg = tint(accentColor, 0.95);

  const badgeBg = tint(accentColor, 0.88);
  const headingStyle = { fontFamily: DISPLAY_FONT, color: INK, '--accent': accentColor, '--rule': tint(accentColor, 0.78) };
  const headingBadge = (icon, size) => <IconBadge name={icon} size={size} bg={badgeBg} color={accentText} />;

  // Headings this template draws itself.
  const heading = (key, text, cls, icon) => (
    <h3 key={`${key}-h`} className={cls} style={headingStyle}>
      {icon && headingBadge(icon, cls === SIDE_HEADING ? SIDE_BADGE : MAIN_BADGE)}
      {text}
    </h3>
  );

  // Headings drawn by the shared helpers (projects, hobbies, references, certificates): find the first h3
  // in the section's blocks and put the matching icon in front of its title. If the helper's output has a
  // different shape, the blocks are returned untouched and the heading simply has no icon.
  const withHeadingIcon = (nodes, size) => {
    if (!Array.isArray(nodes)) return nodes;
    const at = nodes.findIndex((n) => React.isValidElement(n) && n.type === 'h3');
    if (at < 0) return nodes;
    const h = nodes[at];
    const kids = React.Children.toArray(h.props.children);
    const icon = iconForTitle(kids.filter((k) => typeof k === 'string' || typeof k === 'number').join(''));
    if (!icon) return nodes;
    return nodes.map((n, i) => (i === at ? React.cloneElement(h, undefined, headingBadge(icon, size), ...kids) : n));
  };
  const withHeadingIcons = (byKey, size) =>
    Object.fromEntries(Object.entries(byKey || {}).map(([k, v]) => [k, withHeadingIcon(v, size)]));

  // Main column: title with the dates in an outlined pill, employer and location on one line under it.
  const mainHead = (title, date, primary, secondary) => (
    <div>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[15px] font-semibold leading-snug tracking-tight" style={{ fontFamily: DISPLAY_FONT, color: INK }}>{title}</p>
        {date && (
          <span
            className="mt-[1px] inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-[1px] text-[10.5px] tabular-nums text-slate-700"
            style={{ borderColor: tint(accentColor, 0.55) }}
          >
            <Icon name="calendar" size={11} className="shrink-0" style={{ color: accentText }} />
            {date}
          </span>
        )}
      </div>
      {(primary || secondary) && (
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] leading-snug">
          {primary && <span className="font-medium" style={{ color: accentText }}>{primary}</span>}
          {primary && secondary && <span aria-hidden="true" className="h-3 w-px" style={{ backgroundColor: tint(accentColor, 0.5) }} />}
          {secondary && (
            <span className="inline-flex items-center gap-1 text-slate-500">
              <Icon name="pin" size={11} className="shrink-0" />
              {secondary}
            </span>
          )}
        </p>
      )}
    </div>
  );

  // Timeline rail for Experience: every atom carries the rail's left border, the head also carries the node.
  // The gap between entries is padding, so the rail stays unbroken between atoms and across a page break.
  const railEntry = (id, head, bodyNodes, isLastEntry, isFirstEntry) => {
    const list = [head, ...bodyNodes].filter(Boolean);
    return list.map((node, i) => (
      <div
        key={`${id}-${i}`}
        className={`relative ml-[5px] border-l-2 pl-5 ${i === list.length - 1 && !isLastEntry ? 'pb-6' : 'pb-1'}`}
        style={{ borderColor: railColor }}
      >
        {i === 0 && (
          <span
            className="absolute -left-[7px] top-[5px] h-3 w-3 rounded-full border-2"
            style={{
              borderColor: accentColor,
              background: isFirstEntry ? accentColor : '#fff',
              boxShadow: isFirstEntry ? `0 0 0 4px ${tint(accentColor, 0.85)}` : 'none',
            }}
          />
        )}
        {node}
      </div>
    ));
  };

  // Sidebar entries are compact and have no rail.
  const sideEntry = (id, head, bodyNodes, isLastEntry) => {
    const list = [head, ...bodyNodes].filter(Boolean);
    return list.map((node, i) => (
      <div key={`${id}-${i}`} style={{ paddingBottom: i === list.length - 1 ? (isLastEntry ? 0 : 14) : 3 }}>{node}</div>
    ));
  };

  const richLines = (text, prefix) => (
    text ? renderAchievements(text, prefix).map((el, i) => <div key={`${prefix}-w${i}`}>{el}</div>) : []
  );

  // One skill or language: the name with its level as dots on the right, and the level word underneath when there is one.
  const dotOff = tint(accentColor, 0.72);
  const levelRow = (key, label, steps, total, note, isLast) => (
    <div key={key} style={{ paddingBottom: isLast ? 0 : 9 }}>
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-[12px] font-medium leading-snug [overflow-wrap:anywhere]" style={{ color: INK }}>{label}</p>
        {steps !== null && <LevelDots steps={steps} total={total} color={accentColor} offColor={dotOff} />}
      </div>
      {note && <p className="text-[10.5px] leading-snug text-slate-500">{note}</p>}
    </div>
  );

  // Languages are always drawn with level dots. Blank entries are skipped, a comma-separated string works too,
  // and a missing level counts as Fluent, the app's default.
  const rawLanguages = Array.isArray(languages) ? languages : typeof languages === 'string' ? languages.split(/[,\n;]+/) : [];
  const languageItems = rawLanguages.map(readLanguage).filter((l) => l.name);
  const langRow = (l, i, isLast) => {
    const label = hasText(l.level) ? String(l.level) : 'Fluent';
    const known = LANGUAGE_LEVELS[label.trim().toLowerCase()];
    if (known) return levelRow(`lang-${i}`, l.name, known, 3, label, isLast);
    const steps = levelSteps(l.level);
    return levelRow(`lang-${i}`, l.name, steps, 5, steps === null ? label : '', isLast);
  };

  const sectionMap = {
    // Lead paragraph: larger and darker than the body. The overrides reach into whatever renderAchievements outputs.
    summary: summary ? endGroup([
      heading('summary', 'Professional Summary', MAIN_HEADING, 'user'),
      ...renderAchievements(summary, 'summary').map((el, i) => (
        <div key={`summary-w${i}`} className="[&_*]:!text-[13px] [&_*]:!leading-[1.65] [&_*]:!text-[#1F2937]">{el}</div>
      )),
    ]) : [],

    experience: jobs.length > 0 ? endGroup([
      heading('experience', 'Work Experience', MAIN_HEADING, 'briefcase'),
      ...jobs.flatMap((job, i) => railEntry(
        `job-${job.id ?? i}`,
        mainHead(job.title, jobDates(job), job.employer, [job.location, job.remote ? 'Remote' : ''].filter(Boolean).join(', ')),
        richLines(job.achievements, `job-${job.id ?? i}-ach`),
        i === jobs.length - 1,
        i === 0,
      )),
    ]) : [],

    education: educations.length > 0 ? endGroup([
      heading('education', 'Education', SIDE_HEADING, 'cap'),
      ...educations.flatMap((ed, i) => {
        const title = [ed.degree, ed.field].filter(Boolean).join(', ') || ed.institution;
        const school = title === ed.institution ? '' : ed.institution;
        return sideEntry(
          `education-${ed.id ?? i}`,
          (
            <div>
              <p className="text-[12.5px] font-semibold leading-snug" style={{ fontFamily: DISPLAY_FONT, color: INK }}>{title}</p>
              {school && <p className="text-[11.5px] font-medium leading-snug" style={{ color: accentText }}>{school}</p>}
              {ed.date && (
                <p className="mt-1 flex items-start gap-1.5 text-[10.5px] leading-snug text-slate-500">
                  <Icon name="calendar" size={11} className="mt-[1.5px] shrink-0" style={{ color: accentText }} />
                  {ed.date}
                </p>
              )}
              {ed.location && (
                <p className="mt-0.5 flex items-start gap-1.5 text-[10.5px] leading-snug text-slate-500">
                  <Icon name="pin" size={11} className="mt-[1.5px] shrink-0" style={{ color: accentText }} />
                  {ed.location}
                </p>
              )}
            </div>
          ),
          richLines(ed.achievements, `education-${ed.id ?? i}-ach`),
          i === educations.length - 1,
        );
      }),
    ]) : [],

    skills: namedSkills.length > 0 ? endGroup([
      heading('skills', 'Skills', SIDE_HEADING, 'layers'),
      ...(SKILL_STYLE === 'chips' ? [
        <div key="skills-chips" className="flex flex-wrap gap-1.5">
          {namedSkills.map((s, i) => (
            <span
              key={`skill-${s.id ?? i}`}
              className="rounded-md border px-2 py-[3px] text-[11px] font-medium leading-snug"
              style={{ borderColor: tint(accentColor, 0.7), background: '#fff', color: INK }}
            >
              {s.text}
            </span>
          ))}
        </div>,
      ] : SKILL_STYLE === 'text' ? [
        <p key="skills-list" className="text-[12px] font-medium leading-relaxed" style={{ color: INK }}>
          {namedSkills.map((s) => s.text).filter(Boolean).join(', ')}
        </p>,
      ] : namedSkills.map((s, i) => levelRow(
        `skill-${s.id ?? i}`,
        s.text,
        levelSteps(skillRating(s)),
        5,
        '',
        i === namedSkills.length - 1,
      ))),
    ]) : [],

    // Languages with level dots. The shared helper is only used when there is no named language to draw.
    ...(languageItems.length > 0 ? {
      languages: endGroup([
        heading('languages', 'Languages', SIDE_HEADING, 'languages'),
        ...languageItems.map((l, i) => langRow(l, i, i === languageItems.length - 1)),
      ]),
    } : {}),
  };

  // Extras come from the shared helpers, called once per column so each gets that column's heading size.
  const mainExtras = withHeadingIcons(renderExtraSections({ projects, languages, hobbies, references, headingClass: MAIN_HEADING, headingStyle, accentColor }), MAIN_BADGE);
  const sideExtras = withHeadingIcons(renderExtraSections({ projects, languages, hobbies, references, headingClass: SIDE_HEADING, headingStyle, accentColor }), SIDE_BADGE);
  const sideCerts = withHeadingIcons(renderCertificates({ certificates, headingClass: SIDE_HEADING, headingStyle }), SIDE_BADGE);

  const mainKeys = sectionOrder.filter((key) => !SIDEBAR_KEYS.has(key));
  const sideKeys = sectionOrder.filter((key) => SIDEBAR_KEYS.has(key));
  const mainBlocks = mainKeys.flatMap((key) => markSection(edit, key, sectionMap[key] || mainExtras[key] || []));
  const sideBlocks = sideKeys.flatMap((key) => markSection(edit, key, sectionMap[key] || sideExtras[key] || sideCerts[key] || []));

  const main = usePaginatedBlocks(mainBlocks, NEXT_PAGE_MAX_HEIGHT);
  const side = usePaginatedBlocks(sideBlocks, NEXT_PAGE_MAX_HEIGHT);
  const pageCount = Math.max(1, main.pages.length, side.pages.length);

  // Header pieces.
  const name = (fullName || 'Your Name').trim();
  const nameParts = name.split(/\s+/);
  const firstName = nameParts[0];
  const restName = nameParts.slice(1).join(' ');
  const nameSize = name.length > 26 ? 38 : name.length > 18 ? 46 : 56;
  const professionParts = (personal.profession || '').split('|').map((s) => s.trim()).filter(Boolean);
  // Contact details, typed and put in a fixed order (email, phone, location, then links); personal details keep
  // their entered order between location and links. The sort is stable.
  const contacts = (contactList || [])
    .filter((c) => typeof c === 'string' && c.trim())
    .map((c, i) => ({ text: c.trim(), kind: contactKind(c), i }))
    .sort((a, b) => contactRank(a.kind) - contactRank(b.kind) || a.i - b.i);
  // Grid columns: 1-3 details sit in one row, 4 make a 2x2, more wrap onto rows of three.
  const contactCols = contacts.length <= 3 ? Math.max(1, contacts.length) : contacts.length === 4 ? 2 : 3;

  return (
    <>
      {/* Hidden copies of every atom, one box per column, as wide as the real column body. */}
      <div
        ref={main.measureContainerRef}
        className="absolute pointer-events-none"
        style={{ top: -9999, left: -9999, width: MAIN_CONTENT_W, fontFamily: BODY_FONT }}
      >
        {main.measureContent}
      </div>
      <div
        ref={side.measureContainerRef}
        className="absolute pointer-events-none"
        style={{ top: -9999, left: -9999 - SIDEBAR_W, width: SIDE_CONTENT_W, fontFamily: BODY_FONT }}
      >
        {side.measureContent}
      </div>

      {Array.from({ length: pageCount }, (_, index) => (
        <A4Page key={index} pageNum={index + 1} totalPages={pageCount}>
          <div
            className="relative flex h-full w-full flex-col overflow-hidden bg-white text-left antialiased"
            style={{ fontFamily: BODY_FONT, color: TEXT, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
          >
            {/* Left rail: CSS only, no text. */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0" style={{ width: RAIL_W, background: accentColor }} />
            {index > 0 && (
              <p className="absolute text-[10.5px] font-medium text-slate-400" style={{ left: MAIN_PAD_L, top: 20, fontFamily: DISPLAY_FONT }}>{name}</p>
            )}

            {/* Full-width header: name and profession on top, contact details below in an aligned grid. */}
            {index === 0 && (
              <div
                {...editAttrs(edit, 'personal')}
                className="w-full shrink-0 border-b border-slate-200"
                style={{ paddingTop: TOP, paddingBottom: 20, paddingLeft: MAIN_PAD_L, paddingRight: 36 }}
              >
                <h1 className="break-words leading-[1.05] tracking-[-0.04em]" style={{ fontFamily: DISPLAY_FONT, fontSize: nameSize, color: INK }}>
                  <span className="font-light">{firstName}</span>
                  {restName && (<>{' '}<span className="font-semibold">{restName}</span></>)}
                </h1>
                {professionParts.length > 0 && (
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[16px]" style={{ fontFamily: DISPLAY_FONT, color: accentText }}>
                    {professionParts.map((part, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <span aria-hidden="true" className="h-4 w-px" style={{ backgroundColor: tint(accentColor, 0.5) }} />}
                        <span>{part}</span>
                      </React.Fragment>
                    ))}
                  </p>
                )}
                {contacts.length > 0 && (
                  <div
                    className="mt-4 grid gap-x-6 gap-y-2.5 border-t pt-4"
                    style={{ gridTemplateColumns: `repeat(${contactCols}, minmax(0, 1fr))`, borderColor: tint(accentColor, 0.75) }}
                  >
                    {contacts.map((c) => (
                      <div key={c.i} className="flex min-w-0 items-center gap-2.5">
                        <IconBadge name={CONTACT_ICON[c.kind]} size={24} bg={badgeBg} color={accentText} />
                        <span className="min-w-0 text-[11.5px] leading-snug [overflow-wrap:anywhere]" style={{ color: INK }}>{c.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex min-h-0 flex-1">
              {/* Main column, on the left. */}
              <div className="flex min-w-0 flex-1 flex-col">
                <div
                  ref={index === 0 ? main.firstBodyRef : undefined}
                  className="relative min-h-0 flex-1 overflow-hidden"
                  style={{ marginLeft: MAIN_PAD_L, marginRight: MAIN_PAD_R, marginTop: index === 0 ? MARGIN_TOP_FIRST : MARGIN_TOP_NEXT, marginBottom: MARGIN_BOTTOM }}
                >
                  {main.pages[index] || null}
                  {isEmpty && index === 0 && (
                    <p className="text-xs italic text-slate-400">Nothing entered yet — fill in a few steps to see them appear here.</p>
                  )}
                </div>
              </div>

              {/* Sidebar, on the right: under the header on page 1, full height on later pages. */}
              <div
                className="relative flex shrink-0 flex-col"
                style={{ width: SIDEBAR_W, background: panelBg, borderLeft: `1px solid ${tint(accentColor, 0.82)}` }}
              >
                <div
                  ref={index === 0 ? side.firstBodyRef : undefined}
                  className="relative min-h-0 flex-1 overflow-hidden"
                  style={{ marginLeft: SIDE_PAD_X, marginRight: SIDE_PAD_X, marginTop: index === 0 ? MARGIN_TOP_FIRST : MARGIN_TOP_NEXT, marginBottom: MARGIN_BOTTOM }}
                >
                  {side.pages[index] || null}
                </div>
              </div>
            </div>
          </div>
        </A4Page>
      ))}
    </>
  );
};

export default AtlasSidebarTemplate;
