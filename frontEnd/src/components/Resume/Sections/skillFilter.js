/*
  "Skills only". The Skills step suggests things a person can do or knows how to use. A qualification (degree,
  diploma, certificate, licence, registration, school result, "N years of experience") is not a skill: it belongs
  under Education or in the work history.

    isQualification(text)  true when the text reads like a qualification
    isSkillTerm(text)      true when the text can be offered as a skill (short, not a qualification, not a sentence)

  Kept in step with _QUALIFICATION_RE in the FastAPI backend (routers/job_match.py), which filters the same way
  before an answer is sent. This copy also protects the list when the AI service is down and the job's own keywords
  are shown instead.
*/

const QUALIFICATION_RE =
  /\b(bachelor['’]?s?|b\.?\s?sc|b\.?\s?com|b\.?\s?tech|btech|honou?rs|master['’]s|masters|mba|ph\.?d|doctorate|degree|diploma|higher certificate|national certificate|senior certificate|n[1-6]|nqf(?:\s*level)?(?:\s*\d+)?|matric|grade\s*1[0-2]|certificate|certification|certified|accredited|accreditation|licen[cs]e|licen[cs]ed|qualification|qualified|registration|registered|\d+\+?\s*(?:years?|yrs?)|years?['’]?\s+(?:of\s+)?experience)\b/i;

export const isQualification = (text) => QUALIFICATION_RE.test(String(text || ''));

export const isSkillTerm = (text) => {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length < 2 || t.length > 40) return false;
  if (t.split(' ').length > 5) return false;
  if (/[.;:!?]/.test(t)) return false;
  return !isQualification(t);
};
