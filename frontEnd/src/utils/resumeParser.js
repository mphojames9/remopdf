// resumeParser.js
// Client-side resume text extraction + best-effort field parsing, used by
// the "Import from an old resume" feature in ResumeBuilder.
//
// Requires two small libraries:
//   npm install pdfjs-dist mammoth

import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Point pdf.js at a worker build matching the installed version. If your
// bundler doesn't like loading the worker from a CDN, swap this for a local
// worker import instead - see the pdf.js "Setup" docs for your bundler.
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/** Reads a .pdf, .docx, or .txt file and returns its plain text content. */
export async function extractTextFromFile(file) {
  const name = file.name.toLowerCase();

  if (name.endsWith('.pdf')) {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item) => item.str).join(' ') + '\n';
    }
    return text;
  }

  if (name.endsWith('.docx')) {
    const buffer = await file.arrayBuffer();
    const { value } = await mammoth.extractRawText({ arrayBuffer: buffer });
    return value;
  }

  if (name.endsWith('.txt')) {
    return file.text();
  }

  throw new Error('Please upload a PDF, DOCX, or TXT resume.');
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;
const ADDRESS_RE = /\b([A-Za-z][A-Za-z\s]*),\s*([A-Za-z\s]+?)\s+(\d{4,6}|[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d)\b/;
const MONTHS = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December';
const MONTH_YEAR = new RegExp(`(${MONTHS})[a-z]*\\.?\\s*(\\d{4})`, 'i');
// Month-name based range: "Jan 2020 - Dec 2022", "January 2020 to Present"
const DATE_RANGE_RE = new RegExp(
  `(${MONTHS})[a-z]*\\.?\\s*\\d{4}\\s*(?:-|–|—|to)\\s*(?:(${MONTHS})[a-z]*\\.?\\s*\\d{4}|present|current)`,
  'i'
);
// Numeric range: "01/2020 - 12/2022", "01.2020 - Present"
const NUMERIC_RANGE_RE = /\b(0?[1-9]|1[0-2])[\/.](\d{4})\s*(?:-|–|—|to)\s*(?:(0?[1-9]|1[0-2])[\/.](\d{4})|present|current)\b/i;
// Year-only range: "2020 - 2022", "2020-Present"
const YEAR_RANGE_RE = /\b((?:19|20)\d{2})\s*(?:-|–|—|to)\s*((?:19|20)\d{2}|present|current)\b/i;
const YEAR_RE = /\b(19|20)\d{2}\b/;
const NUMERIC_DATE_RE = /\b(0?[1-9]|1[0-2])[\/.](\d{4})\b/;
const DEGREE_RE = /\b(Bachelor|Master|Associate|Diploma|Certificate|B\.?Sc\.?|B\.?S\.?|B\.?A\.?|M\.?Sc\.?|M\.?S\.?|M\.?A\.?|MBA|Ph\.?D\.?)\b/i;
const SCHOOL_RE = /\b(University|College|Institute|Academy|Polytechnic)\b/i;
const HONORS_RE = /dean'?s list|cum laude|honou?rs|distinction/i;

// Section headings used to know where one part of the resume ends and the
// next begins, so a section-scoped search (education, skills, summary)
// doesn't run on past its own section into the next one. Kept broad since
// resumes label the same section many different ways.
const SECTION_HEADINGS_RE =
  /^(education|academic background|work\s+experience|experience|professional experience|employment(?:\s+history)?|career history|skills|technical skills|core competencies|key skills|areas of expertise|summary|professional summary|career summary|executive summary|objective|profile|projects|certifications|awards|references)\b/i;

const EXPERIENCE_HEADING_RE =
  /^(work\s+experience|professional experience|experience|employment(?:\s+history)?|career history)\b/i;
const SKILLS_HEADING_RE = /^(skills|technical skills|core competencies|key skills|areas of expertise)\b/i;
const SUMMARY_HEADING_RE = /^(summary|professional summary|career summary|executive summary|objective|profile)\b/i;

/** Tries a month-name range, then a numeric MM/YYYY range, then a bare
 * year range, and normalizes whichever matches into one shape. Returns
 * null if the line doesn't look like a date range at all. */
function matchDateRange(line) {
  let m = line.match(DATE_RANGE_RE);
  if (m) {
    const [rangeText] = m;
    const [startStr, endStr] = rangeText.split(/-|–|—|to/i).map((s) => s.trim());
    const startMY = startStr.match(MONTH_YEAR);
    const current = /present|current/i.test(endStr);
    const endMY = current ? null : endStr.match(MONTH_YEAR);
    return {
      startMonth: startMY ? startMY[1] : '',
      startYear: startMY ? startMY[2] : '',
      endMonth: endMY ? endMY[1] : '',
      endYear: endMY ? endMY[2] : '',
      current,
    };
  }

  m = line.match(NUMERIC_RANGE_RE);
  if (m) {
    const current = /present|current/i.test(m[0]);
    return {
      startMonth: m[1],
      startYear: m[2],
      endMonth: current ? '' : m[3] || '',
      endYear: current ? '' : m[4] || '',
      current,
    };
  }

  m = line.match(YEAR_RANGE_RE);
  if (m) {
    const current = /present|current/i.test(m[2]);
    return { startMonth: '', startYear: m[1], endMonth: '', endYear: current ? '' : m[2], current };
  }

  return null;
}

/** Collects the lines belonging to a section, starting right after its
 * heading and stopping at the next recognized heading (or maxLines). */
function collectSection(lines, headerIdx, maxLines = 25) {
  const out = [];
  for (let i = headerIdx + 1; i < lines.length && out.length < maxLines; i++) {
    if (SECTION_HEADINGS_RE.test(lines[i])) break;
    out.push(lines[i]);
  }
  return out;
}

/** Splits a "Bachelor of Science in Computer Science" / "BSc, Computer
 * Science" / "BA Marketing" style line into { degree, field }. */
function splitDegreeLine(line) {
  const inSplit = line.split(/\bin\b/i);
  if (inSplit.length > 1) {
    return { degree: inSplit[0].trim(), field: inSplit.slice(1).join(' in ').trim() };
  }
  if (line.includes(',')) {
    const commaSplit = line.split(',');
    return { degree: (commaSplit[0] || '').trim(), field: (commaSplit[1] || '').trim() };
  }
  // No "in" and no comma: a degree keyword directly followed by the field,
  // e.g. "BA Marketing" or "BSc Computer Science"
  const degreeMatch = line.match(DEGREE_RE);
  if (degreeMatch) {
    return {
      degree: degreeMatch[0],
      field: line.slice(degreeMatch.index + degreeMatch[0].length).trim(),
    };
  }
  return { degree: line.trim(), field: '' };
}

/** Best-effort extraction of the EducationField.jsx fields from a resume's
 * "Education" section. */
function parseEducation(lines) {
  const headerIdx = lines.findIndex((l) => /^(education|academic background)\b/i.test(l));
  if (headerIdx === -1) return {};

  const section = collectSection(lines, headerIdx);

  let institution = '', location = '', degree = '', field = '';

  // Some resumes put degree and institution on one line, e.g.
  // "BA Marketing, Tshwane University of Technology, Pretoria" - handle
  // that before falling back to treating them as separate lines.
  const comboLine = section.find((l) => DEGREE_RE.test(l) && SCHOOL_RE.test(l));
  if (comboLine) {
    const parts = comboLine.split(/,| \| /).map((s) => s.trim()).filter(Boolean);
    const degreePart = parts.find((p) => DEGREE_RE.test(p));
    const schoolPart = parts.find((p) => SCHOOL_RE.test(p));
    const rest = parts.filter((p) => p !== degreePart && p !== schoolPart);
    if (degreePart) ({ degree, field } = splitDegreeLine(degreePart));
    institution = schoolPart || '';
    location = rest.join(', ');
  } else {
    const schoolLine = section.find((l) => SCHOOL_RE.test(l));
    if (schoolLine) {
      const parts = schoolLine.split(/,| \| /).map((s) => s.trim());
      institution = parts[0] || '';
      location = parts.slice(1).join(', ');
    }

    const degreeLine = section.find((l) => DEGREE_RE.test(l));
    if (degreeLine) {
      ({ degree, field } = splitDegreeLine(degreeLine));
    }
  }

  let gradMonth = '', gradYear = '';
  const monthYearLine = section.find((l) => MONTH_YEAR.test(l));
  if (monthYearLine) {
    const [, m, y] = monthYearLine.match(MONTH_YEAR);
    gradMonth = m;
    gradYear = y;
  } else {
    const numericLine = section.find((l) => NUMERIC_DATE_RE.test(l));
    if (numericLine) {
      const [, m, y] = numericLine.match(NUMERIC_DATE_RE);
      gradMonth = m;
      gradYear = y;
    } else {
      const yearLine = section.find((l) => YEAR_RE.test(l));
      if (yearLine) gradYear = yearLine.match(YEAR_RE)[0];
    }
  }

  const honorsLine = section.find((l) => HONORS_RE.test(l));
  const achievements = honorsLine ? `• ${honorsLine}` : '';

  return { institution, location, degree, field, gradMonth, gradYear, achievements };
}

/** Best-effort extraction of a flat list of skill strings from a resume's
 * "Skills" section (comma / bullet / pipe separated). */
function parseSkills(lines) {
  const headerIdx = lines.findIndex((l) => SKILLS_HEADING_RE.test(l));
  if (headerIdx === -1) return [];

  const section = collectSection(lines, headerIdx, 8);
  const joined = section.join(', ');

  return joined
    .split(/[,•|;\u2022]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 40 && s.split(/\s+/).length <= 4);
}

/** Best-effort extraction of a "Summary" / "Objective" / "Profile" section
 * as a single string, for Summary.jsx. */
function parseSummary(lines) {
  const headerIdx = lines.findIndex((l) => SUMMARY_HEADING_RE.test(l));
  if (headerIdx === -1) return '';

  const section = collectSection(lines, headerIdx, 6);
  return section.join(' ').trim();
}

/**
 * Best-effort extraction of the fields ResumeBuilder's PersonalInfo,
 * ExperienceField, EducationField, SkillsField, and Summary steps use.
 * This is a heuristic, not a guarantee - always show the result to the
 * person for review before treating it as final.
 */
export function parseResumeText(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const email = (text.match(EMAIL_RE) || [])[0] || '';
  const phone = (text.match(PHONE_RE) || [])[0]?.trim() || '';

  // Name: first line that reads like "First Last" and isn't an email/date
  const nameLine =
    lines.find((l) => /^[A-Z][a-zA-Z.'-]+(\s+[A-Z][a-zA-Z.'-]+){1,3}$/.test(l) && !l.includes('@')) || '';
  const [firstName = '', ...rest] = nameLine.split(/\s+/);
  const lastName = rest.join(' ');

  // Profession: the short line right after the name, if it reads like a title
  const nameIdx = lines.indexOf(nameLine);
  const nextLine = nameIdx >= 0 ? lines[nameIdx + 1] : '';
  const profession = nextLine && nextLine.length < 60 && !nextLine.includes('@') ? nextLine : '';

  // Address: "City, Province 12345" style line, wherever it appears.
  // Matched per-line (not against the whole text) since the pattern's \s
  // would otherwise span newlines and pull in unrelated preceding lines.
  const addressLine = lines.find((l) => ADDRESS_RE.test(l));
  const addressMatch = addressLine ? addressLine.match(ADDRESS_RE) : null;
  const city = addressMatch?.[1]?.trim() || '';
  const province = addressMatch?.[2]?.trim() || '';
  const postalCode = addressMatch?.[3] || '';

  // Most recent job: first "<title/employer line>" immediately followed by
  // a recognizable date range, searched from an "Experience" heading if we
  // can find one, otherwise from the top of the document.
  const expHeaderIdx = lines.findIndex((l) => EXPERIENCE_HEADING_RE.test(l));
  const searchLines = expHeaderIdx >= 0 ? lines.slice(expHeaderIdx + 1) : lines;

  let title = '', employer = '', location = '';
  let startMonth = '', startYear = '', endMonth = '', endYear = '';
  let current = false;

  for (let i = 1; i < searchLines.length; i++) {
    const dateInfo = matchDateRange(searchLines[i]);
    if (!dateInfo) continue;

    const titleLine = searchLines[i - 1];
    const parts = titleLine.split(/,| at | \| /).map((s) => s.trim());
    title = parts[0] || '';
    employer = parts[1] || '';
    location = parts[2] || '';

    ({ startMonth, startYear, endMonth, endYear, current } = dateInfo);
    break;
  }

  const education = parseEducation(lines);
  const skills = parseSkills(lines);
  const summary = parseSummary(lines);

  return {
    personal: { firstName, lastName, profession, city, province, postalCode, phone, email },
    experience: { title, employer, location, remote: false, startMonth, startYear, endMonth, endYear, current },
    education,
    skills,
    summary,
  };
}
