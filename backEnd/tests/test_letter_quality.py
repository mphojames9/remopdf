"""Run with:  python -m unittest tests.test_letter_quality   (from the backEnd folder; needs nothing installed)

The cover letter may name a degree, diploma or certificate only if the resume lists it under Education or Certificates.
These tests pin down that rule: what counts as a claim, what backs it, and what the guard removes.
"""
import unittest

from routers import letter_quality as q

H = q.held_qualification_text

# The letter that went out: the resume's Summary and Skills carried "Diploma Operations Management" and "Bachelor's degree".
LIE = (
    "I am a department manager with a Diploma Operations Management and a Bachelor's degree, "
    "and I have held a supervisory role for several years."
)
DIPLOMA_ONLY = H([("Diploma", "Operations Management", "Damelin")])


class WhatIsClaimed(unittest.TestCase):
    def test_the_reported_letter_is_caught(self):
        claimed = q.unsupported_qualifications(LIE, DIPLOMA_ONLY)
        self.assertIn("Bachelor's", claimed)
        self.assertIn("degree", claimed)
        self.assertNotIn("Diploma", claimed)  # the diploma IS listed

    def test_no_education_at_all_means_no_qualification_may_be_named(self):
        claimed = q.unsupported_qualifications(LIE, "")
        self.assertIn("Diploma", claimed)
        self.assertIn("Bachelor's", claimed)

    def test_both_listed_is_fine(self):
        held = H([("Diploma", "Operations Management", "Damelin"), ("Bachelor of Commerce", "", "UNISA")])
        self.assertEqual(q.unsupported_qualifications(LIE, held), [])

    def test_a_diploma_does_not_back_a_degree_and_a_bachelors_does_not_back_an_honours(self):
        self.assertTrue(q.unsupported_qualifications("I hold a degree.", H([("National Diploma", "", "X")])))
        self.assertTrue(q.unsupported_qualifications("I hold an honours degree.", H([("Bachelor of Commerce", "", "X")])))

    def test_any_degree_backs_the_word_degree(self):
        for degree in ("Bachelor of Commerce", "BSc", "Master of Arts", "BCom (Hons)", "MBA"):
            self.assertEqual(q.unsupported_qualifications("I hold a degree.", H([(degree, "", "X")])), [], degree)

    def test_right_kind_wrong_subject_is_caught(self):
        held = H([("Diploma", "Marketing", "X")])
        self.assertEqual(q.unsupported_qualifications("I hold a Diploma in Operations Management.", held), ["Diploma in Operations Management"])

    def test_subject_may_be_worded_in_full_or_abbreviated_to_five_letters(self):
        held = H([("Diploma", "Business Admin", "X")])
        self.assertEqual(q.unsupported_qualifications("I hold a Diploma in Business Administration.", held), [])

    def test_matric_and_national_senior_certificate_are_one_claim(self):
        self.assertEqual(q.unsupported_qualifications("I passed my National Senior Certificate.", H([("Matric", "", "School")])), [])
        self.assertTrue(q.unsupported_qualifications("I passed my National Senior Certificate.", H([("Diploma", "", "X")])))


class NotAClaim(unittest.TestCase):
    def test_a_high_degree_of_accuracy(self):
        self.assertEqual(q.unsupported_qualifications("I work with a high degree of accuracy.", ""), [])
        self.assertEqual(q.unsupported_qualifications("The role has a degree of autonomy.", ""), [])

    def test_certificates_listed_in_the_certificates_section_back_the_word_certificate(self):
        held = H([], ["First Aid Level 1, Red Cross"])
        self.assertEqual(q.unsupported_qualifications("I hold a First Aid certificate from the Red Cross.", held), [])

    def test_a_duty_from_the_applicants_own_work_history(self):
        history = "Trainer at Acme: issued certificates to trainees"
        self.assertEqual(q.unsupported_qualifications("I issued certificates to trainees.", "", history), [])
        # ...but their own history never backs a degree the Education section lacks
        self.assertTrue(q.unsupported_qualifications("I hold a Bachelor's degree.", "", history))

    def test_the_position_title_and_company_are_not_claims(self):
        text = "I am applying for the Certificate Administrator position at Diploma Foods."
        self.assertEqual(q.unsupported_qualifications(text, "", "", ("Certificate Administrator", "Diploma Foods")), [])
        self.assertTrue(q.unsupported_qualifications(text, ""))

    def test_text_without_any_qualification_word(self):
        self.assertEqual(q.unsupported_qualifications("I led the CRM department at Bureau Van Beek.", ""), [])


class WhatTheGuardRemoves(unittest.TestCase):
    BODY = (
        "I am applying for the Department Manager position at Leroy Merlin. " + LIE + "\n\n"
        "At Bureau Van Beek I led the CRM department. I prepared staff schedules."
    )

    def test_only_the_false_sentence_goes(self):
        out = q.drop_unsupported_qualification_sentences(self.BODY, DIPLOMA_ONLY)
        self.assertNotIn("Bachelor", out)
        self.assertIn("I am applying for the Department Manager position", out)
        self.assertIn("I led the CRM department", out)

    def test_a_clean_letter_comes_back_unchanged(self):
        clean = "I led the CRM department.\n\nI hold a Diploma in Operations Management."
        self.assertEqual(q.drop_unsupported_qualification_sentences(clean, DIPLOMA_ONLY), clean)

    def test_a_bullet_that_claims_one_is_removed_with_its_line_only(self):
        body = "My record:\n- Led a team of six\n- Holds a Bachelor's degree\n- Cut stock losses"
        out = q.drop_unsupported_qualification_sentences(body, DIPLOMA_ONLY)
        self.assertIn("- Led a team of six", out)
        self.assertIn("- Cut stock losses", out)
        self.assertNotIn("Bachelor", out)

    def test_paragraphs_left_empty_disappear(self):
        out = q.drop_unsupported_qualification_sentences("I hold a Bachelor's degree.\n\nI led a team.", "")
        self.assertEqual(out, "I led a team.")

    def test_nothing_unlisted_survives_for_any_education(self):
        for held in ("", DIPLOMA_ONLY, H([("BCom", "", "X")])):
            out = q.drop_unsupported_qualification_sentences(self.BODY, held)
            self.assertEqual(q.unsupported_qualifications(out, held), [], held)


class WhatTheModelIsToldAndShown(unittest.TestCase):
    def test_the_problem_is_first_and_never_cut_off(self):
        # A letter with four other problems still reports the qualification first.
        body = "I am writing to express my interest. I am passionate. " + LIE + " Remove the vague role you are offering."
        problems = q.letter_problems(body, "Department Manager", [], DIPLOMA_ONLY)
        self.assertLessEqual(len(problems), 4)
        self.assertIn("does not list", problems[0])
        self.assertIn("Diploma Operations Management", problems[0])  # tells the model what IS listed

    def test_no_held_text_given_skips_the_check(self):
        self.assertFalse(any("does not list" in p for p in q.letter_problems(LIE, "Department Manager", [])))

    def test_a_skill_that_is_a_qualification_is_not_a_skill(self):
        for text in ("Diploma Operations Management", "Bachelor's degree", "First Aid Certificate", "10 years experience"):
            self.assertTrue(q.looks_like_qualification(text), text)
        for text in ("Policy Compliance", "Active Listening", "Salesforce software", "Stock control"):
            self.assertFalse(q.looks_like_qualification(text), text)

    def test_shared_keywords_never_include_an_unlisted_qualification(self):
        advert = ["Bachelor's degree or Diploma Operations Management", "Business Administration"]
        corpus = "Department manager. Holds a Diploma Operations Management and a Bachelor's degree. Business Administration"
        terms = q.matching_terms(["Department Manager"] + advert, corpus)
        self.assertIn("bachelor", terms)  # the raw matcher is fooled by a polluted resume...
        kept = q.drop_unlisted_qualification_terms(terms, DIPLOMA_ONLY)
        self.assertNotIn("bachelor", kept)  # ...so the qualification words are checked against Education
        self.assertNotIn("degree", kept)
        self.assertIn("diploma", kept)  # listed, so allowed
        self.assertIn("operations", kept)


if __name__ == "__main__":
    unittest.main()
