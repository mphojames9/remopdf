"""Run with:  python -m unittest tests.test_plans_route   (from the backEnd folder; needs fastapi + pydantic, no network)

Drives the AI routes with signed AI passes and a FAKE model, to prove the two plans really work end to end:
  1. the pass is checked (signature, expiry, audience) and its plan is read from the "tier" claim (the old "plus" /
     "pro" / "max" claims, and a bare { premium: true }, are served as Premium);
  2. Premium reaches the model with ITS model, thinking level and token room (the model call is replaced, so the plan
     the route passes on is what is checked);
  3. the free plan has no AI suggestions at all: 403 on every route, and the model is never reached;
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


def make_pass(tier="premium", sub="acct-1", *, secret=SECRET, aud="remopdf-ai", exp=None, premium=None, alg="HS256", **extra):
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
    def test_a_premium_pass_is_read_from_the_signed_tier_claim(self):
        access = w.require_access(make_pass("premium", sub="acct-p"), "analyze")
        self.assertEqual((access.tier, access.subject), ("premium", "acct-p"))

    def test_a_pass_signed_under_the_old_paid_plans_is_served_as_premium(self):
        for old in ("plus", "pro", "max"):
            self.assertEqual(w.require_access(make_pass(old), "letter").tier, "premium", old)

    def test_a_pass_that_only_says_premium_is_served_as_premium(self):
        legacy = make_pass(None, premium=True)  # { premium: true } and no tier
        self.assertEqual(w.require_access(legacy, "letter").tier, "premium")

    def test_a_pass_with_no_tier_and_no_premium_is_refused(self):
        with self.assertRaises(HTTPException) as caught:
            w.require_access(make_pass(None, premium=False), "analyze")
        self.assertEqual(caught.exception.status_code, 403)

    def test_a_forged_expired_or_misdirected_pass_is_refused_with_401(self):
        bad = {
            "wrong secret": make_pass("premium", secret="y" * 40),
            "expired": make_pass("premium", exp=int(time.time()) - 5),
            "another audience": make_pass("premium", aud="somebody-else"),
            "alg none": make_pass("premium", alg="none"),
        }
        for why, token in bad.items():
            with self.assertRaises(HTTPException, msg=why) as caught:
                w.require_access(token, "analyze")
            self.assertEqual(caught.exception.status_code, 401, why)

    def test_a_free_pass_cannot_be_edited_into_a_premium_one(self):
        token = make_pass("free")
        head, body, sig = token.split(".")
        claims = json.loads(base64.urlsafe_b64decode(body + "=" * (-len(body) % 4)))
        claims["tier"] = "premium"
        claims["premium"] = True
        forged = f"{head}.{b64(json.dumps(claims).encode())}.{sig}"
        with self.assertRaises(HTTPException) as caught:
            w.require_access(forged, "analyze")
        self.assertEqual(caught.exception.status_code, 401)

    def test_a_pass_without_an_account_id_is_refused_because_the_allowance_is_counted_per_account(self):
        with self.assertRaises(HTTPException) as caught:
            w.require_access(make_pass("premium", sub=""), "analyze")
        self.assertEqual(caught.exception.status_code, 403)


class FreeVersusPremium(PlanTestCase):
    def test_free_has_no_ai_suggestions_at_all(self):
        free = make_pass("free")
        for task in ("analyze", "letter", "posting"):
            with self.assertRaises(HTTPException, msg=task) as caught:
                w.require_access(free, task)
            self.assertEqual(caught.exception.status_code, 403, task)
            self.assertIn("Premium", caught.exception.detail, task)
        with self.assertRaises(HTTPException) as caught:
            self.analyze(free)  # the real route, not just the gate
        self.assertEqual(caught.exception.status_code, 403)
        for bucket, task in (("jm-target", "target"), ("jm-skills", "skills"), ("jm-summary", "summary"), ("jm-rewrite", "rewrite")):
            with self.assertRaises(HTTPException, msg=task) as caught:
                jm._gate(request_with(free), bucket, 100, task)
            self.assertEqual(caught.exception.status_code, 403, task)
        self.assertEqual(self.plans_seen, [])  # the model was never reached

    def test_premium_passes_every_gate_with_its_own_plan(self):
        for task in ai_models.TASKS:
            self.assertEqual(w.require_access(make_pass("premium"), task).tier, "premium", task)
        for old in ("plus", "pro", "max", "premium"):
            access = jm._gate(request_with(make_pass(old)), "jm-rewrite", 100, "rewrite")
            self.assertEqual(access.tier, "premium", old)

    def test_premium_reaches_the_model_with_the_strongest_model_thinking_hardest(self):
        self.analyze(make_pass("premium", sub="acct-p"), text_number("premium"))
        task, plan = self.plans_seen[0]
        self.assertEqual((task, plan.tier, plan.model), ("analyze", "premium", "openai/gpt-oss-120b"))
        self.assertEqual(plan.effort_for("medium"), "high")
        self.assertEqual(plan.budget_x, 1.3)

    def test_every_paying_person_gets_the_same_plan_whichever_old_plan_their_pass_names(self):
        for old in ("plus", "pro", "max"):
            self.analyze(make_pass(old, sub=f"acct-{old}"), text_number(old))
        seen = [plan for _, plan in self.plans_seen]
        self.assertEqual({(p.tier, p.model, p.effort_for("medium"), p.budget_x) for p in seen}, {("premium", "openai/gpt-oss-120b", "high", 1.3)})


class Allowance(PlanTestCase):
    def test_premium_gets_sixty_and_the_sixty_first_is_refused_with_a_quota_code(self):
        token = make_pass("premium")
        # The per-minute limit per address (a different protection) would stop 60 requests in a row; lift it here.
        patcher = mock.patch.object(w, "_rate_limited", return_value=False)
        patcher.start()
        self.addCleanup(patcher.stop)
        for n in range(60):
            self.analyze(token, text_number(n))
        with self.assertRaises(HTTPException) as caught:
            self.analyze(token, text_number("one too many"))
        err = caught.exception
        self.assertEqual(err.status_code, 429)
        self.assertEqual((err.detail["code"], err.detail["tier"], err.detail["limit"]), ("quota", "premium", 60))
        self.assertNotIn("Upgrade", err.detail["message"])  # there is nothing higher to upgrade to
        self.assertEqual(len(self.plans_seen), 60)  # the refused request never reached the model

    def test_an_answer_that_was_already_written_is_free(self):
        token = make_pass("premium")
        for _ in range(10):
            self.analyze(token, text_number("same text"))
        self.assertEqual(len(self.plans_seen), 1)
        self.assertEqual(ai_models.usage("acct-1", "premium"), (1, 60))

    def test_people_have_their_own_allowance(self):
        os.environ["AI_DAILY_PREMIUM"] = "2"
        for n in range(2):
            self.analyze(make_pass("premium", sub="acct-1"), text_number(n))
        self.analyze(make_pass("premium", sub="acct-2"), text_number("fresh"))  # does not raise

    def test_the_allowance_can_be_changed_in_the_environment(self):
        os.environ["AI_DAILY_PREMIUM"] = "1"
        token = make_pass("premium")
        self.analyze(token, text_number("a"))
        with self.assertRaises(HTTPException) as caught:
            self.analyze(token, text_number("b"))
        self.assertEqual(caught.exception.detail["limit"], 1)

    def test_a_person_who_pays_for_a_longer_plan_gets_exactly_the_same_allowance(self):
        # The pass only says "premium": nothing in it tells a 7-day payment from a 30-day one, so they cannot differ.
        self.assertEqual(ai_models.usage("acct-7d", "premium"), ai_models.usage("acct-30d", "premium"))


class TheLetterCostsTwo(PlanTestCase):
    def test_the_second_request_of_a_letter_is_refused_when_the_allowance_cannot_pay_for_it(self):
        # writing_ai.cover_letter catches this refusal on the correction round and keeps the first letter (it is
        # still checked for false qualifications afterwards); here only the counting is checked.
        os.environ["AI_DAILY_PREMIUM"] = "3"
        ai_models.reset_usage()
        access = w.require_access(make_pass("premium"), "letter")
        w._spend(access, "letter")  # 2 of 3
        with self.assertRaises(HTTPException) as caught:
            w._spend(access, "letter")  # would be 4 of 3
        self.assertEqual(caught.exception.status_code, 429)
        self.assertEqual(ai_models.usage("acct-1", "premium"), (2, 3))


if __name__ == "__main__":
    unittest.main()
