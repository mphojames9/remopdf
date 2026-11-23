// Run with:  node --test atsScore.test.js   (from this folder; needs nothing installed)
import test from 'node:test';
import assert from 'node:assert/strict';
import { norm, matchTerm, scoreResume, hasResultFigure, labelFor, isLicenceTerm, licenceText } from './atsScore.js';
import { scoreMatch } from './scoreMatch.js';

const kw = (term, extra = {}) => ({ term, kind: 'skill', must: true, ...extra });
const target = (keywords) => ({ title: 'Sales Consultant', keywords });
const resume = (over = {}) => ({
  personal: { profession: '' },
  summary: '',
  skills: [],
  experiences: [],
  education: [],
  ...over,
});
const job = (achievements, extra = {}) => ({ title: 'Clerk', employer: 'A', startMonth: '01', startYear: '2020', endMonth: '12', endYear: '2022', current: false, achievements, ...extra });
const state = (term, data) => {
  const result = scoreResume(target([kw(term)]), data);
  return result.keywords.covered.length ? 'full' : result.keywords.missing[0].partial ? 'partial' : 'none';
};

test('"Excel" the verb is not Excel the program', () => {
  assert.equal(state('Excel', resume({ summary: 'I excel at selling and I excel under pressure.' })), 'none');
  assert.equal(state('Excel', resume({ experiences: [job('Excel in customer service and team work')] })), 'none');
  assert.equal(state('Excel', resume({ experiences: [job('Excellent communicator')] })), 'none');
});

test('"Excel" the program: in the Skills list, after Microsoft or MS, or beside other tools', () => {
  assert.equal(state('Excel', resume({ skills: [{ text: 'Excel' }] })), 'full');
  assert.equal(state('Excel', resume({ skills: [{ text: 'Advanced Excel (pivot tables)' }] })), 'full');
  assert.equal(state('Excel', resume({ experiences: [job('Built weekly reports in Microsoft Excel')] })), 'full');
  assert.equal(state('Excel', resume({ experiences: [job('Built weekly reports in MS Excel')] })), 'full');
  assert.equal(state('Excel', resume({ experiences: [job('Proficient in Word, Excel and PowerPoint')] })), 'full');
  assert.equal(state('Excel', resume({ experiences: [job('Used Excel spreadsheets to track stock')] })), 'full');
});

test('"Word" in ordinary sentences is not Microsoft Word', () => {
  assert.equal(state('Word', resume({ summary: 'Grew the business by word of mouth. In other words, I deliver.' })), 'none');
  assert.equal(state('Word', resume({ skills: [{ text: 'Word' }] })), 'full');
  assert.equal(state('Microsoft Word', resume({ skills: [{ text: 'Word' }] })), 'full');
  assert.equal(state('Microsoft Word', resume({ experiences: [job('Typed letters in MS Word')] })), 'full');
});

test('"Teams" the program, not teams of people', () => {
  assert.equal(state('Teams', resume({ experiences: [job('Led teams of eight and managed team targets')] })), 'none');
  assert.equal(state('Teams', resume({ experiences: [job('Ran meetings on Microsoft Teams')] })), 'full');
});

test('languages called R, C or Go: only where it is plainly the language', () => {
  assert.equal(state('R', resume({ experiences: [job('Worked in R&D and earned R5 000 bonuses')] })), 'none');
  assert.equal(state('R', resume({ skills: [{ text: 'R' }] })), 'full');
  assert.equal(state('R', resume({ experiences: [job('Wrote reports with programming in R')] })), 'full');
  assert.equal(state('Go', resume({ experiences: [job('A go-getter who goes the extra mile')] })), 'none');
});

test('"Microsoft Office" is half credit for the programs it holds, not full', () => {
  const data = resume({ skills: [{ text: 'Microsoft Office' }] });
  const result = scoreResume(target([kw('Word'), kw('PowerPoint'), kw('Outlook'), kw('Teamwork')]), data);
  assert.equal(result.keywords.covered.length, 0);
  assert.deepEqual(result.keywords.missing.map((k) => [k.term, Boolean(k.partial)]), [['Word', true], ['PowerPoint', true], ['Outlook', true], ['Teamwork', false]]);
  // 3 half credits out of 4 equal-weight keywords (3 x 0.5 / 4 = 37.5% of 70 points)
  assert.equal(result.parts[0].value, 0.375);
  assert.match(result.parts[0].hint, /3 only as/);
  // naming the program earns it in full
  const named = scoreResume(target([kw('Word')]), resume({ skills: [{ text: 'Microsoft Office' }, { text: 'Word' }] }));
  assert.equal(named.keywords.covered.length, 1);
  assert.equal(matchTerm('Access', norm('Microsoft Office'), {}), 'none'); // Access is not part of the usual suite
});

test('tools written the usual other ways', () => {
  assert.equal(state('PowerPoint', resume({ skills: [{ text: 'Power Point' }] })), 'full');
  assert.equal(state('Microsoft Excel', resume({ skills: [{ text: 'MS-Excel' }] })), 'full');
  assert.equal(state('Email', resume({ skills: [{ text: 'E-mail' }] })), 'full');
});

test('British and American spelling are the same word', () => {
  assert.equal(state('Call Centre', resume({ experiences: [job('Handled 80 calls a day in a call center')] })), 'full');
  assert.equal(state('Call Center', resume({ experiences: [job('Worked in a busy call centre')] })), 'full');
  assert.equal(state('Organisation skills', resume({ skills: [{ text: 'Organization skills' }] })), 'full');
  assert.equal(state('Prioritise', resume({ summary: 'I prioritize urgent work' })), 'full');
  assert.equal(norm('advise supervise exercise expertise'), 'advise supervis exercise expertise');
});

test('the verb and the noun of a skill meet; unrelated words do not', () => {
  assert.equal(state('Negotiation', resume({ experiences: [job('Negotiated supplier contracts')] })), 'full');
  assert.equal(state('Inspection', resume({ experiences: [job('Inspecting 40 batches a week')] })), 'full');
  assert.equal(state('Communication', resume({ summary: 'I communicate clearly with clients' })), 'full');
  assert.equal(state('Management', resume({ experiences: [job('Managed a team of eight')] })), 'full');
  assert.equal(state('Market', resume({ summary: 'I know the marketplace' })), 'none');
  assert.equal(state('Negotiation', resume({ summary: 'I am a good listener' })), 'none');
});

test('phrases still need their words side by side', () => {
  assert.equal(state('Project management', resume({ summary: 'project plans and people management' })), 'none');
  assert.equal(state('Customer service', resume({ summary: 'Strong customer service record' })), 'full');
});

test('a measurable result is a figure, not a year, a standard or a level', () => {
  for (const line of ['Worked at the plant since 2023', 'Audited to ISO 9001 standards', 'Completed Grade 12 in 2019', 'Worked a 24/7 roster', 'Called client 0821234567']) {
    assert.equal(hasResultFigure(line), false, line);
  }
  for (const line of ['Inspected 40 batches a week', 'Raised sales by 15%', 'Managed a team of 8', 'Saved R2 million in 2024']) {
    assert.equal(hasResultFigure(line), true, line);
  }
  const data = resume({ experiences: [job('Worked at the plant since 2023\nInspected 40 batches a week')] });
  const results = scoreResume(target([kw('Quality')]), data).parts.find((p) => p.id === 'results');
  assert.match(results.hint, /1 of 2 achievements contain a figure/);
});

test('product names read clearly', () => {
  assert.equal(labelFor('Word'), 'Microsoft Word');
  assert.equal(labelFor('teams'), 'Microsoft Teams');
  assert.equal(labelFor('Negotiation'), 'Negotiation');
});

test('qualification keywords are earned by what the resume shows, not by the words', () => {
  const t = { title: 'Sales Call Centre Consultant', requirements: [], keywords: [
    { term: 'Matric', kind: 'credential', must: true },
    { term: "5 years' sales experience", kind: 'credential', must: true },
  ] };
  const now = new Date();
  const base = (education, experiences, summary = '') => resume({ education, experiences, summary });
  const short = [job('Handled sales calls', { title: 'Sales Agent', startYear: String(now.getFullYear() - 1), endYear: '', endMonth: '', current: true })];

  // a Diploma means Matric is met, though the word is nowhere; one year of sales is not five
  const a = scoreMatch(t, base([{ degree: 'National Diploma', field: 'Marketing', institution: 'TUT' }], short));
  assert.deepEqual(a.keywords.covered.map((k) => k.term), ['Matric']);
  assert.deepEqual(a.keywords.missing.map((k) => k.term), ["5 years' sales experience"]);
  assert.equal(a.requirements.items.length, 2);

  // the words typed in the summary are still accepted as a claim
  const b = scoreMatch(t, base([], short, "Over 5 years' sales experience."));
  assert.ok(b.keywords.covered.some((k) => k.term === "5 years' sales experience"));

  // enough years of sales earn it
  const long = [job('Sold to key accounts', { title: 'Sales Representative', startYear: '2015', endYear: '2023' })];
  const c = scoreMatch(t, base([{ degree: 'Matric', institution: 'High School' }], long));
  assert.equal(c.keywords.missing.length, 0);
});

test('no job target gives no score', () => {
  assert.equal(scoreMatch(null, resume()), null);
  assert.equal(scoreMatch({ keywords: [] }, resume()), null);
});

test("a driver's licence is read from Personal details, so a job that asks for it finds it there", () => {
  const licence = { term: "driver's licence", kind: 'credential', must: true };
  const without = scoreResume(target([licence]), resume({ personal: { profession: '' } }));
  assert.equal(without.keywords.covered.length, 0);
  const withIt = scoreResume(target([licence]), resume({ personal: { profession: '', hasLicence: true, licenceCode: 'C1' } }));
  assert.equal(withIt.keywords.covered.length, 1);
  assert.equal(licenceText({ hasLicence: true, licenceCode: 'C1' }), "Driver's licence code C1");
  assert.equal(licenceText({ hasLicence: false, licenceCode: 'C1' }), '');
});

test("which job keywords are a driver's licence", () => {
  for (const term of ["driver's licence", 'Valid drivers license', 'driving licence', 'Code 08 licence code B']) assert.ok(isLicenceTerm(term), term);
  for (const term of ['forklift licence', 'Diploma in Management', 'Microsoft Office']) assert.equal(isLicenceTerm(term), false, term);
});
