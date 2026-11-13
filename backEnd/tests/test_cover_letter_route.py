"""Run with:  python -m unittest tests.test_cover_letter_route   (from the backEnd folder; needs fastapi + pydantic, no network)

Drives POST /api/writing/cover-letter with a FAKE model, to prove that however the model behaves, the letter that is
returned never names a degree, diploma or certificate the resume does not list under Education or Certificates.
"""
import json
import unittest
from unittest import mock

from fastapi import HTTPException

from routers import writing_ai as w

ADVERT = ["Bachelor's degree or Diploma Operations Management", "Business Administration", "experience leading and supporting teams"]


def resume(education=None, skills=None, summary=None, certificates=None):
    """The resume from the report: a department manager whose Skills and Summary carry qualifications."""
    return w.LetterResume(
        profession="Department manager",
        summary=summary
        if summary is not None
        else (
            "Department manager with experience leading the CRM department. "
            "Holds a Diploma Operations Management and a Bachelor's degree, and lists coaching training and policy compliance as key skills."
        ),
        jobs=[
            w.LetterJob(
                title="Department manager",
                employer="Bureau Van Beek",
                start_year="2016",
                current=True,
                achievements="Lead the CRM department\nPrepare staff work schedules and assign duties\nReview financial statements and performance data",
            )
        ],
        education=education
        if education is not None
        else [w.LetterEducation(degree="Diploma", field="Operations Management", institution="Damelin")],
        skills=skills if skills is not None else ["Salesforce software", "Diploma Operations Management", "Bachelor's degree", "Policy Compliance"],
        certificates=certificates or [],
    )


def request(**kw):
    return w.CoverLetterRequest(
        resume=kw.pop("resume", None) or resume(),
        job_title="Department Manager",
        company="Leroy Merlin South Africa",
        tone="formal",
        years_experience=10,
        fresh=True,
        requirements=ADVERT,
        duties=[],
    )


OPENING = "I am applying for the Department Manager position at Leroy Merlin South Africa."
TRUE_PARAGRAPHS = (
    "At Bureau Van Beek I lead the CRM department. I prepare staff work schedules, assign duties and review financial "
    "statements and performance data so that the department's results can be measured.\n\n"
    "I would welcome the opportunity to discuss the Department Manager position at Leroy Merlin South Africa with you."
)
LYING = OPENING + " I am a department manager with a Diploma Operations Management and a Bachelor's degree.\n\n" + TRUE_PARAGRAPHS
HONEST = OPENING + " I am a department manager and I hold a Diploma Operations Management from Damelin.\n\n" + TRUE_PARAGRAPHS
ONLY_LIES = (
    "I hold a Bachelor's degree in Business Administration. I also hold a Master's degree in Operations Management. "
    "My Honours degree and my diploma in Marketing prepared me for this work, and my certificate in leadership did too."
)


def model_says(*bodies):
    return mock.patch.object(w, "call_groq_letter", side_effect=[json.dumps({"body": b}) for b in bodies])


class Route(unittest.TestCase):
    def setUp(self):
        w._cache.clear()
        for name, value in (("_bearer_pass", "pass"), ("_rate_limited", False), ("require_access", None)):
            patcher = mock.patch.object(w, name, return_value=value)
            patcher.start()
            self.addCleanup(patcher.stop)

    def write(self, req, *bodies):
        with model_says(*bodies) as fake:
            result = w.cover_letter(req, mock.Mock())
        return result["body"], fake

    def test_a_lying_model_cannot_get_a_false_qualification_out(self):
        body, fake = self.write(request(), LYING, LYING)  # lies on the first try AND on the correction
        self.assertNotIn("Bachelor", body)
        self.assertNotIn("degree", body)
        self.assertIn("I lead the CRM department", body)  # the true parts stay
        self.assertIn("Department Manager position at Leroy Merlin South Africa", body)
        self.assertEqual(fake.call_count, 2)

    def test_the_correction_round_tells_the_model_exactly_what_is_not_listed(self):
        _, fake = self.write(request(), LYING, HONEST)
        retry_messages = fake.call_args_list[1].args[0]
        told = retry_messages[-1]["content"]
        self.assertIn("Bachelor's", told)
        self.assertIn("does not list", told)
        self.assertIn("Diploma Operations Management", told)  # ...and what IS listed

    def test_an_honest_second_try_is_the_one_returned(self):
        body, _ = self.write(request(), LYING, HONEST)
        self.assertIn("I hold a Diploma Operations Management from Damelin", body)
        self.assertNotIn("Bachelor", body)

    def test_an_honest_first_try_costs_one_call(self):
        body, fake = self.write(request(), HONEST)
        self.assertEqual(fake.call_count, 1)
        self.assertIn("Damelin", body)

    def test_a_resume_with_no_education_gets_no_qualification_at_all(self):
        body, _ = self.write(request(resume=resume(education=[])), LYING, LYING)
        for word in ("Bachelor", "degree", "Diploma", "diploma"):
            self.assertNotIn(word, body)

    def test_both_qualifications_may_be_named_when_the_resume_lists_both(self):
        both = resume(
            education=[
                w.LetterEducation(degree="Diploma", field="Operations Management", institution="Damelin"),
                w.LetterEducation(degree="Bachelor of Commerce", institution="UNISA"),
            ]
        )
        body, fake = self.write(request(resume=both), LYING)
        self.assertEqual(fake.call_count, 1)
        self.assertIn("Bachelor's degree", body)  # listed, so it is the applicant's to claim

    def test_when_nothing_true_is_left_there_is_no_letter_at_all(self):
        # The app then shows its own draft, which is built only from the resume.
        with self.assertRaises(HTTPException) as caught:
            self.write(request(), ONLY_LIES, ONLY_LIES)
        self.assertEqual(caught.exception.status_code, 502)

    def test_a_job_called_certificate_administrator_is_not_a_claim(self):
        req = request()
        req.job_title = "Certificate Administrator"
        text = (
            "I am applying for the Certificate Administrator position at Leroy Merlin South Africa. " + HONEST.split(". ", 1)[1]
        )
        body, fake = self.write(req, text)
        self.assertEqual(fake.call_count, 1)
        self.assertIn("Certificate Administrator", body)


class WhatTheModelIsGiven(unittest.TestCase):
    def prompt(self, req):
        return w.build_letter_messages(req)[1]["content"]

    def test_the_summary_claim_never_reaches_the_model(self):
        text = self.prompt(request())
        self.assertNotIn("Holds a Diploma Operations Management and a Bachelor", text)
        self.assertIn("Department manager with experience leading the CRM department", text)  # the true sentence stays

    def test_qualifications_in_the_skills_list_are_not_skills(self):
        skills_line = next(line for line in self.prompt(request()).splitlines() if line.startswith("Skills:"))
        self.assertIn("Policy Compliance", skills_line)
        self.assertNotIn("Diploma", skills_line)
        self.assertNotIn("Bachelor", skills_line)

    def test_education_is_labelled_as_the_only_qualifications(self):
        text = self.prompt(request())
        self.assertIn("Qualifications held (the ONLY degrees, diplomas and certificates this applicant has", text)
        self.assertIn("- Diploma in Operations Management, Damelin", text)

    def test_no_education_says_none_listed(self):
        self.assertIn("Qualifications held: NONE listed", self.prompt(request(resume=resume(education=[]))))

    def test_certificates_are_qualifications_held(self):
        text = self.prompt(request(resume=resume(certificates=["First Aid Level 1, Red Cross"])))
        self.assertIn("- Certificate: First Aid Level 1, Red Cross", text)

    def test_the_advert_is_marked_as_what_the_employer_wants(self):
        text = self.prompt(request())
        self.assertIn("This is what the EMPLOYER asks for", text)
        self.assertIn("Bachelor's degree or Diploma Operations Management", text)  # still shown, as the employer's wish

    def test_bachelor_and_degree_are_not_offered_as_shared_keywords(self):
        text = self.prompt(request())
        terms = text.split("<matching_terms>")[1].split("</matching_terms>")[0]
        self.assertNotIn("bachelor", terms)
        self.assertNotIn("degree", terms)
        self.assertIn("diploma", terms)  # the one the resume really lists

    def test_the_rules_say_it(self):
        self.assertIn("QUALIFICATIONS ARE CHECKED AGAINST THE SCHOOL", w.LETTER_SYSTEM_PROMPT)
        self.assertIn("never both", w.LETTER_SYSTEM_PROMPT)


if __name__ == "__main__":
    unittest.main()
