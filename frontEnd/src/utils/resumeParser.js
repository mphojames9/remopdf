/* -------------------------------------------------------------------------- */
/*  Resume import.                                                            */
/*                                                                            */
/*  1. The file is read in the browser (resumeFileText.js) and its sections   */
/*     are parsed locally (resumeTextParser.js). This finds the name, title,  */
/*     location, links, summary, skills, jobs, education, projects and        */
/*     certificates, which the API below cannot return.                       */
/*  2. Only if that finds too little (a .doc file, a scanned PDF) is the file */
/*     sent to the APILayer Resume Parser through your own endpoint (Vite     */
/*     proxy in dev, serverless function in production), which adds the API   */
/*     key on the server so it never reaches the bundle.                      */
/*                                                                            */
/*  APILayer returns:                                                         */
/*    { name, email, skills: [], education: [{ name, dates }],                */
/*      experience: [{ title, dates, location, organization }] }              */
/*  Every field can be missing, so everything below is defensive.             */
/* -------------------------------------------------------------------------- */

import { fileToBlocks } from './resumeFileText.js';
import { parseResumeBlocks, countFilledAreas, parseDateRange, splitName, tidyCase, clean } from './resumeTextParser.js';

export { parseDateRange };

const ENDPOINT = import.meta.env?.VITE_RESUME_PARSER_URL || '/api/resume-parser';

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_EXTENSIONS = ['pdf', 'doc', 'docx'];

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

const mapSkills = (skills, limit = 30) => {
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

const isAbort = (err) => err?.name === 'AbortError';
const throwIfAborted = (signal) => {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
};

/** Sends the file to the API proxy. Resolves with mapped data, or throws a ResumeParseError. */
async function parseWithApi(file, signal) {
  let response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: file,
      signal,
    });
  } catch (err) {
    if (isAbort(err)) throw err;
    throw new ResumeParseError('Could not reach the resume service. Check your connection and try again.', 0);
  }

  if (!response.ok) throw new ResumeParseError(friendlyStatus(response.status), response.status);

  let json;
  try {
    json = await response.json();
  } catch {
    throw new ResumeParseError("We couldn't read the response from the resume service.", response.status);
  }
  return mapParsedResume(json);
}

// Keeps whatever the local reader found and fills only the gaps from the API.
const mergeResults = (local, api) => {
  const personal = { ...(api.personal || {}) };
  for (const [key, value] of Object.entries(local.personal || {})) {
    const filled = Array.isArray(value) ? value.length > 0 : value !== '' && value != null;
    if (filled) personal[key] = value;
  }
  const pick = (a, b) => (a && a.length ? a : b);
  return {
    ...api,
    ...local,
    personal,
    experiences: pick(local.experiences, api.experiences),
    educations: pick(local.educations, api.educations),
    skills: pick(local.skills, api.skills),
    summary: local.summary || api.summary || '',
  };
};

const hasAnything = (p) =>
  hasValue(p.personal) || p.experiences.length > 0 || p.educations.length > 0 || p.skills.length > 0
  || Boolean(p.summary) || Boolean(p.projects?.length) || Boolean(p.certificates?.length);

// A local result with this many filled areas (name/contact, links, summary, skills ...) is trusted as is.
const CONFIDENT_AREAS = 3;

// meta tells the UI which reader produced the result: "local" (read in the browser), "api"
// (the APILayer backup) or "merged". handleImport ignores it.
const withMeta = (parsed, source, localError) => ({
  ...parsed,
  meta: { source, localError: localError ? String(localError.message || localError) : '' },
});

/** Reads the file and resolves with parsed data ready for handleImport. */
export async function parseResumeFile(file, signal) {
  const problem = validateResumeFile(file);
  if (problem) throw new ResumeParseError(problem, 0);

  // 1. Read it here in the browser.
  let local = null;
  let localError = null;
  try {
    local = parseResumeBlocks(await fileToBlocks(file));
  } catch (err) {
    localError = err;
    console.error('[resume import] the browser reader failed, falling back to the API:', err);
  }
  throwIfAborted(signal);
  if (local && countFilledAreas(local) >= CONFIDENT_AREAS) {
    console.info('[resume import] read in the browser,', countFilledAreas(local), 'areas found');
    return withMeta(local, 'local');
  }

  // 2. Too little found (or an unreadable file type): ask the API and fill the gaps.
  try {
    const api = await parseWithApi(file, signal);
    const merged = local ? mergeResults(local, api) : api;
    if (hasAnything(merged)) return withMeta(merged, local ? 'merged' : 'api', localError);
  } catch (err) {
    if (isAbort(err)) throw err;
    // The API is only the backup. If the local reader found something, use it.
    if (!(local && countFilledAreas(local) > 0)) throw err;
  }

  if (local && countFilledAreas(local) > 0) return withMeta(local, 'local');
  throw new ResumeParseError("We couldn't find any details in that resume.", 0);
}
