// One place for every date shown on a resume, so each template prints them the same way:
//
//   "Jan 2020"            a month and a year
//   "Jan 2020 – Present"  a range (always an en dash with spaces, open end written "Present")
//
// Anything that is not recognised as a date is left exactly as typed (a lone year such as "2018" stays "2018").
//
//   formatDate(text)            one date                       "05 2026"            -> "May 2026"
//   formatRange(text)           a date or a range              "05 2026 - current"  -> "May 2026 – Present"
//   formatDateText(text)        like formatRange, but only when the whole text is a date, so sentences are never touched
//   withFormattedDates(data)    a list of entries ([...] or { items: [...] }) with every date field formatted

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Full names and the usual abbreviations only, so words such as "Marketing 2020" are never read as "Mar 2020".
const MONTH_NAMES = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4, jun: 5, june: 5,
  jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

const OPEN_ENDED = /^(present|current|now|ongoing|today)$/i;
const YEAR = /^\d{4}$/;

const label = (monthIndex, year) => (monthIndex >= 0 && monthIndex <= 11 ? `${MONTHS[monthIndex]} ${year}` : null);
const named = (word) => MONTH_NAMES[String(word).toLowerCase()] ?? -1;

// "May 2026" for a recognised date, otherwise null.
export const parseDate = (raw) => {
  const t = String(raw ?? '').trim();
  if (!t) return null;
  let m;
  if ((m = /^(\d{4})[\s/.-]+(\d{1,2})(?:[\s/.-]+\d{1,2})?(?:T.*)?$/.exec(t))) return label(+m[2] - 1, m[1]); // 2026-05, 2026-05-14, 2026/5
  if ((m = /^(\d{1,2})[\s/.-]+(\d{4})$/.exec(t))) return label(+m[1] - 1, m[2]); // 05 2026, 5/2026
  if ((m = /^(\d{1,2})[\s/.-]+(\d{1,2})[\s/.-]+(\d{4})$/.exec(t))) return label((+m[2] > 12 ? +m[1] : +m[2]) - 1, m[3]); // 14/05/2026, day first
  if ((m = /^([A-Za-z]{3,9})\.?,?\s+(\d{4})$/.exec(t))) { const i = named(m[1]); return i >= 0 ? label(i, m[2]) : null; } // May 2026, Sept 2026
  if ((m = /^\d{1,2}(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})$/.exec(t))) { const i = named(m[1]); return i >= 0 ? label(i, m[2]) : null; } // 10 September 2026
  if ((m = /^([A-Za-z]{3,9})\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+(\d{4})$/.exec(t))) { const i = named(m[1]); return i >= 0 ? label(i, m[2]) : null; } // September 10, 2026
  return null;
};

export const formatDate = (raw) => {
  const t = String(raw ?? '').trim();
  if (OPEN_ENDED.test(t)) return 'Present';
  return parseDate(t) ?? t;
};

// "2018-2021" and "Jan 2020-Mar 2021" (hyphen with no spaces) become ranges; "2026-05" stays a single date.
const splitRange = (raw) => String(raw ?? '')
  .trim()
  .replace(/(\d{4})\s*-\s*(?=\d{4}\b|[A-Za-z])/g, '$1 – ')
  .split(/\s*[–—]\s*|\s+-\s+|\s+to\s+/i);

export const formatRange = (raw) => {
  const t = String(raw ?? '').trim();
  if (!t) return '';
  return splitRange(t).map(formatDate).join(' – ');
};

export const formatDateText = (raw) => {
  const t = String(raw ?? '').trim();
  if (!t) return raw;
  const parts = splitRange(t);
  const isDatePart = (p) => parseDate(p) !== null || YEAR.test(p.trim());
  const ok = parts.every((p) => isDatePart(p) || OPEN_ENDED.test(p.trim())) && parts.some(isDatePart);
  return ok ? parts.map(formatDate).join(' – ') : raw;
};

// One entry (a certificate, a project): date-named fields, separate month fields ("10" -> "Oct"),
// and any other field whose whole value is a date.
const formatEntryDates = (item) => {
  if (!item || typeof item !== 'object') return item;
  const out = { ...item };
  Object.keys(out).forEach((k) => {
    const v = out[k];
    if (typeof v !== 'string' && typeof v !== 'number') return;
    if (/date|issued|expir|valid/i.test(k) && typeof v === 'string') out[k] = formatRange(v);
    else if (/month/i.test(k) && /^\s*\d{1,2}\s*$/.test(String(v)) && +v >= 1 && +v <= 12) out[k] = MONTHS[+v - 1];
    else if (typeof v === 'string') out[k] = formatDateText(v);
  });
  return out;
};

// Certificates, projects and the like arrive as { enabled, items: [...] } (a plain array works too).
export const withFormattedDates = (data) => {
  if (Array.isArray(data)) return data.map(formatEntryDates);
  if (data && typeof data === 'object' && Array.isArray(data.items)) return { ...data, items: data.items.map(formatEntryDates) };
  return data;
};
