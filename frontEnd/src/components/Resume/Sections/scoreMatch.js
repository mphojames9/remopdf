/*
  The Job match score: atsScore.js (keywords, title, results, completeness) with the qualification keywords judged properly.

    scoreMatch(target, resumeData) -> null (no job target yet) or the same result as scoreResume, plus
      requirements: what analyseRequirements (qualificationCheck.js) found, so a screen that needs the cards does not work it out twice

  "Matric" and "5 years' sales experience" are keywords in the advert, but typing the words does not earn them: a level of
  education is met by the qualification on the Education step, and years of experience by the dates of the work history. So
  those keywords are scored by what qualificationCheck.js finds, and the score agrees with the cards and the written review.
*/
import { scoreResume } from './atsScore.js';
import { analyseRequirements } from './qualificationCheck.js';

export function scoreMatch(target, data) {
  const requirements = analyseRequirements(target, data);
  const result = scoreResume(target, data, requirements.outcomes);
  return result ? { ...result, requirements } : null;
}
