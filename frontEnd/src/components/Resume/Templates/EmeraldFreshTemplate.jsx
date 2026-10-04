import React from 'react';
import { renderAchievements } from '../Sections/richText';
import renderCertificates from '../Sections/renderCertificates';
import ResumePhoto from '../Sections/ResumePhoto';
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
 * Halo (id: halo). A light, modern single-column layout.
 *
 *   header   (100% width) a bold gradient panel in the accent colour (sliding into a neighbouring hue) with
 *            rounded bottom corners, white text, and circles, a ring and a dot grid behind it. Big name,
 *            profession, and the contact details as plain white text with a small icon each (email, phone,
 *            location, then links) under a hairline. The profile photo, when there is one, sits on the
 *            right. The gradient is darkened only as far as white text needs.
 *   body     one column, in sectionOrder order. Section headings are plain sentence case with a short
 *            accent bar above. Experience and Education are airy: title and a soft date pill on one
 *            line, employer and location underneath. Skills and Languages are rounded pills.
 *
 * Reading order stays sensible for parsers: header text first (name, profession, contact details), then
 * each section top to bottom. Everything is real text. The gradient, the circles, the ring, the dot grid,
 * the bars, the dots and all icons are decoration only (CSS shapes and inline SVG marked aria-hidden), so
 * extracted text is unchanged.
 *
 * The body is paginated with usePaginatedBlocks. Pages after the first get a thin gradient strip along the
 * top and nothing else (no repeated name). Gaps are padding (never margin on an atom), display
 * fonts are inline on the atoms, and all body margins are inline px, so the hidden measuring box matches
 * the real body.
 *
 * Type: Outfit for display, Inter for body (the same two fonts the Atlas templates use, so nothing new to
 * load). Small coloured text uses a darkened accent; the pure accent is used for shapes only.
 *
 * To register: add 'halo' to DEFAULT_ACCENT (suggested #4F46E5) and to your template list.
 * A missing key falls back to FALLBACK_ACCENT. Use a #rrggbb accent.
 */

const SKILL_STYLE = 'pills'; // how skills are shown: 'pills' | 'text'
const SHOW_SKILL_LEVELS = true; // 'pills' only: add five small dots to a pill when the skill has a rating

// Language levels in the app are Basic, Conversational and Fluent. Languages are drawn exactly like skills, as a
// pill with five dots, so each level word is mapped onto that same five-dot scale.
const LANGUAGE_LEVELS = {
  basic: 2, beginner: 2, elementary: 2,
  conversational: 3, intermediate: 3,
  advanced: 4,
  fluent: 5, proficient: 5, native: 5,
};

const BODY_FONT = `'Inter', 'Segoe UI', system-ui, -apple-system, Arial, sans-serif`;
const DISPLAY_FONT = `'Outfit', 'Inter', 'Segoe UI', system-ui, -apple-system, Arial, sans-serif`;
const FALLBACK_ACCENT = '#4F46E5';
const INK = '#0F172A';
const TEXT = '#334155';

// Geometry (px).
const PAD_X = 50; // left and right padding of the header and the body
const TOP = 46; // top padding of the header panel
const STRIP_H = 6; // accent strip along the top of every page
const MARGIN_TOP_FIRST = 34; // body on page 1, under the header
const MARGIN_TOP_NEXT = 48; // body on pages 2+
const MARGIN_BOTTOM = 40;

const CONTENT_W = PAGE_WIDTH_PX - PAD_X * 2; // the hidden measuring box must match
const NEXT_PAGE_MAX_HEIGHT = PAGE_HEIGHT_PX - MARGIN_TOP_NEXT - MARGIN_BOTTOM; // pages 2+

// Darken a #rrggbb colour toward black (used for small accent-coloured text).
const shade = (hex, amount) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  const n = m ? parseInt(m[1], 16) : 0x4f46e5;
  const f = 1 - amount;
  return `rgb(${Math.round(((n >> 16) & 255) * f)}, ${Math.round(((n >> 8) & 255) * f)}, ${Math.round((n & 255) * f)})`;
};

// Colour helpers for the header gradient. White text sits on the gradient, so each end is darkened only as far
// as needed to stay readable: a vivid accent (indigo, teal, magenta) is used as it is, a light one (orange,
// yellow) is deepened until white text on it has enough contrast.
const rgbOf = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  const n = m ? parseInt(m[1], 16) : 0x4f46e5;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const luminance = ([r, g, b]) => {
  const f = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const darkenTo = (rgb, maxLuminance) => {
  let k = 1;
  let out = rgb;
  while (luminance(out) > maxLuminance && k > 0.1) { k -= 0.04; out = rgb.map((c) => Math.round(c * k)); }
  return out;
};
// Turn the hue by `deg` degrees (keeps saturation and lightness), for the second colour of the gradient.
// Warm hues (red, orange, yellow) turn the other way, towards red, because turning them forwards ends in a
// muddy olive once the colour is darkened.
const rotateHue = ([r8, g8, b8], deg) => {
  const r = r8 / 255, g = g8 / 255, b = b8 / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [r8, g8, b8]; // a pure grey has no hue to turn
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h /= 6;
  h = (h + (h * 360 < 100 ? -deg : deg) / 360 + 1) % 1;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const ch = (t0) => {
    let t = t0;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [ch(h + 1 / 3), ch(h), ch(h - 1 / 3)].map((v) => Math.round(v * 255));
};
const cssRgb = ([r, g, b]) => `rgb(${r}, ${g}, ${b})`;

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
const LevelDots = ({ steps, total, color, offColor, size = 6 }) => (
  <span className="flex shrink-0 gap-[4px]" aria-hidden="true">
    {Array.from({ length: total }, (_, i) => (
      <span key={i} className="rounded-full" style={{ width: size, height: size, background: i < steps ? color : offColor }} />
    ))}
  </span>
);

// Icons for the contact pills: exact path data from Lucide (line icons, 24px grid) and Font Awesome Free
// (the filled LinkedIn and GitHub brand marks). Inline SVG, decorative only, so every svg is aria-hidden.
// `solid` icons are filled instead of stroked and carry their own viewBox.
const ICONS = {
  mail: { body: (<><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></>) },
  phone: { body: (<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />) },
  pin: { body: (<><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" /></>) },
  globe: { body: (<><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></>) },
  linkedin: { solid: true, viewBox: '0 0 448 512', body: (<path d="M100.28 448H7.4V148.9h92.88zM53.79 108.1C24.09 108.1 0 83.5 0 53.8a53.79 53.79 0 0 1 107.58 0c0 29.7-24.1 54.3-53.79 54.3zM447.9 448h-92.68V302.4c0-34.7-.7-79.2-48.29-79.2-48.29 0-55.69 37.7-55.69 76.7V448h-92.78V148.9h89.08v40.8h1.3c12.4-23.5 42.69-48.3 87.88-48.3 94 0 111.28 61.9 111.28 142.3V448z" />) },
  github: { solid: true, viewBox: '0 0 496 512', body: (<path d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3.3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3zm44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9.3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3.7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3.3 2.9 2.3 3.9 1.6 1 3.6.7 4.3-.7.7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3.7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3.7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z" />) },
  heart: { body: (<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />) },
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

// Heading: a short accent bar, then the title in plain sentence case. The bar is a CSS pseudo-element, so the
// heading text stays plain text. The gap under the heading is padding, so it is part of the heading's own box.
const HEADING =
  `flex flex-col items-start gap-2 pb-3.5 text-[16px] font-semibold tracking-tight ` +
  `before:block before:h-[3px] before:w-7 before:rounded-full before:bg-[var(--accent)] before:content-['']`;

// Contact and personal details: work out what each one is, so it gets the right icon and a stable place.
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

const HaloTemplate = (props) => {
  const { fullName, contactList, jobs, educations, namedSkills, personal, summary, hobbies, languages, projects, references, certificates, isEmpty, sectionOrder, edit } = props;
  const accentColor = props.accentColor || DEFAULT_ACCENT.halo || FALLBACK_ACCENT;
  const accentText = shade(accentColor, 0.3);
  // Header gradient: the accent, sliding into a neighbouring hue and a little deeper, diagonally.
  const baseRgb = rgbOf(accentColor);
  const heroBg = `linear-gradient(120deg, ${cssRgb(darkenTo(baseRgb, 0.16))} 0%, ${cssRgb(darkenTo(rotateHue(baseRgb, 32), 0.07))} 100%)`;
  const pillBg = tint(accentColor, 0.9);
  const dotOff = tint(accentColor, 0.7);

  // The heading style is also handed to the shared helpers, so projects, hobbies, references and
  // certificates headings match the ones drawn here.
  const headingStyle = { fontFamily: DISPLAY_FONT, color: INK, '--accent': accentColor, '--rule': tint(accentColor, 0.78) };
  const heading = (key, text) => (
    <h3 key={`${key}-h`} className={HEADING} style={headingStyle}>{text}</h3>
  );

  // Title with the dates in a soft pill on the same line, employer and location underneath.
  const entryHead = (title, date, primary, secondary) => (
    <div>
      <div className="flex items-start justify-between gap-4">
        <p className="min-w-0 text-[14.5px] font-semibold leading-snug tracking-tight" style={{ fontFamily: DISPLAY_FONT, color: INK }}>{title}</p>
        {date && (
          <span
            className="mt-[1px] shrink-0 whitespace-nowrap rounded-full px-2.5 py-[2px] text-[10.5px] font-medium tabular-nums"
            style={{ background: pillBg, color: accentText }}
          >
            {date}
          </span>
        )}
      </div>
      {(primary || secondary) && (
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] leading-snug">
          {primary && <span className="font-medium" style={{ color: accentText }}>{primary}</span>}
          {primary && secondary && <span aria-hidden="true" className="h-[3px] w-[3px] rounded-full bg-slate-300" />}
          {secondary && <span className="text-slate-500">{secondary}</span>}
        </p>
      )}
    </div>
  );

  // Entries have no rail or box: the gap between them is padding on the last atom of each entry.
  const entry = (id, head, bodyNodes, isLastEntry) => {
    const list = [head, ...bodyNodes].filter(Boolean);
    return list.map((node, i) => (
      <div key={`${id}-${i}`} style={{ paddingBottom: i === list.length - 1 ? (isLastEntry ? 4 : 22) : 3 }}>{node}</div>
    ));
  };

  const richLines = (text, prefix) => (
    text ? renderAchievements(text, prefix).map((el, i) => <div key={`${prefix}-w${i}`}>{el}</div>) : []
  );

  // One pill, used for skills and languages alike: the name, then five small dots when there is a level.
  // `note` is the level word. With dots it stays in the page as visually hidden text, so the level can still be
  // read by parsers; without dots (a level we cannot turn into dots) it is shown after the name instead.
  const pill = (key, label, steps, note) => (
    <span
      key={key}
      className="relative inline-flex items-center gap-2 rounded-full px-3 py-[5px] text-[11.5px] font-medium leading-snug"
      style={{ background: pillBg, color: shade(accentColor, 0.4) }}
    >
      {label}
      {note && (steps !== null
        ? <span className="sr-only">{`, ${note}`}</span>
        : <span className="font-normal opacity-70">{note}</span>)}
      {steps !== null && <LevelDots steps={steps} total={5} color={accentColor} offColor={dotOff} size={5} />}
    </span>
  );

  // Skill pill: dots only when the skill has a rating.
  const skillPill = (s, i) => (
    pill(`skill-${s.id ?? i}`, s.text, SHOW_SKILL_LEVELS ? levelSteps(skillRating(s)) : null, '')
  );

  // Language pill: the same pill as a skill. A missing level counts as Fluent, the app's default. A level word
  // becomes dots on the five-dot scale above, and a numeric level (0-5 or a percentage) is drawn as is.
  const languagePill = (l, i) => {
    const label = hasText(l.level) ? String(l.level) : 'Fluent';
    const known = LANGUAGE_LEVELS[label.trim().toLowerCase()];
    const steps = known || levelSteps(l.level);
    return pill(`lang-${i}`, l.name, steps, known || steps === null ? label : '');
  };

  const rawLanguages = Array.isArray(languages) ? languages : typeof languages === 'string' ? languages.split(/[,\n;]+/) : [];
  const languageItems = rawLanguages.map(readLanguage).filter((l) => l.name);

  const sectionMap = {
    // Lead paragraph: a little larger and darker than the body. The overrides reach into whatever
    // renderAchievements outputs.
    summary: summary ? endGroup([
      heading('summary', 'Professional Summary'),
      ...renderAchievements(summary, 'summary').map((el, i) => (
        <div key={`summary-w${i}`} className="pb-1 [&_*]:!text-[13px] [&_*]:!leading-[1.7] [&_*]:!text-[#1E293B]">{el}</div>
      )),
    ]) : [],

    experience: jobs.length > 0 ? endGroup([
      heading('experience', 'Work Experience'),
      ...jobs.flatMap((job, i) => entry(
        `job-${job.id ?? i}`,
        entryHead(job.title, jobDates(job), job.employer, [job.location, job.remote ? 'Remote' : ''].filter(Boolean).join(', ')),
        richLines(job.achievements, `job-${job.id ?? i}-ach`),
        i === jobs.length - 1,
      )),
    ]) : [],

    education: educations.length > 0 ? endGroup([
      heading('education', 'Education'),
      ...educations.flatMap((ed, i) => {
        const title = [ed.degree, ed.field].filter(Boolean).join(', ') || ed.institution;
        const school = title === ed.institution ? '' : ed.institution;
        return entry(
          `education-${ed.id ?? i}`,
          entryHead(title, ed.date, school, ed.location),
          richLines(ed.achievements, `education-${ed.id ?? i}-ach`),
          i === educations.length - 1,
        );
      }),
    ]) : [],

    skills: namedSkills.length > 0 ? endGroup([
      heading('skills', 'Skills'),
      SKILL_STYLE === 'text' ? (
        <p key="skills-list" className="pb-1 text-[12px] font-medium leading-relaxed" style={{ color: INK }}>
          {namedSkills.map((s) => s.text).filter(Boolean).join(', ')}
        </p>
      ) : (
        <div key="skills-pills" className="flex flex-wrap gap-2 pb-1">
          {namedSkills.map(skillPill)}
        </div>
      ),
    ]) : [],

    // Languages as pills. The shared helper is only used when there is no named language to draw.
    ...(languageItems.length > 0 ? {
      languages: endGroup([
        heading('languages', 'Languages'),
        <div key="lang-pills" className="flex flex-wrap gap-2 pb-1">
          {languageItems.map(languagePill)}
        </div>,
      ]),
    } : {}),
  };

  // Extras come from the shared helpers, with this template's heading class and style.
  const extras = renderExtraSections({ projects, languages, hobbies, references, headingClass: HEADING, headingStyle, accentColor });
  const certs = renderCertificates({ certificates, headingClass: HEADING, headingStyle });

  const blocks = sectionOrder.flatMap((key) => markSection(edit, key, sectionMap[key] || extras[key] || certs[key] || []));
  const main = usePaginatedBlocks(blocks, NEXT_PAGE_MAX_HEIGHT);
  const pageCount = Math.max(1, main.pages.length);

  // Header pieces.
  const name = (fullName || 'Your Name').trim();
  const nameParts = name.split(/\s+/);
  const firstName = nameParts[0];
  const restName = nameParts.slice(1).join(' ');
  const nameSize = name.length > 26 ? 36 : name.length > 18 ? 44 : 54;
  const professionParts = ((personal && personal.profession) || '').split('|').map((s) => s.trim()).filter(Boolean);
  const photo = (personal && personal.photo) || '';
  const photoStyle = personal && personal.photoStyle;
  // Contact details, typed and put in a fixed order (email, phone, location, then links); personal details keep
  // their entered order between location and links. The sort is stable.
  const contacts = (contactList || [])
    .filter((c) => typeof c === 'string' && c.trim())
    .map((c, i) => ({ text: c.trim(), kind: contactKind(c), i }))
    .sort((a, b) => contactRank(a.kind) - contactRank(b.kind) || a.i - b.i);

  return (
    <>
      {/* Hidden copy of every atom, as wide as the real body. */}
      <div
        ref={main.measureContainerRef}
        className="absolute pointer-events-none"
        style={{ top: -9999, left: -9999, width: CONTENT_W, fontFamily: BODY_FONT }}
      >
        {main.measureContent}
      </div>

      {Array.from({ length: pageCount }, (_, index) => (
        <A4Page key={index} pageNum={index + 1} totalPages={pageCount}>
          <div
            className="relative flex h-full w-full flex-col overflow-hidden bg-white text-left antialiased"
            style={{ fontFamily: BODY_FONT, color: TEXT, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
          >
            {/* Pages 2+: just a thin gradient strip along the top (CSS only, no text). */}
            {index > 0 && (
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-10" style={{ height: STRIP_H, background: heroBg }} />
            )}

            {/* Page 1: the gradient panel with rounded bottom corners and white text. Circles, a ring and a dot grid
                sit behind the text as decoration (CSS only); the contact details are frosted pills. */}
            {index === 0 && (
              <div
                {...editAttrs(edit, 'personal')}
                className="relative w-full shrink-0 overflow-hidden"
                style={{
                  background: heroBg,
                  borderBottomLeftRadius: 40,
                  borderBottomRightRadius: 40,
                  paddingTop: TOP,
                  paddingBottom: 34,
                  paddingLeft: PAD_X,
                  paddingRight: PAD_X,
                }}
              >
                <div aria-hidden="true" className="pointer-events-none absolute rounded-full" style={{ right: -90, top: -110, width: 320, height: 320, background: 'rgba(255, 255, 255, 0.09)' }} />
                <div aria-hidden="true" className="pointer-events-none absolute rounded-full" style={{ right: 150, bottom: -90, width: 190, height: 190, background: 'rgba(255, 255, 255, 0.07)' }} />
                {!photo && (
                  <div aria-hidden="true" className="pointer-events-none absolute rounded-full border-2" style={{ right: 64, top: 128, width: 72, height: 72, borderColor: 'rgba(255, 255, 255, 0.3)' }} />
                )}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute"
                  style={{ right: 190, top: 34, width: 98, height: 70, backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.45) 1.6px, transparent 1.8px)', backgroundSize: '14px 14px' }}
                />

                <div className="relative flex items-start justify-between gap-8">
                  <div className="min-w-0 flex-1">
                    <h1 className="break-words leading-[1.02] tracking-[-0.045em]" style={{ fontFamily: DISPLAY_FONT, fontSize: nameSize, color: '#FFFFFF' }}>
                      <span className="font-light">{firstName}</span>
                      {restName && (<>{' '}<span className="font-semibold">{restName}</span></>)}
                    </h1>
                    {professionParts.length > 0 && (
                      <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[16px] font-medium" style={{ fontFamily: DISPLAY_FONT, color: 'rgba(255, 255, 255, 0.9)' }}>
                        {professionParts.map((part, i) => (
                          <React.Fragment key={i}>
                            {i > 0 && <span aria-hidden="true" className="h-1 w-1 rounded-full" style={{ backgroundColor: 'rgba(255, 255, 255, 0.55)' }} />}
                            <span>{part}</span>
                          </React.Fragment>
                        ))}
                      </p>
                    )}
                    {/* Contact details: plain white text with a small icon, no background, under a hairline. */}
                    {contacts.length > 0 && (
                      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2.5 border-t pt-4" style={{ borderColor: 'rgba(255, 255, 255, 0.28)' }}>
                        {contacts.map((c) => (
                          <span key={c.i} className="inline-flex max-w-full items-center gap-2 text-[12px] leading-snug" style={{ color: '#FFFFFF' }}>
                            <Icon name={CONTACT_ICON[c.kind]} size={13} className="shrink-0" style={{ color: 'rgba(255, 255, 255, 0.78)' }} />
                            <span className="min-w-0 [overflow-wrap:anywhere]">{c.text}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Profile photo, on the right. Drawn by the shared ResumePhoto so it matches the form's preview
                      (shape, size, border, zoom and framing). Renders nothing when there is no photo. Last in the
                      source order so the name stays first for parsers. */}
                  {photo && (
                    <ResumePhoto
                      src={photo}
                      style={photoStyle}
                      borderColor="#FFFFFF"
                      className="shadow-[0_10px_28px_rgba(0,0,0,0.28)]"
                    />
                  )}
                </div>
              </div>
            )}

            {/* The body: one column, paginated. */}
            <div
              ref={index === 0 ? main.firstBodyRef : undefined}
              className="relative min-h-0 flex-1 overflow-hidden"
              style={{ marginLeft: PAD_X, marginRight: PAD_X, marginTop: index === 0 ? MARGIN_TOP_FIRST : MARGIN_TOP_NEXT, marginBottom: MARGIN_BOTTOM }}
            >
              {main.pages[index] || null}
              {isEmpty && index === 0 && (
                <p className="text-xs italic text-slate-400">Nothing entered yet — fill in a few steps to see them appear here.</p>
              )}
            </div>
          </div>
        </A4Page>
      ))}
    </>
  );
};

export default HaloTemplate;
