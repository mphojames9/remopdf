"""Run with:  python -m unittest tests.test_rewrite_routes   (from the backEnd folder; needs fastapi + pydantic, no network)

Drives the AI routes with a FAKE model (routers.ai_models.complete is replaced), to prove two things:
  1. the plumbing: every route asks for a task that exists, and the reply is cleaned the way the app expects;
  2. the honesty rules hold however the model behaves: no rewrite carries a number the writer never wrote, and the
     "make it stronger" questions only ever point at the writer's own lines.
"""
import json
import unittest
from unittest import mock

from routers import ai_models, job_match as jm, writing_ai as w

BULLETS = "Scheduled and supervised a team of 14 floor staff\nControlled stock counts and ordered replenishment\nHandled customer complaints and returns"


def fake_model(reply_for):
    """Replace the model call. reply_for(task, messages) -> dict. Also checks the task name is a real one."""
    calls = []

    def complete(get_client, messages, *, task, model=None, temperature=None, log=print):
        assert task in ai_models.TASKS, f"unknown task {task!r}"
        calls.append({"task": task, "messages": messages, "temperature": temperature})
        return json.dumps(reply_for(task, messages))

    patcher = mock.patch.object(ai_models, "complete", side_effect=complete)
    patcher.start()
    return patcher, calls


class AnalyzeRoute(unittest.TestCase):
    def setUp(self):
        w._cache.clear()
        for name, value in (("_bearer_pass", "pass"), ("_rate_limited", False), ("require_premium", None)):
            patcher = mock.patch.object(w, name, return_value=value)
            patcher.start()
            self.addCleanup(patcher.stop)

    def analyze(self, reply, field="experience", text=BULLETS):
        patcher, calls = fake_model(lambda task, messages: reply)
        self.addCleanup(patcher.stop)
        result = w.analyze(w.AnalyzeRequest(text=text, field=field, job_title="Store Supervisor"), mock.Mock())
        return result, calls

    def good_reply(self):
        return {
            "rewrites": [
                {"label": "Results-focused", "text": "Supervised and scheduled a team of 14 floor staff\nControlled stock counts and replenishment orders\nResolved customer complaints and processed returns", "why": "Leads each line with a strong verb. It keeps the team size up front."},
                {"label": "Concise & ATS", "text": "Scheduled and supervised 14 floor staff\nManaged stock counts and replenishment\nHandled complaints and returns", "why": "Shorter lines that keep the stock and customer keywords."},
                {"label": "Scope-focused", "text": "Led scheduling for a 14-person floor team\nOwned stock counts and ordering\nSettled complaints and returns at the till", "why": "Puts the scale first."},
            ],
            "needs": [
                {"line": "Controlled stock counts and ordered replenishment", "ask": "How often did you count stock, and how many product lines was that?"},
                {"line": "Handled customer complaints and returns", "ask": "Roughly how many complaints or returns did you handle in a week?"},
            ],
        }

    def test_three_versions_with_a_reason_each_and_questions_about_the_writers_own_lines(self):
        result, calls = self.analyze(self.good_reply())
        self.assertEqual(len(result["rewrites"]), 3)
        self.assertTrue(all(r["why"] for r in result["rewrites"]))
        self.assertEqual(len(result["needs"]), 2)
        self.assertEqual(result["improved"], result["rewrites"][0]["text"])  # older front ends still work
        self.assertEqual(calls[0]["task"], "analyze")

    def test_a_version_that_invents_a_number_is_thrown_away_and_the_others_stay(self):
        reply = self.good_reply()
        reply["rewrites"][1]["text"] = "Scheduled and supervised 14 floor staff, cutting overtime by 30%\nManaged stock counts\nHandled complaints"
        result, _ = self.analyze(reply)
        self.assertEqual(len(result["rewrites"]), 2)
        self.assertTrue(all("30%" not in r["text"] for r in result["rewrites"]))

    def test_a_question_about_a_line_the_writer_never_wrote_is_dropped(self):
        reply = self.good_reply()
        reply["needs"].append({"line": "Negotiated supplier contracts", "ask": "How large were the contracts?"})
        result, _ = self.analyze(reply)
        self.assertEqual(len(result["needs"]), 2)

    def test_education_and_other_blocks_never_get_questions(self):
        for field in ("education", "other"):
            result, _ = self.analyze(self.good_reply(), field=field)
            self.assertEqual(result["needs"], [])

    def test_a_reply_without_the_new_fields_still_works(self):
        reply = {"rewrites": [{"label": "Polished", "text": "Supervised and scheduled a team of 14 floor staff\nControlled stock counts\nHandled complaints"}]}
        result, _ = self.analyze(reply)
        self.assertEqual(result["rewrites"][0]["why"], "")
        self.assertEqual(result["needs"], [])

    def test_the_prompt_asks_for_coaching_and_forbids_invented_figures(self):
        self.assertIn('"needs"', w.SYSTEM_PROMPT)
        self.assertIn("Never put a number of your own", w.SYSTEM_PROMPT)
        self.assertIn("Never add, round, convert or \"improve\" a figure", w.SYSTEM_PROMPT)


class JobRewriteRoute(unittest.TestCase):
    def setUp(self):
        jm._cache.clear()
        patcher = mock.patch.object(jm, "_gate", return_value=None)
        patcher.start()
        self.addCleanup(patcher.stop)

    def target(self):
        return jm.TargetIn(
            title="Store Supervisor",
            company="Harbour Hardware",
            keywords=[jm.KeywordIn(term="stock control", must=True), jm.KeywordIn(term="staff scheduling", must=True), jm.KeywordIn(term="customer service")],
            requirements=["Experience supervising floor staff"],
        )

    def rewrite(self, reply):
        patcher, calls = fake_model(lambda task, messages: reply)
        self.addCleanup(patcher.stop)
        body = jm.RewriteRequest(text=BULLETS, field="experience", job_title="Store Supervisor", target=self.target())
        return jm.rewrite(body, mock.Mock()), calls

    def test_versions_carry_why_adds_and_needs_and_an_invented_figure_is_dropped(self):
        reply = {
            "rewrites": [
                {"label": "Match-first", "text": "Staff scheduling and supervision of 14 floor staff\nStock control: counts and replenishment\nCustomer service: complaints and returns", "why": "Puts the staffing line the job asks for first."},
                {"label": "Results", "text": "Scheduled and supervised 14 floor staff, raising customer service scores by 20%\nStock control", "why": "Adds a result."},
            ],
            "needs": [{"line": "Handled customer complaints and returns", "ask": "Roughly how many complaints did you handle in a week?"}],
        }
        result, calls = self.rewrite(reply)
        self.assertEqual(calls[0]["task"], "rewrite")
        self.assertEqual(len(result["rewrites"]), 1)  # the one with "20%" is gone
        first = result["rewrites"][0]
        self.assertEqual(first["why"], "Puts the staffing line the job asks for first.")
        self.assertEqual(first["adds"], ["stock control", "staff scheduling", "customer service"])  # the job's words this version now uses
        self.assertEqual(len(result["needs"]), 1)

    def test_machinery_words_never_reach_the_resume(self):
        reply = {"rewrites": [{"label": "A", "text": "Scheduled and supervised 14 floor staff per the O*NET occupation profile\nStock counts\nComplaints", "why": "x" * 10}]}
        result, _ = self.rewrite(reply)
        self.assertEqual(result["rewrites"], [])


class OtherRoutesPlumbing(unittest.TestCase):
    """Skills, summary and target each ask for a real task and read the reply as before."""

    def setUp(self):
        jm._cache.clear()
        patcher = mock.patch.object(jm, "_gate", return_value=None)
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_skills(self):
        reply = {
            "supported": [{"skill": "Staff scheduling", "job_item": "staff scheduling", "evidence": "Scheduled and supervised a team of 14 floor staff"}],
            "to_confirm": [{"skill": "Customer service", "job_item": "customer service", "reason": "The job is customer facing."}],
        }
        patcher, calls = fake_model(lambda task, messages: reply)
        self.addCleanup(patcher.stop)
        target = jm.TargetIn(title="Store Supervisor", keywords=[jm.KeywordIn(term="staff scheduling", must=True), jm.KeywordIn(term="customer service")])
        resume = jm.ResumeIn(summary="", skills=["Stock control"], jobs=[jm.JobIn(title="Store Supervisor", employer="Harbour Hardware", achievements=BULLETS)])
        result = jm.match_skills(jm.SkillsRequest(target=target, resume=resume), mock.Mock())
        self.assertEqual(calls[0]["task"], "skills")
        self.assertEqual([s["skill"] for s in result["supported"]], ["Staff scheduling"])
        self.assertEqual([s["skill"] for s in result["to_confirm"]], ["Customer service"])

    def test_summary(self):
        reply = {
            "summary": "Store Supervisor at Harbour Hardware, scheduling and supervising a team of 14 floor staff. Controls stock counts and orders replenishment, and handles customer complaints and returns.",
            "claims": [
                {"strength": "staff scheduling", "evidence": "Scheduled and supervised a team of 14 floor staff"},
                {"strength": "stock control", "evidence": "Controlled stock counts and ordered replenishment"},
            ],
        }
        patcher, calls = fake_model(lambda task, messages: reply)
        self.addCleanup(patcher.stop)
        resume = jm.ResumeIn(skills=["Stock control", "Staff scheduling", "Customer service"], jobs=[jm.JobIn(title="Store Supervisor", employer="Harbour Hardware", achievements=BULLETS, start_year="2015", end_year="2024")])
        result = jm.write_summary(jm.SummaryRequest(resume=resume), mock.Mock())
        self.assertEqual(calls[0]["task"], "summary")
        self.assertIn("Store Supervisor", result["summary"])
        self.assertEqual(len(result["checked"]), 2)

    def test_summary_still_throws_away_an_answer_that_invents_a_figure(self):
        bad = {
            "summary": "Store Supervisor at Harbour Hardware, scheduling and supervising a team of 40 floor staff. Controls stock counts and orders replenishment, and handles customer complaints and returns.",
            "claims": [
                {"strength": "staff scheduling", "evidence": "Scheduled and supervised a team of 14 floor staff"},
                {"strength": "stock control", "evidence": "Controlled stock counts and ordered replenishment"},
            ],
        }
        patcher, calls = fake_model(lambda task, messages: bad)
        self.addCleanup(patcher.stop)
        resume = jm.ResumeIn(skills=["Stock control", "Staff scheduling", "Customer service"], jobs=[jm.JobIn(title="Store Supervisor", employer="Harbour Hardware", achievements=BULLETS, start_year="2015", end_year="2024")])
        with self.assertRaises(Exception) as caught:
            jm.write_summary(jm.SummaryRequest(resume=resume), mock.Mock())
        self.assertEqual(caught.exception.status_code, 422)
        self.assertEqual(len(calls), jm.SUMMARY_ATTEMPTS)  # it was told what was wrong, three times, and never let it through

    def test_target_from_pasted_text(self):
        advert = (
            "Store Supervisor - Harbour Hardware, Durban. We are looking for a Store Supervisor to run our floor. "
            "Requirements: 3 years retail experience, stock control, staff scheduling, customer service. "
            "Duties: schedule and supervise floor staff; control stock counts."
        )
        reply = {
            "job_title": "Store Supervisor",
            "company": "Harbour Hardware",
            "requirements": ["stock control", "staff scheduling", "customer service"],
            "duties": ["schedule and supervise floor staff", "control stock counts"],
            "keywords": [
                {"term": "stock control", "kind": "skill", "must": True},
                {"term": "staff scheduling", "kind": "skill", "must": True},
                {"term": "forklift licence", "kind": "credential", "must": True},  # not in the advert: must be dropped
            ],
        }
        patcher, calls = fake_model(lambda task, messages: reply)
        self.addCleanup(patcher.stop)
        with mock.patch.object(jm, "_lookup_onet", return_value=None):
            result = jm.build_target(jm.TargetRequest(text=advert), mock.Mock())
        self.assertEqual(calls[0]["task"], "target")
        terms = [k["term"] for k in result["target"]["keywords"]]
        self.assertEqual(terms, ["stock control", "staff scheduling"])


if __name__ == "__main__":
    unittest.main()
