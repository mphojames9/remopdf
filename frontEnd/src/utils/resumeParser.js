/* -------------------------------------------------------------------------- */
/*  Resume parsing via the APILayer Resume Parser API.                        */
/*                                                                            */
/*  The browser never talks to APILayer directly. It posts the file to your   */
/*  own endpoint (a Vite proxy in dev, a serverless function in production),  */
/*  which adds the API key on the server. That keeps the key out of the       */
/*  bundle and avoids CORS problems.                                          */
/*                                                                            */
/*  APILayer returns:                                                         */
/*    { name, email, skills: [], education: [{ name, dates }],                */
/*      experience: [{ title, dates, location, organization }] }              */
/*  Every field can be missing, so everything below is defensive.             */
/* -------------------------------------------------------------------------- */

const ENDPOINT = import.meta.env?.VITE_RESUME_PARSER_URL || '/api/resume-parser';

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_EXTENSIONS = ['pdf', 'doc', 'docx'];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LOOKUP = {
  jan: 'Jan', january: 'Jan', feb: 'Feb', february: 'Feb', mar: 'Mar', march: 'Mar',
  apr: 'Apr', april: 'Apr', may: 'May', jun: 'Jun', june: 'Jun', jul: 'Jul', july: 'Jul',
  aug: 'Aug', august: 'Aug', sep: 'Sep', sept: 'Sep', september: 'Sep',
  oct: 'Oct', october: 'Oct', nov: 'Nov', november: 'Nov', dec: 'Dec', december: 'Dec',
};

const clean = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');

// Parsers often return names in capitals ("JOHN DOE"). Mixed case is left alone.
const tidyCase = (text) => {
  const t = clean(text);
  if (!t) return '';
  const isShouting = t === t.toUpperCase() || t === t.toLowerCase();
  if (!isShouting) return t;
  return t.toLowerCase().replace(/(^|[\s\-'(])([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase());
};

const splitName = (full) => {
  const parts = tidyCase(full).split(' ').filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
};

/**
 * "2015", "2015 - 2018", "Jan 2015 – Present", "03/2019 to 11/2021" ...
 * Returns the pieces the builder stores for a job.
 */
export const parseDateRange = (raw) => {
  const text = clean(raw);
  const empty = { startMonth: '', startYear: '', endMonth: '', endYear: '', current: false, startDate: '', endDate: '' };
  if (!text) return empty;

  const current = /\b(present|current|now|ongoing|today|to date)\b/i.test(text);

  // Each match is an optional month (name or number) followed by a four-digit year.
  const found = [];
  const re = /(?:\b([A-Za-z]{3,9})\.?,?\s+|\b(\d{1,2})\s*[\/\-.]\s*)?\b((?:19|20)\d{2})\b/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    let month = '';
    if (m[1]) month = MONTH_LOOKUP[m[1].toLowerCase()] || '';
    else if (m[2]) {
      const n = parseInt(m[2], 10);
      if (n >= 1 && n <= 12) month = MONTHS[n - 1];
    }
    found.push({ month, year: m[3] });
  }

  if (found.length === 0) return { ...empty, current, endDate: current ? 'Present' : '' };

  const start = found[0];
  const end = found.length > 1 ? found[1] : null;
  const fmt = (p) => (p ? [p.month, p.year].filter(Boolean).join(' ') : '');

  return {
    startMonth: start.month,
    startYear: start.year,
    endMonth: !current && end ? end.month : '',
    endYear: !current && end ? end.year : '',
    current,
    startDate: fmt(start),
    endDate: current ? 'Present' : fmt(end),
  };
};

const mapJob = (item) => {
  const range = parseDateRange(item?.dates);
  const location = clean(item?.location);
  return {
    title: tidyCase(item?.title),
    employer: clean(item?.organization),
    location,
    city: location,
    ...range,
  };
};

const mapEducation = (item) => {
  const range = parseDateRange(item?.dates);
  // For a qualification the last year found is the graduation year.
  const gradYear = range.endYear || range.startYear;
  const gradMonth = range.endYear ? range.endMonth : range.startMonth;
  return {
    institution: clean(item?.name),
    degree: clean(item?.degree),
    gradMonth,
    gradYear,
    date: [gradMonth, gradYear].filter(Boolean).join(' '),
  };
};

const mapSkills = (skills, limit = 15) => {
  if (!Array.isArray(skills)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of skills) {
    const text = clean(typeof raw === 'string' ? raw : raw?.name);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
};

const hasValue = (obj) => Object.values(obj).some((v) => v !== '' && v !== false && v != null);

/** Turns APILayer's JSON into what ResumeBuilder's handleImport expects. */
export const mapParsedResume = (api) => {
  const data = api && typeof api === 'object' ? api : {};
  const { firstName, lastName } = splitName(data.name);

  const personal = {
    firstName,
    lastName,
    email: clean(data.email),
    phone: clean(data.phone || data.mobile_number || data.mobile),
  };

  return {
    personal,
    experiences: (Array.isArray(data.experience) ? data.experience : []).map(mapJob).filter(hasValue),
    educations: (Array.isArray(data.education) ? data.education : []).map(mapEducation).filter(hasValue),
    skills: mapSkills(data.skills),
    summary: clean(data.summary || data.objective),
  };
};

export class ResumeParseError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ResumeParseError';
    this.status = status;
  }
}

const friendlyStatus = (status) => {
  if (status === 401 || status === 403) return 'The resume service rejected our API key. Please try again later.';
  if (status === 413) return 'That file is too large. Try one under 5 MB.';
  if (status === 429) return 'The monthly import limit has been reached. Please try again later.';
  if (status >= 500) return 'The resume service is having trouble. Please try again in a moment.';
  return "We couldn't read that file. Try a different PDF or Word document.";
};

export const validateResumeFile = (file) => {
  if (!file) return 'Choose a file to import.';
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!ACCEPTED_EXTENSIONS.includes(ext)) return 'Please choose a PDF or Word document (.pdf, .doc, .docx).';
  if (file.size === 0) return 'That file is empty.';
  if (file.size > MAX_RESUME_BYTES) return 'That file is too large. Try one under 5 MB.';
  return '';
};

/** Uploads the file and resolves with parsed data ready for handleImport. */
export async function parseResumeFile(file, signal) {
  const problem = validateResumeFile(file);
  if (problem) throw new ResumeParseError(problem, 0);

  let response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: file,
      signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new ResumeParseError('Could not reach the resume service. Check your connection and try again.', 0);
  }

  if (!response.ok) throw new ResumeParseError(friendlyStatus(response.status), response.status);

  let json;
  try {
    json = await response.json();
  } catch {
    throw new ResumeParseError("We couldn't read the response from the resume service.", response.status);
  }

  const parsed = mapParsedResume(json);
  const gotAnything =
    hasValue(parsed.personal) || parsed.experiences.length > 0 || parsed.educations.length > 0 || parsed.skills.length > 0;
  if (!gotAnything) throw new ResumeParseError("We couldn't find any details in that resume.", response.status);

  return parsed;
}
