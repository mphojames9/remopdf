"""Run with:  python -m unittest tests.test_coaching   (from the backEnd folder; needs nothing installed)

routers/coaching.py: the "never a number the writer did not write" rule for rewrites, and the cleaning of the
"why" notes and "make it stronger" questions the model sends back.
"""
import unittest

from routers import coaching as c

TEXT = "Scheduled and supervised a team of 14 floor staff\nControlled stock counts and ordered replenishment\nHandled customer complaints and returns"


class NoInventedNumbers(unittest.TestCase):
    def test_a_new_figure_is_caught(self):
        self.assertTrue(c.adds_a_figure(TEXT, "Supervised 15 floor staff"))
        self.assertTrue(c.adds_a_figure(TEXT, "Handled customer complaints, cutting returns by 30%"))
        self.assertTrue(c.adds_a_figure("Handled customer complaints", "Handled 200 customer complaints"))

    def test_the_writers_own_figure_is_fine(self):
        self.assertFalse(c.adds_a_figure(TEXT, "Scheduled and supervised 14 floor staff"))
        self.assertFalse(c.adds_a_figure(TEXT, "Handled customer complaints and returns"))  # no figures at all

    def test_a_figure_written_as_a_word_may_come_back_as_digits(self):
        self.assertFalse(c.adds_a_figure("Five years as a store supervisor", "5 years as a store supervisor"))
        self.assertTrue(c.adds_a_figure("Five years as a store supervisor", "6 years as a store supervisor"))

    def test_commas_and_trailing_zeros_do_not_make_a_new_figure(self):
        self.assertFalse(c.adds_a_figure("Processed 2,000 invoices a month", "Processed 2000 invoices a month"))
        self.assertFalse(c.adds_a_figure("Budget of R3.50 per unit", "Budget of R3.5 per unit"))

    def test_number_words_in_the_rewrite_are_not_counted_as_new_figures(self):
        # The model is told to keep figures as written; a word is not a claim the check can compare, and "one of" is common.
        self.assertFalse(c.adds_a_figure("Supervised a team", "One of the supervisors on the team"))

    def test_a_rewrite_with_no_original_figures_may_not_add_any(self):
        self.assertTrue(c.adds_a_figure("Managed the stockroom", "Managed the stockroom for 3 shifts"))


class WhyNotes(unittest.TestCase):
    def test_one_short_sentence(self):
        self.assertEqual(c.clean_why("Leads with the result. It also names the tools."), "Leads with the result.")

    def test_empty_or_tiny_notes_are_dropped(self):
        for bad in (None, 5, "", "ok", ["a list"]):
            self.assertEqual(c.clean_why(bad), "")

    def test_a_long_note_is_cut(self):
        self.assertLessEqual(len(c.clean_why("x" * 400)), 160)


class NeedsQuestions(unittest.TestCase):
    def need(self, line, ask):
        return {"line": line, "ask": ask}

    def test_a_good_question_about_a_real_line_is_kept(self):
        got = c.clean_needs([self.need("Controlled stock counts and ordered replenishment", "How many product lines or how much stock value did you control?")], TEXT)
        self.assertEqual(len(got), 1)
        self.assertTrue(got[0]["ask"].endswith("?"))

    def test_a_slightly_mis_copied_line_still_matches(self):
        got = c.clean_needs([self.need("Handled customer complaints & returns", "Roughly how many complaints did you handle in a week?")], TEXT)
        self.assertEqual(len(got), 1)

    def test_a_line_that_is_not_in_the_text_is_dropped(self):
        self.assertEqual(c.clean_needs([self.need("Negotiated supplier contracts worth millions", "How much were the contracts worth?")], TEXT), [])

    def test_a_line_that_already_has_its_number_is_dropped(self):
        self.assertEqual(c.clean_needs([self.need("Scheduled and supervised a team of 14 floor staff", "How many shifts did you schedule?")], TEXT), [])

    def test_a_statement_is_not_a_question(self):
        self.assertEqual(c.clean_needs([self.need("Handled customer complaints and returns", "Add the number of complaints you handled.")], TEXT), [])

    def test_the_model_may_not_put_a_figure_of_its_own_in_a_question(self):
        self.assertEqual(c.clean_needs([self.need("Handled customer complaints and returns", "Did you handle more than 50 complaints a week?")], TEXT), [])

    def test_duplicates_and_junk_are_ignored_and_the_list_is_capped(self):
        raw = [
            self.need("Controlled stock counts and ordered replenishment", "How often did you count stock?"),
            self.need("Controlled stock counts and ordered replenishment", "How big was the stockroom?"),
            "a bare string",
            None,
            {"line": "Handled customer complaints and returns"},  # no question
            self.need("Handled customer complaints and returns", "How many complaints came in each week?"),
            self.need("Scheduled and supervised a team", "How did you decide on the shift rota?"),
            self.need("Handled customer complaints and returns", "Another question about complaints?"),
        ]
        got = c.clean_needs(raw, TEXT, limit=3)
        self.assertEqual([n["line"] for n in got], [
            "Controlled stock counts and ordered replenishment",
            "Handled customer complaints and returns",
            "Scheduled and supervised a team",
        ])

    def test_not_a_list_is_an_empty_answer(self):
        for bad in (None, "text", {"line": "x"}, 5):
            self.assertEqual(c.clean_needs(bad, TEXT), [])


if __name__ == "__main__":
    unittest.main()
