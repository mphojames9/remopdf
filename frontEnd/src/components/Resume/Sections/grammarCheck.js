// Grammar, style and résumé checks. Like spellCheck.js this is plain JavaScript: no React, no
// dictionary, no network. It is a small rule engine (regular expressions plus a few word lists),
// so it runs in a few milliseconds and works offline.
//
// Every issue points into the ORIGINAL text and carries edits that are ready to apply:
//   { id, rule, kind, title, message, start, end, text, edits, soft, span, dismissKey, context }
//   edits: [{ start, end, text, label }]   (empty when the advice cannot be applied automatically)
// kind is 'grammar' (mistakes), 'style' (clearer wording) or 'resume' (résumé-specific advice).
// A "soft" issue is advice about a whole sentence (too long, repetitive openers). It never has edits.

const WORD_RE = /[A-Za-z]+(?:['’][A-Za-z]+)*/g;
const SENTENCE_RE = /[^.!?\n]+(?:[.!?]+|\n|$)/g;
const MARK = '\u0001';
const MAX_SENTENCE_WORDS = 30;
const CAPS = { 'first-person': 3, exclamation: 1 }; // at most this many cards for a noisy rule

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const phraseRe = (phrase) => new RegExp(`\\b${phrase.split(' ').map(escapeRe).join('[ \\t]+')}\\b`, 'gi');

// Tags, links, e-mail addresses and formatting marks (* _ ~ `) are not prose. They are swapped for a
// placeholder of the same length, so every offset in the scan still points into the original text.
const toScan = (text) => text
  .replace(/<[^>]*>/g, (m) => MARK.repeat(m.length))
  .replace(/(?:https?:\/\/|www\.)\S+/gi, (m) => MARK.repeat(m.length))
  .replace(/\S+@\S+\.\S+/g, (m) => MARK.repeat(m.length))
  .replace(/[*_~`]/g, MARK);

// True when `before` ends where a sentence (or a line, or a bullet) begins.
const startsSentence = (before) => /(?:^|[.!?\n])[ \t\u0001>•\-–—#]*$/.test(before);
// True when `before` ends where a clause begins ("..., and he have" or "He have").
const startsClause = (before) => /(?:^|[.!?\n,;:]|\b(?:and|but|because|so|while|although|since|that|which|who)\b)[ \t\u0001>•\-–—#]*$/i.test(before);

// "Phase I", "Type I", "Elizabeth I": a Roman numeral, not the pronoun.
const ROMAN_CUE = /\b(?:phase|part|type|war|chapter|level|grade|class|section|step|stage|tier|vitamin)[ \t]+$/i;
const afterRomanCue = (before) => {
  if (ROMAN_CUE.test(before)) return true;
  const name = before.match(/\b[A-Z][A-Za-z]*[ \t]+$/); // a capitalised word in the middle of a sentence
  return Boolean(name) && !startsSentence(before.slice(0, name.index));
};

// Keeps the capitalisation the writer used: "Utilize" -> "Use", "UTILIZE" -> "USE".
const keepCase = (original, replacement) => {
  if (!original || !replacement) return replacement;
  if (original.length > 1 && original === original.toUpperCase() && /[A-Z]/.test(original)) return replacement.toUpperCase();
  const first = original.charAt(0);
  return first !== first.toLowerCase() ? replacement.charAt(0).toUpperCase() + replacement.slice(1) : replacement;
};

// What the reader sees around a problem: { before, hit, after }, with formatting marks dropped.
const clip = (s) => s.replace(/<[^>]*>/g, '').replace(/[*_~`]/g, '').replace(/\s+/g, ' ');
export const contextAround = (text, start, end, radius = 22) => {
  const from = Math.max(0, start - radius);
  const to = Math.min(text.length, end + radius);
  const hit = text.slice(start, end);
  return {
    before: (from > 0 ? '…' : '') + clip(text.slice(from, start)),
    hit: hit.trim() === '' ? '␣'.repeat(clamp(hit.length, 1, 4)) : clip(hit),
    after: clip(text.slice(end, to)) + (to < text.length ? '…' : ''),
  };
};

// ---------------------------------------------------------------------------------------------
// "a" or "an": decided by the SOUND of the next word, not its first letter.
// ---------------------------------------------------------------------------------------------
const SILENT_H = /^(?:hour|honest|honou?r|heir)/i;
const CONSONANT_SOUND = /^(?:uni(?![nm])|use|usu|ute|uti|uto|uta|ura|uro|ubi|uku|unan|eu|ewe|one(?!r)|once)/i;
const vowelSound = (word) => {
  if (SILENT_H.test(word)) return true;
  if (CONSONANT_SOUND.test(word)) return false;
  return /^[aeiou]/i.test(word);
};

// ---------------------------------------------------------------------------------------------
// Rule definitions
// ---------------------------------------------------------------------------------------------
const def = (id, kind, title, message) => ({ id, kind, title, message });
const D = {
  repeated: def('repeated-word', 'grammar', 'Repeated word', 'The same word appears twice in a row.'),
  article: def('article', 'grammar', 'A or an?', 'Use “an” before a vowel sound and “a” before a consonant sound.'),
  agreement: def('agreement', 'grammar', 'Subject–verb agreement', 'The verb does not match its subject.'),
  couldOf: def('could-of', 'grammar', '“of” instead of “have”', 'It sounds like “of”, but the correct form is “could have”, “should have” and so on.'),
  then: def('then-than', 'grammar', '“then” or “than”?', 'Use “than” to compare things. “Then” is about time.'),
  its: def('its', 'grammar', '“its” or “it’s”?', '“It’s” means “it is” or “it has”. “Its” shows ownership.'),
  your: def('your', 'grammar', '“your” or “you’re”?', '“You’re” means “you are”. “Your” shows ownership.'),
  their: def('their', 'grammar', '“their” or “there”?', '“There is” and “there are” need “there”. “Their” shows ownership.'),
  regards: def('in-regards-to', 'grammar', 'Awkward phrase', '“In regards to” is a common slip. “Regarding” or “in regard to” is correct.'),
  irregardless: def('irregardless', 'grammar', 'Not a standard word', 'Use “regardless”.'),
  alot: def('alot', 'grammar', 'Two words', '“A lot” is always written as two words.'),
  capital: def('capital', 'grammar', 'Capital letter', 'A new sentence starts with a capital letter.'),
  pronounI: def('lowercase-i', 'grammar', 'Capital “I”', 'The pronoun “I” is always a capital letter.'),
  spaces: def('extra-space', 'grammar', 'Extra space', 'Use a single space between words.'),
  spaceBefore: def('space-before-punctuation', 'grammar', 'Space before punctuation', 'Punctuation sticks to the word before it.'),
  commaSpace: def('space-after-comma', 'grammar', 'Missing space', 'Add a space after a comma.'),
  stopSpace: def('space-after-stop', 'grammar', 'Missing space', 'Add a space after the full stop.'),
  doublePunct: def('double-punctuation', 'grammar', 'Repeated punctuation', 'One mark is enough.'),
  wordy: def('wordy', 'style', 'Wordy phrase', 'There is a shorter way to say this.'),
  filler: def('filler', 'style', 'Filler word', 'Cutting this word usually makes the sentence stronger.'),
  passive: def('passive', 'style', 'Passive voice', 'Active voice sounds more confident. Say who did the work.'),
  longSentence: def('long-sentence', 'style', 'Long sentence', 'Shorter sentences are easier to read.'),
  openers: def('repeated-opener', 'style', 'Repetitive openings', 'Vary how your sentences begin.'),
  weak: def('weak-phrase', 'resume', 'Weak opener', 'This phrase hides what you actually did. Open with a strong action verb.'),
  buzz: def('buzzword', 'resume', 'Overused phrase', 'Recruiters read this all the time. A specific result is more convincing.'),
  hedge: def('hedge', 'resume', 'Hedging', 'Sound sure of yourself and state what you did.'),
  firstPerson: def('first-person', 'resume', 'First person', 'Résumés read more confidently without “I”. Lead with what you did.'),
  exclaim: def('exclamation', 'resume', 'Exclamation mark', 'Exclamation marks can look unprofessional on a résumé.'),
};

// Simple "this exact slip -> that fix" rules. `tail` means the fix replaces only capture group 1,
// which sits at the end of the match ("could of" -> "could have").
const SIMPLE = [
  { d: D.regards, re: /\bin[ \t]+regards?[ \t]+to\b/gi, options: ['regarding', 'in regard to'] },
  { d: D.irregardless, re: /\birregardless\b/gi, options: ['regardless'] },
  { d: D.alot, re: /\balot\b/gi, options: ['a lot'] },
  { d: D.its, re: /\bits(?=[ \t]+(?:a|an|the|been|not)\b)/gi, options: ["it's"] },
  { d: D.your, re: /\byour(?=[ \t]+(?:a|an|going|not|welcome|the)\b)/gi, options: ["you're"] },
  { d: D.their, re: /\btheir(?=[ \t]+(?:is|are|was|were)\b)/gi, options: ['there'] },
  { d: D.couldOf, re: /\b(?:could|should|would|must|might)[ \t]+(of)\b(?![ \t]+course)/gi, options: ['have'], tail: true },
  {
    d: D.then,
    re: /\b(?:more|less|better|worse|greater|fewer|larger|smaller|higher|lower|rather|faster|slower|bigger|easier|harder)[ \t]+(then)\b/gi,
    options: ['than'],
    tail: true,
  },
];

const AGREEMENT = {
  'i is': 'am', 'i are': 'am', 'i has': 'have', 'i does': 'do',
  'we is': 'are', 'we has': 'have', 'we was': 'were', 'we does': 'do',
  'you is': 'are', 'you has': 'have', 'you was': 'were', 'you does': 'do',
  'they is': 'are', 'they has': 'have', 'they was': 'were', 'they does': 'do',
  'he are': 'is', 'she are': 'is', 'it are': 'is',
  'he have': 'has', 'she have': 'has', 'it have': 'has',
  'he do': 'does', 'she do': 'does', 'it do': 'does',
  "he don't": "doesn't", "she don't": "doesn't", "it don't": "doesn't",
};

const NOT_REPEATS = new Set(['had', 'that', 'is', 'do', 'can']); // "had had" and "that that" are fine

const ABBREVIATIONS = new Set([
  'e.g', 'i.e', 'etc', 'vs', 'inc', 'ltd', 'co', 'corp', 'approx', 'dept', 'est', 'fig', 'mr', 'mrs', 'ms',
  'dr', 'prof', 'jr', 'sr', 'st', 'no', 'cf', 'al', 'ca', 'a.m', 'p.m', 'u.s', 'u.k', 'ph.d',
]);

// Shorter ways to say it: [phrase, options].
const WORDY = [
  ['in order to', ['to']],
  ['due to the fact that', ['because']],
  ['owing to the fact that', ['because']],
  ['in spite of the fact that', ['although']],
  ['despite the fact that', ['although']],
  ['a number of', ['several', 'many']],
  ['at this point in time', ['now']],
  ['at the present time', ['now']],
  ['for the purpose of', ['for']],
  ['in the event that', ['if']],
  ['with regard to', ['about', 'regarding']],
  ['with respect to', ['about', 'regarding']],
  ['is able to', ['can']],
  ['are able to', ['can']],
  ['has the ability to', ['can']],
  ['have the ability to', ['can']],
  ['on a daily basis', ['daily']],
  ['on a weekly basis', ['weekly']],
  ['on a monthly basis', ['monthly']],
  ['on a regular basis', ['regularly']],
  ['in a timely manner', ['promptly']],
  ['the majority of', ['most']],
  ['a majority of', ['most']],
  ['prior to', ['before']],
  ['subsequent to', ['after']],
  ['in close proximity to', ['near']],
  ['as a result of', ['because of']],
  ['each and every', ['every']],
  ['first and foremost', ['first']],
  ['whether or not', ['whether']],
  ['end result', ['result']],
  ['past experience', ['experience']],
  ['in the near future', ['soon']],
  ['utilize', ['use']], ['utilise', ['use']],
  ['utilized', ['used']], ['utilised', ['used']],
  ['utilizing', ['using']], ['utilising', ['using']],
  ['commence', ['start', 'begin']],
  ['commenced', ['started', 'began']],
].map(([phrase, options]) => ({ re: phraseRe(phrase), options }));

// Résumé openers that hide the action. `verb` marks the ones that are replaced by an action verb,
// which only reads well when the next word is not already an -ing verb.
const WEAK = [
  ['was responsible for', ['led', 'managed', 'owned'], true],
  ['responsible for', ['led', 'managed', 'owned'], true],
  ['in charge of', ['led', 'managed', 'oversaw'], true],
  ['tasked with', ['handled', 'owned'], true],
  ['worked on', ['built', 'developed', 'delivered'], true],
  ['working on', ['building', 'developing', 'delivering'], true],
  ['helped with', ['supported', 'contributed to'], false],
  ['assisted with', ['supported'], false],
  ['assisted in', ['supported'], false],
  ['participated in', ['contributed to'], false],
  ['involved in', ['contributed to'], false],
  ['duties included', null, false],
  ['responsibilities included', null, false],
].map(([phrase, options, verb]) => ({ re: phraseRe(phrase), options, verb }));

const BUZZ = [
  ['team player', null], ['hard worker', null], ['hard-working', null], ['hard working', null],
  ['go-getter', null], ['self-starter', null], ['results-driven', null], ['results-oriented', null],
  ['think outside the box', null], ['out-of-the-box', null], ['synergy', null], ['proven track record', null],
  ['highly motivated', null], ['excellent communication skills', null], ['strong communication skills', null],
  ['good communication skills', null], ['rockstar', null], ['ninja', null], ['guru', null],
  ['leveraged', ['used', 'applied']], ['leveraging', ['using', 'applying']],
  ['references available upon request', null, 'Not needed. Employers assume you can provide references.'],
].map(([phrase, options, message]) => ({ re: phraseRe(phrase), options, message }));

const FILLER_RE = /\b(?:basically|essentially|literally|actually|really|very|quite|extremely|totally|simply|definitely|absolutely|obviously)\b/gi;
const HEDGE_WORD_RE = /\b(?:somewhat|perhaps|maybe|probably)\b/gi;
const HEDGE_PHRASE_RE = /\bI[ \t]+(?:think|believe|feel)\b/gi;
const PASSIVE_RE = /\b(?:am|is|are|was|were|be|been|being)[ \t]+(?:[a-z]+ed|built|made|given|taken|written|chosen|shown|led|run|held|done|known|seen|sent|kept|set)[ \t]+by\b/gi;
const PAST_VERB = /^(?:(?!need$|proceed$|succeed$|exceed$|feed$|speed$|indeed$|bleed$|breed$)[a-z]{3,}ed|led|built|ran|wrote|drove|made|grew|won|taught|oversaw|began|chose|took|sold|brought|kept|held|spoke|set)$/i;

// ---------------------------------------------------------------------------------------------
// The checker
// ---------------------------------------------------------------------------------------------
const PRIORITY = { grammar: 0, spelling: 1, style: 2, resume: 3 };

export const findWritingIssues = (text, { dismissed = new Set(), skipTrailing = false } = {}) => {
  if (!text || !text.trim()) return [];
  const scan = toScan(text);
  const textEnd = scan.trimEnd().length;
  const out = [];
  const used = {};

  const intact = (s, e) => scan.slice(s, e) === text.slice(s, e); // false when the range crosses a link or a formatting mark
  const each = (re, fn) => { for (const m of scan.matchAll(re)) fn(m, m.index, m.index + m[0].length); };

  const add = (d, start, end, edits = [], { soft = false, message = d.message } = {}) => {
    if (skipTrailing && end >= textEnd) return; // the writer is probably still typing it
    if (!intact(start, end)) return;
    const shown = text.slice(start, end);
    const dismissKey = `${d.id}:${shown.toLowerCase()}`;
    if (dismissed.has(dismissKey)) return;
    if (CAPS[d.id] && (used[d.id] || 0) >= CAPS[d.id]) return;
    used[d.id] = (used[d.id] || 0) + 1;
    const good = edits.filter((e) => intact(e.start, e.end));
    const span = good.length
      ? [Math.min(...good.map((e) => e.start)), Math.max(...good.map((e) => e.end))]
      : [start, end];
    out.push({
      id: `${d.id}@${start}`,
      rule: d.id,
      kind: d.kind,
      title: d.title,
      message,
      start,
      end,
      text: shown,
      dismissKey,
      soft,
      edits: good,
      span,
      context: contextAround(text, start, end),
    });
  };

  // Deleting a word also removes the space after it, and capitalises the next word at a sentence start.
  const removal = (s, e, eatComma = true) => {
    let end = e;
    if (eatComma && scan[end] === ',') end += 1;
    while (scan[end] === ' ' || scan[end] === '\t') end += 1;
    const next = text[end] || '';
    if (startsSentence(scan.slice(0, s)) && /[a-z]/.test(next)) {
      return { start: s, end: end + 1, text: next.toUpperCase(), label: 'Remove' };
    }
    let start = s;
    if (!next || /[\n.,;:!?)]/.test(next)) {
      while (start > 0 && (scan[start - 1] === ' ' || scan[start - 1] === '\t')) start -= 1;
    }
    return { start, end, text: '', label: 'Remove' };
  };

  const nextWord = (e) => (scan.slice(e).match(/^[ \t]+([A-Za-z]+)/) || [])[1] || '';
  const pronounSlot = (s, e) => {
    const prev = scan[s - 1] || '';
    const next = scan[e] || '';
    if (/[./\-\\]/.test(prev) || /[./\-)\\]/.test(next)) return false; // i.e. / I/O / (i) / i-th
    return !(prev === '(' && next === ')');
  };

  // --- Grammar ---------------------------------------------------------------------------------
  each(/\b([A-Za-z]+)[ \t]+\1\b/gi, (m, s, e) => {
    if (NOT_REPEATS.has(m[1].toLowerCase())) return;
    add(D.repeated, s, e, [{ start: s, end: e, text: m[1], label: m[1] }]);
  });

  each(/\b(a|an)[ \t]+([A-Za-z][A-Za-z'’-]*)/gi, (m, s, e) => {
    const [, article, word] = m;
    if (word.length > 1 && word === word.toUpperCase()) return; // acronyms are ambiguous (an HTML, a SQL)
    const wantsAn = vowelSound(word);
    if (wantsAn === (article.toLowerCase() === 'an')) return;
    const fix = keepCase(article, wantsAn ? 'an' : 'a');
    add(D.article, s, e, [{ start: s, end: s + article.length, text: fix, label: fix }]);
  });

  each(/\b(I|we|you|they|he|she|it)[ \t]+(is|are|was|has|have|does|do|don['’]t)\b/gi, (m, s, e) => {
    const subject = m[1].toLowerCase();
    const verb = m[2].toLowerCase().replace('’', "'");
    const fix = AGREEMENT[`${subject} ${verb}`];
    if (!fix) return;
    const before = scan.slice(0, s);
    // "Did he have" and "make it do" are correct, so he/she/it + have/do only counts at the start of a clause.
    if (/^(he|she|it)$/.test(subject) && /^(have|do|don't)$/.test(verb) && !startsClause(before)) return;
    if (subject === 'i' && afterRomanCue(before)) return;
    const at = e - m[2].length;
    const text2 = keepCase(m[2], fix);
    add(D.agreement, s, e, [{ start: at, end: e, text: text2, label: fix }]);
  });

  SIMPLE.forEach(({ d, re, options, tail }) => each(re, (m, s, e) => {
    const start = tail ? e - m[1].length : s;
    const original = tail ? m[1] : m[0];
    add(d, s, e, options.map((o) => ({ start, end: e, text: keepCase(original, o), label: o })));
  }));

  each(/([.!?])([ \t]+)([a-z])/g, (m, s) => {
    const before = scan.slice(0, s);
    if (before.endsWith('.')) return; // ellipsis
    const token = (before.match(/[A-Za-z0-9.]+$/) || [''])[0];
    if (m[1] === '.' && (ABBREVIATIONS.has(token.toLowerCase()) || /^\d+$/.test(token) || token.length === 1 || token.includes('.'))) return;
    const at = s + 1 + m[2].length;
    if (/^[a-z]\.[a-z]/.test(scan.slice(at))) return; // "e.g." and "i.e." are written in lower case
    const wordEnd = at + (scan.slice(at).match(/^[a-z]+/) || [m[3]])[0].length;
    add(D.capital, at, wordEnd, [{ start: at, end: at + 1, text: m[3].toUpperCase(), label: m[3].toUpperCase() }]);
  });

  each(/\bi\b/g, (m, s, e) => {
    if (!pronounSlot(s, e)) return;
    add(D.pronounI, s, e, [{ start: s, end: e, text: 'I', label: 'I' }]);
  });

  each(/(\S)( {2,})(?=\S)/g, (m, s) => {
    const at = s + 1;
    add(D.spaces, at, at + m[2].length, [{ start: at, end: at + m[2].length, text: ' ', label: 'Single space' }]);
  });

  each(/(\S)([ \t]+)([,;:!?]|\.(?!\.))(?=\s|$)/g, (m, s, e) => {
    const at = s + 1;
    add(D.spaceBefore, at, e, [{ start: at, end: e, text: m[3], label: 'Remove space' }]);
  });

  each(/,(?=[A-Za-z])/g, (m, s, e) => add(D.commaSpace, s, e, [{ start: s, end: e, text: ', ', label: 'Add space' }]));
  each(/(?:[a-z]{2,}\.|[!?])(?=[A-Z][a-z])/g, (m, s, e) => {
    const mark = m[0].slice(-1);
    add(D.stopSpace, e - 1, e, [{ start: e - 1, end: e, text: `${mark} `, label: 'Add space' }]);
  });

  each(/([!?,;:])\1+/g, (m, s, e) => add(D.doublePunct, s, e, [{ start: s, end: e, text: m[1], label: m[1] }]));
  each(/(?:^|[^.])(\.\.)(?!\.)/g, (m, s, e) => add(D.doublePunct, e - 2, e, [
    { start: e - 2, end: e, text: '.', label: 'One dot' },
    { start: e - 2, end: e, text: '…', label: 'Ellipsis' },
  ]));

  // --- Style -----------------------------------------------------------------------------------
  WORDY.forEach(({ re, options }) => each(re, (m, s, e) => {
    add(D.wordy, s, e, options.map((o) => ({ start: s, end: e, text: keepCase(m[0], o), label: o })));
  }));

  each(FILLER_RE, (m, s, e) => add(D.filler, s, e, [removal(s, e)]));
  each(PASSIVE_RE, (m, s, e) => add(D.passive, s, e));

  const sentences = [];
  each(SENTENCE_RE, (m, s) => {
    const words = [...m[0].matchAll(WORD_RE)].map((w) => ({ start: s + w.index, end: s + w.index + w[0].length, text: w[0] }));
    if (words.length > 0) sentences.push(words);
  });
  sentences.forEach((words) => {
    if (words.length <= MAX_SENTENCE_WORDS) return;
    const last = words[Math.min(2, words.length - 1)];
    add(D.longSentence, words[0].start, last.end, [], {
      soft: true,
      message: `This sentence has ${words.length} words. Aim for 25 or fewer, or split it in two.`,
    });
  });
  let run = 1;
  sentences.forEach((words, i) => {
    const same = i > 0 && sentences[i - 1][0].text.toLowerCase() === words[0].text.toLowerCase();
    run = same ? run + 1 : 1;
    if (run !== 3) return;
    add(D.openers, words[0].start, words[0].end, [], {
      soft: true,
      message: `Three sentences in a row start with “${words[0].text}”. Change how one of them begins.`,
    });
  });

  // --- Résumé tips -----------------------------------------------------------------------------
  WEAK.forEach(({ re, options, verb }) => each(re, (m, s, e) => {
    if (options && !(verb && /ing$/i.test(nextWord(e)))) {
      add(D.weak, s, e, options.map((o) => ({ start: s, end: e, text: keepCase(m[0], o), label: o })));
      return;
    }
    add(D.weak, s, e, [], {
      message: 'Open with the action itself: “Managed the team” beats “Responsible for managing the team”.',
    });
  }));

  BUZZ.forEach(({ re, options, message }) => each(re, (m, s, e) => {
    add(D.buzz, s, e, (options || []).map((o) => ({ start: s, end: e, text: keepCase(m[0], o), label: o })), message ? { message } : {});
  }));

  each(HEDGE_WORD_RE, (m, s, e) => add(D.hedge, s, e, [removal(s, e)]));
  each(HEDGE_PHRASE_RE, (m, s, e) => add(D.hedge, s, e));

  each(/\b(?:I|me|my|myself)\b/gi, (m, s, e) => {
    const word = m[0];
    if (word === 'i') return; // a lowercase i is already a grammar issue
    if (word === 'I' && (!pronounSlot(s, e) || afterRomanCue(scan.slice(0, s)))) return;
    const edits = [];
    if (word === 'I' && PAST_VERB.test(nextWord(e))) edits.push({ ...removal(s, e, false), label: 'Remove “I”' });
    add(D.firstPerson, s, e, edits);
  });

  each(/!+/g, (m, s, e) => add(D.exclaim, s, e, [{ start: s, end: e, text: '.', label: 'Use a full stop' }]));

  // --- Keep one issue per stretch of text: grammar beats spelling beats style beats résumé tips ---
  const kept = [];
  [...out]
    .sort((a, b) => PRIORITY[a.kind] - PRIORITY[b.kind] || a.start - b.start)
    .forEach((issue) => {
      const clash = !issue.soft && kept.some((k) => !k.soft && issue.span[0] < k.span[1] && k.span[0] < issue.span[1]);
      if (!clash) kept.push(issue);
    });
  return kept.sort((a, b) => a.start - b.start);
};

// Drops spelling hits that a grammar or style issue already covers (for example "alot" -> "a lot").
export const withoutOverlaps = (spellHits, issues) => spellHits.filter(
  (h) => !issues.some((i) => !i.soft && h.start < i.span[1] && i.span[0] < h.end),
);

export const applyEdit = (text, edit) => text.slice(0, edit.start) + edit.text + text.slice(edit.end);

// ---------------------------------------------------------------------------------------------
// Reading statistics, tips and the overall score
// ---------------------------------------------------------------------------------------------
const STOP = new Set([
  'about', 'after', 'again', 'also', 'among', 'because', 'before', 'being', 'between', 'could', 'during', 'every',
  'first', 'their', 'there', 'these', 'those', 'through', 'under', 'which', 'while', 'where', 'would', 'should',
  'other', 'with', 'within', 'without', 'across', 'around', 'using', 'having',
  'that', 'this', 'from', 'have', 'been', 'were', 'they', 'them', 'will', 'your', 'over', 'more', 'most', 'such',
  'than', 'then', 'each', 'into', 'only', 'both', 'many', 'much', 'very', 'when', 'what', 'does', 'done', 'made',
  'make', 'like', 'just', 'well', 'good', 'need', 'used', 'uses', 'some', 'same', 'able', 'been', 'here',
]);

const POWER_VERBS = new Set([
  'achieved', 'analysed', 'analyzed', 'automated', 'built', 'championed', 'coached', 'collaborated', 'coordinated',
  'created', 'cut', 'delivered', 'deployed', 'designed', 'developed', 'directed', 'drove', 'earned', 'enhanced',
  'established', 'executed', 'expanded', 'generated', 'grew', 'implemented', 'improved', 'increased', 'initiated',
  'integrated', 'introduced', 'launched', 'led', 'maintained', 'managed', 'mentored', 'migrated', 'negotiated',
  'optimised', 'optimized', 'orchestrated', 'organised', 'organized', 'oversaw', 'owned', 'planned', 'produced',
  'reduced', 'refactored', 'resolved', 'saved', 'scaled', 'secured', 'shipped', 'simplified', 'spearheaded',
  'streamlined', 'strengthened', 'supervised', 'taught', 'tested', 'trained', 'transformed', 'won',
]);

const syllables = (word) => {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 3) return 1;
  const groups = w.replace(/(?:[^laeiouy]es|[^laeiouy]ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g);
  return groups ? groups.length : 1;
};

export const analyzeText = (text) => {
  const scan = toScan(text || '');
  const words = scan.match(WORD_RE) || [];
  const sentences = (scan.match(SENTENCE_RE) || []).filter((s) => /[A-Za-z]/.test(s)).length;
  const lower = words.map((w) => w.toLowerCase().replace(/’/g, "'"));
  const avgSentence = sentences ? words.length / sentences : 0;
  const perWord = words.length ? words.reduce((n, w) => n + syllables(w), 0) / words.length : 0;
  const readingEase = words.length ? clamp(206.835 - 1.015 * avgSentence - 84.6 * perWord, 0, 100) : 0;

  const counts = new Map();
  lower.forEach((w) => {
    if (w.length >= 4 && !STOP.has(w)) counts.set(w, (counts.get(w) || 0) + 1);
  });
  const repeated = [...counts]
    .filter(([, n]) => n >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word, count]) => ({ word, count }));

  return {
    words: words.length,
    sentences,
    avgSentence: Math.round(avgSentence),
    readingEase: Math.round(readingEase),
    powerVerbs: new Set(lower.filter((w) => POWER_VERBS.has(w))).size,
    hasNumbers: /\d/.test(scan),
    repeated,
  };
};

export const readingLabel = (ease) => {
  if (ease >= 70) return 'easy';
  if (ease >= 50) return 'clear';
  if (ease >= 30) return 'dense';
  return 'very dense';
};

// Up to three ideas that no single rule can see: length, numbers, strong verbs, repetition.
export const getTips = (stats) => {
  if (!stats || stats.words < 8) return [];
  const tips = [];
  if (stats.words < 25) tips.push('A little more detail will help. Aim for 40 to 80 words.');
  else if (stats.words > 110) tips.push('This is long for a summary. Aim for 40 to 80 words.');
  if (!stats.hasNumbers && stats.words >= 20) tips.push('Add one number: years of experience, team size or a % result.');
  if (stats.powerVerbs === 0 && stats.words >= 20) tips.push('Try a strong verb such as “led”, “built” or “delivered”.');
  if (stats.repeated.length > 0) tips.push(`“${stats.repeated[0].word}” appears ${stats.repeated[0].count} times. Try a synonym.`);
  if (stats.readingEase < 30 && stats.words >= 20) tips.push('The reading level is dense. Shorter sentences will help.');
  return tips.slice(0, 3);
};

// 0 to 100. Mistakes cost more than wording advice, and the cost is relative to the length of the text.
export const writingScore = (counts, wordCount) => {
  const penalty = counts.spelling * 6 + counts.grammar * 6 + counts.style * 2 + counts.resume * 1.5;
  return clamp(Math.round(100 - (penalty * 100) / Math.max(wordCount, 40)), 0, 100);
};

export const scoreLabel = (score) => {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 55) return 'Needs polish';
  return 'Needs work';
};
