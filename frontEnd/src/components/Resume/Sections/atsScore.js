/*
  The ATS match score, worked out on the device.

  It is plain counting, so it costs nothing, works offline and updates on every keystroke. The AI is only
  used for the things that need judgement (reading the advert, rewriting, suggesting skills).

    scoreResume(target, resumeData) -> null (no job target yet) or
      {
        score,                      0-100
        keywords: { pct, covered: [kw], missing: [kw], mustMissing: [kw] },
        parts: [{ id, label, weight, value, hint }]     value is 0-1; weight is the share of the score (they add up to 100)
      }

  How the 100 points are made:
    70  keywords    the job's keywords found anywhere on the resume. Must-haves count three times as much as the rest.
    10  job title   the advertised role (without "Senior", "Lead"...) appears in a job title, the headline or the summary.
    10  results     the share of achievement bullets that contain a number (half of them is full marks).
    10  complete    a summary, work history with achievements, education and at least five skills.

  Matching: lower case, split into words, and a keyword counts only as a whole word or phrase ("project management" does
  not match "project plans and people management"). So that the score is fair to a real resume, both the job's words and the
  resume's words go through the same folding first (see `norm`):
    - plurals ("sales" = "sale"), and British/American spelling ("call centre" = "call center", "organisation" = "organization");
    - the verb and noun forms of common skills ("negotiated" = "negotiation", "managed" = "management", "inspecting" = "inspection");
    - the usual ways of writing a tool ("MS Excel" = "Microsoft Excel", "Power Point" = "PowerPoint").
  And so that the score is not flattered:
    - a product name that is also an ordinary word ("Excel", "Word", "Outlook", "Teams", "Access", and languages like "R", "C",
      "Go") counts only where it is plainly the product: in the Skills list, after "Microsoft", or next to other tools. "I excel
      at sales" and "in other words" are not Excel and Word;
    - "Microsoft Office" on a resume is half credit for Word, Excel, PowerPoint and Outlook, not full: name the ones you use;
    - a "measurable result" is a figure, not a year, a standard's number ("ISO 9001") or a level ("Grade 12").
  Qualification keywords (a level of education, years of experience) are judged by qualificationCheck.js against the Education
  step and the dates of the work history, and the result is passed in (`outcomes`); a literal match is not how they are earned.
*/

const TOKEN_RE = /[a-z0-9][a-z0-9+#]*/g;

const stem = (token) => {
  if (token.length > 4 && token.endsWith('ies')) return `${token.slice(0, -3)}y`;
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
};

// British -> American, so "centre" and "center" are one word. Both sides of every comparison are folded the same way.
const BRITISH = {
  centre: 'center', theatre: 'theater', metre: 'meter', litre: 'liter', fibre: 'fiber', licence: 'license', labour: 'labor',
  behaviour: 'behavior', favour: 'favor', colour: 'color', honour: 'honor', programme: 'program', catalogue: 'catalog',
  dialogue: 'dialog', grey: 'gray', defence: 'defense', offence: 'offense', practise: 'practice', enrol: 'enroll', fulfil: 'fulfill',
  judgement: 'judgment', ageing: 'aging', whilst: 'while', learnt: 'learned', cheque: 'check', tyre: 'tire', skilful: 'skillful',
  travelling: 'traveling', travelled: 'traveled', traveller: 'traveler', labelled: 'labeled', modelling: 'modeling',
  modelled: 'modeled', cancelled: 'canceled', counselling: 'counseling', counsellor: 'counselor',
};
// "-ise" verbs and their nouns, only for words known to take "-ize": "advise", "supervise", "exercise" and "expertise" are not.
const ISE_STEMS =
  'organis|prioritis|specialis|recognis|analys|optimis|standardis|utilis|finalis|summaris|realis|customis|categoris|maximis|minimis|emphasis|authoris|capitalis|centralis|digitis|familiaris|personalis|mobilis|modernis|harmonis|synchronis|visualis|monetis|operationalis|rationalis|localis|globalis|formalis|stabilis|socialis|memoris|criticis|apologis|itemis|computeris|materialis|neutralis|normalis|legalis|generalis|internationalis|industrialis|commercialis|revitalis';
const ISE_RE = new RegExp(`^(${ISE_STEMS})(e|es|ed|ing|ation|ations|er|ers)$`);

// The verb and noun forms of skills that resumes and adverts tend to use differently ("negotiated" on one, "negotiation" on the
// other). A word is folded to the root only when what follows the root is an ordinary ending, so "market" and "marketing" meet
// but "marketplace" does not.
const ROOTS = [
  'negotiat', 'communicat', 'collaborat', 'coordinat', 'organiz', 'manag', 'supervis', 'schedul', 'recruit', 'facilitat',
  'implement', 'prioritiz', 'motivat', 'analyz', 'train', 'market', 'budget', 'forecast', 'audit', 'inspect', 'mentor', 'prepar',
];
const ROOT_ENDINGS = new Set(['e', 'es', 'ed', 'ing', 'ion', 'ions', 'ation', 'ations', 'ement', 'ements', 'ment', 'ments', 'er', 'ers', 'or', 'ors', 'ive']);
const IRREGULAR = { sold: 'sell', selling: 'sell', seller: 'sell', sellers: 'sell' };

const fold = (token) => {
  let t = BRITISH[token] || token;
  const ise = ISE_RE.exec(t);
  if (ise) t = `${ise[1].slice(0, -2)}iz${ise[2]}`;
  if (IRREGULAR[t]) return IRREGULAR[t];
  for (let i = 0; i < ROOTS.length; i += 1) {
    const root = ROOTS[i];
    if (t.length > root.length && t.startsWith(root) && ROOT_ENDINGS.has(t.slice(root.length))) return root;
  }
  return t;
};

// The usual ways of writing a tool, as one phrase. Applied to the joined words.
const ALIASES = [
  [/\bpower point\b/g, 'powerpoint'],
  [/\bshare point\b/g, 'sharepoint'],
  [/\be mail\b/g, 'email'],
  [/\bms (word|excel|powerpoint|outlook|access|office|project|team|visio|sharepoint|onenote|publisher)\b/g, 'microsoft $1'],
  [/\b(?:microsoft|office) 365\b|\bm365\b/g, 'microsoft office'],
  [/\bmicrosoft office suite\b/g, 'microsoft office'],
];

export const norm = (text) => {
  const words = (String(text || '').toLowerCase().match(TOKEN_RE) || []).map((token) => fold(stem(token))).join(' ');
  return ALIASES.reduce((out, [re, to]) => out.replace(re, to), words);
};

export const hasTerm = (normText, term) => {
  const t = norm(term);
  return Boolean(t) && ` ${normText} `.includes(` ${t} `);
};

/*
  Product names that are also ordinary words. They are checked by the keyword as the advert wrote it (lower case), and count
  only where the resume plainly means the product.
*/
const OFFICE_FAMILY = new Set(['word', 'excel', 'powerpoint', 'outlook', 'access', 'sharepoint', 'onenote', 'visio', 'publisher', 'microsoft', 'office', 'spreadsheet', 'pivot', 'vlookup', 'formula', 'macro', 'vba', 'calendar']);
const TECH_FAMILY = new Set(['python', 'java', 'javascript', 'typescript', 'sql', 'html', 'css', 'react', 'php', 'ruby', 'kotlin', 'scala', 'matlab', 'sas', 'stata', 'rust', 'perl', 'bash', 'linux', 'git', 'node', 'swift', 'dart', 'go', 'r', 'c', 'c++', 'c#', 'golang', 'programming', 'code', 'coding', 'developer']);
const TECH_CONTEXT = new Set(['programming', 'language', 'coding', 'scripting', 'code', 'script', 'package', 'studio']);
const AMBIGUOUS = new Map([
  ['word', OFFICE_FAMILY], ['excel', OFFICE_FAMILY], ['outlook', OFFICE_FAMILY], ['access', OFFICE_FAMILY], ['teams', OFFICE_FAMILY],
  ['r', TECH_FAMILY], ['c', TECH_FAMILY], ['go', TECH_FAMILY], ['swift', TECH_FAMILY], ['dart', TECH_FAMILY],
]);
// The Office programs that "Microsoft Office" on a resume points to without naming.
const OFFICE_SUITE = new Set(['word', 'excel', 'powerpoint', 'outlook']);

// Is this (normalised) tool name the product in this text? True when it is a Skills-list item, comes after "Microsoft", sits
// next to other tools of its kind ("Word, Excel and PowerPoint"), or (for languages) is called a language or programming.
const plainlyTheProduct = (tool, family, normText, skills) => {
  if (skills.some((skill) => skill.split(' ').length <= 4 && hasTerm(skill, tool))) return true;
  if (family === OFFICE_FAMILY && hasTerm(normText, `microsoft ${tool}`)) return true;
  const words = normText.split(' ');
  for (let i = 0; i < words.length; i += 1) {
    if (words[i] !== tool) continue;
    const around = [...words.slice(Math.max(0, i - 2), i), ...words.slice(i + 1, i + 3)];
    if (around.some((w) => w !== tool && family.has(w))) return true;
    if (family === TECH_FAMILY && (TECH_CONTEXT.has(words[i - 1]) || TECH_CONTEXT.has(words[i + 1]))) return true;
  }
  return false;
};

/**
 * How well a keyword is on the resume: 'full' | 'partial' | 'none'.
 * `normText` is norm(resume text); ctx.skills is the Skills list, each item run through norm().
 * 'partial' is only ever "Microsoft Office is listed, and the job names Word, Excel, PowerPoint or Outlook".
 */
export function matchTerm(term, normText, ctx = {}) {
  const t = norm(term);
  if (!t) return 'none';
  const skills = ctx.skills || [];
  const raw = String(term).trim().toLowerCase();
  const suite = (tool) => (OFFICE_SUITE.has(tool) && hasTerm(normText, 'microsoft office') ? 'partial' : 'none');

  const family = AMBIGUOUS.get(raw);
  if (family) return plainlyTheProduct(t, family, normText, skills) ? 'full' : suite(t);

  const product = /^microsoft (word|excel|powerpoint|outlook|access|team)$/.exec(t);
  if (product) {
    if (hasTerm(normText, t)) return 'full';
    const bare = product[1];
    // "Microsoft Excel" is met by "Excel" in the Skills list or among other tools; "Microsoft PowerPoint" by plain "PowerPoint".
    if (AMBIGUOUS.has(bare === 'team' ? 'teams' : bare)) return plainlyTheProduct(bare, OFFICE_FAMILY, normText, skills) ? 'full' : suite(bare);
    return hasTerm(normText, bare) ? 'full' : suite(bare);
  }

  if (hasTerm(normText, t)) return 'full';
  return suite(t);
}

// What to call a keyword on screen: the advert's own word for a bare product name ("Word"), made clear ("Microsoft Word").
const PRODUCT_NAMES = { word: 'Microsoft Word', excel: 'Microsoft Excel', outlook: 'Microsoft Outlook', access: 'Microsoft Access', teams: 'Microsoft Teams' };
export const labelFor = (term) => PRODUCT_NAMES[String(term || '').trim().toLowerCase()] || String(term || '');

// The builder stores **bold**, *italic* and "- " bullets; matching only needs the words.
export const stripMarkup = (text) =>
  String(text || '')
    .replace(/\*\*|\*/g, '')
    .replace(/^\s*[-\u2022]\s+/gm, '');

const SKIP_KEYS = /(^id$|photo|month|year|date|level|rating|enabled|current|remote|available)/i;

// Every piece of text in a part of the resume (strings inside objects and lists), without ids, dates and flags.
export const collectStrings = (value, out = []) => {
  if (typeof value === 'string') {
    if (value.trim().length >= 2) out.push(stripMarkup(value));
  } else if (Array.isArray(value)) {
    value.forEach((v) => collectStrings(v, out));
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, v]) => {
      if (!SKIP_KEYS.test(key)) collectStrings(v, out);
    });
  }
  return out;
};

export const resumeText = (data) => {
  const d = data || {};
  return [
    d.personal?.profession,
    d.summary,
    ...(Array.isArray(d.skills) ? d.skills.map((s) => s && s.text) : []),
    ...collectStrings(d.experiences),
    ...collectStrings(d.education),
    ...collectStrings(d.certificates),
    ...collectStrings(d.projects),
    ...collectStrings(d.languages),
  ]
    .filter((t) => typeof t === 'string' && t.trim())
    .map(stripMarkup)
    .join('\n');
};

const LEVEL_WORDS = /\b(senior|junior|jr|sr|lead|principal|staff|intern|trainee|graduate|entry level|ii|iii|iv)\b\.?/gi;

// "Senior Backend Engineer (Node.js) - Johannesburg" -> "backend engineer"
const coreTitle = (title) => {
  const base = String(title || '')
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .split(/\s[-\u2013|@/]\s|,/)[0]
    .replace(LEVEL_WORDS, ' ');
  return norm(base);
};

const bulletsOf = (text) =>
  stripMarkup(text)
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 12);

const clamp01 = (n) => Math.max(0, Math.min(1, n));

// A figure that is a result (40 batches, 15%, R2 million, a team of 8), not a year, a standard's number or a level.
const NOT_A_RESULT = [
  /\b(?:19|20)\d{2}\b/g, // 2023
  /\b(?:iso|sans|sabs|din|en|bs|ohsas)\s*[-:]?\s*\d[\d:.-]*/gi, // ISO 9001
  /\b(?:level|grade|gr|phase|step|stage|tier|form|module|class|code|nqf|n)\s*\d+\b/gi, // Grade 12, NQF 5
  /\b24\s*\/\s*7\b|\b\d\s*sigma\b|\b\d+\s*s\b(?=\s+(?:method|audit|principles?|system))/gi, // 24/7, 6 Sigma, 5S
  /\b\d{6,}\b/g, // reference and phone numbers
];
export const hasResultFigure = (bullet) => /\d/.test(NOT_A_RESULT.reduce((out, re) => out.replace(re, ' '), String(bullet || '')));

export const hasJobTarget = (target) =>
  Boolean(target && !target.skipped && Array.isArray(target.keywords) && target.keywords.length > 0);

export function scoreResume(target, data, outcomes) {
  if (!hasJobTarget(target)) return null;
  const d = data || {};
  const text = norm(resumeText(d));

  // 1. Keywords
  const skillsNorm = (Array.isArray(d.skills) ? d.skills : []).map((s) => norm(s && s.text)).filter(Boolean);
  const covered = [];
  const missing = [];
  let have = 0;
  let total = 0;
  target.keywords.forEach((kw) => {
    const weight = kw.must ? 3 : 1;
    total += weight;
    const key = norm(kw.term);
    // A level of education or a length of experience is earned by having it (qualificationCheck.js), not by typing the words.
    const earned = outcomes && outcomes.has(key) ? outcomes.get(key) : null;
    const found = matchTerm(kw.term, text, { skills: skillsNorm });
    const state = earned === true || found === 'full' ? 'full' : earned === null && found === 'partial' ? 'partial' : 'none';
    if (state === 'full') {
      have += weight;
      covered.push(kw);
    } else if (state === 'partial') {
      have += weight * 0.5;
      missing.push({ ...kw, partial: true });
    } else {
      missing.push(kw);
    }
  });
  const keywordValue = total ? have / total : 0;

  // 2. Job title
  const wanted = coreTitle(target.title);
  const titleSpace = norm(
    [d.personal?.profession, d.summary, ...(Array.isArray(d.experiences) ? d.experiences.map((j) => j && j.title) : [])].join('\n')
  );
  let titleValue = 0;
  if (wanted) {
    if (` ${titleSpace} `.includes(` ${wanted} `)) titleValue = 1;
    else {
      const words = wanted.split(' ').filter((w) => w.length >= 3);
      const found = words.filter((w) => titleSpace.split(' ').includes(w)).length;
      titleValue = words.length ? (found / words.length) * 0.6 : 0;
    }
  }

  // 3. Results (bullets with a number)
  const bullets = (Array.isArray(d.experiences) ? d.experiences : []).flatMap((j) => bulletsOf(j && j.achievements));
  const withNumber = bullets.filter(hasResultFigure).length;
  const resultsValue = bullets.length ? clamp01(withNumber / bullets.length / 0.5) : 0;

  // 4. Complete sections
  const hasSummary = stripMarkup(d.summary).trim().length >= 40;
  const hasWork = (Array.isArray(d.experiences) ? d.experiences : []).some((j) => j && stripMarkup(j.achievements).trim().length >= 20);
  const hasEducation = collectStrings(d.education).length > 0;
  const skillCount = (Array.isArray(d.skills) ? d.skills : []).filter((s) => s && String(s.text || '').trim()).length;
  const pieces = [hasSummary, hasWork, hasEducation, skillCount >= 5];
  const completeValue = pieces.filter(Boolean).length / pieces.length;
  const todo = [
    !hasSummary && 'summary',
    !hasWork && 'work achievements',
    !hasEducation && 'education',
    skillCount < 5 && `${5 - skillCount} more skill${5 - skillCount === 1 ? '' : 's'}`,
  ].filter(Boolean);

  const parts = [
    {
      id: 'keywords',
      label: 'Keywords',
      weight: 70,
      value: keywordValue,
      hint: `${covered.length} of ${target.keywords.length} keywords found${missing.some((k) => k.partial) ? ` (${missing.filter((k) => k.partial).length} only as \u201CMicrosoft Office\u201D)` : ''}`,
    },
    {
      id: 'title',
      label: 'Job title',
      weight: 10,
      value: titleValue,
      hint: titleValue >= 1 ? 'Your resume uses the job’s title' : `Use “${target.title}” in your headline or summary if it describes you`,
    },
    {
      id: 'results',
      label: 'Measurable results',
      weight: 10,
      value: resultsValue,
      hint: bullets.length
        ? `${withNumber} of ${bullets.length} achievements contain a figure`
        : 'Write achievements to start scoring',
    },
    {
      id: 'complete',
      label: 'Complete sections',
      weight: 10,
      value: completeValue,
      hint: todo.length ? `Still to add: ${todo.join(', ')}` : 'Everything an ATS expects is there',
    },
  ];

  const score = Math.round(parts.reduce((sum, p) => sum + p.weight * clamp01(p.value), 0));
  return {
    score,
    keywords: {
      pct: Math.round(keywordValue * 100),
      covered,
      missing,
      mustMissing: missing.filter((k) => k.must),
    },
    parts,
  };
}

export const scoreLabel = (score) =>
  score >= 85 ? 'Excellent' : score >= 70 ? 'Strong' : score >= 45 ? 'Getting there' : 'Just starting';
