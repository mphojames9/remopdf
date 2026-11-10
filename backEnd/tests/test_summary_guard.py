"""Run with:  python -m unittest tests.test_summary_guard   (from the backEnd folder; needs nothing installed)"""
import datetime as dt
import re
import unittest

from routers import summary_guard as g

QUAL = re.compile(r"\b(degree|diploma|certificate|certified|licen[cs]e|mba|\d+\+?\s*(?:years?|yrs?))\b", re.I)
TODAY = dt.date(2026, 11, 9)

JOBS = [
    {"title": "Store Supervisor", "employer": "Harbour Hardware", "start_month": "03", "start_year": "2015",
     "end_month": "", "end_year": "2024", "current": False,
     "achievements": "Scheduled and supervised a team of 14 floor staff\nControlled stock counts and ordered replenishment\nHandled customer complaints and returns"},
    {"title": "Sales Assistant", "employer": "Keystone Paints", "start_month": "", "start_year": "2012",
     "end_month": "", "end_year": "2015", "current": False, "achievements": "Served customers and advised on paint and tools"},
]
FACTS = g.build_facts(JOBS, ["Stock control", "Staff scheduling", "Customer service"], ["Diploma in Business Management"], TODAY)
CLAIMS = [
    {"strength": "supervising staff", "evidence": "Scheduled and supervised a team of 14 floor staff"},
    {"strength": "stock control", "evidence": "Controlled stock counts and ordered replenishment"},
]
GOOD = ("Store supervisor with nine years at Harbour Hardware, scheduling and supervising a team of 14 floor staff. "
        "Controls stock counts and replenishment, and resolves customer complaints and returns on the shop floor.")
GOOD = GOOD.replace("nine years", "8 years 10 months")  # the length printed in the facts, not a figure the model made up


def check(text, claims=CLAIMS, **kw):
    kw.setdefault("qualification_re", QUAL)
    return g.check_summary(text, claims, FACTS, **kw)


class Facts(unittest.TestCase):
    def test_durations_are_computed_not_guessed(self):
        self.assertIn("Mar 2015 – 2024", FACTS)
        self.assertIn("8 years 10 months", FACTS)  # Mar 2015 -> Jan 2024 (a year-only end counts from January)
        self.assertIn("2012 – 2015, 3 years", FACTS)

    def test_current_job_runs_to_today(self):
        facts = g.build_facts([{"title": "Cook", "employer": "X", "start_month": "01", "start_year": "2020", "current": True}], [], [], TODAY)
        self.assertIn("Jan 2020 – Present, 6 years 10 months", facts)

    def test_bad_dates_give_no_length(self):
        self.assertIsNone(g.job_months("", "2020", "", "", False, TODAY))
        self.assertIsNone(g.job_months("", "2024", "", "2020", False, TODAY))


class Honest(unittest.TestCase):
    def test_a_true_summary_passes(self):
        self.assertIsNone(check(GOOD))


class Fabrication(unittest.TestCase):
    def reject(self, text, *needle, **kw):
        reason = check(text, **kw)
        self.assertIsNotNone(reason, text)
        for n in needle:
            self.assertIn(n.lower(), reason.lower())

    def test_invented_figure(self):
        self.reject(GOOD.replace("14 floor staff", "40 floor staff"), "40")

    def test_invented_quantity_in_words(self):
        self.reject(GOOD.replace("a team of 14", "a team of twenty"), "twenty")

    def test_invented_rank(self):
        self.reject(GOOD.replace("Store supervisor", "Senior store supervisor"), "senior")

    def test_claims_leadership_the_history_never_mentions(self):
        facts = g.build_facts([{"title": "Cashier", "employer": "Mart", "start_year": "2019", "end_year": "2022", "achievements": "Operated the till and packed shelves"}], ["Cash handling"], [], TODAY)
        text = "Cashier with three years at Mart who leads teams on the shop floor, handling payments accurately and keeping shelves packed and presentable."
        reason = g.check_summary(text, [{"evidence": "Operated the till and packed shelves"}, {"evidence": "Cash handling"}], facts, qualification_re=QUAL)
        self.assertIsNotNone(reason)

    def test_invented_tool_or_employer(self):
        self.reject(GOOD.replace("stock counts", "stock counts in SAP"), "SAP")
        self.reject(GOOD.replace("Harbour Hardware", "Builders Warehouse"), "Builders")

    def test_invented_qualification(self):
        self.reject(GOOD + " Holds a degree in retail management.", "degree")

    def test_claims_the_job_being_applied_for(self):
        self.reject(GOOD.replace("Store supervisor", "Department manager"), "department manager", forbidden_names=["Department Manager"])

    def test_job_word_the_resume_does_not_support(self):
        self.reject(GOOD + " Skilled in merchandising and visual displays.", "merchandising", job_terms=["merchandising"])

    def test_job_word_is_fine_when_the_resume_says_it(self):
        self.assertIsNone(check(GOOD.replace("floor staff", "floor staff on customer service"), job_terms=["customer service"]))

    def test_leaks(self):
        self.reject(GOOD + " Matches the occupation (O*NET) well.")
        self.reject(GOOD + " Strong on O*NET skills.", "o*net")
        self.reject(GOOD + " Keywords from the advert are covered.", "keyword")

    def test_hype(self):
        self.reject(GOOD.replace("Store supervisor", "Results-driven store supervisor"), "results-driven")

    def test_first_person(self):
        self.reject("I supervise a team of 14 floor staff at Harbour Hardware and I control stock counts and replenishment every single week.", "first person")

    def test_made_up_vocabulary(self):
        reason = check("Store supervisor at Harbour Hardware orchestrating cross-functional merchandising synergies, optimising logistics throughput and spearheading procurement initiatives for 14 floor staff.")
        self.assertIsNotNone(reason)

    def test_evidence_must_be_real(self):
        reason = check(GOOD, claims=[{"evidence": "Reduced shrinkage by overhauling the warehouse"}, {"evidence": "Controlled stock counts and ordered replenishment"}])
        self.assertIsNotNone(reason)
        self.assertIn("not in the resume", reason)

    def test_needs_claims(self):
        self.assertIsNotNone(check(GOOD, claims=[]))


class Helpers(unittest.TestCase):
    def test_job_words_used(self):
        self.assertEqual(g.job_words_used(GOOD, ["stock counts", "merchandising", "customer complaints"]), ["stock counts", "customer complaints"])


if __name__ == "__main__":
    unittest.main()
