// Run with:  node --test qualificationCheck.test.js   (from this folder; needs nothing installed)
import test from 'node:test';
import assert from 'node:assert/strict';
import { analyseRequirements, formatMonths } from './qualificationCheck.js';

const NOW = new Date(2026, 10, 20); // 20 Nov 2026

const job = (title, employer, from, to, achievements = '') => {
  const [startMonth, startYear] = from.split('/');
  const current = to === 'now';
  const [endMonth, endYear] = current ? ['', ''] : to.split('/');
  return { id: `${title}${from}`, title, employer, startMonth, startYear, endMonth, endYear, current, achievements };
};
const school = (degree, field = '', institution = 'Some School') => ({ id: degree, degree, field, institution, achievements: '' });
const resume = (experiences, education) => ({ experiences, education, skills: [] });
const target = (requirements = [], keywords = []) => ({ title: 'Sales Representative', requirements, keywords });
const kw = (term, must = true) => ({ term, kind: 'credential', must });

const one = (result, kind) => result.items.find((i) => i.kind === kind);

test('the screenshot: Matric and 5 years sales experience, a new quality control job and no education entered', () => {
  const t = target([], [kw('Matric'), kw("5 years' sales experience")]);
  const data = resume([job('Quality Control Officer', 'Robertson and Caine (Pty) Ltd', '02/2025', 'now', 'Checked product quality')], [school('')].map((e) => ({ ...e, institution: '' })));
  const { items, handled } = analyseRequirements(t, data, NOW);

  assert.equal(items.length, 2);
  assert.ok(handled.has('matric'));
  assert.ok(handled.has("5 year sale experience"));

  const exp = one({ items }, 'experience');
  assert.equal(exp.title, '5 years in sales');
  assert.equal(exp.status, 'none'); // 1 year 10 months in all, none of it mentions sales
  assert.match(exp.detail, /None of the titles or lines/);
  assert.match(exp.detail, /1 year 10 months/);
  assert.match(exp.fix, /Do not stretch your dates/);

  const edu = one({ items }, 'education');
  assert.equal(edu.status, 'none');
  assert.match(edu.detail, /Education section is empty/);
});

test('years of experience: counted only from jobs that mention the field, overlaps counted once', () => {
  const t = target(["Minimum 5 years' experience in sales"]);
  const data = resume(
    [
      job('Sales Consultant', 'Shop A', '01/2022', '12/2024'), // 3 years
      job('Sales Consultant', 'Shop B', '06/2024', '06/2025'), // overlaps 7 months with Shop A
      job('Cashier', 'Shop C', '01/2015', '12/2019', 'Handled cash'), // not sales
    ],
    [school('Matric')]
  );
  const exp = analyseRequirements(t, data, NOW).items[0];
  assert.equal(exp.kind, 'experience');
  assert.equal(exp.status, 'short');
  // Jan 2022 to Jun 2025 = 42 months (3 years 6 months); needs 60
  assert.equal(exp.have, '3 years 6 months in sales');
  assert.equal(exp.pill, '1 yr 6 mo short');
  assert.deepEqual(exp.bar, { have: '3 yrs 6 mo', need: '5 yrs' });
  assert.ok(exp.ratio > 0.69 && exp.ratio < 0.71);
  assert.deepEqual(exp.jobs.map((j) => j.counted), [true, true, false]);
});

test('years of experience: met, and a job counted through its lines is said so', () => {
  const t = target(['5+ years sales experience']);
  const data = resume([job('Account Manager', 'Firm', '01/2015', '12/2022', 'Led sales to key accounts')], []);
  const exp = analyseRequirements(t, data, NOW).items[0];
  assert.equal(exp.status, 'met');
  assert.match(exp.detail, /One of them counts because the lines under the job mention sales/);
});

test('total years when the advert names no field', () => {
  const t = target(['At least 3 years of experience']);
  const data = resume([job('Clerk', 'A', '01/2020', '12/2021'), job('Admin', 'B', '01/2022', 'now')], []);
  const exp = analyseRequirements(t, data, NOW).items[0];
  assert.equal(exp.status, 'met');
  assert.equal(exp.title, '3 years of experience');
});

test('years in total but none marked as the field: unproven, with the right advice', () => {
  const t = target(["5 years' sales experience"]);
  const data = resume([job('Clerk', 'A', '01/2015', '12/2022', 'Filing and reports')], []);
  const exp = analyseRequirements(t, data, NOW).items[0];
  assert.equal(exp.status, 'unproven');
  assert.match(exp.fix, /If you have not, do not add it/);
});

test('jobs with no dates cannot be counted, and the answer says so instead of guessing', () => {
  const t = target(['3 years experience']);
  const data = resume([{ title: 'Clerk', employer: 'A', achievements: 'Did filing' }], []);
  const exp = analyseRequirements(t, data, NOW).items[0];
  assert.equal(exp.status, 'unknown');
  assert.equal(exp.pill, 'No dates');
});

test('empty work history', () => {
  const exp = analyseRequirements(target(['2 years experience']), resume([], []), NOW).items[0];
  assert.equal(exp.status, 'empty');
});

test('a ranged or worded length reads the lower figure; months are fractions of a year', () => {
  const a = analyseRequirements(target(['3-5 years in retail']), resume([], []), NOW).items[0];
  assert.equal(a.title, '3 years in retail');
  assert.equal(a.need, '3\u20135 years in retail');
  assert.equal(a.bar.need, '3\u20135 yrs');
  const b = analyseRequirements(target(['five (5) years of experience as a store manager']), resume([], []), NOW).items[0];
  assert.equal(b.title, '5 years in store manager');
  const c = analyseRequirements(target(['18 months experience']), resume([], []), NOW).items[0];
  assert.equal(c.title, '1 year 6 months of experience');
});

test('periods that are not a length of experience are ignored', () => {
  for (const line of ['A clean driving record for the last 5 years', 'Must be between 21 and 35 years old', 'Licence valid for 5 years']) {
    assert.equal(analyseRequirements(target([line]), resume([], []), NOW).items.length, 0, line);
  }
});

test('one line, two requirements: Matric and years', () => {
  const t = target(["Matric and 5 years' sales experience in a fast-paced environment"]);
  const { items } = analyseRequirements(t, resume([], []), NOW);
  assert.equal(items.length, 2);
  assert.deepEqual(items.map((i) => i.title).sort(), ['5 years in sales', 'Matric']);
});

test('education: a higher qualification meets Matric, and the answer says a scan wants the word', () => {
  const edu = analyseRequirements(target(['Matric']), resume([], [school('National Diploma', 'Marketing')]), NOW).items[0];
  assert.equal(edu.status, 'met');
  assert.match(edu.detail, /sits above Matric/);
});

test('education: Grade 12 or National Senior Certificate is read as Matric', () => {
  for (const degree of ['Grade 12', 'National Senior Certificate', 'NSC', 'Matric']) {
    const edu = analyseRequirements(target(['Matric']), resume([], [school(degree)]), NOW).items[0];
    assert.equal(edu.status, 'met', degree);
  }
  const hs = analyseRequirements(target(['Matric']), resume([], [{ degree: '', field: '', institution: 'Pretoria High School', achievements: '' }]), NOW).items[0];
  assert.equal(hs.status, 'met');
});

test('education: below the level the job asks for', () => {
  const edu = analyseRequirements(target(["Bachelor's degree in Marketing or a related field"]), resume([], [school('National Diploma', 'Marketing')]), NOW).items[0];
  assert.equal(edu.status, 'below');
  assert.equal(edu.title, 'Bachelor\u2019s degree in marketing');
  assert.match(edu.detail, /National Diploma in Marketing, which is one level below/);
  assert.match(edu.fix, /do not list a qualification you do not hold/);
});

test('education: "or equivalent experience" changes the advice', () => {
  const edu = analyseRequirements(target(['Degree or equivalent experience']), resume([], [school('Matric')]), NOW).items[0];
  assert.equal(edu.status, 'below');
  assert.match(edu.fix, /accepts equivalent experience/);
});

test('education: level met but the subject is not shown', () => {
  const edu = analyseRequirements(target(['Diploma in Logistics']), resume([], [school('National Diploma', 'Marketing')]), NOW).items[0];
  assert.equal(edu.status, 'partial');
  assert.match(edu.headline, /names logistics/);
});

test('education: subject shown, and "Diploma and 5 years in sales" does not invent a subject', () => {
  const met = analyseRequirements(target(['Diploma in Logistics']), resume([], [school('National Diploma', 'Logistics and Supply Chain')]), NOW).items[0];
  assert.equal(met.status, 'met');
  const lines = analyseRequirements(target(["Diploma and 5 years' experience in sales"]), resume([], [school('National Diploma', 'Marketing')]), NOW).items;
  assert.equal(lines.find((i) => i.kind === 'education').status, 'met');
});

test('education: an entry whose level cannot be read', () => {
  const edu = analyseRequirements(target(['Matric']), resume([], [{ degree: '', field: '', institution: 'Tshwane University', achievements: '' }]), NOW).items[0];
  assert.equal(edu.status, 'unknown');
  assert.match(edu.fix, /Degree box/);
});

test('Master\u2019s degree is one requirement, not a Master\u2019s plus a degree', () => {
  const { items } = analyseRequirements(target(["Master's degree in Finance"]), resume([], [school('BCom', 'Finance')]), NOW);
  assert.equal(items.length, 1);
  assert.equal(items[0].status, 'below');
  assert.equal(items[0].title, 'Master\u2019s degree in finance');
});

test('either of two levels will do: the lower is required', () => {
  const edu = analyseRequirements(target(['Diploma or degree in Marketing']), resume([], [school('National Diploma', 'Marketing')]), NOW).items[0];
  assert.equal(edu.status, 'met');
});

test('a bare certificate in an advert is a short course or a licence, not an education level', () => {
  assert.equal(analyseRequirements(target(['First aid certificate', 'PSIRA registration']), resume([], []), NOW).items.length, 0);
});

test('the same requirement from the advert line and from a keyword is one card, and a must-have wins', () => {
  const t = target(["Minimum 5 years' sales experience"], [kw("5 years' sales experience", true)]);
  const { items } = analyseRequirements(t, resume([], []), NOW);
  assert.equal(items.length, 1);
  assert.equal(items[0].must, true);
});

test('"preferred" lines are not must-haves', () => {
  const items = analyseRequirements(target(['Degree preferred']), resume([], [school('Matric')]), NOW).items;
  assert.equal(items[0].must, false);
});

test('unmet requirements come first', () => {
  const t = target(['Matric', "5 years' sales experience"]);
  const data = resume([job('Clerk', 'A', '01/2020', '12/2021')], [school('Matric')]);
  const { items } = analyseRequirements(t, data, NOW);
  assert.equal(items[0].kind, 'experience');
  assert.equal(items[1].status, 'met');
});

test('nothing parseable gives no items and never throws, whatever the resume holds', () => {
  assert.deepEqual(analyseRequirements(null, null, NOW).items, []);
  assert.deepEqual(analyseRequirements({}, {}, NOW).items, []);
  const weird = { experiences: [null, 'x', { startYear: 'abc' }], education: 'text' };
  assert.doesNotThrow(() => analyseRequirements(target(['Matric', '3 years experience']), weird, NOW));
});

test('formatMonths', () => {
  assert.equal(formatMonths(25, true), '2 yrs 1 mo');
  assert.equal(formatMonths(12, true), '1 yr');
  assert.equal(formatMonths(0), '0 months');
  assert.equal(formatMonths(1), '1 month');
  assert.equal(formatMonths(12), '1 year');
  assert.equal(formatMonths(25), '2 years 1 month');
});
