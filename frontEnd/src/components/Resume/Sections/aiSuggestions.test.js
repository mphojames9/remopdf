// Run with:  node --test aiSuggestions.test.js   (from this folder; needs nothing installed)
import test from 'node:test';
import assert from 'node:assert/strict';
import { appendAchievement, hasAchievement, sortIdeas, removeAchievementLine } from './aiSuggestions.js';

const FIVE_S = 'Led a 5S initiative that cut workplace waste by [X]%, improving safety compliance and enhancing team morale.';
const LEAN = 'Implemented lean production scheduling that increased daily output by [X]%, reducing idle time and aligning with ISO 9001 quality standards.';

test('an added idea stays ticked after [X] is replaced, so it cannot be added twice', () => {
  const added = appendAchievement('- Planned weekly production.', FIVE_S);
  assert.ok(hasAchievement(added, FIVE_S));
  const edited = added.replace('[X]', '20');
  assert.ok(hasAchievement(edited, FIVE_S));
  const { shown } = sortIdeas([FIVE_S], edited);
  assert.deepEqual(shown, [{ idea: FIVE_S, added: true }]);
});

test('pressing the tick takes the line out, wherever the number went', () => {
  const edited = '- Planned weekly production.\n- Led a 5S initiative that cut workplace waste by 20%, improving safety compliance and enhancing team morale.\n- Reported output daily.';
  assert.equal(removeAchievementLine(edited, FIVE_S), '- Planned weekly production.\n- Reported output daily.');
  const only = '- Led a 5S initiative that cut workplace waste by 20%, improving safety compliance and enhancing team morale.';
  assert.equal(removeAchievementLine(only, FIVE_S), '');
});

test('removing works on the HTML older saved resumes hold, and drops an empty list', () => {
  const html = '<ul><li>Planned weekly production.</li><li>Led a 5S initiative that cut workplace waste by 20%, improving safety compliance and enhancing team morale.</li></ul>';
  assert.equal(removeAchievementLine(html, FIVE_S), '<ul><li>Planned weekly production.</li></ul>');
  assert.equal(removeAchievementLine('<ul><li>Led a 5S initiative that cut workplace waste by 20%, improving safety compliance and enhancing team morale.</li></ul>', FIVE_S), '');
});

test('removing a line that is not there changes nothing', () => {
  const text = '- Planned weekly production.\n- Reported output daily.';
  assert.equal(removeAchievementLine(text, FIVE_S), text);
});

test('an idea that repeats a written line in other words is not offered; a different one is', () => {
  const written = '- Introduced 5S housekeeping standards, reducing waste by 20% and improving safety.';
  const { shown, hidden } = sortIdeas([FIVE_S, LEAN], written);
  assert.equal(hidden, 1);
  assert.deepEqual(shown.map((s) => s.idea), [LEAN]);
});

test('two ideas that say the same thing are offered once', () => {
  const { shown, hidden } = sortIdeas([LEAN, 'Introduced lean scheduling in production, raising daily output and cutting idle time.', FIVE_S], '');
  assert.equal(hidden, 1);
  assert.equal(shown.length, 2);
});

test('an Education line saved with an old label still counts as the idea', () => {
  const saved = '- Relevant coursework: Operations Management, Production Planning, Quality Assurance.';
  const idea = 'Operations Management, Production Planning, Quality Assurance.';
  assert.ok(hasAchievement(saved, idea));
  assert.equal(removeAchievementLine(saved, idea), '');
});
