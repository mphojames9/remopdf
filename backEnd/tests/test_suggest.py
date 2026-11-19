"""Run with:  python -m unittest tests.test_suggest   (from the backEnd folder; needs fastapi + pydantic, no network)

The AI ideas for the Education and Work history steps (routers/suggest.py). The model call is replaced by a fake, so these
check what the server does with whatever the model says: the figures rule (a number may only appear if the person wrote
it; every other figure becomes a [placeholder]), that several DIFFERENT achievement ideas come back (and one retry when
too few are usable), the cache, and that the free plan is refused.
"""
from unittest import mock

from fastapi import HTTPException

from routers import ai_models
from routers import job_match as jm
from routers import suggest as sg
from tests.test_plans_route import PlanTestCase, make_pass, request_with

ACCESS = ai_models.Access(tier="premium", subject="acct-1")


def kw(term, must=False, source="ad"):
    return jm.KeywordIn(term=term, must=must, kind="skill", source=source)


def target(*terms, title="Technical Manager"):
    return jm.TargetIn(title=title, company="", requirements=[f"Experience with {t}" for t in terms], duties=[], keywords=[kw(t, i == 0) for i, t in enumerate(terms)])


class Figures(PlanTestCase):
    def test_a_figure_the_person_never_wrote_becomes_a_placeholder(self):
        allowed = {"3", "20"}
        self.assertEqual(sg.mask_unknown_figures("Cut defects by 15% across 3 lines", allowed), "Cut defects by [X]% across 3 lines")
        self.assertEqual(sg.mask_unknown_figures("Cut waste by 20% and saved R1,200", allowed), "Cut waste by 20% and saved R[X]")
        self.assertEqual(sg.mask_unknown_figures("Led [X] staff over 5 shifts", set()), "Led [X] staff over [X] shifts")  # [placeholders] stay

    def test_figures_are_found_and_compared_the_same_way_the_rewriter_does(self):
        self.assertEqual(sg.unknown_figures("Reduced rework by 2,000 units", {"2000"}), set())
        self.assertEqual(sg.unknown_figures("Reduced rework by [X]%", set()), set())  # a placeholder is not a figure
        self.assertEqual(sg.unknown_figures("Inspected 40 parts", {"4"}), {"40"})
        self.assertTrue(sg.has_placeholder("Led [X] staff"))
        self.assertTrue(sg.has_figure("Led 4 staff"))
        self.assertFalse(sg.has_figure("Led [X] staff"))

    def test_names_and_labels_are_not_figures(self):
        for text in ("Introduced 5S housekeeping on the line", "Worked with B2B accounts", "Kept the line running 24/7", "Audited to ISO 9001 and SANS 10400", "Built 3D models", "Completed NQF 4 training"):
            self.assertFalse(sg.has_figure(text), text)
            self.assertEqual(sg.mask_unknown_figures(text, set()), text, text)

    def test_amounts_with_a_unit_letter_are_still_figures(self):
        self.assertEqual(sg.mask_unknown_figures("Saved R10k and 5m of cable", set()), "Saved R[X]k and [X]m of cable")


class AchievementChecks(PlanTestCase):
    def check(self, text, allowed=frozenset(), existing=(), avoid=(), chosen=()):
        return sg.check_achievement(text, allowed=set(allowed), existing_lines=list(existing), avoid=list(avoid), chosen=list(chosen))

    LINE = "Inspected composite components against strict specifications before release, preventing defects from reaching customers"

    def test_a_good_line_passes_and_an_invented_figure_becomes_a_placeholder(self):
        self.assertEqual(self.check(self.LINE), (self.LINE, ""))
        text, problem = self.check("Inspected composite components against strict specifications, cutting rework by 18% across 9 production lines")
        self.assertEqual(problem, "")
        self.assertEqual(text, "Inspected composite components against strict specifications, cutting rework by [X]% across [X] production lines")

    def test_a_line_without_any_number_is_fine(self):
        self.assertEqual(self.check(self.LINE)[1], "")

    def test_a_figure_the_person_gave_is_kept(self):
        text, _ = self.check("Inspected composite components against strict specifications, cutting rework by 15% on every production line", allowed={"15"})
        self.assertIn("15%", text)

    def test_first_person_and_talk_about_the_tool_are_refused(self):
        self.assertEqual(self.check("I inspected composite components against strict specifications before release to customers")[1], "first person or talks about the tool")
        self.assertEqual(self.check("Inspected components in line with the O*NET occupation standards for quality control technicians")[1], "first person or talks about the tool")

    def test_too_short_is_refused(self):
        self.assertEqual(self.check("Inspected components daily")[1], "too short")

    def test_repeats_are_refused(self):
        self.assertEqual(self.check(self.LINE, existing=[self.LINE])[1], "repeats an earlier line")
        self.assertEqual(self.check(self.LINE, avoid=[self.LINE])[1], "repeats an earlier line")
        self.assertEqual(self.check(self.LINE, chosen=[self.LINE])[1], "says the same as another idea")


class EducationChecks(PlanTestCase):
    def test_lines_with_invented_figures_or_first_person_or_repeats_are_dropped(self):
        raw = [
            {"text": "Relevant coursework: Statistics, Quality Management, Materials Science"},
            {"text": "Graduated with a 3.8 GPA in Materials Science"},
            {"text": "I studied quality management in depth over three years"},
            {"text": "Focus areas: Process improvement and inspection methods"},
            {"text": "- Skills developed: Measurement, reporting and root cause analysis"},
            {"text": "Relevant coursework: Statistics, Quality Management, Materials Science"},
        ]
        out = sg.clean_education_ideas(raw, existing="", context="National Diploma Quality Management", avoid=[])
        self.assertEqual([o["text"] for o in out], [
            "Relevant coursework: Statistics, Quality Management, Materials Science",
            "Focus areas: Process improvement and inspection methods",
            "Skills developed: Measurement, reporting and root cause analysis",
        ])

    def test_a_line_already_in_the_details_box_is_not_offered_again(self):
        out = sg.clean_education_ideas([{"text": "Relevant coursework: Statistics and Quality Management"}], existing="<li>Relevant coursework: Statistics and Quality Management</li>", context="", avoid=[])
        self.assertEqual(out, [])


IDEAS = [
    "Inspected composite components against strict specifications before release, preventing defects from reaching customers",
    "Reduced rework on finished hulls by tightening surface checks and recording every defect, saving [X] hours of repairs each month",
    "Trained new finishing staff on inspection standards and safe handling, so every team member could sign off work to the same quality",
    "Compiled weekly quality reports for production managers, highlighting recurring cracks and bubbles and the fixes agreed with the moulding team",
    "Improved shift handovers by logging open defects and corrective actions, cutting repeat faults across [X] production lines",
    "Checked raw material samples against supplier certificates before use, stopping non-conforming resin from entering production",
]


class Endpoints(PlanTestCase):
    def setUp(self):
        super().setUp()
        self.asked = []
        self.answers = []
        for patcher in (
            mock.patch.object(sg, "_gate", side_effect=lambda *a, **k: ACCESS),
            mock.patch.object(sg, "_ask_groq", side_effect=self.fake_groq),
        ):
            patcher.start()
            self.addCleanup(patcher.stop)
        jm._cache.clear()

    def fake_groq(self, messages, **kwargs):
        self.asked.append((kwargs.get("task"), messages[-1]["content"]))
        return self.answers.pop(0)

    def achievements(self, **kw):
        body = sg.AchievementIdeasRequest(title=kw.pop("title", "Quality Controller"), **kw)
        return sg.achievement_ideas(body, request_with(make_pass("premium")))

    @staticmethod
    def said(*texts):
        return {"ideas": [{"text": t} for t in texts]}

    def test_five_or_more_different_ideas_come_back_with_the_keywords_they_use(self):
        self.answers = [self.said(*IDEAS)]
        out = self.achievements(target=target("Specifications", "Rework", "HVAC"))
        self.assertEqual(len(out["ideas"]), 6)
        self.assertEqual(len({i["text"] for i in out["ideas"]}), 6)
        self.assertEqual(out["ideas"][0]["uses"], ["Specifications"])  # computed here, not taken from the model
        self.assertEqual(out["ideas"][1]["uses"], ["Rework"])
        self.assertEqual(len(self.asked), 1)
        self.assertEqual(self.asked[0][0], "ideas")
        self.assertIn("Write 6 different achievement lines", self.asked[0][1])

    def test_numbers_are_there_where_they_fit_and_never_made_up(self):
        invented = "Cut rework on finished hulls by 37% across 9 production lines through tighter surface checks and clearer defect records"
        self.answers = [self.said(invented, *IDEAS[:5])]
        out = self.achievements()
        texts = [i["text"] for i in out["ideas"]]
        self.assertEqual(texts[0], "Cut rework on finished hulls by [X]% across [X] production lines through tighter surface checks and clearer defect records")
        self.assertTrue(any("[X]" in t for t in texts))
        self.assertTrue(any("[X]" not in t for t in texts))  # a line with no number is fine

    def test_too_few_usable_ideas_are_asked_for_once_more(self):
        self.answers = [self.said(*IDEAS[:3], "I did lots of quality checks on every single hull we finished"), self.said(*IDEAS[3:])]
        out = self.achievements()
        self.assertEqual(len(self.asked), 2)
        self.assertIn("Write 3 different achievement lines", self.asked[1][1])
        self.assertIn(IDEAS[0], self.asked[1][1])  # told what is already usable, so it is not repeated
        self.assertEqual(len(out["ideas"]), 6)

    def test_repeats_inside_one_answer_are_dropped(self):
        self.answers = [self.said(IDEAS[0], IDEAS[0], *IDEAS[1:5])]
        out = self.achievements()
        self.assertEqual([i["text"] for i in out["ideas"]], IDEAS[:5])  # five different ones are enough: no second try
        self.assertEqual(len(self.asked), 1)

    def test_never_more_than_one_retry(self):
        self.answers = [self.said(IDEAS[0]), self.said(IDEAS[1])]
        out = self.achievements()
        self.assertEqual(len(out["ideas"]), 2)
        self.assertEqual(len(self.asked), 2)

    def test_what_the_person_asked_for_goes_to_the_model_and_their_figures_are_kept(self):
        line = "Cut rework on finished hulls by 15% through tighter surface checks and clearer defect records across every shift"
        self.answers = [self.said(line, *IDEAS[:5])]
        out = self.achievements(prompt="add numbers, we cut rework by 15%")
        self.assertIn("rework by 15%", self.asked[0][1])
        self.assertIn("15%", out["ideas"][0]["text"])

    def test_load_more_sends_what_was_shown_and_brings_different_ideas(self):
        self.answers = [self.said(*IDEAS)]
        first = self.achievements()
        more_lines = [
            "Led daily start-of-shift quality briefings so the whole finishing team knew the focus areas and recent defect trends",
            "Maintained calibrated measuring equipment and inspection records, keeping every audit file complete and traceable",
            "Escalated recurring surface faults to engineering with photographed evidence, speeding up root cause fixes on the moulds",
            "Checked finished vessels against customer drawings and handover checklists, so each delivery met the agreed specification",
            "Introduced a simple defect-tracking sheet used by all shifts, which made recurring problems visible to supervisors",
        ]
        self.answers = [self.said(IDEAS[0], *more_lines)]  # the model repeats one: it is dropped because it was shown
        second = self.achievements(avoid=[i["text"] for i in first["ideas"]])
        self.assertEqual(len(self.asked), 2)
        self.assertIn(IDEAS[0], self.asked[1][1])
        self.assertEqual(len(second["ideas"]), 5)
        self.assertNotIn(IDEAS[0], [i["text"] for i in second["ideas"]])

    def test_the_same_request_is_answered_from_the_store_for_free(self):
        self.answers = [self.said(*IDEAS)]
        first = self.achievements()
        second = self.achievements()
        self.assertEqual(first, second)
        self.assertEqual(len(self.asked), 1)

    def test_nothing_usable_is_not_kept(self):
        self.answers = [self.said("short"), self.said("tiny")]
        self.assertEqual(self.achievements()["ideas"], [])
        self.answers = [self.said(*IDEAS)]
        self.assertEqual(len(self.achievements()["ideas"]), 6)  # asked again, not served an empty store

    def test_a_title_is_needed(self):
        with self.assertRaises(HTTPException) as caught:
            self.achievements(title="  ")
        self.assertEqual(caught.exception.status_code, 400)
        self.assertEqual(caught.exception.detail["code"], "needtitle")

    def test_education_ideas_need_a_degree_or_a_field(self):
        with self.assertRaises(HTTPException) as caught:
            sg.education_ideas(sg.EducationIdeasRequest(), request_with(make_pass("premium")))
        self.assertEqual(caught.exception.detail["code"], "needdegree")

    def test_education_ideas_come_back_checked(self):
        self.answers = [{"ideas": [{"text": "Relevant coursework: Statistics, Quality Management"}, {"text": "Graduated cum laude with a 82% average"}]}]
        out = sg.education_ideas(sg.EducationIdeasRequest(degree="National Diploma", field="Quality Management"), request_with(make_pass("premium")))
        self.assertEqual([i["text"] for i in out["ideas"]], ["Relevant coursework: Statistics, Quality Management"])


class FreePlan(PlanTestCase):
    def test_the_free_plan_is_refused_before_anything_else_happens(self):
        for bucket in ("sg-edu", "sg-ach"):
            with self.assertRaises(HTTPException, msg=bucket) as caught:
                sg._gate(request_with(make_pass("free")), bucket, 100, "ideas")
            self.assertEqual(caught.exception.status_code, 403, bucket)

    def test_a_paying_person_passes(self):
        self.assertEqual(sg._gate(request_with(make_pass("premium")), "sg-ach", 100, "ideas").tier, "premium")
