/*
  Cover letter: the draft text, the letter "model" the preview and the PDF both draw from, and saving.
  No React and no browser-only code except localStorage (always inside try/catch), so it can be tested on its own.

  Flow
    resumeData + what the person typed (details)  ->  buildDraft()        a starting text, from the resume only
    resumeData + details + body                   ->  buildLetterModel()  everything the letter shows
    model                                         ->  utils/coverLetterPdf.js (layout, preview, PDF)

  The starter draft only repeats what is in the resume (names, job titles, employers, skills, qualification). It never
  invents achievements or claims. Everything in it can be edited by the person.

  The AI (Groq, through utils/coverLetterAI.js) writes the letter body from buildResumeBrief(). When the person has
  pasted the link to the job advert, the server reads it (readJobPosting) and the position, company, address and what
  the job asks for are kept in the letter (jobUrl, requirements, duties); the AI then answers those requirements with
  what the resume says. The result is kept in letter.aiBody. The starter draft stays as the fallback for people who are
  signed out, not on Premium, or when the AI cannot be reached.
*/

export const TONES = [
  { id: 'formal', label: 'Formal' },
  { id: 'confident', label: 'Confident' },
  { id: 'warm', label: 'Warm' },
];
const TONE_IDS = TONES.map((t) => t.id);

const MAX_FIELD = 200;
const MAX_URL = 2000;
const MAX_REQUIREMENTS = 15;
const MAX_DUTIES = 8;
const MAX_ITEM = 240;
const MAX_BODY = 8000;
const MAX_BULLETS = 3;
const MAX_SKILLS = 5;

/* ------------------------------------------------------------------ small text helpers */

const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

// The builder keeps **bold**, *italic* and "- " bullets as plain text. A letter shows none of that markup.
export const stripMarkup = (text) =>
  clean(String(text ?? '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1'));

// One resume achievements box -> its lines, without bullet marks or markup.
export const achievementLines = (text) =>
  String(text ?? '')
    .split(/\r?\n/)
    .map((line) => stripMarkup(line.trim().replace(/^([-\u2022]\s+|\*\s+)/, '')))
    .filter(Boolean);

// "A, B and C"
export const joinList = (items) => {
  const list = items.filter(Boolean);
  if (list.length <= 1) return list.join('');
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
};

// Letters whose NAME starts with a vowel sound, for "an MBA", "an HR officer", "an MSc".
const VOWEL_SOUND_LETTERS = new Set('AEFHILMNORSX');

// "a" or "an" for the word that follows.
export const article = (word) => {
  const w = clean(word);
  if (!w) return 'a';
  if (/^[A-Z]{2}/.test(w)) return VOWEL_SOUND_LETTERS.has(w[0]) ? 'an' : 'a';
  if (/^(hono|hour|heir)/i.test(w)) return 'an';
  return /^[aeiou]/i.test(w) ? 'an' : 'a';
};

// A company address as the lines of a letter's address block. "12 Rivonia Road, Sandton, Gauteng, 2196, South Africa"
// becomes "12 Rivonia Road" and "Sandton, Gauteng, 2196, South Africa"; an address typed on several lines (or split
// with ";" or " | ") keeps its own lines; a short one such as "Cape Town" stays one line.
export const addressLines = (address) => {
  const raw = String(address ?? '');
  const rows = raw.split(/\r?\n|\s*;\s*|\s+\|\s+/).map(clean).filter(Boolean);
  if (rows.length > 1) return rows;
  const parts = clean(raw).split(/\s*,\s*/).filter(Boolean);
  if (parts.length >= 3 && /\d/.test(parts[0])) return [parts[0], parts.slice(1).join(', ')];
  return parts.length > 0 ? [parts.join(', ')] : [];
};

// What a list in a saved letter must look like: short plain strings, no empties, no more than `max`.
const cleanList = (value, max) =>
  (Array.isArray(value) ? value : [])
    .map((item) => clean(item).slice(0, MAX_ITEM))
    .filter(Boolean)
    .slice(0, max);

/* ------------------------------------------------------------------ what the resume says */

const namedJobs = (resumeData) =>
  (Array.isArray(resumeData?.experiences) ? resumeData.experiences : []).filter((j) => clean(j.title) || clean(j.employer));

const namedEducation = (resumeData) =>
  (Array.isArray(resumeData?.education) ? resumeData.education : []).filter((e) => clean(e.institution) || clean(e.degree));

const namedSkills = (resumeData) =>
  (Array.isArray(resumeData?.skills) ? resumeData.skills : []).map((s) => clean(s?.text)).filter(Boolean);

export const fullNameOf = (personal) => clean(`${personal?.firstName || ''} ${personal?.lastName || ''}`);

// Whole years between the earliest start year and the latest end year (or this year for a current job).
// 0 when the resume has no usable years.
export const yearsOfExperience = (jobs, now = new Date().getFullYear()) => {
  let start = Infinity;
  let end = -Infinity;
  jobs.forEach((job) => {
    const s = parseInt(job.startYear, 10);
    if (!Number.isFinite(s)) return;
    const e = job.current ? now : parseInt(job.endYear, 10);
    start = Math.min(start, s);
    end = Math.max(end, Number.isFinite(e) ? e : s);
  });
  if (!Number.isFinite(start) || end <= start) return 0;
  return Math.min(end - start, 60);
};

// Job titles that stand alone ("as Head of Sales"), so no "a" before them.
const NO_ARTICLE_TITLE = /^(head|chief|director|vice|president|ceo|cto|cfo|coo)\b/i;

// "as a Front-End Developer at Acme", "as a Developer", or "at Acme" when the job has no title.
const asRole = (job) => {
  const title = clean(job.title);
  const employer = clean(job.employer);
  const role = title ? `as ${NO_ARTICLE_TITLE.test(title) ? '' : `${article(title)} `}${title}` : '';
  if (role && employer) return `${role} at ${employer}`;
  return role || `at ${employer}`;
};

/* ------------------------------------------------------------------ the draft */

const TONE_TEXT = {
  formal: {
    open: (target) => `I am writing to apply for ${target}.`,
    bullets: 'Key responsibilities and achievements in this role include:',
    skills: 'My core skills include',
    close: (who) =>
      `I would welcome the opportunity to discuss how my experience can contribute to ${who}. Thank you for your time and consideration.`,
  },
  confident: {
    open: (target) => `I am excited to apply for ${target}, and I believe my background is a strong match.`,
    bullets: 'Some of my key achievements in this role:',
    skills: 'My key strengths are',
    close: (who) =>
      `I would value the chance to discuss how I can contribute to ${who}. Thank you for considering my application.`,
  },
  warm: {
    open: (target) => `I would love to be considered for ${target}, and I am grateful for the chance to introduce myself.`,
    bullets: 'A few things I am proud of from this role:',
    skills: 'I enjoy working with',
    close: (who) =>
      `I would be delighted to talk about how I can help ${who}. Thank you so much for your time, and I look forward to hearing from you.`,
  },
};

// The position/company the letter is about, in a sentence-ready phrase.
const targetPhrase = (role, company) => {
  if (role && company) return `the ${role} position at ${company}`;
  if (role) return `the ${role} position at your organisation`;
  if (company) return `a role at ${company}`;
  return 'a role at your organisation';
};

/**
 * A starting text for the letter, built only from the resume and the details typed in the form.
 * Paragraphs are separated by a blank line; a line starting with "- " is a bullet.
 */
export function buildDraft(resumeData, details = {}) {
  const personal = resumeData?.personal || {};
  const jobs = namedJobs(resumeData);
  const education = namedEducation(resumeData);
  const skills = namedSkills(resumeData).slice(0, MAX_SKILLS);
  const tone = TONE_TEXT[TONE_IDS.includes(details.tone) ? details.tone : 'formal'];

  const role = clean(details.jobTitle);
  const company = clean(details.company);
  const profession = clean(personal.profession);

  const paragraphs = [];

  // 1. Who is writing, and for what.
  const years = yearsOfExperience(jobs);
  const intro = [tone.open(targetPhrase(role, company))];
  if (profession && years > 0) {
    intro.push(`I am ${article(profession)} ${profession} with ${years} ${years === 1 ? 'year' : 'years'} of professional experience.`);
  } else if (profession) {
    intro.push(`I am ${article(profession)} ${profession}.`);
  } else if (years > 0) {
    intro.push(`I bring ${years} ${years === 1 ? 'year' : 'years'} of professional experience.`);
  }
  paragraphs.push(intro.join(' '));

  // 2. The most recent job, its first few achievements, and the one before it.
  if (jobs.length > 0) {
    const latest = jobs[0];
    const bullets = achievementLines(latest.achievements).slice(0, MAX_BULLETS);
    let block = latest.current
      ? `I currently work ${asRole(latest)}.`
      : `Most recently, I worked ${asRole(latest)}.`;
    if (bullets.length > 0) block = `${block} ${tone.bullets}\n${bullets.map((b) => `- ${b}`).join('\n')}`;
    if (jobs[1]) block = `${block}\n\nBefore that, I worked ${asRole(jobs[1])}.`;
    paragraphs.push(block);
  }

  // 3. Skills and qualification.
  const about = [];
  if (skills.length > 0) about.push(`${tone.skills} ${joinList(skills)}.`);
  const qualification = education[0];
  if (qualification) {
    const degree = clean(qualification.degree);
    const field = clean(qualification.field);
    const institution = clean(qualification.institution);
    const degreeText = degree && field && !degree.toLowerCase().includes(field.toLowerCase()) ? `${degree} in ${field}` : degree;
    if (degreeText && institution) about.push(`I hold ${article(degreeText)} ${degreeText} from ${institution}.`);
    else if (degreeText) about.push(`I hold ${article(degreeText)} ${degreeText}.`);
    else if (institution && field) about.push(`I studied ${field} at ${institution}.`);
    else if (institution) about.push(`I studied at ${institution}.`);
  }
  if (about.length > 0) paragraphs.push(about.join(' '));

  // 4. Closing.
  paragraphs.push(tone.close(company || 'your team'));

  return paragraphs.join('\n\n');
}

/* ------------------------------------------------------------------ the body text -> blocks */

/**
 * The letter text -> [{ type: 'p', text } | { type: 'bullets', items: [text] }].
 * A blank line ends a paragraph. A line starting with "- " (or a bullet dot) is a bullet.
 * Single line breaks inside a paragraph are joined with a space.
 */
export function parseBody(body) {
  const blocks = [];
  let paragraph = [];
  let bullets = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) blocks.push({ type: 'p', text: paragraph.join(' ') });
    paragraph = [];
  };
  const flushBullets = () => {
    if (bullets.length > 0) blocks.push({ type: 'bullets', items: bullets });
    bullets = [];
  };

  String(body ?? '')
    .split(/\r?\n/)
    .forEach((raw) => {
      const line = raw.trim();
      if (!line) {
        flushParagraph();
        flushBullets();
        return;
      }
      const bullet = line.match(/^[-\u2022]\s+(.*)$/);
      if (bullet) {
        flushParagraph();
        if (clean(bullet[1])) bullets.push(clean(bullet[1]));
        return;
      }
      flushBullets();
      paragraph.push(clean(line));
    });
  flushParagraph();
  flushBullets();
  return blocks;
}

/* ------------------------------------------------------------------ the letter model */

const todayISO = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// '2026-11-07' -> '7 November 2026' (built from the parts, so the time zone can never move the day)
export const formatLetterDate = (iso) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!match) return '';
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime()) || date.getMonth() !== Number(match[2]) - 1) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

// What the person typed as the manager's name, ready for "Dear ...": "Dear Ms Dlamini," -> "Ms Dlamini"
const managerName = (value) => clean(value).replace(/^dear\s+/i, '').replace(/[,;:]+$/, '').trim();

/**
 * Everything the letter shows, as plain strings and blocks. The preview and the PDF both draw from this, so
 * they can never disagree.
 *   { name, profession, contacts[], dateText, recipient[], salutation, blocks[], closing, signName }
 */
export function buildLetterModel(resumeData, letter, body) {
  const personal = resumeData?.personal || {};
  const name = fullNameOf(personal);
  const manager = managerName(letter?.hiringManager);

  const location = [clean(personal.city), clean(personal.province)].filter(Boolean).join(', ');
  const websites = (Array.isArray(personal.websites) ? personal.websites : [])
    .map((w) => clean(w?.url).replace(/^https?:\/\//i, '').replace(/\/$/, ''))
    .filter(Boolean);
  const contacts = [clean(personal.email), clean(personal.phone), location, ...websites].filter(Boolean);

  return {
    name,
    profession: clean(personal.profession),
    contacts,
    dateText: formatLetterDate(letter?.dateOverride || todayISO()),
    recipient: [manager, clean(letter?.company), ...addressLines(letter?.companyAddress)].filter(Boolean),
    salutation: manager ? `Dear ${manager},` : 'Dear Hiring Manager,',
    blocks: parseBody(body),
    closing: 'Yours sincerely,',
    signName: name,
  };
}

/* ------------------------------------------------------------------ what the AI is given */

const clip = (value, max) => clean(value).slice(0, max);
const yearText = (value) => (/^\d{4}$/.test(clean(value)) ? clean(value) : '');

/**
 * The words of the resume, in the shape POST /api/writing/cover-letter expects. Contact details, address, photo,
 * date of birth and the like are left out on purpose: the AI does not need them to write a letter.
 * hasContent is false for a resume with nothing to write from.
 */
export function buildResumeBrief(resumeData) {
  const personal = resumeData?.personal || {};
  const allJobs = namedJobs(resumeData);

  const jobs = allJobs.slice(0, 6).map((job) => ({
    title: clip(job.title, 120),
    employer: clip(job.employer, 120),
    start_year: yearText(job.startYear),
    end_year: job.current ? '' : yearText(job.endYear),
    current: Boolean(job.current),
    achievements: achievementLines(job.achievements).join('\n').slice(0, 1200),
  }));

  const education = namedEducation(resumeData)
    .slice(0, 4)
    .map((e) => ({
      degree: clip(e.degree, 120),
      field: clip(e.field, 120),
      institution: clip(e.institution, 120),
      year: yearText(e.gradYear),
    }));

  const skills = namedSkills(resumeData).slice(0, 20).map((s) => s.slice(0, 120));

  const languages = (resumeData?.languages?.enabled ? resumeData.languages.items || [] : [])
    .filter((l) => clean(l?.name))
    .slice(0, 8)
    .map((l) => (clean(l.level) ? `${clip(l.name, 60)} (${clip(l.level, 40)})` : clip(l.name, 60)));

  const certificates = (resumeData?.certificates?.enabled ? resumeData.certificates.items || [] : [])
    .filter((c) => clean(c?.name))
    .slice(0, 6)
    .map((c) => (clean(c.issuer) ? `${clip(c.name, 80)}, ${clip(c.issuer, 40)}` : clip(c.name, 120)));

  const resume = {
    profession: clip(personal.profession, 120),
    summary: stripMarkup(resumeData?.summary).slice(0, 1500),
    jobs,
    education,
    skills,
    languages,
    certificates,
  };

  return {
    resume,
    yearsExperience: yearsOfExperience(allJobs),
    hasContent: Boolean(resume.profession || resume.summary || jobs.length || education.length || skills.length),
  };
}

// A short fingerprint of what a generated letter was written from: tone, position, company and the resume's own
// words. When it no longer matches, the page offers to write the letter again.
const hashText = (text) => {
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};

export const aiSignature = (resumeData, letter) => {
  const parts = [
    TONE_IDS.includes(letter?.tone) ? letter.tone : 'formal',
    clean(letter?.jobTitle).toLowerCase(),
    clean(letter?.company).toLowerCase(),
    hashText(JSON.stringify(buildResumeBrief(resumeData).resume)),
  ];
  // What the job asks for counts too. A letter with no requirements keeps the signature it always had, so letters
  // saved before this existed are not suddenly reported as out of date.
  const requirements = cleanList(letter?.requirements, MAX_REQUIREMENTS);
  const duties = cleanList(letter?.duties, MAX_DUTIES);
  if (requirements.length > 0 || duties.length > 0) parts.push(hashText(JSON.stringify([requirements, duties])));
  return parts.join('|');
};

/* ------------------------------------------------------------------ saving */

const STORAGE_PREFIX = 'remopdf:coverLetter:';

export const defaultLetter = () => ({
  jobTitle: '',
  company: '',
  companyAddress: '',
  jobUrl: '', // the link to the job advert the person pasted
  requirements: [], // what the advert asks for (read from jobUrl; the person can remove items)
  duties: [], // what the role involves (read from the advert)
  hiringManager: '',
  dateOverride: '', // '' = today
  tone: 'formal',
  body: '',
  bodyEdited: false, // false: the text is the AI letter (or the starter draft); true: the person has written their own
  aiBody: '', // the letter the AI wrote from the resume ('' = none yet)
  aiFor: '', // aiSignature() of what aiBody was written from
});

const text = (value, max) => String(value ?? '').slice(0, max);

// Anything read back from storage becomes a complete, valid letter.
export const normalizeLetter = (saved) => {
  const base = defaultLetter();
  if (!saved || typeof saved !== 'object') return base;
  const edited = saved.bodyEdited === true && typeof saved.body === 'string';
  return {
    jobTitle: text(saved.jobTitle, MAX_FIELD),
    company: text(saved.company, MAX_FIELD),
    companyAddress: text(saved.companyAddress, MAX_FIELD),
    jobUrl: text(saved.jobUrl, MAX_URL),
    requirements: cleanList(saved.requirements, MAX_REQUIREMENTS),
    duties: cleanList(saved.duties, MAX_DUTIES),
    hiringManager: text(saved.hiringManager, MAX_FIELD),
    dateOverride: /^\d{4}-\d{2}-\d{2}$/.test(saved.dateOverride || '') ? saved.dateOverride : '',
    tone: TONE_IDS.includes(saved.tone) ? saved.tone : base.tone,
    body: edited ? text(saved.body, MAX_BODY) : '',
    bodyEdited: edited,
    aiBody: typeof saved.aiBody === 'string' ? text(saved.aiBody, MAX_BODY) : '',
    aiFor: typeof saved.aiBody === 'string' && saved.aiBody ? text(saved.aiFor, 600) : '',
  };
};

export const loadLetter = (key) => {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? normalizeLetter(JSON.parse(raw)) : defaultLetter();
  } catch {
    return defaultLetter();
  }
};

export const saveLetter = (key, letter) => {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(letter));
  } catch {
    /* Storage can be blocked or full. The letter still works for this visit. */
  }
};

export const MAX_BODY_CHARS = MAX_BODY;
export const MAX_FIELD_CHARS = MAX_FIELD;
export const MAX_URL_CHARS = MAX_URL;
export const MAX_REQUIREMENT_ITEMS = MAX_REQUIREMENTS;
export const MAX_DUTY_ITEMS = MAX_DUTIES;
export const MAX_ITEM_CHARS = MAX_ITEM;
export const todayIso = todayISO;
