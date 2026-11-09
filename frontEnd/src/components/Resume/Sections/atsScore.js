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

  Matching works the same way as the server (routers/job_match.py): lower case, split into words, plurals folded,
  and a keyword counts only as a whole word or phrase ("project management" does not match "project plans and
  people management").
*/

const TOKEN_RE = /[a-z0-9][a-z0-9+#]*/g;

const stem = (token) => {
  if (token.length > 4 && token.endsWith('ies')) return `${token.slice(0, -3)}y`;
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
};

export const norm = (text) =>
  (String(text || '').toLowerCase().match(TOKEN_RE) || []).map(stem).join(' ');

export const hasTerm = (normText, term) => {
  const t = norm(term);
  return Boolean(t) && ` ${normText} `.includes(` ${t} `);
};

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

export const hasJobTarget = (target) =>
  Boolean(target && !target.skipped && Array.isArray(target.keywords) && target.keywords.length > 0);

export function scoreResume(target, data) {
  if (!hasJobTarget(target)) return null;
  const d = data || {};
  const text = norm(resumeText(d));

  // 1. Keywords
  const covered = [];
  const missing = [];
  let have = 0;
  let total = 0;
  target.keywords.forEach((kw) => {
    const weight = kw.must ? 3 : 1;
    total += weight;
    if (hasTerm(text, kw.term)) {
      have += weight;
      covered.push(kw);
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
  const withNumber = bullets.filter((b) => /\d/.test(b)).length;
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
      hint: `${covered.length} of ${target.keywords.length} keywords found`,
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
        ? `${withNumber} of ${bullets.length} achievements contain a number`
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
