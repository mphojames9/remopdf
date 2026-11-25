"""Run with:  python -m unittest tests.test_grounding   (from the backEnd folder; needs nothing installed)

routers/grounding.py: the check that what the AI wrote is backed by what the person wrote. Each test is a real way a
resume or a letter goes wrong without containing a single invented number.
"""
import unittest

from routers import grounding as g

BULLETS = "Scheduled and supervised a team of 14 floor staff\nControlled stock counts and ordered replenishment\nHandled customer complaints and returns"
QC = "Inspected finished steel panels against the drawing\nRecorded defects in PASTEL\nAssisted with the weekly stock count"


class Faithful(unittest.TestCase):
    def test_an_honest_rewrite_passes(self):
        text = "Supervised and scheduled a team of 14 floor staff\nControlled stock counts and replenishment orders\nResolved customer complaints and processed returns"
        self.assertEqual(g.problems(BULLETS, text, context="Store Supervisor"), [])

    def test_markup_and_bullets_do_not_matter(self):
        text = "- **Supervised** a team of 14 floor staff\n- *Controlled* stock counts\n- Handled complaints and returns"
        self.assertEqual(g.problems(BULLETS, text, context="Store Supervisor"), [])

    def test_ordinary_work_verbs_are_not_results(self):
        # \"cut\", \"drove\" and \"double-checked\" are what the work is, not what it achieved.
        src = "Cut steel sheets to size\nDrove the forklift in the yard\nDouble-checked orders before dispatch"
        self.assertEqual(g.problems(src, "Cut steel sheets to size\nDrove the forklift in the yard\nDouble-checked orders before dispatch"), [])

    def test_the_writers_own_result_may_be_kept(self):
        src = "Improved packing speed by moving the labels\nReduced scrap on the line"
        self.assertEqual(g.problems(src, "Improved packing speed by relocating labels\nReduced scrap on the production line"), [])


class InventedResults(unittest.TestCase):
    def test_an_outcome_the_writer_never_stated_is_caught(self):
        found = g.problems(QC, "Inspected finished panels, improving product quality across the plant\nRecorded defects in PASTEL\nAssisted with the weekly stock count")
        self.assertTrue(any("improving" in p for p in found))

    def test_result_phrases_and_praise_are_caught(self):
        found = g.problems(QC, "Inspected panels, resulting in fewer defects\nRecorded defects in PASTEL\nAssisted with stock counts")
        self.assertTrue(any("resulting in" in p for p in found))
        found = g.problems(QC, "Consistently inspected panels\nRecorded defects in PASTEL\nAssisted with stock counts")
        self.assertTrue(any("consistently" in p for p in found))


class InflatedResponsibility(unittest.TestCase):
    def test_assisted_does_not_become_led(self):
        found = g.problems(QC, "Led a team of inspectors\nRecorded defects in PASTEL\nAssisted with stock counts")
        self.assertTrue(any("led" in p and "people" in p for p in found))

    def test_leading_things_is_not_leading_people(self):
        self.assertEqual(g.problems(QC, "Managed defect records in PASTEL\nInspected finished panels against the drawing\nAssisted with the weekly stock count"), [])

    def test_a_writer_who_did_supervise_may_say_led(self):
        self.assertEqual(g.problems(BULLETS, "Led scheduling for a 14-person floor team\nControlled stock counts\nHandled complaints and returns", context="Store Supervisor"), [])

    def test_a_seniority_word_the_text_never_gives_is_caught(self):
        found = g.problems(QC, "Senior inspector of finished panels\nRecorded defects in PASTEL\nAssisted with stock counts")
        self.assertTrue(any("senior" in p for p in found))

    def test_the_job_title_counts_as_backing(self):
        self.assertEqual(g.problems(QC, "Inspected finished panels as a senior inspector\nRecorded defects in PASTEL\nAssisted with stock counts", context="Senior Quality Inspector"), [])


class InventedNames(unittest.TestCase):
    def test_a_tool_the_writer_never_named_is_caught(self):
        found = g.problems(QC, "Inspected panels and logged defects in PASTEL and SAP\nAssisted with stock counts")
        self.assertTrue(any('"SAP"' in p for p in found))

    def test_a_standard_from_the_advert_is_not_a_claim_the_writer_made(self):
        found = g.problems(QC, "Inspected panels to ISO standards\nRecorded defects in PASTEL\nAssisted with stock counts")
        self.assertTrue(any('"ISO"' in p for p in found))

    def test_capitalised_words_at_the_start_of_a_sentence_are_not_names(self):
        self.assertEqual(g.problems(QC, "Inspected finished panels against the drawing\nRecorded defects in PASTEL\nAssisted with the weekly stock count"), [])

    def test_a_name_the_writer_used_in_any_case_is_fine(self):
        self.assertEqual(g.problems("Used excel for the weekly report", "Built the weekly report in Excel"), [])


class WhatMustBeKept(unittest.TestCase):
    def test_a_dropped_tool_or_figure_is_caught(self):
        found = g.problems(QC + "\nChecked 14 panels a day", "Inspected finished panels\nAssisted with stock counts")
        joined = " ".join(found)
        self.assertIn("PASTEL", joined)
        self.assertIn("14", joined)

    def test_a_dropped_qualifier_is_caught(self):
        found = g.problems("Acting supervisor on the finishing line", "Supervisor on the finishing line")
        self.assertTrue(any("acting" in p for p in found))
        found = g.problems("Assisted with welding", "Performed welding")
        self.assertTrue(any("assisted" in p for p in found))

    def test_assisted_may_become_supported(self):
        self.assertEqual(g.problems("Assisted with welding", "Supported the welding team"), [])

    def test_a_letter_does_not_have_to_keep_everything(self):
        self.assertEqual(g.letter_problems(QC, "I inspect finished panels against the drawing and record defects in PASTEL."), [])


class InventedFigures(unittest.TestCase):
    def test_a_new_figure_is_named_in_the_instruction(self):
        found = g.problems(BULLETS, "Supervised 15 floor staff\nControlled stock counts\nHandled complaints")
        self.assertTrue(any('"15"' in p for p in found))


class Settling(unittest.TestCase):
    GOOD = {"label": "Honest", "text": "Supervised and scheduled a team of 14 floor staff\nControlled stock counts\nHandled complaints and returns"}
    GOOD2 = {"label": "Short", "text": "Scheduled and supervised 14 floor staff\nControlled stock counts\nHandled returns"}
    BAD = {"label": "Bold", "text": "Led a team of 14 floor staff, boosting sales\nControlled stock counts\nHandled complaints"}

    def test_enough_good_versions_means_no_second_call(self):
        calls = []
        out = g.settle_rewrites(BULLETS, [self.GOOD, self.GOOD2, self.BAD], lambda note: calls.append(note) or [], context="Store Supervisor")
        self.assertEqual(calls, [])
        self.assertEqual([o["id"] for o in out], ["rw1", "rw2"])

    def test_too_few_good_versions_asks_again_with_the_exact_problems(self):
        calls = []

        def again(note):
            calls.append(note)
            return [self.GOOD2]

        out = g.settle_rewrites(BULLETS, [self.GOOD, self.BAD], again, context="Store Supervisor")
        self.assertEqual(len(calls), 1)
        self.assertIn('Version "Bold"', calls[0])
        self.assertIn("boosting", calls[0])
        self.assertEqual([o["text"] for o in out], [self.GOOD["text"], self.GOOD2["text"]])

    def test_the_second_try_cannot_bring_the_same_version_in_twice(self):
        out = g.settle_rewrites(BULLETS, [self.GOOD, self.BAD], lambda note: [self.GOOD, self.BAD], context="Store Supervisor")
        self.assertEqual(len(out), 1)

    def test_a_failed_second_try_keeps_what_passed(self):
        def boom(note):
            raise RuntimeError("quota")

        out = g.settle_rewrites(BULLETS, [self.GOOD, self.BAD], boom, context="Store Supervisor", log=lambda m: None)
        self.assertEqual([o["text"] for o in out], [self.GOOD["text"]])

    def test_nothing_is_asked_again_when_nothing_was_rejected(self):
        calls = []
        out = g.settle_rewrites(BULLETS, [self.GOOD], lambda note: calls.append(note) or [], context="Store Supervisor")
        self.assertEqual(calls, [])
        self.assertEqual(len(out), 1)

    def test_a_version_that_adds_a_figure_gets_the_chance_to_be_corrected(self):
        invented = {"label": "Numbers", "text": "Supervised 15 floor staff\nControlled stock counts\nHandled complaints"}
        calls = []
        g.settle_rewrites(BULLETS, [invented], lambda note: calls.append(note) or [self.GOOD, self.GOOD2], context="Store Supervisor")
        self.assertEqual(len(calls), 1)
        self.assertIn('"15"', calls[0])


class Letters(unittest.TestCase):
    SOURCE = (
        "Quality Controller Harbour Panels Inspected finished steel panels against the drawing. Recorded defects in PASTEL. "
        "Assistant Manager Harbour Panels Scheduled and supervised a team of 14 finishers. "
        "Diploma in Management Westfield College English Zulu 2014 2023"
    )
    ALLOWED = "Department Lead Marine Works Pty Ltd 9 years"

    def test_a_grounded_letter_passes_even_with_the_company_and_hiring_manager(self):
        body = (
            "I am applying for the Department Lead position at Marine Works Pty Ltd. At Harbour Panels I supervised a team of 14 finishers "
            "and recorded defects in PASTEL. I would welcome the chance to meet the Hiring Manager."
        )
        self.assertEqual(g.letter_problems(self.SOURCE, body, allowed=self.ALLOWED), [])

    def test_the_years_given_by_the_app_are_allowed_but_no_others(self):
        self.assertEqual(g.letter_problems(self.SOURCE, "I bring 9 years of experience in finishing.", allowed=self.ALLOWED), [])
        self.assertTrue(g.letter_problems(self.SOURCE, "I bring 12 years of experience in finishing.", allowed=self.ALLOWED))

    def test_an_invented_result_or_tool_is_found(self):
        self.assertTrue(g.letter_problems(self.SOURCE, "I cut defects by streamlining the line.", allowed=self.ALLOWED))
        self.assertTrue(g.letter_problems(self.SOURCE, "I recorded defects in SAP.", allowed=self.ALLOWED))

    def test_only_the_bad_sentences_are_dropped(self):
        body = (
            "I recorded defects in PASTEL at Harbour Panels.\n\n"
            "I also improved plant-wide quality and used SAP daily. I inspected finished panels against the drawing."
        )
        out = g.drop_ungrounded_sentences(self.SOURCE, body, allowed=self.ALLOWED)
        self.assertIn("PASTEL", out)
        self.assertIn("inspected finished panels", out)
        self.assertNotIn("SAP", out)
        self.assertNotIn("improved", out)
        self.assertEqual(out.count("\n\n"), 1)


if __name__ == "__main__":
    unittest.main()
