/*
  Resume doctor: finds the data problems that make a resume look careless or break the score, and repairs them.

    findProblems(resumeData, now?)  -> [problem]    what is wrong, most serious first
    fixAllSafe(resumeData, now?)    -> { data, applied }   applies only the fixes that cannot lose or change anything
    cleanResume(resumeData)         -> resumeData   fixAllSafe, for a freshly imported resume

  problem = {
    id,        stable for the same problem, so "Ignore" survives a re-render
    kind,      e.g. 'job-is-a-note'
    severity,  'high' | 'medium' | 'low'
    step,      the builder step it belongs to (0 Heading, 1 Work history, 2 Education, 3 Skills, 4 Summary)
    where,     the same, as words
    title, detail,
    fixes: [{ id, label, safe, apply(data) -> data }]   (none when only the person can decide)
  }

  The kind of problem this is for: a resume imported from a PDF or Word file where a line like "(Progressed into Assistant and
  Senior Management roles)" became a job of its own, with dates, so it was counted as years of work. Others: the same job twice,
  a job that ends before it starts, a company typed where the job title goes, a title in capitals, skills pasted as one
  comma-separated line, "gmial.com", and "[number]" left in a line from an AI idea.

  Rules the fixes keep, because this edits a real person's resume:
    - nothing is invented: a fix moves, splits, merges, removes or re-cases what is already there;
    - a fix that removes an entry says so in its label, and one that changes a date says which date;
    - only fixes that lose nothing (spacing, capitals, exact duplicates, a pasted skills list) are `safe`, and only those run
      by themselves on import;
    - fixes find their target by id in the data they are given, so applying one to the latest data is always right.
*/

import { norm, stripMarkup } from './atsScore.js';

const asList = (v) => (Array.isArray(v) ? v : []);
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = (v) => (typeof v === 'string' ? v : '');
const words = (s) => text(s).trim().split(/\s+/).filter(Boolean);

const STEP = { heading: 0, work: 1, education: 2, skills: 3, summary: 4 };
const WHERE = ['Heading step', 'Work history step', 'Education step', 'Skills step', 'Summary step'];
const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

/* ------------------------------ small helpers ------------------------------ */

const keyOf = (item, index) => (item && item.id !== undefined && item.id !== null ? String(item.id) : `#${index}`);
const jobName = (job) => {
  const title = text(job.title).trim();
  const employer = text(job.employer).trim();
  return title && employer ? `${title} at ${employer}` : title || employer || 'an untitled job';
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthOf = (v) => {
  const s = String(v ?? '').trim();
  if (!s) return 0;
  if (/^\d{1,2}$/.test(s)) {
    const n = Number(s);
    return n >= 1 && n <= 12 ? n : 0;
  }
  return MONTHS.map((m) => m.toLowerCase()).indexOf(s.slice(0, 3).toLowerCase()) + 1;
};
const yearOf = (v) => {
  const m = /\b(?:19|20)\d{2}\b/.exec(String(v ?? ''));
  return m ? Number(m[0]) : 0;
};
const label = (index) => `${MONTHS[((index % 12) + 12) % 12]} ${Math.floor(index / 12)}`;
const monthText = (index) => String((((index % 12) + 12) % 12) + 1).padStart(2, '0');

// A job as month indexes { start, end, open }. start: null when it has no start year. end: null when it has ended with no end year.
const spanOf = (job, nowIndex) => {
  const sy = yearOf(job.startYear);
  const start = sy ? sy * 12 + (monthOf(job.startMonth) || 1) - 1 : null;
  if (job.current) return { start, end: nowIndex, open: true };
  const ey = yearOf(job.endYear);
  return { start, end: ey ? ey * 12 + (monthOf(job.endMonth) || 12) - 1 : null, open: false };
};

const mapJobs = (data, fn) => ({ ...data, experiences: asList(data.experiences).map(fn) });
const mapJob = (data, key, change) => mapJobs(data, (job, i) => (isObj(job) && keyOf(job, i) === key ? { ...job, ...change(job) } : job));
const withoutJob = (data, key) => ({ ...data, experiences: asList(data.experiences).filter((job, i) => !(isObj(job) && keyOf(job, i) === key)) });

/* --------------------------- achievements (lines) --------------------------- */

const lineKey = (line) => norm(stripMarkup(line).replace(/^[\s\-\u2022*]+/, ''));
const linesOf = (value) => text(value).split('\n');

const appendLine = (achievements, line) => {
  const base = text(achievements).replace(/\s+$/, '');
  if (!base) return line;
  const bullets = /^\s*[-\u2022]\s/m.test(base);
  return `${base}\n${bullets ? '- ' : ''}${line}`;
};

// Lines of `extra` that `base` does not already have.
const newLines = (base, extra) => {
  const have = new Set(linesOf(base).map(lineKey));
  return linesOf(extra).filter((line) => line.trim() && !have.has(lineKey(line)));
};

const dedupeLines = (value) => {
  const seen = new Set();
  return linesOf(value)
    .filter((line) => {
      const key = lineKey(line);
      if (!key) return true; // blank lines are spacing, not duplicates
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join('\n');
};

/* -------------------------------- capitals -------------------------------- */

const SMALL = new Set(['and', 'or', 'of', 'the', 'for', 'to', 'in', 'at', 'a', 'an', 'on']);
const COMPANY_FORMS = { pty: 'Pty', ltd: 'Ltd', inc: 'Inc', llc: 'LLC', plc: 'PLC', cc: 'CC', co: 'Co', corp: 'Corp', sa: 'SA', uk: 'UK', usa: 'USA' };
const titleCase = (value) =>
  text(value).replace(/[A-Za-z][A-Za-z'\u2019]*/g, (word, offset) => {
    const lower = word.toLowerCase();
    if (COMPANY_FORMS[lower]) return COMPANY_FORMS[lower];
    if (word.length <= 3 && word.length > 1 && !SMALL.has(lower)) return word.toUpperCase(); // QC, HR, IT
    if (offset > 0 && SMALL.has(lower)) return lower;
    return lower[0].toUpperCase() + lower.slice(1);
  });
const isShouting = (value) => {
  const letters = text(value).replace(/[^A-Za-z]/g, '');
  return letters.length >= 6 && letters === letters.toUpperCase() && /[AEIOU]/.test(letters);
};

// "  Senior   Manager, " -> "Senior Manager"
const tidy = (value) => text(value).replace(/\s+/g, ' ').trim().replace(/[\s,;:|\-\u2013\u2014]+$/, '');

/* --------------------------------- notes ---------------------------------- */

// Words that make a piece of text a note about a career ("Progressed into..."), not a job title or qualifier.
const NOTE_WORDS = /\b(progress(?:ed)?|promot(?:ed|ion)|moved (?:up|into)|grew|rose|started as|joined as|responsible (?:for|to)|duties|reported to|references? (?:available|upon)|was (?:a|the)|worked (?:as|with))\b/i;

const wholeNote = (title) => {
  const t = text(title).trim();
  const n = words(t).length;
  return (/^[(\[].{8,}[)\]]$/.test(t) && n >= 3) || n >= 9 || (n >= 5 && (NOTE_WORDS.test(t) || /\.$/.test(t)));
};
// "Machine Operator (Progressed into Assistant and Senior Management roles)" -> { clean, note }
const noteInTitle = (title) => {
  const m = /^(.*?\S)\s*[(\[]([^)\]]{12,})[)\]]\s*$/.exec(text(title).trim());
  return m && NOTE_WORDS.test(m[2]) ? { clean: m[1].trim(), note: m[2].trim() } : null;
};
const asLine = (note) => note.replace(/^[(\[\s]+|[)\]\s]+$/g, '').replace(/^\w/, (c) => c.toUpperCase());

const COMPANY_RE = /\b(pty|ltd|limited|inc|llc|plc|corp|corporation|holdings|enterprises)\b|\(pty\)/i;
const ROLE_RE = /\b(manager|officer|assistant|clerk|operator|supervisor|consultant|engineer|technician|administrator|director|agent|representative|coordinator|specialist|analyst|developer|accountant|driver|cashier|teacher|nurse|foreman|artisan|controller|receptionist|secretary|labourer|laborer|welder|electrician|plumber|mechanic)\b/i;

/* ------------------------------- the checks ------------------------------- */

const problem = (kind, id, severity, step, title, detail, fixes = []) => ({ id: `${kind}:${id}`, kind, severity, step, where: WHERE[step], title, detail, fixes });

function jobProblems(data, nowIndex) {
  const out = [];
  const list = asList(data.experiences).map((job, i) => ({ job, key: keyOf(job, i), index: i })).filter((e) => isObj(e.job));
  const spans = new Map(list.map((e) => [e.key, spanOf(e.job, nowIndex)]));
  // A note listed as a job is reported once, as a note; its dates would otherwise raise an overlap or a gap as well.
  const noteKeys = new Set(list.filter((e) => !noteInTitle(e.job.title) && wholeNote(e.job.title)).map((e) => e.key));

  list.forEach(({ job, key, index }) => {
    const title = text(job.title);
    const name = jobName(job);

    // A career note typed or imported as its own job. (A real title with a note after it is the other case, below.)
    const split = noteInTitle(title);
    if (!split && wholeNote(title)) {
      const note = asLine(title);
      const sameEmployer = list.find((o) => o.key !== key && norm(o.job.employer) && norm(o.job.employer) === norm(job.employer));
      const neighbour = sameEmployer || list.find((o) => o.index === index - 1) || list.find((o) => o.index === index + 1);
      const span = spans.get(key);
      const dated = span && span.start !== null && span.end !== null;
      const fixes = [];
      if (neighbour) {
        fixes.push({
          id: 'attach',
          label: `Add it as a line to \u201C${jobName(neighbour.job)}\u201D${dated ? ' (its dates are dropped)' : ''}`,
          safe: false,
          apply: (d) => mapJob(withoutJob(d, key), neighbour.key, (j) => ({ achievements: appendLine(j.achievements, note) })),
        });
      }
      fixes.push({ id: 'remove', label: 'Delete this entry', safe: false, apply: (d) => withoutJob(d, key) });
      out.push(problem('job-is-a-note', key, 'high', STEP.work,
        'A note is listed as a job',
        `\u201C${title.trim().slice(0, 90)}\u201D reads like a note about a job, not a job title.${dated ? ` It also has dates (${label(span.start)} to ${span.open ? 'now' : label(span.end)}), so it is counted as time worked.` : ''} A reader sees a job with no real title, and the time it covers is counted as work.`,
        fixes));
    } else {
      if (split) {
        out.push(problem('job-note-in-title', key, 'medium', STEP.work,
          'A note is inside a job title',
          `\u201C${title.trim()}\u201D has a note in brackets. A title should be the job only; the note belongs under the job as a line.`,
          [{
            id: 'split',
            label: `Title \u201C${split.clean}\u201D, note moved under it`,
            safe: false,
            apply: (d) => mapJob(d, key, (j) => ({ title: split.clean, achievements: appendLine(j.achievements, asLine(split.note)) })),
          }]));
      }
    }

    // A company where the job title goes, and the job title where the company goes.
    const employer = text(job.employer);
    if (title.trim() && employer.trim() && COMPANY_RE.test(title) && !ROLE_RE.test(title) && ROLE_RE.test(employer) && !COMPANY_RE.test(employer)) {
      out.push(problem('job-swapped', key, 'medium', STEP.work,
        'Job title and employer look swapped',
        `\u201C${title.trim()}\u201D looks like a company and \u201C${employer.trim()}\u201D like a job title.`,
        [{ id: 'swap', label: `Title \u201C${employer.trim()}\u201D, employer \u201C${title.trim()}\u201D`, safe: false, apply: (d) => mapJob(d, key, (j) => ({ title: j.employer, employer: j.title })) }]));
    }

    // Capitals, spacing and stray punctuation.
    const shouted = ['title', 'employer'].filter((f) => isShouting(job[f]));
    if (shouted.length) {
      out.push(problem('job-shouting', key, 'low', STEP.work,
        'Job text is in capitals',
        `The ${shouted.join(' and ')} of ${name} ${shouted.length > 1 ? 'are' : 'is'} all capitals, which a reader takes for shouting.`,
        [{ id: 'case', label: 'Use normal capitals', safe: true, apply: (d) => mapJob(d, key, (j) => Object.fromEntries(shouted.map((f) => [f, titleCase(j[f])]))) }]));
    }
    const messy = ['title', 'employer', 'location'].filter((f) => text(job[f]) && tidy(job[f]) !== text(job[f]));
    if (messy.length) {
      out.push(problem('job-spacing', key, 'low', STEP.work,
        'Stray spaces or punctuation in a job',
        `Extra spaces or a trailing comma or dash in the ${messy.join(', ')} of ${name}.`,
        [{ id: 'tidy', label: 'Tidy it', safe: true, apply: (d) => mapJob(d, key, (j) => Object.fromEntries(messy.map((f) => [f, tidy(j[f])]))) }]));
    }
    if (dedupeLines(job.achievements) !== text(job.achievements)) {
      out.push(problem('job-repeated-lines', key, 'low', STEP.work,
        'The same line twice under a job',
        `${name} has an achievement line that appears more than once.`,
        [{ id: 'dedupe', label: 'Remove the repeats', safe: true, apply: (d) => mapJob(d, key, (j) => ({ achievements: dedupeLines(j.achievements) })) }]));
    }

    // Dates.
    const span = spans.get(key);
    if (!job.current && span.start !== null && span.end !== null && span.end < span.start) {
      out.push(problem('job-dates-reversed', key, 'high', STEP.work,
        'A job ends before it starts',
        `${name} starts in ${label(span.start)} and ends in ${label(span.end)}. The time worked cannot be counted.`,
        [{
          id: 'swap-dates',
          label: `Start ${label(span.end)}, end ${label(span.start)}`,
          safe: false,
          apply: (d) => mapJob(d, key, (j) => ({ startMonth: j.endMonth, startYear: j.endYear, endMonth: j.startMonth, endYear: j.startYear })),
        }]));
    }
    if (!job.current && span.end !== null && span.end > nowIndex) {
      out.push(problem('job-ends-in-future', key, 'medium', STEP.work,
        'A job ends in the future',
        `${name} ends in ${label(span.end)}, which has not happened yet. If you still work there, it should say so.`,
        [{ id: 'current', label: 'Mark it as the job you hold now', safe: false, apply: (d) => mapJob(d, key, () => ({ current: true, endMonth: '', endYear: '' })) }]));
    }
  });

  // The same job twice.
  const seen = new Map();
  list.filter((e) => !noteKeys.has(e.key)).forEach(({ job, key }) => {
    const signature = [norm(job.title), norm(job.employer), yearOf(job.startYear), monthOf(job.startMonth)].join('|');
    if (!norm(job.title) && !norm(job.employer)) return;
    if (!seen.has(signature)) {
      seen.set(signature, { job, key });
      return;
    }
    const first = seen.get(signature);
    out.push(problem('job-duplicate', key, 'high', STEP.work,
      'The same job is listed twice',
      `${jobName(job)} (${yearOf(job.startYear) || 'no start year'}) appears more than once.`,
      [{
        id: 'merge',
        label: 'Keep one, with the lines from both',
        safe: false,
        apply: (d) => {
          const extra = newLines(first.job.achievements, job.achievements);
          const merged = extra.reduce((acc, line) => appendLine(acc, line.replace(/^\s*[-\u2022]\s*/, '')), text(first.job.achievements));
          return mapJob(withoutJob(d, key), first.key, () => ({ achievements: merged }));
        },
      }]));
  });

  // Two roles at the same employer that overlap: a promotion recorded as two jobs without closing the first.
  for (let a = 0; a < list.length; a += 1) {
    for (let b = a + 1; b < list.length; b += 1) {
      const x = list[a];
      const y = list[b];
      if (noteKeys.has(x.key) || noteKeys.has(y.key)) continue;
      if (!norm(x.job.employer) || norm(x.job.employer) !== norm(y.job.employer)) continue;
      const sx = spans.get(x.key);
      const sy = spans.get(y.key);
      if ([sx.start, sx.end, sy.start, sy.end].some((v) => v === null)) continue;
      const [early, late, se, sl] = sx.start <= sy.start ? [x, y, sx, sy] : [y, x, sy, sx];
      if (se.start === sl.start || se.end < sl.start) continue;
      if (norm(early.job.title) === norm(late.job.title)) continue; // the duplicate check covers these
      const end = sl.start - 1;
      out.push(problem('job-overlap', `${early.key}-${late.key}`, 'medium', STEP.work,
        'Two roles at one employer overlap',
        `${jobName(early.job)} runs to ${se.open ? 'now' : label(se.end)}, but ${jobName(late.job)} starts in ${label(sl.start)}. The overlap is counted as extra time.`,
        [{
          id: 'close-earlier',
          label: `End the earlier role in ${label(end)}`,
          safe: false,
          apply: (d) => mapJob(d, early.key, () => ({ current: false, endMonth: monthText(end), endYear: String(Math.floor(end / 12)) })),
        }]));
    }
  }

  // A gap of more than a year between jobs (information only).
  const dated = list.filter((e) => !noteKeys.has(e.key)).map((e) => ({ e, s: spans.get(e.key) })).filter((x) => x.s.start !== null && x.s.end !== null && x.s.end >= x.s.start).sort((p, q) => p.s.start - q.s.start);
  let reach = null;
  dated.forEach(({ s }) => {
    if (reach !== null && s.start - reach > 13) {
      out.push(problem('job-gap', `${reach}`, 'low', STEP.work,
        `A gap of ${Math.round((s.start - reach - 1) / 12 * 10) / 10} years in your work history`,
        `Nothing is listed between ${label(reach)} and ${label(s.start)}. A recruiter will ask about it; a line on what you did (study, caring, freelance work) answers it.`));
    }
    reach = reach === null ? s.end : Math.max(reach, s.end);
  });

  return out;
}

const EMAIL_TYPOS = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gmail.con': 'gmail.com',
  'gmail.co': 'gmail.com', 'gnail.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gmail.cm': 'gmail.com',
  'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'hotnail.com': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outloook.com': 'outlook.com', 'outlook.con': 'outlook.com',
  'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahoo.con': 'yahoo.com', 'yhoo.com': 'yahoo.com',
  'icloud.con': 'icloud.com', 'iclod.com': 'icloud.com',
};

function contactProblems(data) {
  const out = [];
  const personal = isObj(data.personal) ? data.personal : {};
  const email = text(personal.email).trim();
  if (email) {
    const at = email.lastIndexOf('@');
    const domain = at > 0 ? email.slice(at + 1).toLowerCase() : '';
    if (EMAIL_TYPOS[domain]) {
      const fixed = `${email.slice(0, at)}@${EMAIL_TYPOS[domain]}`;
      out.push(problem('email-typo', 'email', 'medium', STEP.heading, 'Your email address looks mistyped',
        `\u201C${email}\u201D: did you mean ${fixed}? Employers cannot reach you on an address that does not exist.`,
        [{ id: 'fix', label: `Change it to ${fixed}`, safe: false, apply: (d) => ({ ...d, personal: { ...d.personal, email: fixed } }) }]));
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      out.push(problem('email-invalid', 'email', 'high', STEP.heading, 'Your email address is not valid',
        `\u201C${email}\u201D is not a working email address format, so a recruiter cannot reply to you.`));
    }
  }
  const phone = text(personal.phone).trim();
  if (phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15 || /[a-z]{3,}/i.test(phone)) {
      out.push(problem('phone-invalid', 'phone', 'medium', STEP.heading, 'Your phone number looks incomplete',
        `\u201C${phone}\u201D has ${digits.length < 7 ? 'too few' : 'too many'} digits to be a phone number.`));
    }
  }
  return out;
}

function skillProblems(data) {
  const out = [];
  const skills = asList(data.skills).filter(isObj);
  const seen = new Set();
  skills.forEach((skill, i) => {
    const raw = text(skill.text).trim();
    if (!raw) return;
    const key = keyOf(skill, i);

    // "Word, Excel, PowerPoint" typed or pasted into one skill.
    const parts = raw.split(/\s*[,;|]\s*/).filter(Boolean);
    if (parts.length >= 2 && parts.length <= 12 && parts.every((p) => words(p).length <= 4)) {
      out.push(problem('skills-joined', key, 'low', STEP.skills, 'Several skills are in one box',
        `\u201C${raw.slice(0, 80)}\u201D is ${parts.length} skills in one. A scan and a reader count them as one.`,
        [{
          id: 'split',
          label: `Split into ${parts.length} skills`,
          safe: true,
          apply: (d) => ({
            ...d,
            skills: asList(d.skills).flatMap((s, idx) =>
              isObj(s) && keyOf(s, idx) === key ? parts.map((p, n) => ({ ...s, id: n === 0 ? s.id : `${String(s.id ?? idx)}-${n}`, text: p })) : [s]),
          }),
        }]));
      parts.forEach((p) => seen.add(norm(p)));
      return;
    }

    const n = norm(raw);
    if (seen.has(n)) {
      out.push(problem('skills-duplicate', key, 'low', STEP.skills, 'A skill is listed twice', `\u201C${raw}\u201D is in your Skills more than once.`,
        [{
          id: 'remove',
          label: 'Remove the repeat',
          safe: true,
          apply: (d) => {
            let kept = false;
            return { ...d, skills: asList(d.skills).filter((s, idx) => {
              if (!isObj(s) || norm(s.text) !== n) return true;
              if (!kept) { kept = true; return true; }
              return false;
            }) };
          },
        }]));
      return;
    }
    seen.add(n);

    if (words(raw).length >= 7 || /\.$/.test(raw)) {
      out.push(problem('skills-sentence', key, 'medium', STEP.skills, 'A sentence is listed as a skill',
        `\u201C${raw.slice(0, 90)}\u201D is a sentence. Skills read best as short names (\u201CCustomer service\u201D, \u201CForklift licence\u201D); a sentence belongs in your Summary or under a job.`,
        [{ id: 'remove', label: 'Remove it from Skills', safe: false, apply: (d) => ({ ...d, skills: asList(d.skills).filter((s, idx) => !(isObj(s) && keyOf(s, idx) === key)) }) }]));
    }
  });
  return out;
}

function educationProblems(data) {
  const out = [];
  const seen = new Map();
  asList(data.education).forEach((entry, i) => {
    if (!isObj(entry)) return;
    const signature = [norm(entry.degree), norm(entry.field), norm(entry.institution)].join('|');
    if (signature === '||') return;
    const key = keyOf(entry, i);
    if (!seen.has(signature)) {
      seen.set(signature, key);
      return;
    }
    out.push(problem('education-duplicate', key, 'medium', STEP.education, 'The same qualification is listed twice',
      `${text(entry.degree).trim() || 'A qualification'}${text(entry.institution).trim() ? ` at ${text(entry.institution).trim()}` : ''} appears more than once.`,
      [{ id: 'remove', label: 'Remove the repeat', safe: false, apply: (d) => ({ ...d, education: asList(d.education).filter((e, idx) => !(isObj(e) && keyOf(e, idx) === key)) }) }]));
  });
  return out;
}

// "[number]", "[Company]", "lorem ipsum": text that was meant to be replaced.
const PLACEHOLDER = /\[[^\]\n]{1,40}\]|lorem ipsum|\bxxx+\b|your name here|company name here/i;
function placeholderProblems(data) {
  const found = [];
  const check = (value, step) => {
    const m = PLACEHOLDER.exec(text(value));
    if (m) found.push({ step, sample: m[0] });
  };
  check(data.summary, STEP.summary);
  asList(data.experiences).filter(isObj).forEach((j) => ['title', 'employer', 'achievements'].forEach((f) => check(j[f], STEP.work)));
  asList(data.education).filter(isObj).forEach((e) => ['degree', 'field', 'achievements'].forEach((f) => check(e[f], STEP.education)));
  asList(data.skills).filter(isObj).forEach((s) => check(s.text, STEP.skills));
  const out = [];
  [STEP.work, STEP.education, STEP.skills, STEP.summary].forEach((step) => {
    const here = found.filter((f) => f.step === step);
    if (!here.length) return;
    const samples = [...new Set(here.map((h) => h.sample))].slice(0, 3).map((s) => `\u201C${s}\u201D`).join(', ');
    out.push(problem('placeholder', String(step), 'high', step, 'Unfilled placeholder text',
      `${samples} ${here.length === 1 ? 'is' : 'are'} still in your ${WHERE[step].replace(' step', '').toLowerCase()}. Replace ${here.length === 1 ? 'it' : 'them'} with your real figures, or delete the line.`));
  });
  return out;
}

export function findProblems(data, now = new Date()) {
  const d = isObj(data) ? data : {};
  const nowIndex = now.getFullYear() * 12 + now.getMonth();
  return [...contactProblems(d), ...jobProblems(d, nowIndex), ...educationProblems(d), ...skillProblems(d), ...placeholderProblems(d)].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.step - b.step
  );
}

// Applies the safe fixes (nothing is lost or changed in meaning), repeating until there are none: one fix can reveal another.
// A fix that changes nothing is skipped, so a problem a fix cannot clear never loops.
export function fixAllSafe(data, now = new Date()) {
  let next = data;
  let applied = 0;
  for (let pass = 0; pass < 80; pass += 1) {
    const before = JSON.stringify(next);
    const candidates = findProblems(next, now).flatMap((p) => p.fixes.filter((f) => f.safe));
    const changed = candidates.map((fix) => fix.apply(next)).find((after) => JSON.stringify(after) !== before);
    if (!changed) break;
    next = changed;
    applied += 1;
  }
  return { data: next, applied };
}

export const cleanResume = (data) => fixAllSafe(data).data;
