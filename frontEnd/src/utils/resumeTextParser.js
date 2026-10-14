/* -------------------------------------------------------------------------- */
/*  Turns the text of a resume into the data ResumeBuilder's handleImport     */
/*  expects. Pure functions: no DOM, no network, no dependencies.             */
/*                                                                            */
/*  Input is a list of "blocks" (one per paragraph / line):                   */
/*    { text, bullet?, bold?, italic?, links?: [{ text, href }] }             */
/*  resumeFileText.js builds those from a .docx or .pdf; textToBlocks() below */
/*  builds them from plain text.                                              */
/* -------------------------------------------------------------------------- */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LOOKUP = {
  jan: 'Jan', january: 'Jan', feb: 'Feb', february: 'Feb', mar: 'Mar', march: 'Mar',
  apr: 'Apr', april: 'Apr', may: 'May', jun: 'Jun', june: 'Jun', jul: 'Jul', july: 'Jul',
  aug: 'Aug', august: 'Aug', sep: 'Sep', sept: 'Sep', september: 'Sep',
  oct: 'Oct', october: 'Oct', nov: 'Nov', november: 'Nov', dec: 'Dec', december: 'Dec',
};

export const clean = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');

// Names and titles often arrive in capitals ("JOHN DOE"). Mixed case is left alone.
export const tidyCase = (text) => {
  const t = clean(text);
  if (!t) return '';
  const isShouting = t === t.toUpperCase() || t === t.toLowerCase();
  if (!isShouting) return t;
  return t.toLowerCase().replace(/(^|[\s\-'(])([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase());
};

const NAME_PARTICLES = new Set(['van', 'von', 'der', 'den', 'de', 'del', 'della', 'di', 'da', 'du', 'le', 'la', 'bin', 'ibn', 'al', 'el', 'st', 'ten', 'ter']);

// "Mpho James Matli" -> first "Mpho James", last "Matli". Surname particles stay with the surname.
export const splitName = (full) => {
  const raw = clean(full);
  const shouting = raw !== '' && (raw === raw.toUpperCase() || raw === raw.toLowerCase());
  let parts = tidyCase(raw).split(' ').filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  if (shouting) {
    parts = parts.map((w, i) => (i > 0 && i < parts.length - 1 && NAME_PARTICLES.has(w.toLowerCase()) ? w.toLowerCase() : w));
  }
  let cut = parts.length - 1;
  while (cut > 1 && NAME_PARTICLES.has(parts[cut - 1].toLowerCase())) cut -= 1;
  return { firstName: parts.slice(0, cut).join(' '), lastName: parts.slice(cut).join(' ') };
};

/* ------------------------------- dates ------------------------------------ */

const D_MONTH = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const D_ONE = `(?:(?:${D_MONTH}\\.?,?\\s+)?(?:19|20)\\d{2}|(?<!\\d)(?:0?[1-9]|1[0-2])\\s*[/.-]\\s*(?:19|20)\\d{2}|(?<!\\d)(?:0?[1-9]|1[0-2])\\s+(?:19|20)\\d{2})`;
const D_NOW = '(?:present|current|now|ongoing|today|to\\s+date)';
// A single date, or a range such as "Jan 2015 – Present" or "03/2019 to 11/2021".
const RANGE_RE = new RegExp(`${D_ONE}(?:\\s*(?:[-–—]|to|until|till)\\s*(?:${D_ONE}|${D_NOW}))?`, 'i');

const pad2 = (n) => String(n).padStart(2, '0');
const monthNumber = (name) => {
  const i = MONTHS.indexOf(MONTH_LOOKUP[String(name || '').toLowerCase()]);
  return i >= 0 ? pad2(i + 1) : '';
};

/**
 * "2015", "2015 - 2018", "Jan 2015 – Present", "03/2019 to 11/2021", "05 2026 - Present" ...
 * Months are returned as "01".."12", the way the builder's month picker stores them.
 */
export const parseDateRange = (raw) => {
  const text = clean(raw);
  const empty = { startMonth: '', startYear: '', endMonth: '', endYear: '', current: false, startDate: '', endDate: '' };
  if (!text) return empty;

  const current = /\b(present|current|now|ongoing|today|to date)\b/i.test(text);

  const found = [];
  const re = /(?:\b([A-Za-z]{3,9})\.?,?\s+|(?<!\d)(\d{1,2})(?:\s*[/\-.]\s*|\s+))?(?<!\d)((?:19|20)\d{2})(?!\d)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    let month = '';
    if (m[1]) month = monthNumber(m[1]);
    else if (m[2]) {
      const n = parseInt(m[2], 10);
      if (n >= 1 && n <= 12) month = pad2(n);
    }
    found.push({ month, year: m[3] });
  }

  if (found.length === 0) return { ...empty, current, endDate: current ? 'Present' : '' };

  const start = found[0];
  const end = found.length > 1 ? found[1] : null;
  const show = (p) => (p ? [p.month ? MONTHS[parseInt(p.month, 10) - 1] : '', p.year].filter(Boolean).join(' ') : '');

  return {
    startMonth: start.month,
    startYear: start.year,
    endMonth: !current && end ? end.month : '',
    endYear: !current && end ? end.year : '',
    current,
    startDate: show(start),
    endDate: current ? 'Present' : show(end),
  };
};

/* ------------------------------ vocabulary -------------------------------- */

const SECTION_ALIASES = {
  summary: ['summary', 'professional summary', 'career summary', 'executive summary', 'profile', 'professional profile', 'personal profile', 'personal statement', 'career objective', 'objective', 'about me', 'about'],
  experience: ['experience', 'work experience', 'professional experience', 'employment', 'employment history', 'work history', 'career history', 'relevant experience', 'internships', 'internship experience'],
  education: ['education', 'education and training', 'education and qualifications', 'academic background', 'academic qualifications', 'academic history', 'educational background', 'qualifications'],
  skills: ['skills', 'technical skills', 'key skills', 'core skills', 'core competencies', 'competencies', 'skills and tools', 'skills and abilities', 'professional skills', 'areas of expertise', 'expertise', 'technical proficiencies', 'technologies'],
  projects: ['projects', 'personal projects', 'selected projects', 'key projects', 'academic projects', 'portfolio'],
  certificates: ['certifications', 'certificates', 'certifications and training', 'certificates and training', 'training and certification', 'training and certifications', 'licenses and certifications', 'licences and certifications', 'courses', 'courses and certifications', 'certifications and courses', 'training'],
  languages: ['languages', 'language skills'],
  hobbies: ['hobbies', 'interests', 'hobbies and interests', 'interests and hobbies', 'personal interests'],
  references: ['references', 'referees'],
};

const HEADING_LOOKUP = {};
for (const [key, list] of Object.entries(SECTION_ALIASES)) for (const alias of list) HEADING_LOOKUP[alias] = key;

// Only used for ALL-CAPS lines, so "Skills Academy" in bold is not mistaken for a heading.
const FUZZY_HEADINGS = [
  ['experience', /\b(experience|employment)\b/],
  ['education', /\b(education|academic)\b/],
  ['skills', /\b(skills?|competenc\w+|expertise)\b/],
  ['projects', /\bprojects?\b/],
  ['certificates', /\b(certificat\w+|licen[sc]es?)\b/],
  ['languages', /\blanguages?\b/],
  ['hobbies', /\b(hobbies|interests)\b/],
  ['references', /\b(references?|referees?)\b/],
  ['summary', /\b(summary|profile|objective)\b/],
];

const JOB_RE = /\b(?:developer|engineer|designer|manager|analyst|consultant|specialist|administrator|assistant|accountant|architect|officer|director|lead|intern|internship|technician|teacher|lecturer|tutor|nurse|coordinator|executive|supervisor|scientist|programmer|writer|editor|marketer|clerk|representative|associate|owner|founder|freelancer|freelance|student|graduate|artist|strategist|planner|advis[eo]r|attorney|lawyer|driver|operator|receptionist|cashier|agent|trainee|apprentice|researcher|tester|devops|ceo|cto|cfo|coo|president|head|principal|volunteer|technologist|mechanic|electrician|plumber|chef|cook|waiter|waitress|barista)\b/i;

const INSTITUTION_RE = /\b(?:university|college|school|institute|institution|academy|polytechnic|campus|tvet|varsity|faculty|seminary|conservatory)\b/i;

const DEGREE_RE = /(?<![\p{L}])(?:bachelors?|masters?|doctorate|ph\.?d|diploma|degree|certificate|honou?rs|associate|postgraduate|undergraduate|matric|grade\s*1[0-2]|national senior certificate|nqf|b\.?sc|m\.?sc|b\.?com|b\.?tech|m\.?tech|b\.?eng|m\.?eng|b\.?a|m\.?a|mba|hnd|hnc|a-levels?|gcse|high school)(?![\p{L}])/iu;

const ORG_WORD_RE = /\b(?:inc|ltd|llc|plc|corp|corporation|co|company|group|pty|partners|associates|holdings|limited)\b/i;
const CERT_RE = /\b(?:certificate|certification|certified|diploma|course|award|licen[cs]e|programme|program|badge|specialization|specialisation|nanodegree|bootcamp|training|workshop|masterclass)\b/i;
const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const MARITAL_OPTIONS = ['Single', 'Married', 'Divorced', 'Widowed'];
const LICENCE_CODES = ['A1', 'A', 'B', 'C1', 'C', 'EB', 'EC1', 'EC'];

const URL_RE = /(?:https?:\/\/)?(?:www\.)?[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.[a-z]{2,24}(?:\/[^\s|•·,;]*)?/gi;
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const BULLET_RE = /^\s*(?:[•●▪■◦○·‣⁃*\uE000-\uF8FF]|[-–—](?=\s))\s*/;

/* ------------------------------ small helpers ------------------------------ */

const GAP = ' | '; // what a wide horizontal gap in a PDF line becomes in "structured" lines

const wordCount = (t) => clean(t).split(' ').filter(Boolean).length;
const normHeading = (t) =>
  clean(t).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();

const isUpper = (t) => /\p{L}/u.test(t) && t === t.toUpperCase();

const tidySeparators = (t) =>
  clean(t)
    .replace(/\(\s*\)|\[\s*\]/g, ' ')
    .replace(/^[\s|•·,;:–—-]+|[\s|•·,;:–—-]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

const normUrl = (u) => clean(u).toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
const stripProtocol = (u) => clean(u).replace(/^https?:\/\//i, '').replace(/\/+$/, '');
const isUrlText = (t) => /^(?:https?:\/\/)?(?:www\.)?[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.[a-z]{2,24}(?:\/\S*)?$/i.test(clean(t)) && !EMAIL_RE.test(t);

// Text of a block with its wide gaps turned into " | ". Used wherever a line holds several items
// (contact details, skill chips, a job title next to its dates). Running text uses b.text instead.
const sepText = (b) => (Array.isArray(b.cols) && b.cols.length > 1 ? b.cols.map(clean).filter(Boolean).join(GAP) : clean(b.text));

/** Joins blocks into the builder's rich-text format: "- " marks a bullet, plain lines stay plain. */
const richLines = (blocks, { joinPlain = false } = {}) => {
  const lines = [];
  let lastPlain = false;
  for (const b of blocks) {
    const text = clean(b.text);
    if (!text) continue;
    if (b.bullet) {
      lines.push(`- ${text}`);
      lastPlain = false;
    } else if (joinPlain && lastPlain && lines.length) {
      lines[lines.length - 1] += ` ${text}`;
    } else {
      lines.push(text);
      lastPlain = true;
    }
  }
  return lines.join('\n');
};

const sectionOf = (block) => {
  if (block.bullet) return null;
  const t = clean(block.text).replace(/[:：]\s*$/, '');
  if (!t || t.length > 50 || wordCount(t) > 6) return null;
  const exact = HEADING_LOOKUP[normHeading(t)];
  if (exact) return exact;
  if (isUpper(t) && wordCount(t) <= 5 && !/[\d.|•@]/.test(t)) {
    const norm = normHeading(t);
    for (const [key, re] of FUZZY_HEADINGS) if (re.test(norm)) return key;
  }
  return null;
};

/**
 * Turns plain text lines into blocks.
 * Each line is a string or { text, cols, bullet, x, textX, h } (the last four come from a PDF).
 * Wrapped bullet lines are glued back onto their bullet.
 */
export function textToBlocks(input) {
  const lines = Array.isArray(input) ? input : String(input || '').split(/\r?\n/);
  const blocks = [];
  let blankBefore = false;
  for (const line of lines) {
    const obj = typeof line === 'string' ? { text: line } : line;
    const raw = String(obj.text || '').replace(/\u00a0/g, ' ').replace(/\s+([,;])/g, '$1').trim();
    if (!raw) {
      blankBefore = true;
      continue;
    }
    // Lines read from a PDF already know whether they start with a bullet marker.
    const bullet = 'bullet' in obj ? !!obj.bullet : BULLET_RE.test(raw);
    const text = clean('bullet' in obj ? raw : raw.replace(BULLET_RE, ''));
    if (!text) {
      blankBefore = true;
      continue;
    }
    const prev = blocks[blocks.length - 1];

    // Same indent as the text of the bullet above = the bullet wrapped onto another line.
    const indented = !bullet && prev && prev.bullet && prev.textX != null && obj.x != null
      && Math.abs(obj.x - prev.textX) <= (obj.h || 10) * 0.5;
    const lowercaseWrap = !bullet && prev && !blankBefore && /^[a-z(]/.test(text) && !/[.!?:]$/.test(prev.text)
      && (prev.bullet || wordCount(prev.text) >= 6);

    if (indented || lowercaseWrap) {
      prev.text = clean(`${prev.text} ${text}`);
      if (prev.cols) prev.cols = null;
    } else {
      const block = { text, bullet };
      if (Array.isArray(obj.cols) && obj.cols.length > 1) block.cols = obj.cols.map((c) => clean(String(c).replace(/\s+([,;])/g, '$1'))).filter(Boolean);
      if (obj.textX != null) block.textX = obj.textX;
      blocks.push(block);
    }
    blankBefore = false;
  }
  return blocks;
}

/* ---------------------------- dates inside lines --------------------------- */

const D_MONTH_RE = new RegExp(D_MONTH, 'i');

// A date that belongs to a heading line ("Acme | Jan 2020 – Present"), as opposed to one that merely
// appears in a sentence ("increased sales in 2021").
const hasHeaderDate = (text) => {
  const m = text.match(RANGE_RE);
  if (!m) return false;
  const before = text.slice(0, m.index).trim();
  const raw = m[0];
  const rangeLike = /[-–—]|\b(?:to|until|till)\b|present|current|now|ongoing|today/i.test(raw);
  const monthLike = D_MONTH_RE.test(raw) || /^\d{1,2}\s*[/.\s-]/.test(raw);
  if (rangeLike || monthLike) return true;
  return before === '' || /[|(\[,–—•·-]$/.test(before);
};

const dateOnlyLine = (text) => {
  const m = text.match(RANGE_RE);
  return !!m && tidySeparators(text.replace(m[0], ' ')).replace(/[^\p{L}\d]/gu, '') === '';
};

const toIsoDate = (raw) => {
  const t = clean(raw).replace(/\bof\b/gi, ' ');
  let day; let month; let year;
  let m;
  if ((m = t.match(/(\d{4})-(\d{1,2})-(\d{1,2})/))) [, year, month, day] = m;
  else if ((m = t.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})/))) [, day, month, year] = [m[0], m[1], monthNumber(m[2]), m[3]];
  else if ((m = t.match(/([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/))) [, month, day, year] = [m[0], monthNumber(m[1]), m[2], m[3]];
  else if ((m = t.match(/(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{4})/))) {
    // 25/12/1990 is day first; only 12/25/1990 (second number above 12) is read month first.
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    [day, month, year] = b > 12 && a <= 12 ? [m[2], m[1], m[3]] : [m[1], m[2], m[3]];
  } else return '';
  const d = parseInt(day, 10);
  const mo = parseInt(month, 10);
  const y = parseInt(year, 10);
  if (!(d >= 1 && d <= 31 && mo >= 1 && mo <= 12 && y >= 1900 && y <= 2100)) return '';
  return `${y}-${pad2(mo)}-${pad2(d)}`;
};

/* --------------------------------- header ---------------------------------- */

const looksLikeName = (t) => {
  const s = clean(t);
  if (!s || /[\d@|•:/,]/.test(s)) return false;
  const words = s.split(' ');
  if (words.length < 2 || words.length > 5) return false;
  if (!words.every((w) => /^[\p{L}][\p{L}'’.-]*$/u.test(w))) return false;
  if (JOB_RE.test(s)) return false;
  if (HEADING_LOOKUP[normHeading(s)]) return false;
  if (/^(resume|curriculum vitae|cv)\b/i.test(s)) return false;
  return true;
};

const looksLikePlace = (t) => {
  const s = clean(t);
  return /\p{L}/u.test(s) && wordCount(s) <= 8 && !/[:@]/.test(s) && !/^\d+$/.test(s);
};

const LABEL_SPLIT_RE = /\s+(?=(?:nationality|gender|sex|marital|born|date of birth|dob|driver['’]?s?\s+licen[cs]e)\b)/i;
const pickOption = (value, options) => options.find((o) => o.toLowerCase() === clean(value).toLowerCase()) || '';

function parseHeader(blocks) {
  const personal = {};
  const websites = [];
  const addSite = (url) => {
    const shown = stripProtocol(url);
    if (shown && !websites.some((w) => normUrl(w.url) === normUrl(shown))) websites.push({ url: shown });
  };

  const nameIdx = blocks.slice(0, 8).findIndex((b) => !b.bullet && looksLikeName(b.text));
  let profIdx = -1;

  if (nameIdx >= 0) {
    const { firstName, lastName } = splitName(blocks[nameIdx].text);
    personal.firstName = firstName;
    personal.lastName = lastName;

    // The line under the name is usually the job title.
    for (let i = nameIdx + 1; i < Math.min(blocks.length, nameIdx + 3); i += 1) {
      const t = clean(blocks[i].text);
      if (!t || blocks[i].bullet || /[\d@|•·]/.test(t) || wordCount(t) > 8 || EMAIL_RE.test(t)) continue;
      if (JOB_RE.test(t) || (i === nameIdx + 1 && !/,/.test(t) && wordCount(t) <= 6 && !isUrlText(t))) {
        personal.profession = tidyCase(t);
        profIdx = i;
      }
      break;
    }
  }

  const places = [];
  let summaryGuess = '';

  blocks.forEach((block, i) => {
    if (i === nameIdx || i === profIdx) return;
    const whole = clean(block.text);
    if (!whole) return;

    (block.links || []).forEach((l) => {
      if (!l.href || /^mailto:|^tel:/i.test(l.href)) return;
      const label = clean(l.text);
      // Prefer what the person typed when it already looks like an address.
      addSite(isUrlText(label) ? label : l.href);
    });

    // A long paragraph in the header with no heading above it is almost always the summary.
    if (wordCount(whole) >= 20 && !EMAIL_RE.test(whole)) {
      if (!summaryGuess) summaryGuess = whole;
      return;
    }

    // Each wide gap (PDF) or "|" is a boundary, so a phone number can never swallow the address next to it.
    const segments = sepText(block)
      .split(/\s*[|•·●▪;]\s*/)
      .flatMap((seg) => seg.split(LABEL_SPLIT_RE))
      .map(clean)
      .filter(Boolean);

    segments.forEach((segment) => {
      let text = segment;

      const email = text.match(EMAIL_RE);
      if (email) {
        if (!personal.email) personal.email = email[0];
        text = text.replace(email[0], ' ');
      }
      text = text.replace(/\b(?:e-?mail|phone|tel|telephone|mobile|cell|contact|address|location|website|web|portfolio|linkedin|github)\s*:\s*/gi, ' ');

      // Web addresses first, so digits inside a LinkedIn id are never mistaken for a phone number.
      text = text.replace(URL_RE, (hit) => {
        if (/^\d+(\.\d+)*$/.test(hit)) return hit;
        addSite(hit);
        return ' ';
      });

      const phoneHit = text.match(/\(?\+?\d[\d\s().-]{7,}\d/);
      if (phoneHit) {
        // "74 418 7026 14569" is a phone followed by a street number: drop trailing groups until it fits.
        let candidate = phoneHit[0];
        const max = candidate.trim().startsWith('+') ? 15 : 12;
        while (candidate.replace(/\D/g, '').length > max && /\s\S+$/.test(candidate)) candidate = candidate.replace(/\s+\S+$/, '');
        const digits = candidate.replace(/\D/g, '').length;
        if (digits >= 9 && digits <= max) {
          if (!personal.phone) personal.phone = clean(candidate);
          text = text.replace(candidate, ' ');
        }
      }

      text = tidySeparators(text);
      if (!text) return;

      let m;
      if ((m = text.match(/^(?:date of birth|d\.?o\.?b\.?|born|birth ?date|birthday)\s*:?\s*(.+)$/i))) {
        const iso = toIsoDate(m[1]);
        if (iso) personal.dateOfBirth = iso;
        return;
      }
      if ((m = text.match(/^nationality\s*:?\s*(.+)$/i))) {
        personal.nationality = tidyCase(m[1]);
        return;
      }
      if ((m = text.match(/^(?:gender|sex)\s*:?\s*(.+)$/i))) {
        const g = pickOption(m[1], GENDER_OPTIONS);
        if (g) personal.gender = g;
        return;
      }
      if ((m = text.match(/^marital(?:\s+status)?\s*:?\s*(.+)$/i))) {
        const ms = pickOption(m[1], MARITAL_OPTIONS);
        if (ms) personal.maritalStatus = ms;
        return;
      }
      if ((m = text.match(/^driver['’]?s?\s+licen[cs]e(?:\s*(?:code|class)?\s*:?\s*([A-Za-z0-9]{1,3}))?$/i))) {
        personal.hasLicence = true;
        const code = (m[1] || '').toUpperCase();
        if (LICENCE_CODES.includes(code)) personal.licenceCode = code;
        return;
      }
      if (looksLikePlace(text)) places.push(text);
    });
  });

  // An address-like line (with commas) beats a lone word.
  const location = places.find((p) => /,/.test(p)) || places[0] || '';
  if (location) {
    const parts = location.split(',').map(clean).filter(Boolean);
    if (parts.length && /^\d{4,6}$/.test(parts[parts.length - 1]) && parts.length > 1) personal.postalCode = parts.pop();
    if (parts.length > 1 && /^\d/.test(parts[0])) personal.streetAddress = parts.shift();
    if (parts.length) personal.city = parts[0];
    if (parts.length > 1) personal.province = parts.slice(1).join(', ');
  }
  if (websites.length) personal.websites = websites.slice(0, 6);

  return { personal, summaryGuess };
}

/* --------------------------------- skills ---------------------------------- */

function splitTopLevel(text, separators) {
  const out = [];
  let depth = 0;
  let buf = '';
  for (const ch of text) {
    if (ch === '(' || ch === '[') depth += 1;
    if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if (depth === 0 && separators.includes(ch)) {
      out.push(buf);
      buf = '';
    } else buf += ch;
  }
  out.push(buf);
  return out.map(clean).filter(Boolean);
}

// "React (Hooks, Component Architecture)" -> React, Hooks, Component Architecture
// "JavaScript (ES6+)" stays as it is; a long explanation in brackets is dropped.
function expandSkill(item) {
  const m = item.match(/^(.*?)\s*[([]([^)\]]*)[)\]]\s*(.*)$/);
  if (!m) return [item];
  const base = clean(`${m[1]} ${m[3]}`);
  const inner = clean(m[2]);
  if (/[,/]/.test(inner)) return [base, ...inner.split(/[,/]/).map(clean)].filter(Boolean);
  if (inner.length <= 12) return [item];
  return base ? [base] : [item];
}

function parseSkills(blocks, limit = 30) {
  const seen = new Set();
  const out = [];
  const add = (skill) => {
    const s = clean(skill).replace(/[.]+$/, '');
    const key = s.toLowerCase();
    if (!s || s.length > 45 || wordCount(s) > 6 || seen.has(key)) return;
    seen.add(key);
    out.push(s);
  };
  for (const b of blocks) {
    let pieces;
    let cols = Array.isArray(b.cols) && b.cols.length > 1 ? b.cols : null;
    // "Languages & Frontend:" in its own column is a label, not a skill.
    if (cols && /:$/.test(cols[0])) {
      cols = null;
    }
    if (cols) {
      // Skill chips: each gap-separated item is one skill, commas included ("Friendly, positive attitude").
      pieces = cols.flatMap((c) => splitTopLevel(c, ['|', '•', '·', '●', '▪', ';']));
    } else {
      let text = clean(b.text);
      // "Languages & Frontend: A, B, C" -> drop the label.
      const label = text.match(/^([^:]{1,40}):\s*(.+)$/);
      if (label && wordCount(label[1]) <= 6) text = label[2];
      pieces = splitTopLevel(text, [',', ';', '|', '•', '·', '●', '▪']);
    }
    for (const piece of pieces) {
      for (const skill of expandSkill(piece)) {
        add(skill);
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}

/* ------------------------- experience & education -------------------------- */

const STOP_WORDS = new Set(['of', 'and', 'the', 'at', 'in', 'for', 'de', 'la', 'du', 'van', 'der', 'a', '&', 'on', 'to']);

// "Google, Germiston", "Remote", "Resume Builder": a short run of capitalised words, not a sentence.
const looksLikeOrgLine = (text) => {
  const t = clean(text);
  if (!t || /[.!?:]$/.test(t) || wordCount(t) > 7 || hasHeaderDate(t) || BULLET_RE.test(t)) return false;
  const words = t.split(/[\s,]+/).filter((w) => /\p{L}/u.test(w) && !STOP_WORDS.has(w.toLowerCase()));
  if (words.length === 0) return false;
  const capital = words.filter((w) => /^\p{Lu}/u.test(w)).length;
  return capital / words.length >= 0.6;
};

const looksLikeHeader = (text, bold, kind) => {
  if (/[.!?]$/.test(text)) return false;
  if (hasHeaderDate(text)) return true;
  const words = wordCount(text);
  if (bold && words <= 12) return true;
  if (kind === 'experience' && JOB_RE.test(text) && words <= 12) return true;
  if (kind === 'education' && (INSTITUTION_RE.test(text) || DEGREE_RE.test(text)) && words <= 14) return true;
  return /\s[|—–]\s/.test(text) && words <= 14;
};

// A short bare line (a company name, say) followed by a line that is clearly a title or a date
// starts the next entry, even though the bare line says nothing by itself.
const nextIsHeader = (next, text, kind) => {
  if (!next || next.bullet || /[.!?]$/.test(text) || wordCount(text) > 8) return false;
  const nt = sepText(next);
  return nt.length <= 160 && looksLikeHeader(nt, next.bold, kind);
};

/** Groups the blocks of a section into entries: { head: [text...], body: [block...] }. */
function splitEntries(blocks, kind) {
  const entries = [];
  let cur = null;

  const addHead = (entry, text) => {
    entry.head.push(text);
    if (hasHeaderDate(text) && !dateOnlyLine(text)) entry.closed = true;
  };
  const start = (text) => {
    cur = { head: [], body: [], closed: false, orgTaken: false };
    entries.push(cur);
    addHead(cur, text);
  };

  const list = blocks.filter((b) => clean(b.text));
  for (let i = 0; i < list.length; i += 1) {
    const b = list[i];
    const text = clean(b.text);
    const sep = sepText(b);
    if (b.bullet) {
      if (!cur) {
        cur = { head: [], body: [], closed: true, orgTaken: true };
        entries.push(cur);
      }
      cur.body.push(b);
      continue;
    }
    const headish = sep.length <= 160 && wordCount(sep) <= 25;
    if (!cur) {
      if (headish) start(sep);
      continue;
    }
    if (cur.body.length === 0 && !cur.closed && headish && cur.head.length < 3) {
      addHead(cur, sep);
    } else if (cur.body.length === 0 && cur.closed && !cur.orgTaken && cur.head.length === 1 && looksLikeOrgLine(sep)) {
      // "Title | dates" followed by "Employer, City" on the next line.
      cur.head.push(sep);
      cur.orgTaken = true;
    } else if (headish && (looksLikeHeader(sep, b.bold, kind) || nextIsHeader(list[i + 1], text, kind))) {
      start(sep);
    } else {
      cur.body.push(b);
    }
  }
  return entries;
}

const splitParts = (line, kind) => {
  const sep = kind === 'experience' ? /\s*\|\s*|\s+[•·]\s+|\s+[—–]\s+|\s+-\s+|\s+@\s+|\s+at\s+/i : /\s*\|\s*|\s+[•·]\s+|\s+[—–]\s+|\s+-\s+/;
  const parts = line.split(sep).map(tidySeparators).filter(Boolean);
  // "Software Engineer, Acme Corp" -> two parts.
  if (parts.length === 1 && /,/.test(parts[0])) {
    const [first, ...rest] = parts[0].split(',').map(clean);
    const isTitle = kind === 'experience' ? JOB_RE.test(first) : (DEGREE_RE.test(first) || INSTITUTION_RE.test(first));
    if (isTitle && rest.length && kind === 'experience') return [first, rest.join(', ')];
    // "Diploma in Marketing, Central Business College" -> degree, institution (+ place).
    if (kind === 'education') {
      const chunks = parts[0].split(',').map(clean).filter(Boolean);
      const d = chunks.findIndex((c) => DEGREE_RE.test(c));
      const i = chunks.findIndex((c, idx) => idx !== d && INSTITUTION_RE.test(c));
      if (d >= 0 && i >= 0) {
        const more = chunks.filter((_, idx) => idx !== d && idx !== i);
        return [chunks[d], [chunks[i], ...more].join(', ')];
      }
    }
  }
  return parts;
};

const isPlace = (p) =>
  /^[\p{L} .'-]+,\s*[\p{L} .'-]+(?:,\s*[\p{L} .'-]+)?$/u.test(p) && !JOB_RE.test(p) && wordCount(p) <= 6;

// "Google, Germiston" -> { name: "Google", place: "Germiston" }
const splitOrgPlace = (text) => {
  const m = clean(text).match(/^([^,]+),\s*(.+)$/);
  if (m && wordCount(m[2]) <= 4 && !ORG_WORD_RE.test(m[2]) && !/[&]/.test(m[2]) && /\p{L}/u.test(m[2])) return { name: clean(m[1]), place: clean(m[2]) };
  return { name: clean(text), place: '' };
};

function headInfo(entry, kind) {
  let dateRaw = '';
  const parts = [];
  for (const raw of entry.head) {
    let line = clean(raw);
    const m = line.match(RANGE_RE);
    if (m && !dateRaw && hasHeaderDate(line)) {
      dateRaw = m[0];
      line = tidySeparators(line.replace(m[0], ' '));
    }
    if (line) parts.push(...splitParts(line, kind));
  }
  return { parts, range: parseDateRange(dateRaw) };
}

function entryToJob(entry) {
  const { parts, range } = headInfo(entry, 'experience');
  const rest = [...parts];
  const jobIdx = rest.findIndex((p) => JOB_RE.test(p));
  const title = jobIdx >= 0 ? rest.splice(jobIdx, 1)[0] : rest.shift() || '';
  let location = '';
  const placeIdx = rest.findIndex(isPlace);
  if (rest.length >= 2 && placeIdx >= 0) location = rest.splice(placeIdx, 1)[0];
  let employer = rest.shift() || '';
  if (!location && rest.length) location = rest.shift();

  if (/^(?:remote|hybrid|on-?site)$/i.test(employer) && !location) {
    location = employer;
    employer = '';
  }
  if (employer && !location) {
    const split = splitOrgPlace(employer);
    employer = split.name;
    location = split.place;
  }
  const remote = /^remote$/i.test(location);

  return {
    title: tidyCase(title),
    employer,
    location: remote ? '' : location,
    remote,
    ...range,
    achievements: richLines(entry.body),
  };
}

function entryToEducation(entry) {
  const { parts, range } = headInfo(entry, 'education');
  const instIdx = parts.findIndex((p) => INSTITUTION_RE.test(p));
  const degIdx = parts.findIndex((p, i) => i !== instIdx && DEGREE_RE.test(p));
  let institution = '';
  let degree = '';
  if (instIdx >= 0) institution = parts[instIdx];
  if (degIdx >= 0) degree = parts[degIdx];
  const others = parts.filter((_, i) => i !== instIdx && i !== degIdx);
  if (!institution && degIdx < 0) institution = others.shift() || '';
  else if (!institution && others.length) institution = others.shift();
  if (!degree && others.length) degree = others.shift();

  // "Diploma, Information Technology" -> degree + field of study.
  let field = '';
  const dm = degree.match(/^([^,]+),\s*(.+)$/);
  if (dm && DEGREE_RE.test(dm[1]) && wordCount(dm[2]) <= 6) {
    degree = clean(dm[1]);
    field = clean(dm[2]);
  }
  // "University of Cape Town, South Africa" -> institution + location.
  let location = '';
  if (institution) {
    const split = splitOrgPlace(institution);
    institution = split.name;
    location = split.place;
  }

  // For a qualification the last year found is the graduation year.
  const gradYear = range.endYear || range.startYear;
  const gradMonth = range.endYear ? range.endMonth : range.startMonth;
  return { institution, location, degree, field, gradMonth, gradYear, achievements: richLines(entry.body) };
}

/* --------------------------- projects & certificates ----------------------- */

function parseProjects(blocks) {
  const entries = [];
  let cur = null;
  for (const b of blocks) {
    const text = clean(b.text);
    if (!text) continue;
    if (b.bullet) {
      if (!cur) {
        cur = { title: '', lines: [], hasBody: false, titleBold: false };
        entries.push(cur);
      }
      cur.lines.push(b);
      cur.hasBody = true;
      continue;
    }
    const sep = sepText(b);
    const short = wordCount(sep) <= 14 && !/[.!?]$/.test(sep);
    const startsNew = !cur
      || (cur.hasBody && short)
      || (!cur.hasBody && b.bold && cur.titleBold && short && !b.italic);
    if (startsNew) {
      cur = { title: sep, lines: [], hasBody: false, titleBold: !!b.bold };
      entries.push(cur);
    } else {
      cur.lines.push(b);
      if (wordCount(text) > 14) cur.hasBody = true;
    }
  }
  return entries
    .filter((e) => e.title || e.lines.length)
    .map((e) => {
      // "Remopdf | remopdf.site": the address on the right is the project's link.
      const parts = e.title.split(/\s+\|\s+/).map(clean).filter(Boolean);
      const link = parts.find(isUrlText) || '';
      const title = parts.filter((p) => p !== link).join(' — ') || e.title;
      return { title, link: link ? stripProtocol(link) : '', description: richLines(e.lines) };
    });
}

const FILLER_RE = /\b(?:completed|issued|earned|obtained|awarded|expected|graduated|since)\b\s*:?/gi;

function parseCertificateLine(raw) {
  const text = clean(raw);
  const parts = text.split(/\s+[|•·]\s+|\s+[—–]\s+|\s+-\s+/).map(clean).filter(Boolean);
  let dateRaw = '';
  const rest = [];
  for (const p of parts) {
    const m = p.match(RANGE_RE);
    if (!m || !hasHeaderDate(p)) {
      rest.push(p);
      continue;
    }
    if (!dateRaw) dateRaw = m[0];
    const remainder = tidySeparators(tidySeparators(p.replace(m[0], ' ')).replace(FILLER_RE, ' '));
    if (/\p{L}/u.test(remainder)) rest.push(remainder);
  }
  let name = rest[0] || '';
  let issuer = '';
  if (rest.length >= 2) {
    issuer = rest[rest.length - 1];
    name = rest.slice(0, -1).join(' — ');
    const short = clean(issuer.replace(/\s*\([^)]*\)\s*/g, ' '));
    if (short) issuer = short;
  }
  const range = parseDateRange(dateRaw);
  const year = range.endYear || range.startYear;
  const month = range.endYear ? range.endMonth : range.startMonth;
  return { name, issuer, date: [month, year].filter(Boolean).join(' '), link: '', lines: [] };
}

/**
 * One line per certificate ("Name — Issuer • Mar 2025") or several lines each
 * ("Name | May 2020", then the issuer, then its link, then a description).
 */
function parseCertificates(blocks) {
  const certs = [];
  let cur = null;
  for (const b of blocks) {
    const sep = sepText(b);
    const text = clean(b.text);
    if (!text) continue;
    if (cur && !b.bullet && isUrlText(text)) {
      if (!cur.link) cur.link = stripProtocol(text);
      continue;
    }
    const nameLike = !b.bullet && wordCount(sep) <= 20 && !/[.!?]$/.test(sep)
      && (hasHeaderDate(sep) || /\s[|—–]\s/.test(sep) || CERT_RE.test(sep));
    if (!cur || nameLike) {
      cur = parseCertificateLine(sep);
      certs.push(cur);
    } else if (!cur.issuer && cur.lines.length === 0 && !b.bullet && wordCount(text) <= 6 && !/[.!?]$/.test(text)) {
      cur.issuer = text;
    } else {
      cur.lines.push(b);
    }
  }
  return certs
    .filter((c) => c.name)
    .map(({ lines, ...c }) => ({ ...c, description: richLines(lines) }));
}

/* ----------------------------- languages & rest ---------------------------- */

// The builder's five levels: Basic, Conversational, Advanced, Fluent, Native.
const LEVEL_WORDS = [
  [/^(?:native|mother|bilingual)$/i, 'Native'],
  [/^(?:fluent|c2)$/i, 'Fluent'],
  [/^(?:advanced|proficient|professional|business|working|c1|b2)$/i, 'Advanced'],
  [/^(?:intermediate|conversational|b1)$/i, 'Conversational'],
  [/^(?:basic|beginner|elementary|limited|a1|a2)$/i, 'Basic'],
];
const levelOf = (token) => {
  const hit = LEVEL_WORDS.find(([re]) => re.test(token));
  return hit ? hit[1] : '';
};

function parseLanguages(blocks) {
  const out = [];
  const seen = new Set();
  let last = null;
  const push = (name, level) => {
    const clean1 = tidyCase(name);
    const key = clean1.toLowerCase();
    if (!clean1 || wordCount(clean1) > 3 || /\d/.test(clean1) || seen.has(key)) return;
    seen.add(key);
    last = { name: clean1, level };
    out.push(last);
  };

  for (const b of blocks) {
    // Gap-separated items (a PDF's "French [bars] Native English [bars] Advanced") are units of their own.
    const units = Array.isArray(b.cols) && b.cols.length > 1
      ? b.cols
      : splitTopLevel(clean(b.text), [',', ';', '|', '•', '·', '●', '▪']);
    for (const unit of units) {
      let acc = [];
      const tokens = clean(unit).replace(/\s[–—-]\s/g, ' ').replace(/[():]/g, ' ').split(' ').filter(Boolean);
      for (const token of tokens) {
        const lv = levelOf(token);
        if (/^tongue$/i.test(token)) continue;
        if (/^(?:and|&)$/i.test(token)) {
          if (acc.length) push(acc.join(' '), '');
          acc = [];
        } else if (lv) {
          if (acc.length) push(acc.join(' '), lv);
          else if (last && !last.level) last.level = lv;
          acc = [];
        } else acc.push(token);
      }
      if (acc.length) push(acc.join(' '), '');
    }
  }
  return out;
}

/* --------------------------------- main ------------------------------------ */

/** Turns blocks of resume text into what ResumeBuilder's handleImport expects. */
export function parseResumeBlocks(input) {
  const blocks = (Array.isArray(input) ? input : [])
    .map((b) => ({ ...b, text: clean(b && b.text) }))
    .filter((b) => b.text);

  const sections = { header: [] };
  let current = 'header';
  for (const b of blocks) {
    const key = sectionOf(b);
    if (key) {
      current = key;
      if (!sections[key]) sections[key] = [];
    } else {
      sections[current].push(b);
    }
  }

  const { personal, summaryGuess } = parseHeader(sections.header);

  const summarySource = sections.summary || [];
  const summary = summarySource.length ? richLines(summarySource, { joinPlain: true }) : summaryGuess;

  const experiences = splitEntries(sections.experience || [], 'experience')
    .map(entryToJob)
    .filter((j) => j.title || j.employer);
  const educations = splitEntries(sections.education || [], 'education')
    .map(entryToEducation)
    .filter((e) => e.institution || e.degree);

  const skills = parseSkills(sections.skills || []);
  const projects = parseProjects(sections.projects || []);
  const certificates = parseCertificates(sections.certificates || []);
  const languages = parseLanguages(sections.languages || []);
  const hobbies = richLines(sections.hobbies || []);

  const refText = (sections.references || []).map((b) => b.text).join(' ');
  const references = /available\s+(?:upon|on)\s+request/i.test(refText) ? { availableUponRequest: true } : null;

  const out = { personal, experiences, educations, skills, summary };
  if (projects.length) out.projects = projects;
  if (certificates.length) out.certificates = certificates;
  if (languages.length) out.languages = languages;
  if (hobbies) out.hobbies = hobbies;
  if (references) out.references = references;
  return out;
}

/** How many separate areas of the resume were filled; used to decide whether to trust the result. */
export function countFilledAreas(parsed) {
  if (!parsed) return 0;
  const p = parsed.personal || {};
  return [
    p.firstName || p.email || p.phone,
    p.websites && p.websites.length,
    p.city,
    parsed.summary,
    parsed.experiences && parsed.experiences.length,
    parsed.educations && parsed.educations.length,
    parsed.skills && parsed.skills.length,
    parsed.projects && parsed.projects.length,
    parsed.certificates && parsed.certificates.length,
    parsed.languages && parsed.languages.length,
  ].filter(Boolean).length;
}
