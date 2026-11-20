/*
  Does the resume meet the experience and education the job asks for?

    analyseRequirements(target, resumeData, now?) -> { items: [item], handled: Set<string> }

  Why this exists: the Job match panel used to show "5 years' sales experience" and "Matric" as grey chips and say
  nothing more. Years of experience were never compared with the work history at all, and an education level was only
  looked for as a word ("Grade 12" is not "Matric"; a Diploma was never compared with a degree). This reads the advert's
  own lines and answers, for each requirement, "what does the job ask for, what does your resume show, and how far
  short is it?" in plain sentences.

  It reads BOTH sources the advert reader fills in: target.requirements (the advert's lines, up to 200 characters) and
  the keywords that are qualifications. It does not depend on the AI having tagged anything as a "credential", so it
  works the same whichever way the advert came in (link, pasted text, or typed title with O*NET). One line can hold
  two requirements ("Matric and 5 years' sales experience"): both are found.

  Plain counting on the device, like atsScore.js: no network, nothing stored, updates on every keystroke.

  item = {
    id, kind: 'experience' | 'education',
    title,            "5 years in sales"  /  "Bachelor’s degree in marketing"
    need, have,       the two short phrases shown side by side
    status,           experience: met | short | none | unproven | unknown | empty
                      education:  met | below | partial | unknown | none
    tone,             'met' | 'gap' | 'soft'  (how the card is coloured)
    pill,             the short label on the card ("3 years 11 months short")
    headline,         one line for the written review
    detail, fix,      what the situation is, and what to do about it
    must,             the advert makes it a requirement (not just "preferred")
    ratio?,           experience only: 0..1 of the years asked for that the resume shows
    jobs?,            experience only: [{ name, months, counted, via, dated }] so the person sees what was counted
  }

  Honesty is part of the design, because this tells a real person what to put on a real resume:
    - it never suggests a date, a figure or a qualification to add: every "fix" says to add something only where it is
      true, and says plainly when the resume cannot close a gap;
    - years are worked out from the dates the person typed; dates are never "stretched";
    - a requirement that cannot be checked (no dates, an unreadable qualification) is reported as such, never guessed.
*/

import { norm, hasTerm, stripMarkup } from './atsScore.js';
import { isQualification } from './skillFilter.js';

const asList = (value) => (Array.isArray(value) ? value : []);
const isObj = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value) => (typeof value === 'string' ? value.trim() : '');
const flat = (value) => stripMarkup(value).replace(/\s+/g, ' ').trim();
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/* -------------------------------------------------------------------------- */
/*                         reading the advert's requirements                  */
/* -------------------------------------------------------------------------- */

const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, fifteen: 15, twenty: 20 };
const NUM = '(\\d{1,2}(?:[.,]\\d)?|one|two|three|four|five|six|seven|eight|nine|ten|twelve|fifteen|twenty)';
const toNumber = (value) => {
  const word = WORDS[String(value).toLowerCase()];
  if (word) return word;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

// "5 years", "5+ years", "3-5 years", "five (5) years", "18 months". The trailing apostrophe is taken too ("5 years' sales").
const yearsRegex = () => new RegExp(`\\b${NUM}\\s*(?:\\+|plus)?\\s*(?:(?:-|\\u2013|\\u2014|to)\\s*${NUM}\\s*(?:\\+|plus)?\\s*)?(years?|yrs?|months?)(?![a-z])['\\u2019]?`, 'gi');

const PREFERRED_RE = /\b(preferred|preferably|advantage|advantageous|an asset|ideal(?:ly)?|desirable|nice to have|bonus|a plus|beneficial)\b/i;
// "or equivalent", "or relevant experience": the advert itself says the requirement is not rigid.
const ALTERNATIVE_RE = /\bor\s+(?:equivalent|comparable)\b|\bequivalent\s+(?:qualification|experience)|\bin\s+lieu\b|\bor\s+(?:relevant|similar|extensive)\s+(?:work\s+)?experience/i;
const RELATED_RE = /\b(?:or|and\/or)\s+(?:an?\s+)?(?:related|relevant|similar|equivalent|comparable)\b/i;

// Words that say how, not what: dropped from the start and end of a field ("relevant sales" -> "sales").
const GENERIC = new Set([
  'relevant', 'related', 'similar', 'proven', 'previous', 'prior', 'working', 'work', 'practical', 'hands-on', 'hands', 'on', 'minimum', 'min',
  'of', 'at', 'least', 'an', 'a', 'the', 'environment', 'field', 'industry', 'sector', 'role', 'roles', 'position', 'positions', 'capacity',
  'setting', 'background', 'direct', 'solid', 'strong', 'demonstrable', 'demonstrated', 'professional', 'general', 'equivalent', 'total',
  'overall', 'your', 'in', 'as', 'with', 'within', 'and', 'or', 'year', 'years', 'experience', 'exposure', 'studies', 'discipline', 'subject',
]);
// Not a line of work: "5 years in a fast-paced environment".
const NOT_A_FIELD = /\b(?:fast[- ]?paced|high[- ]?pressure|dynamic|target[- ]?driven|teams?|deadlines?|multi[- ]?task\w*)\b/gi;
// Where the next, separate requirement starts: "...in sales and Matric", "...in retail with a valid licence".
const CUT = /\s+(?:and|with|plus|&)\s+(?:an?\s+)?(?:matric|grade|gr\b|diploma|degree|bachelor|nqf|certificate|valid|proven|strong|excellent|good|knowledge|proficien)/i;

const cleanField = (raw) => {
  const words = String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9&+#/ '\u2019-]/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^['\u2019-]+|['\u2019-]+$/g, ''))
    .filter(Boolean);
  let a = 0;
  let b = words.length;
  while (a < b && GENERIC.has(words[a])) a += 1;
  while (b > a && GENERIC.has(words[b - 1])) b -= 1;
  const kept = words.slice(a, b).slice(0, 4).join(' ').replace(NOT_A_FIELD, ' ').replace(/\s+/g, ' ').trim();
  return kept.length < 3 ? '' : kept;
};

const FIELD_CHARS = "[a-z0-9&+#/ '\\u2019-]";

// What line of work the years are in: "5 years' SALES experience", "experience IN SALES", "at least 5 years AS A STORE MANAGER",
// "retail experience of 5 years".
const fieldFor = (lead, rest) => {
  const clause = rest.split(/[.;\n,]/)[0].split(CUT)[0];

  const around = new RegExp(`^\\s*(?:of\\s+)?(${FIELD_CHARS}{0,50}?)\\s*\\bexperience\\b(?:\\s*(?:in|as|of|within|with|working(?:\\s+in)?)\\s+(?:an?\\s+|the\\s+)?(${FIELD_CHARS}{2,50}))?`, 'i').exec(clause);
  if (around) {
    const field = cleanField(around[1]) || cleanField(around[2]);
    if (field) return field;
  }

  const after = new RegExp(`^\\s*(?:of\\s+)?(?:in|as|within|working\\s+in)\\s+(?:an?\\s+|the\\s+)?(${FIELD_CHARS}{2,50})`, 'i').exec(clause);
  if (after) {
    const field = cleanField(after[1]);
    if (field) return field;
  }

  const before = new RegExp(`(${FIELD_CHARS}{2,50}?)\\s+experience\\s*(?:of|:|-|\\u2013)?\\s*(?:at least|a minimum of|minimum of|minimum|min\\.?|over|more than)?\\s*$`, 'i').exec(lead);
  return before ? cleanField(before[1]) : '';
};

// One line of the advert -> the experience requirements in it (usually zero or one).
const parseExperience = (raw) => {
  const line = String(raw || '').replace(/\(\s*\d{1,2}\s*\)/g, ' ');
  const found = [];
  const re = yearsRegex();
  let match = re.exec(line);
  while (match) {
    const lead = line.slice(0, match.index);
    const rest = line.slice(match.index + match[0].length);
    const unit = match[3].toLowerCase();
    const low = toNumber(match[1]);
    const next = match[2] ? toNumber(match[2]) : NaN;
    const years = unit.startsWith('m') ? low / 12 : low;
    const field = fieldFor(lead, rest);

    // "the last 5 years", "5 years old": a period, not a required length of experience.
    const aPeriod = /\b(?:last|past|previous|within|over the|in the)\s*$/i.test(lead) || /^\s*(?:old|ago)\b/i.test(rest);
    // "valid for 3 years": needs the word "experience" nearby, or "years in / years as".
    const aboutExperience = /\b(experience|exposure|track record|background)\b/i.test(line) || /^\s*(?:of\s+)?(?:in|as|within|working)\b/i.test(rest);

    if (Number.isFinite(years) && years > 0 && years <= 40 && !aPeriod && aboutExperience) {
      found.push({
        id: `exp:${Math.round(years * 12)}:${field}`,
        kind: 'experience',
        raw: String(raw).trim(),
        years,
        maxYears: Number.isFinite(next) ? (unit.startsWith('m') ? next / 12 : next) : null,
        field,
      });
    }
    match = re.exec(line);
  }
  return found;
};

/* ----------------------------- education levels ----------------------------- */

// Lowest to highest. `ad` reads an advert (strict: a bare "certificate" in an advert is usually a short course or a
// licence, not a level); `entry` reads what the person typed in their own Degree box (lenient).
const LEVELS = [
  { rank: 7, name: 'Doctorate', ad: '(?:ph\\.?\\s?d|doctorate|doctoral|nqf\\s*(?:level\\s*)?10)(?:\\s+degree)?' },
  { rank: 6, name: 'Master\u2019s degree', ad: '(?:master[\'\\u2019]s|masters|master\\s+(?:of|degree)|m\\.?\\s?sc|m\\.?\\s?com|m\\.?\\s?tech|mba|nqf\\s*(?:level\\s*)?9)(?:\\s+degree)?' },
  { rank: 5, name: 'Honours or postgraduate qualification', ad: 'honou?rs(?:\\s+degree)?|post[- ]?graduate(?:\\s+(?:diploma|degree|certificate|qualification))?|pgdip|nqf\\s*(?:level\\s*)?8' },
  { rank: 4, name: 'Bachelor\u2019s degree', ad: 'bachelor[\'\\u2019]?s?(?:\\s+(?:degree|of))?|b\\.?\\s?sc|b\\.?\\s?com|b\\.?\\s?tech|ba|b\\.?\\s?ed|llb|advanced\\s+diploma|nqf\\s*(?:level\\s*)?7|degree' },
  { rank: 3, name: 'Diploma', ad: 'national\\s+diploma|diploma|advanced\\s+certificate|n[4-6]|nqf\\s*(?:level\\s*)?6' },
  { rank: 2, name: 'Certificate', ad: 'higher\\s+certificate|national\\s+certificate|n[1-3]|nqf\\s*(?:level\\s*)?5', entry: 'certificate|certification' },
];
const MATRIC = { rank: 1, name: 'Matric' };
// Matric is taken out first so "National Senior Certificate" is not read as a certificate.
const MATRIC_SOURCE = '(?:national\\s+)?senior\\s+certificate|matric(?:ulation)?|nsc|grade\\s*12|gr\\.?\\s*12|(?:high|secondary)\\s*school(?:\\s+(?:diploma|certificate|education|qualification|leaving))?|nqf\\s*(?:level\\s*)?4';

const levelRegex = (source) => new RegExp(`\\b(?:${source})(?![a-z0-9])`, 'gi');
const LEVELS_DOWN = [...LEVELS].sort((a, b) => b.rank - a.rank);

// The levels an advert line names, highest first, each text span removed once found so "Master's degree" is not also "degree".
const levelsIn = (line, mode) => {
  const hits = [];
  let work = String(line || '');
  const take = (level, source) => {
    if (!levelRegex(source).test(work)) return;
    hits.push(level);
    work = work.replace(levelRegex(source), ' ');
  };
  take(MATRIC, MATRIC_SOURCE);
  LEVELS_DOWN.forEach((level) => take(level, mode === 'entry' && level.entry ? `${level.ad}|${level.entry}` : level.ad));
  return { hits };
};

// What subject the advert names: "degree IN MARKETING or a related field" -> ['marketing']. Only a subject that follows the
// level directly counts ("Bachelor of Commerce", "Diploma/Degree in Logistics"); "Diploma and 5 years in sales" names none.
const ALL_LEVELS = LEVELS.map((level) => level.ad).join('|');
const SUBJECT_CHARS = "[a-z&+#/ ,'\\u2019-]";
const subjectsFor = (line) => {
  const m = new RegExp(
    `\\b(?:${ALL_LEVELS})(?![a-z0-9])(?:\\s*\\([^)]*\\))?(?:\\s*(?:\\/|,|\\bor\\b)\\s*(?:${ALL_LEVELS})(?![a-z0-9]))*(?:\\s+(?:degree|diploma|certificate|qualification))?\\s+(?:in|of)\\s+(?:an?\\s+|the\\s+)?([a-z]${SUBJECT_CHARS}{2,70})`,
    'i'
  ).exec(String(line));
  if (!m) return [];
  const piece = m[1].split(/\b(?:with|plus|preferably|from|who|that|and\s+(?:at\s+least|minimum))\b/i)[0];
  return piece
    .split(/\s*(?:,|\bor\b|\band\b|\/)\s*/i)
    .map(cleanField)
    .filter(Boolean)
    .slice(0, 4);
};

const parseEducation = (raw) => {
  const line = String(raw || '');
  const { hits } = levelsIn(line, 'ad');
  if (!hits.length) return [];

  const out = [];
  const alt = ALTERNATIVE_RE.test(line);
  const related = RELATED_RE.test(line);

  const higher = hits.filter((h) => h.rank > 1);
  if (hits.some((h) => h.rank === 1)) {
    out.push({ id: 'edu:1:', kind: 'education', raw: line.trim(), rank: 1, name: MATRIC.name, subjects: [], alt, related: false });
  }
  if (higher.length) {
    // "Diploma or degree": either will do, so the lowest of them is what is required.
    const sorted = [...higher].sort((a, b) => a.rank - b.rank);
    const rank = sorted[0].rank;
    const name = [...new Set(sorted.map((h) => h.name))].join(' or ');
    const subjects = subjectsFor(line);
    out.push({ id: `edu:${rank}:${subjects.join('+')}`, kind: 'education', raw: line.trim(), rank, name, subjects, alt, related });
  }
  return out;
};

const collectLines = (target) => {
  const t = target || {};
  return [
    ...asList(t.requirements).map((r) => ({ raw: text(r), kw: null })),
    ...asList(t.keywords)
      .filter((k) => k && typeof k === 'object' && text(k.term) && (k.kind === 'credential' || isQualification(k.term)))
      .map((k) => ({ raw: text(k.term), kw: k })),
  ].filter((l) => l.raw);
};

/* -------------------------------------------------------------------------- */
/*                               reading the resume                           */
/* -------------------------------------------------------------------------- */

const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const monthOf = (value) => {
  const s = String(value ?? '').trim();
  if (!s) return 0;
  if (/^\d{1,2}$/.test(s)) {
    const n = Number(s);
    return n >= 1 && n <= 12 ? n : 0;
  }
  return MONTH_NAMES.indexOf(s.slice(0, 3).toLowerCase()) + 1;
};
const yearOf = (value) => {
  const m = /\b(?:19|20)\d{2}\b/.exec(String(value ?? ''));
  return m ? Number(m[0]) : 0;
};

// A job as a run of whole months { start, end } (both counted). A missing month (an imported resume) counts as the middle
// of the year at both ends, so the guess is as likely to be a little under as a little over. No start (or, for a job
// that has ended, no end) means it cannot be counted.
const jobSpan = (job, nowIndex) => {
  const startYear = yearOf(job.startYear);
  if (!startYear) return null;
  const start = startYear * 12 + (monthOf(job.startMonth) || 6) - 1;
  let end;
  if (job.current) {
    end = nowIndex;
  } else {
    const endYear = yearOf(job.endYear);
    if (!endYear) return null;
    end = endYear * 12 + (monthOf(job.endMonth) || 6) - 1;
  }
  end = Math.min(end, nowIndex);
  return end < start ? null : { start, end };
};

// Months covered by these runs, overlaps counted once (two jobs held at the same time are not two years in one year).
const mergeMonths = (spans) => {
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  let total = 0;
  let current = null;
  sorted.forEach((span) => {
    if (current && span.start <= current.end + 1) {
      current.end = Math.max(current.end, span.end);
    } else {
      if (current) total += current.end - current.start + 1;
      current = { ...span };
    }
  });
  if (current) total += current.end - current.start + 1;
  return total;
};

const workOf = (data, nowIndex) => {
  const jobs = asList(data && data.experiences)
    .filter(isObj)
    .map((job) => {
      const title = text(job.title);
      const employer = text(job.employer);
      const achievements = flat(job.achievements);
      return {
        name: title && employer ? `${title} at ${employer}` : title || employer || 'An untitled job',
        title: norm(title),
        body: norm(achievements),
        any: Boolean(title || employer || achievements),
        span: jobSpan(job, nowIndex),
      };
    })
    .filter((job) => job.any);
  const dated = jobs.filter((job) => job.span);
  return { jobs, dated, totalMonths: mergeMonths(dated.map((job) => job.span)) };
};

const sameWord = (a, b) => a === b || (Math.min(a.length, b.length) >= 6 && a.slice(0, 6) === b.slice(0, 6));
const significant = (phrase) => norm(phrase).split(' ').filter((w) => w.length >= 3 && !GENERIC.has(w));

// Is this line of work mentioned in this (already normalised) text? "sales" matches "Sales Representative"; "customer service"
// matches a text that has both words; "sales or marketing" matches either.
const mentions = (field, normalised) => {
  const words = normalised.split(' ').filter(Boolean);
  return field
    .split(/\s+(?:or|and)\s+|\//i)
    .some((alternative) => {
      const tokens = significant(alternative);
      if (!tokens.length) return false;
      return hasTerm(normalised, alternative) || tokens.every((token) => words.some((word) => sameWord(word, token)));
    });
};

const educationOf = (data) => {
  const raw = data && data.education;
  const list = Array.isArray(raw) ? raw : isObj(raw) ? [raw] : [];
  const entries = list
    .filter(isObj)
    .map((entry) => {
      const degree = text(entry.degree);
      const field = text(entry.field);
      const institution = text(entry.institution);
      const details = flat(entry.achievements);
      let rank = Math.max(0, ...levelsIn(`${degree} ${field}`, 'entry').hits.map((h) => h.rank));
      if (!rank && levelsIn(institution, 'entry').hits.some((h) => h.rank === 1)) rank = 1;
      return { degree, field, institution, details, rank, any: Boolean(degree || field || institution || text(entry.achievements)) };
    })
    .filter((entry) => entry.any);
  const top = entries.reduce((best, entry) => (!best || entry.rank > best.rank ? entry : best), null);
  return {
    entries,
    top,
    rank: top ? top.rank : 0,
    normalised: norm(entries.map((e) => `${e.degree} ${e.field} ${e.details}`).join('\n')),
  };
};

/* -------------------------------------------------------------------------- */
/*                                 the answers                                */
/* -------------------------------------------------------------------------- */

export const formatMonths = (months) => {
  const total = Math.round(months);
  if (total <= 0) return '0 months';
  const years = Math.floor(total / 12);
  const rest = total % 12;
  return [years && plural(years, 'year'), rest && plural(rest, 'month')].filter(Boolean).join(' ');
};

const DONT_STRETCH = 'Do not stretch your dates to close the gap: employers check them.';

const checkExperience = (req, work) => {
  const needMonths = Math.round(req.years * 12);
  const asked = formatMonths(needMonths);
  const field = req.field;
  const title = field ? `${asked} in ${field}` : `${asked} of experience`;
  const needText = req.maxYears && req.maxYears > req.years ? `${asked} to ${formatMonths(Math.round(req.maxYears * 12))}${field ? ` in ${field}` : ''}` : title;

  const counted = (job) => {
    if (!job.span) return { counted: false, via: null };
    if (!field) return { counted: true, via: null };
    if (mentions(field, job.title)) return { counted: true, via: 'title' };
    if (mentions(field, job.body)) return { counted: true, via: 'lines' };
    return { counted: false, via: null };
  };
  const jobs = work.jobs.map((job) => ({
    name: job.name,
    dated: Boolean(job.span),
    months: job.span ? job.span.end - job.span.start + 1 : null,
    ...counted(job),
  }));
  const hits = work.dated.filter((job) => counted(job).counted);
  const months = field ? mergeMonths(hits.map((job) => job.span)) : work.totalMonths;
  const ratio = needMonths ? Math.max(0, Math.min(1, months / needMonths)) : 1;
  const base = { id: req.id, kind: 'experience', title, need: needText, ratio, jobs: jobs.slice(0, 5), raw: req.raw, must: req.must };

  let status;
  if (!work.jobs.length) status = 'empty';
  else if (!work.dated.length) status = 'unknown';
  else if (months >= needMonths) status = 'met';
  else if (field && months === 0) status = work.totalMonths >= needMonths ? 'unproven' : 'none';
  else status = 'short';

  const short = formatMonths(needMonths - months);
  const total = formatMonths(work.totalMonths);
  const mentioned = hits.filter((job) => counted(job).via === 'lines').length;

  switch (status) {
    case 'met':
      return {
        ...base, status, tone: 'met', pill: 'Met', ratio: 1,
        have: `${formatMonths(months)}${field ? ` in ${field}` : ''}`,
        headline: `You meet the ${title} the job asks for`,
        detail: field
          ? `The jobs on your resume that mention ${field} add up to ${formatMonths(months)}, which covers the ${asked} the job asks for${mentioned ? `. ${mentioned === 1 ? 'One of them counts' : `${mentioned} of them count`} because the lines under the job mention ${field}, not the title, so make sure those lines really show it` : ''}.`
          : `The dates in your work history add up to ${formatMonths(months)}, which covers the ${asked} the job asks for.`,
        fix: '',
      };
    case 'short':
      return {
        ...base, status, tone: 'gap', pill: `${short} short`,
        have: `${formatMonths(months)}${field ? ` in ${field}` : ''}`,
        headline: `${short} short of the ${title} the job asks for`,
        detail: `The job asks for ${title}. ${field ? `The jobs on your resume that mention ${field} add up to ${formatMonths(months)}` : `The dates in your work history add up to ${formatMonths(months)}`}, so you are ${short} short.${
          field && work.totalMonths >= needMonths ? ` Your work history is ${total} in all, so the time may be there but not written down as ${field} work.` : ''
        }`,
        fix: `${field && work.totalMonths >= needMonths ? `If some of your other jobs did include ${field} work, say so in the lines of the job where you did it. ` : ''}If you held an earlier job that is not on your resume, add it with its real dates. ${DONT_STRETCH} If the rest of your match is strong, apply anyway and say plainly what you do have.`,
      };
    case 'none':
      return {
        ...base, status, tone: 'gap', pill: 'Not shown',
        have: field ? `No ${field} work shown` : 'No experience counted',
        headline: `Nothing on your resume shows the ${title} the job asks for`,
        detail: `The job asks for ${title}. None of the titles or lines in your work history mention ${field}, and your work history adds up to ${total} in all, which is under the ${asked} asked for.`,
        fix: `If you have done ${field} work, in a job or outside one, add it as a job or a line with its real dates. If you have not, leave it out. ${DONT_STRETCH} Strong results in the work you have done can still carry an application, so lead with those.`,
      };
    case 'unproven':
      return {
        ...base, status, tone: 'gap', pill: 'Not shown',
        have: `${total} of work, none marked ${field}`,
        headline: `Your resume does not show your ${field} experience`,
        detail: `The job asks for ${title}. Your work history adds up to ${total}, but no job title or line mentions ${field}, so neither a scan nor a recruiter can tell that any of it counts.`,
        fix: `If you have done ${field} work in one or more of these jobs, say so in the lines of the job where you did it: what you did, who it was for and what came of it. If you have not, do not add it.`,
      };
    case 'unknown':
      return {
        ...base, status, tone: 'soft', pill: 'No dates',
        have: 'Your jobs have no dates',
        headline: 'Your jobs cannot be counted without dates',
        detail: `The job asks for ${title}, and the years are worked out from the start and end dates of your jobs. None of yours has a start date, so there is nothing to count. A recruiter makes this sum first.`,
        fix: 'Add the month and year you started and finished each job, or tick \u201CI currently work here\u201D for the one you still hold.',
      };
    default:
      return {
        ...base, status: 'empty', tone: 'gap', pill: 'Missing',
        have: 'No work history',
        headline: `Your work history is empty, so the ${title} cannot be shown`,
        detail: `The job asks for ${title}. Your work history is empty, so there is nothing to count.`,
        fix: 'Add the jobs you have held, with their dates. With no paid jobs yet, add voluntary work, an internship or a project.',
      };
  }
};

const checkEducation = (req, edu) => {
  const subject = req.subjects.length ? req.subjects.join(' or ') : '';
  const title = `${req.name}${subject ? ` in ${subject}` : ''}`;
  const base = { id: req.id, kind: 'education', title, need: title, raw: req.raw, must: req.must };
  const topName = edu.top ? [edu.top.degree, edu.top.field].filter(Boolean).join(' in ') : '';
  const level = edu.rank ? [MATRIC, ...LEVELS].find((l) => l.rank === edu.rank).name : '';
  const haveText = topName || level || 'Nothing readable';

  if (!edu.entries.length) {
    return {
      ...base, status: 'none', tone: 'gap', pill: 'Missing', have: 'Education is empty',
      headline: `You list no qualification, and the job asks for ${title}`,
      detail: `The job asks for ${title}. Your Education section is empty, so a scan finds no qualification at all.`,
      fix: `If you hold ${req.name === 'Matric' ? 'Matric' : `a ${req.name.toLowerCase()}`}, add it in the Education step${req.rank === 1 ? ': write \u201CMatric\u201D or \u201CNational Senior Certificate\u201D in the Degree box, with your school and the year' : ''}. If you do not, leave it out. ${req.alt ? 'The advert also accepts equivalent experience, so let your work history carry it.' : 'Strong, relevant experience can still carry an application.'}`,
    };
  }

  if (!edu.rank) {
    return {
      ...base, status: 'unknown', tone: 'soft', pill: 'Level unclear', have: `${haveText}, level not stated`,
      headline: 'Your qualification\u2019s level is not clear',
      detail: `The job asks for ${title}. Your Education step has an entry, but its Degree box does not say what level it is, so a scan cannot tell whether it meets this.`,
      fix: 'Write the name of the qualification in the Degree box (for example \u201CNational Diploma\u201D, \u201CBCom\u201D or \u201CMatric\u201D) and the subject under Field of study.',
    };
  }

  if (edu.rank < req.rank) {
    const steps = req.rank - edu.rank;
    return {
      ...base, status: 'below', tone: 'gap', pill: 'Below', have: haveText,
      headline: `Your highest qualification is below the ${req.name.toLowerCase()} the job asks for`,
      detail: `The job asks for ${title}. The highest qualification on your resume is ${haveText}, which is ${steps === 1 ? 'one level' : `${steps} levels`} below that.`,
      fix: `${req.alt ? 'The advert also accepts equivalent experience, so lead with your years of relevant work and say what you studied. ' : 'This is a real gap, and the resume cannot close it: do not list a qualification you do not hold. '}If you are studying towards it now, add it and write \u201Cin progress\u201D or your expected year in the Details box.`,
    };
  }

  // The level is met. For Matric, a higher qualification means it was held, but a scan looks for the word.
  const implied = req.rank === 1 && edu.rank > 1;
  const fieldMissing = subject && !req.subjects.some((s) => mentions(s, edu.normalised));
  if (fieldMissing) {
    return {
      ...base, status: 'partial', tone: 'soft', pill: 'Subject not shown', have: haveText,
      headline: `The job names ${subject}, and your education does not`,
      detail: `Your ${haveText} meets the level the job asks for, but the job names ${subject} and nothing in your Education step mentions it.${req.related ? ' The advert says related fields are accepted, so yours may still count.' : ''}`,
      fix: `If your studies covered ${subject} (a module, a major, a project), say so in the Details box of that qualification. If they did not, leave it, and let your work history show the skill.`,
    };
  }
  return {
    ...base, status: 'met', tone: 'met', pill: 'Met', have: haveText, fix: '',
    headline: `You meet the ${title} the job asks for`,
    detail: implied
      ? `Your highest qualification is ${haveText}, which sits above Matric, so you meet the level. A scan looks for the word, so if you hold Matric you can also add it as its own line under Education.`
      : `Your ${haveText} meets the level the job asks for.`,
  };
};

const STATUS_RANK = { met: 2, soft: 1, gap: 0 };

export function analyseRequirements(target, data, now = new Date()) {
  const nowIndex = now.getFullYear() * 12 + now.getMonth();
  const reqs = new Map();
  const handled = new Set();

  collectLines(target).forEach(({ raw, kw }) => {
    const found = [...parseExperience(raw), ...parseEducation(raw)];
    if (!found.length) return;
    if (kw) handled.add(norm(kw.term));
    const must = kw ? kw.must === true : !PREFERRED_RE.test(raw);
    found.forEach((req) => {
      const prior = reqs.get(req.id);
      if (prior) {
        prior.must = prior.must || must;
        prior.alt = prior.alt || req.alt;
      } else {
        reqs.set(req.id, { ...req, must });
      }
    });
  });

  if (!reqs.size) return { items: [], handled };

  const work = workOf(data, nowIndex);
  const edu = educationOf(data);
  const items = [...reqs.values()]
    .map((req) => (req.kind === 'experience' ? checkExperience(req, work) : checkEducation(req, edu)))
    // What still needs attention first, the advert's must-haves before its nice-to-haves.
    .map((item, index) => ({ item, index }))
    .sort((a, b) => STATUS_RANK[a.item.tone] - STATUS_RANK[b.item.tone] || Number(Boolean(b.item.must)) - Number(Boolean(a.item.must)) || a.index - b.index)
    .map(({ item }) => item);

  return { items, handled };
}

