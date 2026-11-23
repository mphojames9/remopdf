/*
  The written review of a resume against the job it is aimed at (Premium).

    reviewResume(target, resumeData, result?) -> null (no job target yet) or
      {
        verdict,                 one short paragraph: where the resume stands and what to do first
        summary,                 one short sentence for the top of the panel
        missing: [finding],      "Missing big time": gaps that cost the most points (or make the resume unreadable)
        improve: [finding],      "Needs improving": real, fixable weaknesses that are not gaps
        good:    [string],       what already works, so the person knows what to leave alone
      }

    finding = {
      id, level: 'missing' | 'improve',
      title,                     one line
      body,                      what is wrong and why an ATS or a recruiter cares, in plain sentences
      fix,                       what to do about it, in plain sentences
      where,                     the builder step to do it in ("Work history step")
      points,                    how many of the 100 points it can still win (0 when it is not part of the score)
      terms?: [{ term, must }],  job keywords this finding is about
      examples?: [{ line, note }] the person's own lines that show the problem, with a question or a note
    }

  Like the score (atsScore.js) this is plain counting on the device: it costs nothing, works offline and is
  never out of date, because it is worked out from the resume as it is right now. Nothing here is sent anywhere.

  Honesty is part of the design, because this text tells a real person what to put on a real resume:
    - every "fix" says to add something only where it is true for the person, and never suggests a figure;
    - "examples" ask a question ("How many people did this cover?"), they never write the answer;
    - a keyword that is a qualification (degree, licence, years of experience) is never presented as a skill
      to "work in": it is only ever "add it if you hold it", under Education (a degree, a diploma), under Certificates
      (a trade licence, a short course) or under Personal details (a driver's licence);
    - the years of experience and the education level the job asks for are compared with the resume by
      qualificationCheck.js, and what it finds becomes findings here, so the panel's cards and this review always agree.
*/

import { norm, hasTerm, matchTerm, labelFor, stripMarkup, collectStrings, resumeText, isLicenceTerm } from './atsScore';
import { scoreMatch } from './scoreMatch';
import { isQualification } from './skillFilter';
import { analyseRequirements } from './qualificationCheck';

const asList = (value) => (Array.isArray(value) ? value : []);
const text = (value) => (typeof value === 'string' ? value.trim() : '');
const flat = (value) => stripMarkup(value).replace(/\s+/g, ' ').trim();
const clip = (value, max = 110) => (value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value);
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// "a, b and c"
const join = (items) => {
  const list = items.filter(Boolean);
  return list.length <= 1 ? list.join('') : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
};
const quoted = (items) => join(items.map((item) => `“${item}”`));

// The same rule atsScore.js uses for "an achievement": a line of at least 12 characters.
const linesOf = (value) =>
  stripMarkup(value)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 12);

const jobHasContent = (job) => Boolean(job && (text(job.title) || text(job.employer) || flat(job.achievements)));
const jobName = (job) => {
  const title = text(job.title);
  const employer = text(job.employer);
  return title && employer ? `${title} at ${employer}` : title || employer || 'an untitled job';
};

const isQual = (keyword) => keyword.kind === 'credential' || isQualification(keyword.term);

// What to ask the writer about a line that states no figure. A question only: the answer is theirs to give.
const ASKS = [
  [/\b(manag|led|lead|supervis|oversaw|coordinat|train|mentor)/i, 'How many people did this cover?'],
  [/\b(sales|sold|selling|revenue|target|quota|commission)/i, 'What were the sales figures or targets?'],
  [/\b(customer|client|patient|student|guest|caller)/i, 'How many a day, a week or a month?'],
  [/\b(budget|cost|saving|expens|invoice|payment|financ)/i, 'What size was the budget or the amount?'],
  [/\b(improv|reduc|increas|streamlin|speed|faster|efficien)/i, 'By how much, or how much time did it save?'],
  [/\b(project|deliver|install|build|construct|produc|manufactur)/i, 'How many, how big, or how long did it take?'],
];
const askFor = (line) => (ASKS.find(([pattern]) => pattern.test(line)) || [null, 'How many, how often, how much or how fast?'])[1];

const WEAK_OPENER = /^(?:was |were )?(?:responsible for|duties (?:included|include)|helped (?:with|to)|worked on|involved in|tasked with|assisted (?:with|in)|in charge of)\b/i;
const FIRST_PERSON = /\bI(?:[’']m|[’']ve|[’']ll)?\s+[a-z]|\b(?:my|me)\b/;
const FILLER = /\b(hard[- ]?working|team player|results[- ]driven|passionate|proven track record|self[- ]starter|go[- ]getter|detail[- ]oriented|dynamic)\b/gi;

// A driver's licence is a personal detail (the Heading step), never an Education entry (isLicenceTerm, atsScore.js).
const STEP = {
  heading: 'Heading step (personal details)',
  work: 'Work history step',
  education: 'Education step',
  skills: 'Skills step',
  summary: 'Summary step',
};

export function reviewResume(target, data, precomputed) {
  const result = precomputed || scoreMatch(target, data);
  if (!result) return null;

  const d = data || {};
  const part = (id) => result.parts.find((p) => p.id === id) || { value: 0, weight: 0 };
  const keywordPart = part('keywords');
  const titlePart = part('title');
  const resultsPart = part('results');

  const jobs = asList(d.experiences).filter(jobHasContent);
  const perJob = jobs.map((job) => ({ job, name: jobName(job), lines: linesOf(job.achievements) }));
  const lines = perJob.flatMap((entry) => entry.lines);
  const summary = flat(d.summary);
  const skills = asList(d.skills).map((s) => text(s && s.text)).filter(Boolean);
  const education = collectStrings(d.education);
  const personal = d.personal && typeof d.personal === 'object' ? d.personal : {};
  const jobTitle = text(target.title) || 'this job';

  const findings = [];
  const add = (level, priority, finding) => findings.push({ level, priority, points: 0, ...finding });
  const good = [];

  /* ------------------------------ contact details ------------------------------ */

  const noContact = [!text(personal.email) && 'an email address', !text(personal.phone) && 'a phone number'].filter(Boolean);
  if (noContact.length) {
    add('missing', 98, {
      id: 'contact',
      title: 'Your contact details are incomplete',
      body: `Your resume has no ${join(noContact.map((c) => c.replace(/^an? /, '')))}. A recruiter who likes what they read has to be able to reach you in one click, and without that the resume goes no further.`,
      fix: `Add ${join(noContact)} in the Heading step. Use one you check every day.`,
      where: STEP.heading,
    });
  } else if (!text(personal.city) && !text(personal.province)) {
    add('improve', 35, {
      id: 'location',
      title: 'No town or province',
      body: 'Employers often filter applicants by where they live or can work from, and a resume with no location is easy to skip.',
      fix: 'Add your town or city and province in the Heading step. Your full street address is not needed.',
      where: STEP.heading,
    });
  } else {
    good.push('Your contact details are complete.');
  }

  /* ------------------------------- work history -------------------------------- */

  if (jobs.length === 0) {
    add('missing', 96, {
      id: 'work-empty',
      title: 'Your work history is empty',
      body: 'Work history is the part a recruiter reads hardest and the part an ATS takes most of its keyword matches from. With nothing there, a skill you list has no evidence behind it, and the resume reads as if you have never done this kind of work.',
      fix: 'Add your most recent job first, then the ones before it. For each, write 3 to 6 short lines about what you actually did and what it achieved. If you have no formal jobs, add voluntary work, internships or projects instead.',
      where: STEP.work,
      points: 2.5,
    });
  } else {
    const bare = perJob.filter((entry) => flat(entry.job.achievements).length < 20);
    if (bare.length) {
      const all = bare.length === perJob.length;
      add(all || bare[0] === perJob[0] ? 'missing' : 'improve', all ? 92 : 90, {
        id: 'work-bare',
        title: all ? 'None of your jobs say what you did' : `${plural(bare.length, 'job')} with no achievements`,
        body: `${join(bare.slice(0, 4).map((entry) => `“${clip(entry.name, 60)}”`))} ${bare.length === 1 ? 'has' : 'have'} a title but no lines under ${bare.length === 1 ? 'it' : 'them'}. A job title on its own tells a recruiter where you were, not what you can do, and gives an ATS nothing to match keywords against.`,
        fix: 'Under each job, write 3 to 6 short lines: what you did, who or what it served, and the result where you know it. Write only what you really did.',
        where: STEP.work,
        points: all ? 2.5 : 0,
      });
    }

    const recent = perJob[0];
    if (recent && recent.lines.length >= 1 && recent.lines.length < 3) {
      add('improve', 52, {
        id: 'work-recent-thin',
        title: `Your top job has only ${plural(recent.lines.length, 'line')}`,
        body: `“${clip(recent.name, 70)}” is the first job on your resume, so it is the one a recruiter reads first and weighs most, and ${recent.lines.length === 1 ? 'one line is' : 'two lines are'} not enough to show your range. Older jobs can be short; this one cannot.`,
        fix: 'Add lines for the other things you did there: different duties, people or customers you dealt with, systems you used, problems you solved. Stop when you run out of true things to say.',
        where: STEP.work,
      });
    }

    const long = lines.filter((line) => line.length > 230);
    if (long.length) {
      add('improve', 40, {
        id: 'long-lines',
        title: `${plural(long.length, 'line')} in your work history ${long.length === 1 ? 'is' : 'are'} too long`,
        body: 'A line that runs past two or three lines of text is skipped by a recruiter doing a seven-second scan, and the achievement buried in it is never seen.',
        fix: 'Split each long line in two: one achievement per line, the strongest part first.',
        where: STEP.work,
        examples: long.slice(0, 2).map((line) => ({ line: clip(line, 150), note: `${line.length} characters. Try to keep a line under about 200.` })),
      });
    }

    const undated = perJob.filter((entry) => text(entry.job.title) && !text(entry.job.startYear));
    if (undated.length) {
      add('improve', 55, {
        id: 'dates',
        title: `${plural(undated.length, 'job')} without dates`,
        body: `${join(undated.slice(0, 3).map((entry) => `“${clip(entry.name, 50)}”`))} ${undated.length === 1 ? 'has' : 'have'} no start date. A recruiter checks the timeline first, and a job with no dates leaves them unable to tell how long you were there or whether there are gaps.`,
        fix: 'Add the month and year you started and finished (or tick “current”) for every job.',
        where: STEP.work,
      });
    }
  }

  /* ------------------------------ keywords ------------------------------------- */

  const kw = result.keywords;
  const total = kw.covered.length + kw.missing.length;
  const missingSkills = kw.missing.filter((k) => !isQual(k)).sort((a, b) => Number(Boolean(b.must)) - Number(Boolean(a.must)));
  const mustMissing = missingSkills.filter((k) => k.must);
  const lost = Math.round(keywordPart.weight * (1 - keywordPart.value));
  const skillsCovered = kw.covered.filter((k) => !isQual(k)).length;

  if (missingSkills.length) {
    const big = keywordPart.value < 0.6;
    const none = kw.covered.length === 0;
    const sentences = [
      'An ATS ranks applicants by how many of the advert’s own words it finds on the resume, and a recruiter skims for the same words.',
      none
        ? `Yours has none of the ${total} for “${jobTitle}”, so a scan would put it near the bottom of the pile.`
        : `Yours has ${kw.covered.length} of the ${total}.`,
      lost > 0 && `Keywords are worth ${keywordPart.weight} of the 100 points, and about ${lost} of them are still on the table.`,
      mustMissing.length &&
        `The must-haves count three times as much as the rest, and you are missing ${quoted(mustMissing.slice(0, 6).map((k) => labelFor(k.term)))}${mustMissing.length > 6 ? ` and ${mustMissing.length - 6} more` : ''}.`,
    ].filter(Boolean);
    add(big ? 'missing' : 'improve', big ? 94 : 60, {
      id: 'keywords',
      title: none ? `None of the ${total} job keywords are on your resume` : big ? `Only ${kw.covered.length} of ${total} job keywords found` : `${plural(missingSkills.length, 'job keyword')} still missing`,
      body: sentences.join(' '),
      fix: 'Take the missing words one at a time. Where you really do, or have done, the thing, add it to the work-history line that shows it, or to your summary, in the job’s own wording. Where you haven’t, leave it out: a keyword you cannot talk about in an interview costs you more than it gains.',
      where: `${STEP.work}, ${STEP.summary}`,
      points: lost,
      terms: missingSkills.slice(0, 10).map((k) => ({ term: labelFor(k.term), must: Boolean(k.must) })),
    });
  } else if (total > 0) {
    good.push(`Every skill keyword the job lists is on your resume (${skillsCovered} of ${skillsCovered}).`);
  }
  if (skillsCovered && missingSkills.length) good.push(`${plural(skillsCovered, 'job keyword')} already on your resume.`);

  // Keywords that only sit in the Skills list: listed, but never shown at work.
  const evidenceText = norm([summary, ...perJob.map((entry) => flat(entry.job.achievements)), ...perJob.map((entry) => text(entry.job.title))].join('\n'));
  const skillsText = norm(skills.join('\n'));
  const claimed = kw.covered.filter((k) => !isQual(k) && matchTerm(k.term, evidenceText) !== 'full' && hasTerm(skillsText, k.term));
  if (claimed.length >= 2) {
    add('improve', 58, {
      id: 'claimed',
      title: `${plural(claimed.length, 'keyword')} appear only in your Skills list`,
      body: `${quoted(claimed.slice(0, 6).map((k) => k.term))} ${claimed.length === 1 ? 'is' : 'are'} listed as skills but ${claimed.length === 1 ? 'is' : 'are'} never mentioned in your work history or summary. A skill with no example behind it reads as a claim, and recruiters trust it less than a skill they have seen in action.`,
      fix: 'For each one you really have used, add a line, or half a line, that shows it at work: what you did with it and for whom.',
      where: STEP.work,
      terms: claimed.slice(0, 8).map((k) => ({ term: k.term, must: Boolean(k.must) })),
    });
  }

  // "Microsoft Office" is listed, the job names the programs: half credit, and the fix is to name the ones really used.
  const suiteOnly = kw.missing.filter((k) => k.partial);
  if (suiteOnly.length) {
    add('improve', 61, {
      id: 'office-suite',
      title: `The job names ${join(suiteOnly.slice(0, 4).map((k) => k.term))}, and you list Microsoft Office`,
      body: 'Your resume lists Microsoft Office, which a reader takes to mean the usual programs, but a scan looks for each program by name and gives only half credit for the suite.',
      fix: 'Name the programs you really use, in your Skills or in the line of work that shows them (for example, \u201CBuilt weekly reports in Excel\u201D). Leave out any you do not use.',
      where: `${STEP.skills}, ${STEP.work}`,
      points: Math.max(1, Math.round(suiteOnly.reduce((sum, k) => sum + (k.must ? 3 : 1), 0) * 0.5 * (keywordPart.weight / Math.max(1, kw.covered.length + kw.missing.length)))),
      terms: suiteOnly.slice(0, 6).map((k) => ({ term: labelFor(k.term), must: Boolean(k.must) })),
    });
  }

  /* -------------------------------- job title ---------------------------------- */

  if (text(target.title) && titlePart.value < 1) {
    const nothing = titlePart.value === 0;
    add(nothing ? 'missing' : 'improve', nothing ? 78 : 56, {
      id: 'title',
      title: nothing ? `“${jobTitle}” appears nowhere on your resume` : `Your resume only partly matches “${jobTitle}”`,
      body: `A scan and a recruiter both look for the role’s name in your headline, your summary and your job titles. ${nothing ? 'Yours has neither the title nor any of its words.' : 'Yours has some of its words but not the title as the job writes it.'} That is worth ${titlePart.weight} points and, more to the point, it is the first thing that tells a reader you are aiming at this job.`,
      fix: `If “${jobTitle}” honestly describes what you do, use it in your headline (Heading step) and open your summary with it. If your real title is different, keep it, and let your summary say how that work matches the role. Never rename yourself.`,
      where: `${STEP.heading}, ${STEP.summary}`,
      points: Math.round(titlePart.weight * (1 - titlePart.value)),
    });
  } else if (text(target.title)) {
    good.push(`Your resume uses the job’s title, “${jobTitle}”.`);
  }
  if (!text(personal.profession) && titlePart.value >= 1) {
    add('improve', 36, {
      id: 'headline',
      title: 'No headline under your name',
      body: 'The headline is the first line an ATS and a recruiter read. Yours is empty, so the top of the resume is only a name.',
      fix: 'Add the role you hold or are aiming for in the Heading step, but only if it describes you.',
      where: STEP.heading,
    });
  }

  /* ------------------------------ measurable results --------------------------- */

  if (lines.length > 0) {
    const withNumber = lines.filter((line) => /\d/.test(line));
    const without = lines.filter((line) => !/\d/.test(line));
    const ratio = withNumber.length / lines.length;
    if (ratio < 0.5) {
      const nothing = withNumber.length === 0;
      add(nothing ? 'missing' : 'improve', nothing ? 80 : 57, {
        id: 'results',
        title: nothing ? 'None of your achievements contain a number' : `Only ${withNumber.length} of ${lines.length} achievements contain a number`,
        body: `Numbers are what make a line believable: team sizes, volumes, targets, rand amounts, time saved. ${nothing ? `Across your ${plural(lines.length, 'line')} there are none, so every one reads as a duty, not a result.` : 'Most of your lines still read as duties, not results.'} A figure in half of your lines earns the full ${resultsPart.weight} points.`,
        fix: 'For each line quoted above, answer the question under it and put the real figure into the line. If you do not know the figure, leave the line as it is: a rounded or guessed number is worse than none.',
        where: STEP.work,
        points: Math.round(resultsPart.weight * (1 - resultsPart.value)),
        examples: without.slice(0, 3).map((line) => ({ line: clip(line, 140), note: askFor(line) })),
      });
    } else {
      good.push(`${withNumber.length} of your ${lines.length} achievements carry a real figure.`);
    }
  }

  /* ---------------------------- how the lines are written ---------------------- */

  const weak = lines.filter((line) => WEAK_OPENER.test(line));
  if (weak.length) {
    add('improve', 45, {
      id: 'weak-verbs',
      title: `${plural(weak.length, 'line')} start${weak.length === 1 ? 's' : ''} with a weak phrase`,
      body: '“Responsible for”, “duties included” and “worked on” say what the job was, not what you did. They are the most common way a strong person sounds average, and they use up the first words a recruiter reads.',
      fix: 'Start each line with what you did, in the past tense (present tense for a job you still hold): managed, trained, reconciled, negotiated, scheduled. Pick the verb that is true.',
      where: STEP.work,
      examples: weak.slice(0, 3).map((line) => ({ line: clip(line, 140), note: '' })),
    });
  }

  const openers = {};
  lines.forEach((line) => {
    const word = (line.match(/^[A-Za-z]+/) || [''])[0].toLowerCase();
    if (word.length > 3 && !WEAK_OPENER.test(line)) openers[word] = (openers[word] || 0) + 1;
  });
  const repeated = Object.entries(openers).filter(([, count]) => count >= 3).sort((a, b) => b[1] - a[1])[0];
  if (repeated) {
    add('improve', 38, {
      id: 'repeated-verbs',
      title: `“${repeated[0][0].toUpperCase()}${repeated[0].slice(1)}” opens ${repeated[1]} of your lines`,
      body: 'The same first word again and again makes a list read as a copy-and-paste, and it hides the fact that you did different things.',
      fix: 'Change the opening word on all but one of them, picking verbs that say what was different about each task.',
      where: STEP.work,
    });
  }

  const wrote = [summary, ...lines].join('\n');
  if (FIRST_PERSON.test(wrote)) {
    add('improve', 44, {
      id: 'first-person',
      title: 'Your writing uses “I”, “my” or “me”',
      body: 'A resume is written without the first person. Words like “I” and “my” make it read like a letter and take space from the facts.',
      fix: 'Drop the pronoun and start with the verb: “I managed a team of five” becomes “Managed a team of five”, with your own real figures.',
      where: `${STEP.summary}, ${STEP.work}`,
    });
  }

  const filler = [...new Set((wrote.match(FILLER) || []).map((word) => word.toLowerCase()))];
  if (filler.length) {
    add('improve', 42, {
      id: 'filler',
      title: 'Filler phrases that anyone can claim',
      body: `${quoted(filler.slice(0, 4))} ${filler.length === 1 ? 'is a phrase' : 'are phrases'} every applicant uses, so readers skim past ${filler.length === 1 ? 'it' : 'them'}. They also take up room an ATS could be matching real keywords in.`,
      fix: 'Cut each one, or replace it with a fact that shows it: not “hard-working”, but what you did that took hard work.',
      where: `${STEP.summary}, ${STEP.work}`,
    });
  }

  /* ---------------------------------- summary ---------------------------------- */

  if (summary.length < 40) {
    add('missing', 76, {
      id: 'summary',
      title: summary ? 'Your summary is too short to count' : 'You have no professional summary',
      body: `The summary is the first thing read and the place an ATS expects to find your role, how long you have done it and your strongest skills. ${summary ? 'Yours is only a few words, so it is not counted as a summary at all.' : 'Without one, the top of your resume is only a name.'}`,
      fix: `Write 2 to 4 sentences: your role, how long you have done it, and two or three strengths that match “${jobTitle}”. The Summary step can write one from your work history, using only what you have entered.`,
      where: STEP.summary,
      points: 2.5,
    });
  } else if (summary.length < 150) {
    add('improve', 54, {
      id: 'summary-thin',
      title: 'Your summary is thin',
      body: `Your summary is ${summary.split(' ').length} words. That is enough to count, but not enough to say who you are, what you are good at and why this job: a thin summary wastes the best-read spot on the page.`,
      fix: `Grow it to two to four sentences by adding your strongest skills and what you deliver, as long as it is all true. Mention “${jobTitle}” only if it describes you.`,
      where: STEP.summary,
    });
  } else if (summary.length > 700) {
    add('improve', 41, {
      id: 'summary-long',
      title: 'Your summary is too long',
      body: 'A summary of this length is read by almost nobody, and the strongest points sink into it.',
      fix: 'Cut it to the two to four sentences that matter most for this job. Move detail into the work-history lines where it belongs.',
      where: STEP.summary,
    });
  } else {
    good.push('You have a professional summary of a good length.');
  }

  /* ----------------------------------- skills ---------------------------------- */

  if (skills.length < 5) {
    add('missing', 70, {
      id: 'skills',
      title: skills.length ? `Only ${plural(skills.length, 'skill')} listed` : 'You have not listed any skills',
      body: `The Skills list is the quickest thing an ATS reads. Five is the least that counts as a complete list here, and a resume with ${skills.length ? `just ${skills.length}` : 'none'} gives it little to match against the ${total ? `${total} words in the job` : 'job'}.`,
      fix: 'Add skills until you have around 8 to 12 that are true and relevant to this job. The Skills step suggests ones your work history supports and ones the job asks for: add only the ones you really have.',
      where: STEP.skills,
      points: 2.5,
    });
  } else {
    good.push(`You list ${skills.length} skills.`);
  }

  // Skills set to Novice. A template that shows levels prints it, and a recruiter reads "Novice" next to a skill used at work
  // as a contradiction. The ATS ignores the level, so it only costs. The advice never suggests claiming a higher level.
  const novice = asList(d.skills).filter((s) => s && text(s.text) && Number(s.rating) === 1).map((s) => text(s.text));
  if (novice.length) {
    add('improve', 41, {
      id: 'novice',
      title: novice.length === 1 ? 'A skill is set to Novice' : `${novice.length} skills are set to Novice`,
      body: `${quoted(novice.slice(0, 4))}${novice.length > 4 ? ` and ${novice.length - 4} more` : ''} ${novice.length === 1 ? 'is' : 'are'} marked Novice. In a template that shows skill levels, a recruiter reads that as “just starting out”, which clashes with the jobs you list. An ATS ignores the level, so it gains you nothing.`,
      fix: 'Set each one to the level you honestly have, take off any you are only starting to learn, or choose a template that lists skills without levels.',
      where: STEP.skills,
    });
  }

  /* -------------------------------- education ---------------------------------- */

  // What the advert asks for in years and in education level, compared with the work history and the Education step.
  // Each unmet requirement becomes its own finding below; the card in the panel shows the very same result.
  const check = analyseRequirements(target, d);

  // Qualifications that belong under Education (a degree, diploma, certificate, licence...) which qualificationCheck.js
  // did not read as a level (a licence, a registration, a named certificate). "5 years of experience" is not one of them.
  const EDU_LIKE = /\b(degree|diploma|certificate|certification|bachelor|honou?rs|master|mba|ph\.?d|matric|nqf|qualification|licen[cs]e)/i;
  // Checked against the resume and not on it:
  const qualKeywords = [...new Set(kw.missing.filter(isQual).filter((k) => !check.handled.has(norm(k.term))).map((k) => k.term))].filter((t) => EDU_LIKE.test(t) && !isLicenceTerm(t)).slice(0, 4);
  // A driver's licence the job asks for is checked against Personal details, and answered there, never under Education.
  const licenceAsked = [...kw.covered, ...kw.missing].some((k) => isLicenceTerm(k.term)) || asList(target.requirements).some((r) => typeof r === 'string' && isLicenceTerm(r));
  // What the advert lists as requirements: only used where Education is empty, so nothing has to be checked against it.
  const qualRequirements = asList(target.requirements)
    .filter((r) => typeof r === 'string' && EDU_LIKE.test(r) && !isLicenceTerm(r))
    .map((r) => clip(r.trim(), 70))
    .slice(0, 3);
  const eduAsked = check.items.filter((item) => item.kind === 'education').map((item) => item.title);
  const listed = [...new Set([...eduAsked, ...qualKeywords])].slice(0, 3);
  if (listed.length === 0) listed.push(...qualRequirements);
  if (education.length === 0) {
    add('missing', 66, {
      id: 'education',
      title: 'Your education section is empty',
      body: `${listed.length ? `The job lists ${quoted(listed)}, and an ATS looks for those under Education. ` : ''}An empty Education section makes a scan flag the resume as incomplete, even when your experience is strong.`,
      fix: 'Add your highest qualification first, then anything else you completed, including short courses. If you do not hold what the job lists, do not add it: strong experience can still carry the application.',
      where: STEP.education,
      points: 2.5,
    });
  } else {
    good.push('Your education is on the resume.');
    if (qualKeywords.length) {
      add('improve', 48, {
        id: 'quals',
        title: 'Qualifications the job lists are not on your resume',
        body: `The job asks for ${quoted(qualKeywords)}. ${qualKeywords.length === 1 ? 'It is' : 'They are'} not found anywhere on your resume, and ${qualKeywords.length === 1 ? 'it counts' : 'they count'} only if you hold ${qualKeywords.length === 1 ? 'it' : 'them'}.`,
        fix: 'If you do hold one, add it with the year: a degree, diploma or school certificate under Education, a trade licence or short course under Certificates. If you do not, leave it out and let your experience make the case.',
        where: STEP.education,
      });
    }
  }

  // The driver's licence: on the resume only when it is switched on in Personal details.
  if (licenceAsked) {
    if (personal.hasLicence) {
      good.push(`Your driver’s licence${text(personal.licenceCode) ? ` (code ${text(personal.licenceCode)})` : ''} is listed in your personal details.`);
    } else {
      add('improve', 46, {
        id: 'licence',
        title: 'The job asks for a driver’s licence',
        body: 'The job lists a driver’s licence and your personal details do not show one. A recruiter looks for it next to your contact details, and an ATS reads it there as well.',
        fix: 'If you hold one, switch on “Driver’s licence” under your personal details in the Heading step and pick your code. It goes there, not under Education. If you do not hold one, leave it out.',
        where: STEP.heading,
      });
    }
  }

  // Years of experience and education level, one finding per requirement that is not met.
  check.items.forEach((item) => {
    if (item.status === 'met') {
      good.push(`You meet the ${item.title} the job asks for.`);
      return;
    }
    // An empty Education section or work history already has a finding of its own above.
    if (item.status === 'empty' || (item.kind === 'education' && item.status === 'none')) return;
    const experience = item.kind === 'experience';
    const severe = experience
      ? Boolean(item.must) && (item.status === 'none' || (item.status === 'short' && item.ratio < 0.5))
      : Boolean(item.must) && item.status === 'below';
    add(severe ? 'missing' : 'improve', severe ? (experience ? 88 : 86) : experience ? 59 : 47, {
      id: `req-${item.id}`,
      title: item.headline,
      body: item.detail,
      fix: item.fix,
      where: experience ? STEP.work : STEP.education,
    });
  });

  /* ---------------------------------- overall ---------------------------------- */

  const words = resumeText(d).split(/\s+/).filter(Boolean).length;
  if (words < 120) {
    add('missing', 50, {
      id: 'thin',
      title: 'The whole resume is very thin',
      body: `Everything on it adds up to about ${words} words. A one-page resume normally holds a few hundred, and with this little text an ATS has almost nothing to match against the job.`,
      fix: 'Work through the steps in order and fill in each one with true detail, starting with Work history, which carries the most weight.',
      where: STEP.work,
    });
  }

  /* ---------------------------------- verdict ---------------------------------- */

  const missing = findings.filter((f) => f.level === 'missing').sort((a, b) => b.priority - a.priority);
  const improve = findings.filter((f) => f.level === 'improve').sort((a, b) => b.priority - a.priority);
  const left = 100 - result.score;
  const gaps = plural(missing.length, 'big gap');

  let verdict;
  const open = missing.length + improve.length;
  if (result.score >= 85) {
    verdict = `This resume speaks the language of “${jobTitle}”. ${open ? `${plural(open, 'point')} below ${open === 1 ? 'is' : 'are'} still worth fixing` : 'There is nothing left to fix'}, and before you send it, read every line once more and make sure it is true.`;
  } else if (result.score >= 70) {
    verdict = `A strong match for “${jobTitle}”, with ${left} points still to win. ${missing.length ? `${gaps} ${missing.length === 1 ? 'is' : 'are'} holding it back` : 'No big gaps remain'}; the rest is tightening.`;
  } else if (result.score >= 45) {
    verdict = `You are partway there for “${jobTitle}”, with ${left} points still to win. ${missing.length ? `${gaps} ${missing.length === 1 ? 'is' : 'are'} holding it back the most. Fix ${missing.length === 1 ? 'it' : 'them'} first, in the order below.` : 'There is no single big gap, so the points are in the smaller fixes below.'}`;
  } else {
    verdict = `As it stands, this resume would struggle to get through a scan for “${jobTitle}”. ${missing.length ? `${gaps} ${missing.length === 1 ? 'is' : 'are'} holding it back the most, and ${missing.length === 1 ? 'it is' : 'they are'} listed first below.` : 'The fixes are below, most valuable first.'} Everything here is something you can fix in the builder, and none of it needs you to claim anything that is not true.`;
  }

  // One short sentence for the top of the panel; `verdict` above is the longer one.
  const oneLine =
    result.score >= 85
      ? 'This resume speaks the language of the job.'
      : result.score >= 70
        ? `A strong match, with ${left} points still to win.`
        : result.score >= 45
          ? `Partway there, with ${left} points still to win.`
          : 'As it stands, this resume would struggle to get through a scan for this job.';

  return { verdict, summary: oneLine, missing, improve, good: good.slice(0, 6) };
}
