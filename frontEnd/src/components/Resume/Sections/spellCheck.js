// Pure helpers for the live spell check. There is no React and no dictionary in here:
// `spell` is anything with correct(word) and suggest(word), which is what nspell provides.

const WORD_RE = /[A-Za-z]+(?:['’][A-Za-z]+)*/g;
const SENTENCE_RE = /[^.!?\n]+(?:[.!?]+|\n|$)/g;

// Words a developer's CV is full of that an ordinary English dictionary does not know.
// Added to the dictionary once, so they are never flagged and can be offered as suggestions.
export const TECH_TERMS = [
  'frontend', 'frontends', 'backend', 'backends', 'fullstack', 'devops', 'webapp', 'webapps',
  'codebase', 'codebases', 'repo', 'repos', 'config', 'async', 'refactor', 'refactored', 'refactoring',
  'javascript', 'typescript', 'js', 'jsx', 'tsx', 'nodejs', 'reactjs', 'vuejs', 'nextjs',
  'html', 'css', 'scss', 'sass', 'json', 'yaml', 'xml', 'sql', 'nosql', 'mysql', 'postgresql', 'postgres',
  'mongodb', 'sqlite', 'graphql', 'restful', 'api', 'apis', 'sdk', 'ui', 'ux', 'saas', 'paas',
  'github', 'gitlab', 'bitbucket', 'git', 'npm', 'yarn', 'webpack', 'vite', 'babel', 'eslint', 'redux',
  'tailwind', 'tailwindcss', 'bootstrap', 'figma', 'jira', 'docker', 'kubernetes', 'aws', 'azure',
  'linux', 'ios', 'android', 'firebase', 'supabase', 'oauth', 'jwt', 'ajax', 'microservice', 'microservices',
  'serverless', 'middleware', 'wireframe', 'wireframes', 'mockup', 'mockups', 'agile', 'scrum', 'kanban', 'cicd',
];

export const addTechVocabulary = (spell) => {
  if (spell && typeof spell.add === 'function') TECH_TERMS.forEach((word) => spell.add(word));
  return spell;
};

// A few real words that are almost always a slip in a developer's CV. Each one needs a developer
// word right after it, so ordinary uses ("a fronted adverbial", "she backed him") are left alone.
const CONTEXT_FIXES = [
  {
    re: /\b(fronted|backed)(?=[-\s]+(?:focused|developers?|engineers?|devs?|web|frameworks?|code|applications?|apps?|design|team|role|specialists?|stack|skills|work)\b)/gi,
    fixFor: (word) => (word.toLowerCase() === 'fronted' ? 'frontend' : 'backend'),
  },
];

const blank = (match) => ' '.repeat(match.length);

// Tags, links and e-mail addresses are not prose, so they are blanked out before reading.
// The replacement has the same length, so every offset still points into the original text.
const readable = (text) => text
  .replace(/<[^>]*>/g, blank)
  .replace(/(?:https?:\/\/|www\.)\S+/gi, blank)
  .replace(/\S+@\S+\.\S+/g, blank);

// True when `before` ends where a sentence (or a line, or a bullet) begins.
const startsSentence = (before) => /(?:^|[.!?:\n])[ \t*_~`>•\-–—#]*$/.test(before);

const isCapitalized = (word) => /^[A-Z][^A-Z]*$/.test(word);

// Acronyms (SQL, AWS) and camel case (JavaScript, iOS) are almost always intentional.
const looksIntentional = (word) => (word.length > 1 && word === word.toUpperCase()) || /[a-z][A-Z]/.test(word);

// Pieces of things like "3D", "mp3", "@handle" or "snake_case" are not words.
const touchesCode = (scan, start, end) => /[0-9_@#]/.test(scan[start - 1] || '') || /[0-9_]/.test(scan[end] || '');

// Keeps the capitalisation the writer used: "Teh" -> "The", "teh" -> "the".
export const matchCase = (original, suggestion) => {
  if (!original || !suggestion) return suggestion;
  if (original.length > 1 && original === original.toUpperCase()) return suggestion.toUpperCase();
  const first = original.charAt(0);
  if (first !== first.toLowerCase()) return suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
  return suggestion;
};

// Every misspelled word in `text`, in order: [{ key, start, end, text, fix? }].
// `fix` is set when the word is a real word that is wrong in context (Fronted-focused -> frontend).
// skipTrailing leaves out a word that touches the end of the text, because the writer is probably still typing it.
export const findMisspellings = (text, spell, { ignored = new Set(), skipTrailing = false } = {}) => {
  if (!text || !spell) return [];
  const scan = readable(text);
  const found = [];

  for (const m of scan.matchAll(WORD_RE)) {
    const start = m.index;
    const end = start + m[0].length;
    const word = m[0].replace(/’/g, "'");
    const key = word.toLowerCase();
    if (word.length < 2) continue;
    if (touchesCode(scan, start, end)) continue;
    if (looksIntentional(word)) continue;
    if (ignored.has(key)) continue;
    if (skipTrailing && end === scan.length) continue;
    // A capitalised word in the middle of a sentence is usually a name or a company.
    if (isCapitalized(word) && !startsSentence(scan.slice(0, start))) continue;
    if (spell.correct(word)) continue;
    found.push({ key, start, end, text: text.slice(start, end) });
  }

  CONTEXT_FIXES.forEach(({ re, fixFor }) => {
    for (const m of scan.matchAll(re)) {
      const key = m[1].toLowerCase();
      if (ignored.has(key)) continue;
      found.push({ key, start: m.index, end: m.index + m[1].length, text: text.slice(m.index, m.index + m[1].length), fix: fixFor(m[1]) });
    }
  });

  return found.sort((a, b) => a.start - b.start);
};

// One entry per misspelled word, with every place it appears: [{ key, word, fix?, ranges }].
export const groupMisspellings = (found) => {
  const byKey = new Map();
  found.forEach((hit) => {
    if (!byKey.has(hit.key)) byKey.set(hit.key, { key: hit.key, word: hit.text, fix: hit.fix, ranges: [] });
    byKey.get(hit.key).ranges.push(hit);
  });
  return [...byKey.values()];
};

// Suggestions are looked up once per word and kept in `cache` (a Map), since suggest() is the slow part.
export const suggestionsFor = (spell, issue, cache, limit = 4) => {
  if (!cache.has(issue.key)) {
    let list = [];
    if (issue.fix) {
      list = [issue.fix];
    } else {
      try {
        list = spell.suggest(issue.word.replace(/’/g, "'")) || [];
      } catch {
        list = [];
      }
    }
    cache.set(issue.key, [...new Set(list)].slice(0, limit));
  }
  return cache.get(issue.key);
};

// Swaps each range for its replacement, working from the end so earlier offsets stay valid.
export const replaceRanges = (text, replacements) => [...replacements]
  .sort((a, b) => b.start - a.start)
  .reduce((out, r) => out.slice(0, r.start) + r.text + out.slice(r.end), text);

// Swaps every range for the same suggestion, keeping the capitalisation of each one.
export const applySuggestion = (text, ranges, suggestion) => replaceRanges(
  text,
  ranges.map((r) => ({ start: r.start, end: r.end, text: matchCase(r.text, suggestion) })),
);

// What the reader sees: formatting marks and bullet characters are dropped.
const tidyParts = (parts) => {
  const cleaned = parts
    .map((p) => ({ ...p, text: p.text.replace(/[*_~`]/g, '') }))
    .filter((p) => p.text !== '');
  if (cleaned.length === 0) return cleaned;
  cleaned[0].text = cleaned[0].text.replace(/^[\s•\-–—>#]+/, '');
  const last = cleaned[cleaned.length - 1];
  last.text = last.text.replace(/\s+$/, '');
  return cleaned.filter((p) => p.text !== '');
};

// The "Did you mean" lines: every sentence that has a correctable mistake, with the corrected
// sentence ready to show. `topSuggestion(hit)` gives the best replacement for a hit, or nothing.
//   -> [{ original, parts: [{ text, changed }], fixes: [{ start, end, from, to }] }]
export const buildCorrections = (text, found, topSuggestion) => {
  if (!text || found.length === 0) return [];
  const fixes = [];
  found.forEach((hit) => {
    const top = topSuggestion(hit);
    if (top) fixes.push({ start: hit.start, end: hit.end, from: hit.text, to: matchCase(hit.text, top) });
  });
  if (fixes.length === 0) return [];

  const corrections = [];
  for (const m of text.matchAll(SENTENCE_RE)) {
    const segStart = m.index;
    const segEnd = segStart + m[0].length;
    const inside = fixes.filter((f) => f.start >= segStart && f.end <= segEnd);
    if (inside.length === 0) continue;
    const parts = [];
    let pos = segStart;
    inside.forEach((f) => {
      if (f.start > pos) parts.push({ text: text.slice(pos, f.start), changed: false });
      parts.push({ text: f.to, changed: true });
      pos = f.end;
    });
    if (pos < segEnd) parts.push({ text: text.slice(pos, segEnd), changed: false });
    corrections.push({ original: m[0], parts: tidyParts(parts), fixes: inside });
  }
  return corrections;
};

// Applies the fixes of one or more corrections to the text.
export const applyFixes = (text, fixes) => replaceRanges(
  text,
  fixes.map((f) => ({ start: f.start, end: f.end, text: f.to })),
);
