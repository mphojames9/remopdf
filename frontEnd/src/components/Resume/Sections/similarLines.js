/*
  "Same point, different words".

  Two lines can say the same thing without sharing a sentence:

      "Led a 5S initiative that cut workplace waste by 20%, improving safety compliance."
      "Introduced 5S housekeeping standards, reducing waste by 20% and improving safety."

  A resume that says it twice reads as padding, and a recruiter notices. This file is the one place that decides whether
  two lines are the same point, so the AI ideas, the Education details and the writing assistant all agree.

    sameLine(line, idea)        the line IS the idea: identical, or the idea with its [X] placeholders filled in or edited
    sameThing(a, b)             the two lines make the same point (looser: different words, same content)
    stripLabel(text)            "Relevant coursework: A, B" -> "A, B"
    dedupeSimilarLines(text)    a block of text with every repeated point taken out (the first time it is said is kept)

  Plain counting on the device: no AI, no network, nothing sent anywhere. Pure functions, so it runs in node:test.
*/

/* -------------------------------------------------------------------------- */
/*                                  Cleaning                                   */
/* -------------------------------------------------------------------------- */

const stripMarks = (value) =>
  String(value || '')
    .replace(/<\/(li|p|div)>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\*\*\*|\*\*|\*/g, '');

// One line of text as it is compared: no markup, no bullet, lower case, single spaces, no closing full stop.
export const normLine = (value) =>
  stripMarks(value)
    .replace(/^[\s•\-–—*·]+/, '')
    .replace(/\s+/g, ' ')
    .replace(/[\s.;,]+$/, '')
    .trim()
    .toLowerCase();

const PLACEHOLDER = /\[[^\]\n]{1,24}\]/g;

/* -------------------------------------------------------------------------- */
/*                                Labels ("x:")                                */
/* -------------------------------------------------------------------------- */

// The Education ideas used to start with a label ("Relevant coursework: ...", "Focus areas: ...", "Skills developed: ...").
// The label is taken off; what follows is the line.
const KNOWN_LABEL =
  /^(?:relevant\s+|key\s+|core\s+|main\s+)?(?:course\s*work|modules?|subjects?|topics?|focus\s+areas?|areas?\s+of\s+(?:focus|study)|skills?(?:\s+(?:developed|gained|acquired|learned|learnt))?|(?:final|honou?rs)[\s-]*year\s+project(?:\s+topic)?|project\s+topic|studies|learning\s+outcomes?|competenc(?:y|ies)(?:\s+developed)?)\s*:\s*/i;

export const stripLabel = (value) => {
  const text = String(value || '').trim();
  const bullet = /^([-•*]\s+)?/.exec(text)[0];
  let rest = text.slice(bullet.length);
  const known = KNOWN_LABEL.exec(rest);
  if (known) {
    rest = rest.slice(known[0].length);
  } else {
    // Any other short label before a colon ("Core strengths: ..."), when a real line follows it.
    const generic = /^([A-Za-z][A-Za-z' &/-]{2,32}):\s+(\S[\s\S]{11,})$/.exec(rest);
    if (generic && generic[1].trim().split(/\s+/).length <= 4) rest = generic[2];
  }
  rest = rest.trim();
  if (!rest) return text;
  return `${bullet}${rest.charAt(0).toUpperCase()}${rest.slice(1)}`;
};

/* -------------------------------------------------------------------------- */
/*                                   Tokens                                    */
/* -------------------------------------------------------------------------- */

const STOP = new Set(
  `a an the and or but of to in on at by for with from as is are was were be been being this that these those it its into onto
   over under than then so such via per each every all any both also while which who whom whose their there our your my his her
   them they we you i not no more most less least very can could would should will may might do does did done has have had having
   using use used across within through during after before about around between up down out off new well`.split(/\s+/)
);

const SUFFIXES = ['ations', 'ation', 'ments', 'ment', 'ings', 'ing', 'ers', 'er', 'ors', 'ies', 'ied', 'ed', 'es', 'ly', 'ive', 's'];

// A rough stem, good enough to treat "reduced", "reducing" and "reduce" as one word.
const stem = (word) => {
  let w = word;
  if (w.length > 4) {
    for (const suffix of SUFFIXES) {
      if (w.endsWith(suffix) && w.length - suffix.length >= 3 && !(suffix === 's' && w.endsWith('ss'))) {
        w = w.slice(0, -suffix.length);
        // "cutting" -> "cutt" -> "cut", "planned" -> "plann" -> "plan" (but not "pass", "skill", "buzz")
        if ((suffix === 'ing' || suffix === 'ed') && /([a-z])\1$/.test(w) && !/(ll|ss|zz)$/.test(w)) w = w.slice(0, -1);
        break;
      }
    }
  }
  return w.length > 4 && w.endsWith('e') ? w.slice(0, -1) : w;
};

// Words that carry the same claim on a resume. Each group is reduced to its first word's stem.
const GROUPS = [
  ['lead', 'led', 'leading', 'headed', 'head', 'directed', 'direct', 'spearheaded', 'steered', 'guided', 'managed', 'manage', 'oversaw', 'oversee', 'supervised', 'supervise', 'administered'],
  ['build', 'implemented', 'introduced', 'launched', 'established', 'initiated', 'instituted', 'deployed', 'adopted', 'developed', 'created', 'built', 'designed', 'devised', 'set'],
  ['reduce', 'reduced', 'cut', 'decreased', 'lowered', 'minimized', 'minimised', 'lessened', 'trimmed', 'slashed', 'eliminated', 'curbed', 'diminished', 'reduction'],
  ['improve', 'improved', 'increased', 'raised', 'boosted', 'enhanced', 'grew', 'grown', 'lifted', 'strengthened', 'optimized', 'optimised', 'upgraded', 'advanced', 'elevated', 'maximized', 'maximised', 'accelerated', 'sped', 'improvement', 'increase'],
  ['team', 'teams', 'staff', 'employees', 'personnel', 'workers', 'people', 'workforce', 'colleagues', 'crew', 'operators', 'members'],
  ['productivity', 'output', 'throughput', 'efficiency', 'efficient', 'yield'],
  ['quality', 'assurance', 'qa', 'qc'],
  ['safety', 'safe', 'hazard', 'hazards', 'ppe', 'incident', 'incidents', 'accident', 'accidents', 'injury', 'injuries', 'toolbox', 'whs', 'ohs'],
  ['plan', 'planning', 'planned', 'schedule', 'scheduling', 'scheduled', 'roster', 'rostering', 'forecast', 'forecasting'],
  ['track', 'monitor', 'monitored', 'monitoring', 'tracked', 'tracking', 'measure', 'measured', 'measuring', 'audit', 'audited', 'auditing', 'review', 'reviewed', 'reviewing'],
  ['report', 'reports', 'reporting', 'reported', 'document', 'documented', 'documenting', 'record', 'recorded', 'recording', 'logged'],
  ['train', 'trained', 'training', 'coach', 'coached', 'coaching', 'mentor', 'mentored', 'mentoring', 'upskill', 'upskilled'],
  ['ensure', 'ensured', 'ensuring', 'maintain', 'maintained', 'maintaining', 'uphold', 'upheld', 'guarantee', 'guaranteed'],
  ['compliance', 'comply', 'complied', 'complying', 'adhere', 'adhered', 'adhering', 'standard', 'standards', 'regulation', 'regulations', 'regulatory', 'policy', 'policies', 'requirement', 'requirements'],
  ['process', 'processes', 'procedure', 'procedures', 'workflow', 'workflows', 'method', 'methods'],
  ['cost', 'costs', 'expense', 'expenses', 'spend', 'spending', 'budget', 'budgets', 'saving', 'savings', 'saved'],
  ['customer', 'customers', 'client', 'clients'],
  ['department', 'departments', 'departmental', 'division', 'divisions', 'section', 'sections', 'unit', 'units', 'function', 'functions'],
  ['coordinate', 'coordinated', 'coordination', 'collaborate', 'collaborated', 'collaboration', 'liaise', 'liaised', 'align', 'aligned', 'aligning', 'alignment', 'synchronize', 'synchronized', 'synchronise', 'synchronised', 'partnered'],
  ['stock', 'stocks', 'stockout', 'stockouts', 'inventory', 'inventories'],
  ['procure', 'procurement', 'purchasing', 'sourcing', 'buying'],
  ['logistics', 'supply', 'shipping', 'distribution', 'delivery', 'deliveries'],
  ['defect', 'defects', 'error', 'errors', 'rework', 'scrap', 'reject', 'rejects', 'fault', 'faults', 'nonconformance'],
  ['morale', 'engagement', 'motivation', 'culture', 'satisfaction'],
  ['achieve', 'achieved', 'delivered', 'completed', 'met', 'exceeded', 'reached'],
  ['target', 'targets', 'goal', 'goals', 'kpi', 'kpis', 'objective', 'objectives', 'benchmark', 'benchmarks'],
];

const CANON = new Map();
GROUPS.forEach((group) => {
  const canon = `~${stem(group[0])}`;
  group.forEach((word) => CANON.set(stem(word), canon));
});

const tokens = (value) => {
  const text = stripMarks(value).replace(PLACEHOLDER, ' ').toLowerCase().replace(/['’]/g, '');
  const out = new Set();
  text
    .split(/[^a-z0-9]+/)
    .filter((w) => w && /[a-z]/.test(w) && w.length >= 2 && !STOP.has(w))
    .forEach((w) => {
      const s = stem(w);
      out.add(CANON.get(s) || s);
    });
  return out;
};

/* -------------------------------------------------------------------------- */
/*                                 Comparison                                  */
/* -------------------------------------------------------------------------- */

export const similarity = (a, b) => {
  const A = tokens(a);
  const B = tokens(b);
  if (A.size === 0 || B.size === 0) return { shared: 0, overlap: 0, dice: 0 };
  let shared = 0;
  A.forEach((t) => {
    if (B.has(t)) shared += 1;
  });
  return { shared, overlap: shared / Math.min(A.size, B.size), dice: (2 * shared) / (A.size + B.size) };
};

// The two lines make the same point, whatever the words.
export const sameThing = (a, b) => {
  if (normLine(a) === normLine(b)) return normLine(a) !== '';
  const s = similarity(a, b);
  return (s.shared >= 3 && s.overlap >= 0.66 && s.dice >= 0.5) || (s.shared >= 2 && s.dice >= 0.8);
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// An idea with [X] placeholders as a pattern: every [..] may be any short text (the number the person typed).
const ideaPattern = (idea) => {
  const text = normLine(String(idea || '').replace(PLACEHOLDER, '\u0000'));
  if (!text.includes('\u0000')) return null;
  const parts = text.split('\u0000').map((p) => escapeRegex(p.trim()).replace(/\s+/g, '\\s+'));
  return new RegExp(`^${parts.join('\\s*.{1,40}?\\s*')}$`, 'i');
};

// The line is the idea itself: the same words, the idea with its placeholders filled in, or the idea lightly edited.
// This is what keeps an idea ticked after the person replaced "[X]" with a number.
export const sameLine = (line, idea) => {
  const a = normLine(line);
  const b = normLine(idea);
  if (!a || !b) return false;
  if (a === b) return true;
  const pattern = ideaPattern(idea);
  if (pattern && pattern.test(a)) return true;
  const s = similarity(line, idea);
  return s.shared >= 3 && s.dice >= 0.8;
};

/* -------------------------------------------------------------------------- */
/*                         A block of text, said once                           */
/* -------------------------------------------------------------------------- */

const BULLET = /^(\s*[-•*]\s+)(.*)$/;

// Splits "One. Two! Three?" into sentences, keeping the closing mark with each.
const sentencesOf = (line) => line.match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g) || [line];

/**
 * Takes a block of resume text (bullets, paragraphs or both) and removes every line, or every sentence of a paragraph,
 * that repeats a point already made earlier in the block. The first time a point is made is kept, with its formatting.
 * Text with nothing repeated is returned exactly as it came.
 */
export const dedupeSimilarLines = (text) => {
  const source = String(text || '');
  const kept = []; // what has been said so far
  let removed = 0;
  const out = [];

  source.split(/\r?\n/).forEach((raw) => {
    if (!raw.trim()) {
      out.push(raw);
      return;
    }
    const bullet = BULLET.exec(raw);
    if (bullet) {
      if (kept.some((k) => sameThing(k, bullet[2]))) {
        removed += 1;
        return;
      }
      kept.push(bullet[2]);
      out.push(raw);
      return;
    }
    const sentences = sentencesOf(raw).map((s) => s.trim()).filter(Boolean);
    const keep = sentences.filter((s) => {
      if (kept.some((k) => sameThing(k, s))) {
        removed += 1;
        return false;
      }
      kept.push(s);
      return true;
    });
    if (keep.length === sentences.length) out.push(raw);
    else if (keep.length) out.push(keep.join(' '));
  });

  return removed ? out.join('\n').replace(/\n{3,}/g, '\n\n').trim() : source;
};

// A list of lines (AI ideas) with the repeats taken out, and the lines that repeat something in `existing` too.
export const dropRepeats = (items, existing = [], getText = (item) => item) => {
  const said = existing.slice();
  const kept = [];
  let dropped = 0;
  items.forEach((item) => {
    const text = getText(item);
    if (said.some((s) => sameThing(s, text))) {
      dropped += 1;
      return;
    }
    said.push(text);
    kept.push(item);
  });
  return { kept, dropped };
};
