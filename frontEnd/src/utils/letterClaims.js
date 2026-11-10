/*
  Does the letter claim a qualification the resume does not list?

  A degree, diploma or certificate is something an employer checks with the school. A letter may name one only if the
  resume's Education or Certificates sections list it. The server checks every letter the AI writes (routers/
  letter_quality.py, which this file mirrors); this copy runs on whatever text the page is showing, so it also covers
  a letter written before the check existed and text the person typed or edited themselves.

    heldQualificationText(resumeData)                  "Diploma Operations Management, Damelin; Certificate: First Aid"
    unlistedQualifications(text, resumeData, ignore)   ["Bachelor's", "degree"]  ([] when every one is listed)
    dropUnlistedQualificationSentences(text, resumeData, ignore)
                                                       the text without the sentences that claim one

  No React and no browser-only code, so it can be tested on its own. Keep the kinds below in step with
  _QUALIFICATION_KINDS in letter_quality.py.
*/

const squash = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

// Each kind is looked for in this order, and the words a kind matches are blanked before the next kind looks, so
// "National Senior Certificate" is one matric claim (not also a certificate) and "Master's degree" is one master claim.
const KINDS = [
  { kind: 'matric', patterns: [/\b(?:national\s+senior\s+certificate|senior\s+certificate|matric(?:ulation)?|grade\s*1[0-2])\b/gi] },
  { kind: 'nqf', patterns: [/\bnqf\b/gi, /\bN[1-6]\b/g] },
  {
    kind: 'bachelor',
    patterns: [/\bbachelor['’]?s?\b/gi, /\bB\.?\s?(?:Sc|Com|Comm|Tech|Eng|Ed|Admin|Phil|Compt)\b/g, /\bB\.?A\b\.?/g, /\bBBA\b/g, /\bLLB\b/g],
  },
  {
    kind: 'master',
    patterns: [/\b(?:master['’]?s|master\s+(?:degree|of|in)|mba)\b/gi, /\bM\.?\s?(?:Sc|Com|Tech|Eng|Ed|Phil|Admin)\b/g, /\bM\.?A\b\.?/g],
  },
  { kind: 'honours', patterns: [/\b(?:honou?rs|hons)\b/gi] },
  { kind: 'doctorate', patterns: [/\b(?:ph\.?\s?d|doctorate|doctoral)\b/gi] },
  {
    kind: 'degree',
    patterns: [/\bdegrees?\b/gi],
    // "a high degree of accuracy" is not a qualification
    skip: (text, m) =>
      /\b(?:high|higher|large|great|greater|certain|some|any|same|significant|considerable|fair|good|varying|lesser)\s+$/i.test(text.slice(0, m.index)) ||
      /^\s+of\b/i.test(text.slice(m.index + m[0].length)),
  },
  { kind: 'diploma', patterns: [/\bdiplomas?\b/gi] },
  {
    kind: 'certificate',
    patterns: [/\b(?:certificates?|certifications?)\b/gi, /\b(?:am|was|being|become|became)\s+(?:an?\s+)?(?:fully\s+)?certified\b/gi],
  },
];

// What the RESUME must hold for a kind in the letter to be backed. Any degree backs the word "degree"; nothing else is
// interchangeable (a diploma does not back a bachelor's degree).
const BACKED_BY = {
  matric: ['matric'],
  nqf: ['nqf'],
  bachelor: ['bachelor'],
  master: ['master'],
  honours: ['honours'],
  doctorate: ['doctorate'],
  degree: ['degree', 'bachelor', 'master', 'honours', 'doctorate'],
  diploma: ['diploma'],
  certificate: ['certificate'],
};

// "Diploma in Operations Management": the qualification word, then the subject. The subject must be listed too.
const QUALIFICATION_WORD = /\b(?:diplomas?|degrees?|certificates?|certification|bachelor['’]?s?(?:\s+degree)?|master['’]?s?(?:\s+degree)?|honou?rs(?:\s+degree)?|doctorate)\b/gi;
const SUBJECT = /^(?:\s+(?:in|of))?\s+([A-Z][A-Za-z&'’-]*(?:\s+(?:(?:and|of|in|for|&)\s+)?[A-Z][A-Za-z&'’-]*){0,4})/;
const SUBJECT_CONNECTORS = new Set(['and', 'of', 'in', 'for', 'the']);

const kindsIn = (text) => {
  let work = String(text ?? '');
  const found = [];
  KINDS.forEach(({ kind, patterns, skip }) => {
    patterns.forEach((pattern) => {
      const source = work;
      for (const m of source.matchAll(new RegExp(pattern.source, pattern.flags))) {
        if (skip && skip(source, m)) continue;
        found.push({ at: m.index, kind, phrase: m[0] });
        work = work.slice(0, m.index) + ' '.repeat(m[0].length) + work.slice(m.index + m[0].length);
      }
    });
  });
  return found.sort((a, b) => a.at - b.at);
};

const prefixes = (text) => new Set((String(text ?? '').toLowerCase().match(/[a-z]+/g) || []).map((w) => w.slice(0, 5)));

// 'Diploma in Operations Management' when the resume lists a diploma, but not in that subject.
const unlistedSubjects = (text, heldText) => {
  const held = prefixes(heldText);
  const out = [];
  for (const m of String(text ?? '').matchAll(new RegExp(QUALIFICATION_WORD.source, QUALIFICATION_WORD.flags))) {
    const after = String(text).slice(m.index + m[0].length);
    const subject = SUBJECT.exec(after);
    if (!subject) continue;
    const words = (subject[1].match(/[A-Za-z]+/g) || []).filter((w) => !SUBJECT_CONNECTORS.has(w.toLowerCase()) && w.length >= 3);
    if (words.length > 0 && words.some((w) => !held.has(w.toLowerCase().slice(0, 5)))) out.push(squash(m[0] + subject[0]));
  }
  return out;
};

const maskPhrases = (text, ignore) => {
  let out = String(text ?? '');
  (ignore || []).forEach((phrase) => {
    const words = squash(phrase).split(' ').filter(Boolean);
    if (words.length === 0) return;
    const pattern = new RegExp(words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+'), 'gi');
    out = out.replace(pattern, (hit) => ' '.repeat(hit.length));
  });
  return out;
};

/* ------------------------------------------------------------------ what the resume lists */

const entries = (value) => (Array.isArray(value) ? value : []);

/** Education entries and enabled certificates, as one line of text. '' when the resume lists none. */
export function heldQualificationText(resumeData) {
  const rows = [];
  entries(resumeData?.education).forEach((e) => {
    const degree = squash(e?.degree);
    const field = squash(e?.field);
    const institution = squash(e?.institution);
    const name = degree && field && !degree.toLowerCase().includes(field.toLowerCase()) ? `${degree} ${field}` : degree || field;
    const row = [name, institution].filter(Boolean).join(', ');
    if (row) rows.push(row);
  });
  if (resumeData?.certificates?.enabled) {
    entries(resumeData.certificates.items).forEach((c) => {
      const name = squash(c?.name);
      if (name) rows.push(`Certificate: ${name}`);
    });
  }
  return rows.join('; ');
}

// The applicant's own wording about their jobs. It can back "issued certificates to trainees", never a degree.
const workHistoryText = (resumeData) =>
  entries(resumeData?.experiences)
    .map((j) => `${squash(j?.title)} ${squash(j?.employer)} ${squash(j?.achievements)}`)
    .join(' ');

// Phrases that are not claims: the applicant's own job titles and employers ("Certificate Administrator at Diploma Foods").
const ownJobNames = (resumeData) =>
  entries(resumeData?.experiences).flatMap((j) => [squash(j?.title), squash(j?.employer)]).filter(Boolean);

/**
 * The degrees, diplomas and certificates named in `text` that the resume does not list, as the words `text` uses.
 * `ignore`: phrases that are not claims (the position title and company name from the advert). The applicant's own job
 * titles and employers are never claims either.
 * The applicant's own duties can back the word "certificate" ("issued certificates to trainees"), never a degree,
 * diploma or any other qualification: those must be listed under Education, whatever the duties say.
 */
export function unlistedQualifications(text, resumeData, ignore = []) {
  const clear = maskPhrases(text, [...(ignore || []), ...ownJobNames(resumeData)]);
  if (!squash(clear)) return [];
  const heldText = heldQualificationText(resumeData);
  const held = new Set(kindsIn(heldText).map((k) => k.kind));
  const history = squash(workHistoryText(resumeData)).toLowerCase();

  const bad = [];
  kindsIn(clear).forEach(({ kind, phrase }) => {
    if (BACKED_BY[kind].some((k) => held.has(k))) return;
    if (kind === 'certificate' && history && history.includes(phrase.toLowerCase())) return;
    bad.push(phrase);
  });
  bad.push(...unlistedSubjects(clear, heldText));
  return [...new Set(bad)];
}

const BULLET = /^\s*[-•]\s+/;

// A line as its sentences. A "." "!" or "?" ends one only when a space or the end of the line follows it, so "B.Com"
// stays whole. No lookbehind: older Safari cannot even parse a file that has one.
const sentencesOf = (line) => (String(line).match(/.+?(?:[.!?]+(?=\s|$)|$)/g) || [String(line)]).map((s) => s.trim()).filter(Boolean);

/**
 * The text with every sentence (or "- " bullet line) that claims an unlisted qualification taken out. Paragraph breaks
 * and bullets are kept, and a paragraph left empty goes too. The result is checked again as a whole, so
 * unlistedQualifications() on it is always []. Text that claims nothing unlisted comes back unchanged.
 * Same as drop_unsupported_qualification_sentences() in routers/letter_quality.py.
 */
export function dropUnlistedQualificationSentences(text, resumeData, ignore = []) {
  const source = String(text ?? '');
  const claims = (piece) => unlistedQualifications(piece, resumeData, ignore).length > 0;
  if (!claims(source)) return source;

  const cleanOnce = (value) =>
    value
      .split(/\n\s*\n/)
      .map((paragraph) => {
        const lines = [];
        paragraph.split('\n').forEach((line) => {
          if (!line.trim()) return;
          if (!claims(line)) {
            lines.push(line);
            return;
          }
          if (BULLET.test(line)) return; // a bullet that claims one goes with its own line only
          const kept = sentencesOf(line).filter((s) => !claims(s));
          if (kept.length > 0) lines.push(kept.join(' '));
        });
        return lines.join('\n');
      })
      .filter(Boolean)
      .join('\n\n');

  let result = cleanOnce(source);
  // A claim can straddle a line break ("...a degree" / "Operations Management"): remove what the whole-text check
  // still finds, piece by piece. If that does not clear it, nothing safe is left.
  for (let i = 0; i < 3; i += 1) {
    const left = unlistedQualifications(result, resumeData, ignore);
    if (left.length === 0) return result.trim();
    const pieces = result.split(/\n+/).flatMap(sentencesOf);
    const offending = left.map((w) => w.toLowerCase());
    const survivors = pieces.filter((p) => !offending.some((w) => p.toLowerCase().includes(w)));
    result = survivors.length !== pieces.length ? survivors.join('\n\n') : '';
  }
  return unlistedQualifications(result, resumeData, ignore).length === 0 ? result.trim() : '';
}
