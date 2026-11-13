"""Run with:  python -m unittest tests.test_plans_route   (from the backEnd folder; needs fastapi + pydantic, no network)

Drives the AI routes with signed AI passes and a FAKE model, to prove the four plans really work end to end:
  1. the pass is checked (signature, expiry, audience) and its plan is read from the "tier" claim;
  2. each plan reaches the model with ITS model, thinking level and token room (the model call is replaced, so the
     plan the route passes on is what is checked);
  3. the free plan can use the writing assistant and nothing else (403 on the cover letter and job matching);
  4. the daily allowance is counted per account, a cached answer is free, and going over answers 429 with
     detail.code == "quota";
  5. an answer written for one plan is never served to another.
"""
import base64
import hashlib
import hmac
import json
import os
import time
import unittest
from unittest import mock

from fastapi import HTTPException

from routers import ai_models, job_match as jm, writing_ai as w

SECRET = "x" * 40


def b64(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def make_pass(tier="pro", sub="acct-1", *, secret=SECRET, aud="remopdf-ai", exp=None, premium=None, alg="HS256", **extra):
    """What the accounts server signs (routes/payments.js, GET /ai-pass)."""
    claims = {"sub": sub, "aud": aud, "exp": int(time.time()) + 300 if exp is None else exp}
    if tier is not None:
        claims["tier"] = tier
    claims["premium"] = (tier not in (None, "free")) if premium is None else premium
    claims.update(extra)
    head, body = b64(json.dumps({"alg": alg, "typ": "JWT"}).encode()), b64(json.dumps(claims).encode())
    sig = hmac.new(secret.encode(), f"{head}.{body}".encode(), hashlib.sha256).digest()
    return f"{head}.{body}.{b64(sig)}"


def request_with(token):
    req = mock.Mock()
    req.headers = {"authorization": f"Bearer {token}"}
    req.client = None
    return req


GOOD_REPLY = {
    "rewrites": [
        {
            "label": "Results-focused",
            "text": "Supervised and scheduled a team of 14 floor staff\nResolved customer complaints and processed returns",
            "why": "Leads each line with a strong verb.",
        }
    ],
    "needs": [],
}


def text_number(n):
    return f"Scheduled and supervised a team of 14 floor staff ({n})\nHandled customer complaints and returns"


class PlanTestCase(unittest.TestCase):
    def setUp(self):
        patcher = mock.patch.dict(os.environ, {"AI_PASS_SECRET": SECRET}, clear=False)
        patcher.start()
        self.addCleanup(patcher.stop)
        for name in ai_models_env():
            os.environ.pop(name, None)
        ai_models.reset_usage()
        self.addCleanup(ai_models.reset_usage)
        w._cache.clear()
        w._hits.clear()

        self.plans_seen = []

        def complete(get_client, messages, *, task, model=None, temperature=None, log=print, plan=None):
            self.plans_seen.append((task, plan))
            return json.dumps(GOOD_REPLY)

        patcher = mock.patch.object(ai_models, "complete", side_effect=complete)
        patcher.start()
        self.addCleanup(patcher.stop)

    def analyze(self, token, text=None):
        body = w.AnalyzeRequest(text=text or text_number(0), field="experience", job_title="Store Supervisor")
        return w.analyze(body, request_with(token))


def ai_models_env():
    return ["GROQ_MODEL", "GROQ_FALLBACK_MODEL", *(f"GROQ_MODEL_{t.upper()}" for t in ai_models.TIERS), *(f"AI_DAILY_{t.upper()}" for t in ai_models.TIERS)]


class ThePass(PlanTestCase):
    def test_the_plan_is_read_from_the_signed_tier_claim(self):
        for tier in ai_models.TIERS:
            access = w.require_access(make_pass(tier, sub=f"acct-{tier}"), "analyze")
            self.assertEqual((access.tier, access.subject), (tier, f"acct-{tier}"))

    def test_a_pass_from_before_plans_existed_is_served_as_pro(self):
        legacy = make_pass(None, premium=True)  # { premium: true } and no tier
        self.assertEqual(w.require_access(legacy, "letter").tier, "pro")

    def test_a_pass_with_no_tier_and_no_premium_is_refused(self):
        with self.assertRaises(HTTPException) as caught:
            w.require_access(make_pass(None, premium=False), "analyze")
        self.assertEqual(caught.exception.status_code, 403)

    def test_a_forged_expired_or_misdirected_pass_is_refused_with_401(self):
        bad = {
            "wrong secret": make_pass("max", secret="y" * 40),
            "expired": make_pass("max", exp=int(time.time()) - 5),
            "another audience": make_pass("max", aud="somebody-else"),
            "alg none": make_pass("max", alg="none"),
        }
        for why, token in bad.items():
            with self.assertRaises(HTTPException, msg=why) as caught:
                w.require_access(token, "analyze")
            self.assertEqual(caught.exception.status_code, 401, why)

    def test_a_pass_cannot_claim_a_better_plan_than_the_one_that_was_signed(self):
        token = make_pass("free")
        head, body, sig = token.split(".")
        claims = json.loads(base64.urlsafe_b64decode(body + "=" * (-len(body) % 4)))
        claims["tier"] = "max"
        forged = f"{head}.{b64(json.dumps(claims).encode())}.{sig}"
        with self.assertRaises(HTTPException) as caught:
            w.require_access(forged, "analyze")
        self.assertEqual(caught.exception.status_code, 401)

    def test_a_pass_without_an_account_id_is_refused_because_the_allowance_is_counted_per_account(self):
        with self.assertRaises(HTTPException) as caught:
            w.require_access(make_pass("pro", sub=""), "analyze")
        self.assertEqual(caught.exception.status_code, 403)


class FreeVersusPaid(PlanTestCase):
    def test_free_can_use_the_writing_assistant(self):
        self.analyze(make_pass("free"))
        task, plan = self.plans_seen[0]
        self.assertEqual((task, plan.tier, plan.model), ("analyze", "free", "openai/gpt-oss-20b"))

    def test_free_cannot_write_a_cover_letter_or_read_an_advert_or_match_a_job(self):
        free = make_pass("free")
        for task in ("letter", "posting"):
            with self.assertRaises(HTTPException, msg=task) as caught:
                w.require_access(free, task)
            self.assertEqual(caught.exception.status_code, 403, task)
        for bucket, task in (("jm-target", "target"), ("jm-skills", "skills"), ("jm-summary", "summary"), ("jm-rewrite", "rewrite")):
            with self.assertRaises(HTTPException, msg=task) as caught:
                jm._gate(request_with(free), bucket, 100, task)
            self.assertEqual(caught.exception.status_code, 403, task)
        self.assertEqual(self.plans_seen, [])  # the model was never reached

    def test_every_paid_plan_passes_the_job_matching_gate_with_its_own_plan(self):
        for tier in ("plus", "pro", "max"):
            access = jm._gate(request_with(make_pass(tier)), "jm-rewrite", 100, "rewrite")
            self.assertEqual(access.tier, tier)

    def test_each_plan_reaches_the_model_with_its_own_plan(self):
        for tier in ai_models.TIERS:
            self.analyze(make_pass(tier, sub=f"acct-{tier}"), text_number(tier))
        seen = {plan.tier: plan for _, plan in self.plans_seen}
        self.assertEqual(seen["free"].model, "openai/gpt-oss-20b")
        self.assertEqual([seen[t].effort_for("medium") for t in ai_models.TIERS], ["low", "low", "medium", "high"])
        self.assertEqual(seen["max"].budget_x, 1.3)


class Allowance(PlanTestCase):
    def test_free_gets_six_and_the_seventh_is_refused_with_a_quota_code(self):
        token = make_pass("free")
        for n in range(6):
            self.analyze(token, text_number(n))
        with self.assertRaises(HTTPException) as caught:
            self.analyze(token, text_number("one too many"))
        err = caught.exception
        self.assertEqual(err.status_code, 429)
        self.assertEqual((err.detail["code"], err.detail["tier"], err.detail["limit"]), ("quota", "free", 6))
        self.assertIn("Upgrade", err.detail["message"])
        self.assertEqual(len(self.plans_seen), 6)  # the refused request never reached the model

    def test_an_answer_that_was_already_written_is_free(self):
        token = make_pass("free")
        for _ in range(10):
            self.analyze(token, text_number("same text"))
        self.assertEqual(len(self.plans_seen), 1)
        self.assertEqual(ai_models.usage("acct-1", "free"), (1, 6))

    def test_people_have_their_own_allowance(self):
        for n in range(6):
            self.analyze(make_pass("free", sub="acct-1"), text_number(n))
        self.analyze(make_pass("free", sub="acct-2"), text_number("fresh"))  # does not raise

    def test_paying_lifts_the_limit_straight_away(self):
        for n in range(6):
            self.analyze(make_pass("free"), text_number(n))
        self.analyze(make_pass("plus"), text_number("after paying"))  # same account, new pass: 7 of 25
        self.assertEqual(ai_models.usage("acct-1", "plus"), (7, 25))

    def test_max_is_told_nothing_about_upgrading_when_it_runs_out(self):
        os.environ["AI_DAILY_MAX"] = "1"
        token = make_pass("max")
        self.analyze(token, text_number("a"))
        with self.assertRaises(HTTPException) as caught:
            self.analyze(token, text_number("b"))
        self.assertNotIn("Upgrade", caught.exception.detail["message"])

    def test_an_answer_written_for_one_plan_is_never_served_to_another(self):
        text = text_number("shared")
        self.analyze(make_pass("plus", sub="a"), text)
        self.analyze(make_pass("max", sub="b"), text)  # same text, different plan: asked again, not served from plus
        self.assertEqual([plan.tier for _, plan in self.plans_seen], ["plus", "max"])


class TheLetterCostsTwo(PlanTestCase):
    def test_the_second_request_of_a_letter_is_refused_when_the_allowance_cannot_pay_for_it(self):
        # writing_ai.cover_letter catches this refusal on the correction round and keeps the first letter (it is
        # still checked for false qualifications afterwards); here only the counting is checked.
        os.environ["AI_DAILY_PLUS"] = "3"
        ai_models.reset_usage()
        access = w.require_access(make_pass("plus"), "letter")
        w._spend(access, "letter")  # 2 of 3
        with self.assertRaises(HTTPException) as caught:
            w._spend(access, "letter")  # would be 4 of 3
        self.assertEqual(caught.exception.status_code, 429)
        self.assertEqual(ai_models.usage("acct-1", "plus"), (2, 3))


if __name__ == "__main__":
    unittest.main()
