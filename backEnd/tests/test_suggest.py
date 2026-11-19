"""Run with:  python -m unittest tests.test_suggest   (from the backEnd folder; needs fastapi + pydantic, no network)

The AI ideas for the Skills, Education and Work history steps (routers/suggest.py). The model call is replaced by a
fake, so these check what the server does with whatever the model says: the figures rule (a number may only appear if
the person wrote it; every other figure in the "with numbers" version is a [placeholder]), the evidence rule for skills,
the two-version answer for achievements (and the one retry), the cache, and that the free plan is refused.
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


class AchievementChecks(PlanTestCase):
    def check(self, text, numbers, allowed=frozenset(), existing=(), avoid=()):
        return sg.check_achievement(text, numbers=numbers, allowed=set(allowed), existing_lines=list(existing), avoid=list(avoid))

    def test_the_numbers_version_keeps_placeholders_and_masks_invented_digits(self):
        text, problem = self.check("Inspected composite components against specifications, cutting rework by 18% across [X] production lines", True)
        self.assertEqual(problem, "")
        self.assertIn("[X]%", text)
        self.assertNotIn("18", text)

    def test_the_numbers_version_may_use_a_figure_the_person_gave(self):
        text, problem = self.check("Inspected composite components against specifications, cutting rework by 15% on every production line", True, allowed={"15"})
        self.assertEqual((text.count("15%"), problem), (1, ""))

    def test_a_numbers_version_with_no_number_at_all_is_refused(self):
        self.assertEqual(self.check("Inspected composite components against strict specifications before release to the customer", True)[1], "has no [placeholder] for a number")

    def test_the_plain_version_has_no_figures_and_no_placeholders(self):
        ok = "Inspected composite components against strict specifications before release, preventing defects reaching customers"
        self.assertEqual(self.check(ok, False)[1], "")
        self.assertEqual(self.check(ok + " in 3 plants", False)[1], "has figures")
        self.assertEqual(self.check(ok + " in [X] plants", False)[1], "has figures")
        self.assertEqual(self.check(ok + " in 3 plants", False, allowed={"3"})[1], "")  # the person wrote 3 themselves

    def test_first_person_and_talk_about_the_tool_are_refused(self):
        self.assertEqual(self.check("I inspected composite components against strict specifications before release to customers", False)[1], "first person or talks about the tool")
        self.assertEqual(self.check("Inspected components in line with the O*NET occupation standards for quality control technicians", False)[1], "first person or talks about the tool")

    def test_a_line_the_person_already_has_is_refused(self):
        line = "Inspected composite components against strict specifications before release to customers"
        self.assertEqual(self.check(line, False, existing=[line])[1], "repeats an earlier line")
        self.assertEqual(self.check(line, False, avoid=[line])[1], "repeats an earlier line")


class SkillChecks(PlanTestCase):
    CANDIDATE = "Quality Controller at Robertson and Caine: conducted detailed inspections of marine structures, identifying micro-bubbles, cracks and surface defects. Education: National Senior Certificate Mathematics"

    def run_clean(self, raw, have=(), tgt=None):
        return sg.clean_skills(raw, candidate=self.CANDIDATE, have=list(have), target=tgt, avoid=[])

    def test_a_skill_that_quotes_the_persons_own_words_keeps_its_basis(self):
        out = self.run_clean([{"skill": "Defect Identification", "basis": "work", "evidence": "identifying micro-bubbles, cracks and surface defects", "why": "You do it daily."}])
        self.assertEqual((out[0]["basis"], out[0]["confirm"]), ("work", False))

    def test_invented_evidence_is_downgraded_to_a_suggestion_to_confirm(self):
        out = self.run_clean([{"skill": "Six Sigma", "basis": "work", "evidence": "led six sigma black belt projects across the plant", "why": ""}])
        self.assertEqual((out[0]["basis"], out[0]["confirm"], out[0]["evidence"]), ("role", True, ""))

    def test_a_job_skill_has_to_answer_a_real_item_of_the_job(self):
        tgt = target("Refrigeration", "HVAC")
        good = self.run_clean([{"skill": "Refrigeration Maintenance", "basis": "job", "job_item": "Refrigeration", "why": ""}], tgt=tgt)
        self.assertEqual((good[0]["basis"], good[0]["confirm"]), ("job", True))
        fake = self.run_clean([{"skill": "Welding", "basis": "job", "job_item": "Underwater welding", "why": ""}], tgt=tgt)
        self.assertEqual(fake[0]["basis"], "role")

    def test_qualifications_titles_duplicates_and_skills_already_listed_are_dropped(self):
        out = self.run_clean(
            [
                {"skill": "Bachelor of Science", "basis": "role"},
                {"skill": "Quality Control", "basis": "role"},
                {"skill": "Quality Control", "basis": "role"},
                {"skill": "Excel", "basis": "role"},
                {"skill": "Root Cause Analysis", "basis": "role"},
                "Technical Manager",
            ],
            have=["Excel"],
            tgt=target("HVAC"),
        )
        self.assertEqual([o["skill"] for o in out], ["Quality Control", "Root Cause Analysis"])

    def test_at_most_fourteen(self):
        many = [{"skill": f"Skill Number{chr(65 + i)} Thing", "basis": "role"} for i in range(20)]
        self.assertEqual(len(self.run_clean(many)), sg.MAX_SKILLS)


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


class Endpoints(PlanTestCase):
    def setUp(self):
        super().setUp()
        self.asked = []
        self.answers = []
        self.requests = []
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

    GOOD_NUM = {"text": "Inspected composite components against strict specifications, cutting rework by [X]% across [X] production lines"}
    GOOD_PLAIN = {"text": "Inspected composite components against strict specifications before release, preventing defects from reaching customers"}

    def test_two_versions_come_back_with_the_keywords_they_use(self):
        self.answers = [{"with_numbers": self.GOOD_NUM, "without_numbers": self.GOOD_PLAIN}]
        out = self.achievements(target=target("Specifications", "Rework", "HVAC"))
        self.assertIn("[X]%", out["with_numbers"]["text"])
        self.assertNotRegex(out["without_numbers"]["text"], r"\d|\[")
        self.assertEqual(out["with_numbers"]["uses"], ["Specifications", "Rework"])  # computed here, not taken from the model
        self.assertEqual(len(self.asked), 1)
        self.assertEqual(self.asked[0][0], "ideas")

    def test_a_version_that_breaks_a_rule_is_asked_for_again_once(self):
        bad_plain = {"text": "Inspected composite components against strict specifications in 12 plants before release to customers"}
        self.answers = [{"with_numbers": self.GOOD_NUM, "without_numbers": bad_plain}, {"with_numbers": self.GOOD_NUM, "without_numbers": self.GOOD_PLAIN}]
        out = self.achievements()
        self.assertEqual(len(self.asked), 2)
        self.assertIn("without_numbers has figures", self.asked[1][1])
        self.assertTrue(out["with_numbers"] and out["without_numbers"])

    def test_a_still_broken_version_is_left_out_not_returned(self):
        bad = {"text": "Inspected composite components against strict specifications in 12 plants before release to customers"}
        self.answers = [{"with_numbers": self.GOOD_NUM, "without_numbers": bad}, {"with_numbers": self.GOOD_NUM, "without_numbers": bad}]
        out = self.achievements()
        self.assertTrue(out["with_numbers"])
        self.assertIsNone(out["without_numbers"])
        self.assertEqual(len(self.asked), 2)  # one retry, never more

    def test_figures_the_person_types_in_the_ask_box_are_used_exactly(self):
        with_number = {"text": "Inspected composite components against strict specifications, cutting rework by 15% across [X] production lines"}
        self.answers = [{"with_numbers": with_number, "without_numbers": self.GOOD_PLAIN}]
        out = self.achievements(prompt="add numbers, we cut rework by 15%")
        self.assertIn("15%", out["with_numbers"]["text"])
        self.assertIn("rework by 15%", self.asked[0][1])

    def test_an_invented_figure_in_the_numbers_version_is_turned_into_a_placeholder(self):
        invented = {"text": "Inspected composite components against strict specifications, cutting rework by 37% across 9 production lines"}
        self.answers = [{"with_numbers": invented, "without_numbers": self.GOOD_PLAIN}]
        out = self.achievements()
        self.assertEqual(out["with_numbers"]["text"], "Inspected composite components against strict specifications, cutting rework by [X]% across [X] production lines")

    def test_the_same_request_is_answered_from_the_store_for_free(self):
        self.answers = [{"with_numbers": self.GOOD_NUM, "without_numbers": self.GOOD_PLAIN}]
        first = self.achievements()
        second = self.achievements()
        self.assertEqual(first, second)
        self.assertEqual(len(self.asked), 1)
        # "Show new ideas" sends what was shown before: that is a new request, so the model is asked again.
        self.answers = [{"with_numbers": self.GOOD_NUM, "without_numbers": self.GOOD_PLAIN}]
        self.achievements(avoid=["Something else entirely, shown on the first round of ideas"])
        self.assertEqual(len(self.asked), 2)

    def test_a_title_is_needed(self):
        with self.assertRaises(HTTPException) as caught:
            self.achievements(title="  ")
        self.assertEqual(caught.exception.status_code, 400)
        self.assertEqual(caught.exception.detail["code"], "needtitle")

    def test_skills_without_anything_to_base_them_on_ask_the_model_nothing(self):
        out = sg.skill_ideas(sg.SkillIdeasRequest(resume=jm.ResumeIn()), request_with(make_pass("premium")))
        self.assertEqual((out["skills"], out["needs"]), ([], "history"))
        self.assertEqual(self.asked, [])

    def test_skills_come_back_checked(self):
        resume = jm.ResumeIn(jobs=[jm.JobIn(title="Quality Controller", employer="Robertson", achievements="Conducted detailed inspections identifying micro-bubbles, cracks and surface defects")], education=["National Diploma Quality Management"])
        self.answers = [{"skills": [
            {"skill": "Defect Identification", "basis": "work", "evidence": "inspections identifying micro-bubbles, cracks and surface defects", "why": "You inspect for defects."},
            {"skill": "Underwater Welding", "basis": "work", "evidence": "welded hulls underwater in deep sea rigs", "why": ""},
        ]}]
        out = sg.skill_ideas(sg.SkillIdeasRequest(resume=resume), request_with(make_pass("premium")))
        by = {s["skill"]: s for s in out["skills"]}
        self.assertEqual(by["Defect Identification"]["basis"], "work")
        self.assertEqual((by["Underwater Welding"]["basis"], by["Underwater Welding"]["confirm"]), ("role", True))

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
        for bucket in ("sg-skills", "sg-edu", "sg-ach"):
            with self.assertRaises(HTTPException, msg=bucket) as caught:
                sg._gate(request_with(make_pass("free")), bucket, 100, "ideas")
            self.assertEqual(caught.exception.status_code, 403, bucket)

    def test_a_paying_person_passes_and_is_charged_one_action_per_model_call(self):
        access = sg._gate(request_with(make_pass("premium")), "sg-ach", 100, "ideas")
        self.assertEqual(access.tier, "premium")
        self.assertEqual(ai_models.TASK_CREDITS.get("ideas", 1), 1)
