// Run with:  node --test resumeDoctor.test.js   (from this folder; needs nothing installed)
import test from 'node:test';
import assert from 'node:assert/strict';
import { findProblems, fixAllSafe, cleanResume } from './resumeDoctor.js';

const NOW = new Date(2026, 10, 21); // 21 Nov 2026
let n = 0;
const job = (title, employer, from, to, achievements = '', extra = {}) => {
  const [startMonth, startYear] = from.split('/');
  const current = to === 'now';
  const [endMonth, endYear] = current ? ['', ''] : to.split('/');
  n += 1;
  return { id: `j${n}`, title, employer, location: '', startMonth, startYear, endMonth, endYear, current, achievements, ...extra };
};
const resume = (over = {}) => ({ personal: { email: 'a@gmail.com', phone: '0821234567' }, experiences: [], education: [], skills: [], summary: '', ...over });
const kinds = (data) => findProblems(data, NOW).map((p) => p.kind);
const find = (data, kind) => findProblems(data, NOW).find((p) => p.kind === kind);

test('a note imported as a job: found, and both fixes work', () => {
  const senior = job('Senior Manager', 'Beekman Super Canopies (Pty) Ltd', '10/2016', '10/2022', 'Led the plant');
  const note = job('(Progressed into Assistant and Senior Management roles)', 'Beekman Super Canopies (Pty) Ltd', '02/2008', '09/2016');
  const data = resume({ experiences: [senior, note] });
  const p = find(data, 'job-is-a-note');
  assert.equal(p.severity, 'high');
  assert.equal(p.where, 'Work history step');
  assert.match(p.detail, /has dates \(Feb 2008 to Sep 2016\), so it is counted as time worked/);
  assert.equal(p.fixes.length, 2);
  assert.match(p.fixes[0].label, /Add it as a line to \u201CSenior Manager at Beekman Super Canopies \(Pty\) Ltd\u201D/);

  const attached = p.fixes[0].apply(data);
  assert.equal(attached.experiences.length, 1);
  assert.equal(attached.experiences[0].achievements, 'Led the plant\nProgressed into Assistant and Senior Management roles');
  assert.equal(p.fixes[1].apply(data).experiences.length, 1);
  assert.equal(kinds(attached).includes('job-is-a-note'), false);
  // reported once: its dates do not also raise an overlap, a gap or a duplicate
  assert.deepEqual(kinds(data), ['job-is-a-note']);
});

test('normal titles with brackets or a few words are not notes', () => {
  const data = resume({ experiences: [
    job('Senior Manager (Operations and Maintenance Division)', 'A', '01/2018', '01/2020'),
    job('Sales Representative (Contract)', 'B', '01/2016', '12/2017'),
    job('Head of Customer Service and Client Relations', 'C', '01/2012', '12/2015'),
  ] });
  assert.equal(kinds(data).includes('job-is-a-note'), false);
  assert.equal(kinds(data).includes('job-note-in-title'), false);
});

test('a note inside a title is split out under the job', () => {
  const data = resume({ experiences: [job('Machine Operator (Progressed into Assistant and Senior Management roles)', 'Beekman', '01/2008', '12/2015', 'Ran the press')] });
  const p = find(data, 'job-note-in-title');
  const next = p.fixes[0].apply(data);
  assert.equal(next.experiences[0].title, 'Machine Operator');
  assert.equal(next.experiences[0].achievements, 'Ran the press\nProgressed into Assistant and Senior Management roles');
});

test('the same job twice: merged into one with the lines of both', () => {
  const a = job('Clerk', 'Acme', '03/2019', '03/2021', 'Filed records');
  const b = job('clerk', 'ACME', '03/2019', '03/2021', 'Filed records\nBalanced the till');
  const data = resume({ experiences: [a, b] });
  const p = find(data, 'job-duplicate');
  assert.equal(p.severity, 'high');
  const next = p.fixes[0].apply(data);
  assert.equal(next.experiences.length, 1);
  assert.equal(next.experiences[0].achievements, 'Filed records\nBalanced the till');
});

test('a job that ends before it starts: dates swapped, and the label says which', () => {
  const data = resume({ experiences: [job('Clerk', 'Acme', '06/2020', '02/2018')] });
  const p = find(data, 'job-dates-reversed');
  assert.match(p.fixes[0].label, /Start Feb 2018, end Jun 2020/);
  const j = p.fixes[0].apply(data).experiences[0];
  assert.deepEqual([j.startMonth, j.startYear, j.endMonth, j.endYear], ['02', '2018', '06', '2020']);
});

test('a job that ends in the future can be marked as current', () => {
  const data = resume({ experiences: [job('Clerk', 'Acme', '01/2025', '06/2027')] });
  const p = find(data, 'job-ends-in-future');
  const j = p.fixes[0].apply(data).experiences[0];
  assert.equal(j.current, true);
  assert.equal(j.endYear, '');
});

test('two roles at one employer that overlap: the earlier one is closed the month before', () => {
  const a = job('Assistant Manager', 'Beekman', '01/2012', '12/2020');
  const b = job('Senior Manager', 'Beekman', '06/2016', 'now');
  const data = resume({ experiences: [b, a] });
  const p = find(data, 'job-overlap');
  assert.match(p.fixes[0].label, /End the earlier role in May 2016/);
  const early = p.fixes[0].apply(data).experiences.find((j) => j.title === 'Assistant Manager');
  assert.deepEqual([early.endMonth, early.endYear, early.current], ['05', '2016', false]);
  // different employers overlapping is a second job, not a mistake
  assert.equal(kinds(resume({ experiences: [job('Clerk', 'X', '01/2018', '12/2020'), job('Tutor', 'Y', '06/2019', '06/2020')] })).includes('job-overlap'), false);
});

test('job title and employer swapped', () => {
  const data = resume({ experiences: [job('Beekman Super Canopies (Pty) Ltd', 'Production Manager', '01/2015', '12/2018')] });
  const next = find(data, 'job-swapped').fixes[0].apply(data).experiences[0];
  assert.equal(next.title, 'Production Manager');
  assert.equal(next.employer, 'Beekman Super Canopies (Pty) Ltd');
  assert.equal(kinds(resume({ experiences: [job('Production Manager', 'Beekman (Pty) Ltd', '01/2015', '12/2018')] })).includes('job-swapped'), false);
});

test('capitals, spacing and repeated lines are safe fixes', () => {
  const data = resume({ experiences: [job('PRODUCTION MANAGER ', 'BEEKMAN SUPER CANOPIES (PTY) LTD,', '01/2015', '12/2018', 'Cut scrap\nCut scrap\n- Trained staff')] });
  const found = findProblems(data, NOW);
  assert.deepEqual(found.map((p) => p.kind).sort(), ['job-repeated-lines', 'job-shouting', 'job-spacing']);
  assert.match(found.find((p) => p.kind === 'job-shouting').detail, /^The title and employer of .* are all capitals/);
  assert.ok(found.every((p) => p.fixes[0].safe));
  const { data: clean, applied } = fixAllSafe(data, NOW);
  assert.equal(applied, 3);
  const j = clean.experiences[0];
  assert.equal(j.title, 'Production Manager');
  assert.equal(j.employer, 'Beekman Super Canopies (Pty) Ltd');
  assert.equal(j.achievements, 'Cut scrap\n- Trained staff');
  assert.equal(findProblems(clean, NOW).length, 0);
});

test('skills: a pasted list is split, repeats removed, a sentence flagged', () => {
  const data = resume({ skills: [
    { id: 1, text: 'Word, Excel, PowerPoint', rating: 3 },
    { id: 2, text: 'excel', rating: 4 },
    { id: 3, text: 'Teamwork', rating: 4 },
    { id: 4, text: 'I am a hard working and dedicated person who loves to learn.', rating: 3 },
  ] });
  assert.deepEqual(kinds(data).sort(), ['skills-duplicate', 'skills-joined', 'skills-sentence']);
  const { data: clean } = fixAllSafe(data, NOW);
  assert.deepEqual(clean.skills.map((s) => s.text), ['Word', 'Excel', 'PowerPoint', 'Teamwork', 'I am a hard working and dedicated person who loves to learn.']);
  assert.equal(clean.skills[0].rating, 3); // the rating goes with each part
  const sentence = find(clean, 'skills-sentence');
  assert.equal(sentence.fixes[0].safe, false);
  assert.equal(sentence.fixes[0].apply(clean).skills.length, 4);
});

test('contact: a mistyped email is offered a correction, an invalid one and a short phone are flagged', () => {
  const typo = find(resume({ personal: { email: 'mpho@gmial.com', phone: '0821234567' } }), 'email-typo');
  assert.match(typo.fixes[0].label, /mpho@gmail\.com/);
  assert.equal(typo.fixes[0].apply({ personal: { email: 'mpho@gmial.com' } }).personal.email, 'mpho@gmail.com');
  assert.equal(find(resume({ personal: { email: 'mpho.gmail.com' } }), 'email-invalid').severity, 'high');
  assert.equal(find(resume({ personal: { email: 'a@b.co', phone: '082 12' } }), 'phone-invalid').severity, 'medium');
  assert.deepEqual(kinds(resume()), []);
});

test('education: the same qualification twice', () => {
  const data = resume({ education: [{ id: 'e1', degree: 'Matric', institution: 'Pretoria High School' }, { id: 'e2', degree: 'matric', institution: 'Pretoria High School' }] });
  const p = find(data, 'education-duplicate');
  assert.equal(p.fixes[0].apply(data).education.length, 1);
});

test('placeholders left in the text are reported by step, with no automatic fix', () => {
  const data = resume({ summary: 'Raised sales by [number]% in [period].', experiences: [job('Clerk', 'Acme', '01/2020', '12/2021', 'Cut costs by [X]%')] });
  const found = findProblems(data, NOW).filter((p) => p.kind === 'placeholder');
  assert.deepEqual(found.map((p) => p.where).sort(), ['Summary step', 'Work history step']);
  assert.ok(found.every((p) => p.fixes.length === 0));
  assert.match(found.find((p) => p.step === 4).detail, /\u201C\[number\]\u201D/);
});

test('a gap of more than a year is mentioned, a short one is not', () => {
  const gap = resume({ experiences: [job('Clerk', 'A', '01/2015', '12/2016'), job('Clerk', 'B', '06/2019', '12/2021')] });
  assert.ok(kinds(gap).includes('job-gap'));
  const none = resume({ experiences: [job('Clerk', 'A', '01/2015', '12/2016'), job('Clerk', 'B', '03/2017', '12/2021')] });
  assert.equal(kinds(none).includes('job-gap'), false);
});

test('import cleanup only does the safe things: a note-as-job is left for the person to decide', () => {
  const data = resume({
    experiences: [
      job('SENIOR MANAGER', 'Beekman', '10/2016', '10/2022', 'Led the plant\nLed the plant'),
      job('(Progressed into Assistant and Senior Management roles)', 'Beekman', '02/2008', '09/2016'),
    ],
    skills: [{ id: 1, text: 'Word, Excel', rating: 3 }],
  });
  const clean = cleanResume(data);
  assert.equal(clean.experiences.length, 2); // the note job is still there
  assert.equal(clean.experiences[0].title, 'Senior Manager');
  assert.equal(clean.experiences[0].achievements, 'Led the plant');
  assert.deepEqual(clean.skills.map((s) => s.text), ['Word', 'Excel']);
  assert.ok(kinds(clean).includes('job-is-a-note'));
  assert.deepEqual(cleanResume(clean), clean); // doing it again changes nothing
});

test('most serious first, and nothing throws on odd data', () => {
  const data = resume({ personal: { email: 'bad' }, experiences: [job('PRODUCTION MANAGER', 'X', '01/2015', '12/2018')] });
  assert.equal(findProblems(data, NOW)[0].severity, 'high');
  for (const odd of [null, undefined, {}, { experiences: [null, 'x', 7, {}], skills: [null, { text: 5 }], education: 'text', personal: null }]) {
    assert.doesNotThrow(() => findProblems(odd, NOW));
    assert.doesNotThrow(() => fixAllSafe(odd, NOW));
  }
});
