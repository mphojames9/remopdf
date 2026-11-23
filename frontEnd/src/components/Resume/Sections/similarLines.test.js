// Run with:  node --test similarLines.test.js   (from this folder; needs nothing installed)
import test from 'node:test';
import assert from 'node:assert/strict';
import { sameLine, sameThing, stripLabel, dedupeSimilarLines, dropRepeats } from './similarLines.js';

const LEAN = 'Implemented lean production scheduling that increased daily output by [X]%, reducing idle time and aligning with ISO 9001 quality standards.';
const FIVE_S = 'Led a 5S initiative that cut workplace waste by [X]%, improving safety compliance and enhancing team morale.';
const PPE = 'Conducted weekly safety briefings, reinforcing PPE use and reducing incident reports by [X]%, while fostering a culture of accountability.';
const COORD = 'Coordinated cross-departmental resource planning, ensuring procurement and logistics synchronized with production goals and maintaining zero stockouts.';

test('an idea stays the idea after [X] is replaced by a number', () => {
  assert.ok(sameLine('Implemented lean production scheduling that increased daily output by 10%, reducing idle time and aligning with ISO 9001 quality standards.', LEAN));
  assert.ok(sameLine('- Led a 5S initiative that cut workplace waste by 20%, improving safety compliance and enhancing team morale.', FIVE_S));
  assert.ok(sameLine('Conducted weekly safety briefings, reinforcing PPE use and reducing incident reports by 6%, while fostering a culture of accountability.', PPE));
});

test('an idea stays the idea when the person bolds a number or changes the figure to words', () => {
  assert.ok(sameLine('Led a 5S initiative that cut workplace waste by **20%**, improving safety compliance and enhancing team morale.', FIVE_S));
  assert.ok(sameLine('Led a 5S initiative that cut workplace waste by about a fifth, improving safety compliance and enhancing team morale.', FIVE_S));
});

test('different ideas are not the same line', () => {
  assert.equal(sameLine('Led a 5S initiative that cut workplace waste by 20%, improving safety compliance and enhancing team morale.', LEAN), false);
  assert.equal(sameLine(COORD, PPE), false);
});

test('the same point in different words is caught', () => {
  assert.ok(sameThing(FIVE_S.replace('[X]', '20'), 'Introduced 5S housekeeping standards, reducing waste by 20% and improving safety.'));
  assert.ok(sameThing(PPE.replace('[X]', '6'), 'Ran weekly toolbox talks on safety and PPE use, cutting incident reports by 6%.'));
  assert.ok(sameThing(COORD, 'Aligned procurement and logistics with production plans so there were no stockouts.'));
});

test('different points that share a few common words are left alone', () => {
  assert.equal(sameThing(LEAN, FIVE_S), false);
  assert.equal(sameThing(PPE, COORD), false);
  assert.equal(sameThing('Operations Management, Production Planning, Supply Chain Coordination, Quality Assurance.', 'Leadership and Team Management, Organizational Behavior, Strategic Planning and Change Management.'), false);
  assert.equal(sameThing('Problem-solving, decision-making, data analysis using management information systems.', 'Business communication, report writing, stakeholder presentation, and cross-functional coordination.'), false);
});

test('labels such as "Relevant coursework:" and "Focus areas:" are taken off', () => {
  assert.equal(stripLabel('Relevant coursework: Operations Management, Production Planning, Quality Assurance.'), 'Operations Management, Production Planning, Quality Assurance.');
  assert.equal(stripLabel('Focus areas: Leadership and Team Management, Organizational Behavior.'), 'Leadership and Team Management, Organizational Behavior.');
  assert.equal(stripLabel('Skills developed: Problem-solving, decision-making, data analysis.'), 'Problem-solving, decision-making, data analysis.');
  assert.equal(stripLabel('- Skills developed: Business communication, report writing.'), '- Business communication, report writing.');
  assert.equal(stripLabel('Final-year project topic: A study of inspection methods in manufacturing'), 'A study of inspection methods in manufacturing');
  assert.equal(stripLabel('relevant coursework: statistics and quality management'), 'Statistics and quality management');
});

test('a line without a label is returned as it was', () => {
  assert.equal(stripLabel("Dean's List, 2023"), "Dean's List, 2023");
  assert.equal(stripLabel('Studied statistics and quality management.'), 'Studied statistics and quality management.');
});

test('a rewrite that says one thing twice keeps it once', () => {
  const rewrite = [
    '- Led a 5S initiative that cut workplace waste by 20%, improving safety compliance and enhancing team morale.',
    '- Coordinated procurement and logistics with production goals, maintaining zero stockouts.',
    '- Introduced 5S housekeeping standards, reducing waste by 20% and improving safety.',
  ].join('\n');
  const out = dedupeSimilarLines(rewrite);
  assert.equal(out.split('\n').length, 2);
  assert.ok(out.includes('Led a 5S initiative'));
  assert.ok(!out.includes('housekeeping'));
});

test('a summary paragraph does not repeat a sentence in new words', () => {
  const summary = 'Manufacturing manager with nine years in production. Led the fabrication department. Managed the fabrication department.';
  const out = dedupeSimilarLines(summary);
  assert.ok(out.startsWith('Manufacturing manager with nine years in production.'));
  assert.ok(out.includes('Led the fabrication department.'));
  assert.ok(!out.includes('Managed the fabrication department'));
});

test('text with no repeats comes back exactly as it was', () => {
  const text = '- Led a team of 12 operators.\n- Reported weekly output to the plant director.';
  assert.equal(dedupeSimilarLines(text), text);
  assert.equal(dedupeSimilarLines(''), '');
});

test('dropRepeats removes ideas that repeat each other or something already written', () => {
  const ideas = [{ text: LEAN }, { text: FIVE_S }, { text: 'Introduced 5S housekeeping standards, reducing waste and improving safety.' }, { text: PPE }];
  const { kept, dropped } = dropRepeats(ideas, ['Conducted weekly safety briefings and reduced incident reports.'], (i) => i.text);
  assert.deepEqual(kept.map((i) => i.text), [LEAN, FIVE_S]);
  assert.equal(dropped, 2);
});
