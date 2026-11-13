"""Run with:  python -m unittest routers.test_ai_models   (from the backEnd folder; needs nothing installed)

routers/ai_models.py decides which Groq model answers, how hard it thinks, and what happens when it fails. These tests
use a FAKE client, so no key and no network are needed.
"""
import datetime
import os
import unittest
from types import SimpleNamespace
from unittest import mock

from routers import ai_models as m

GOOD = '{"body": "ok"}'


def reply(content, finish="stop"):
    return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content), finish_reason=finish)])


class FakeClient:
    """Plays back a script: a reply object (returned) or an exception (raised), one per call."""

    def __init__(self, *script):
        self.script = list(script)
        self.calls = []
        self.options = []

    def with_options(self, **kw):
        self.options.append(kw)
        return self

    @property
    def chat(self):
        return self

    @property
    def completions(self):
        return self

    def create(self, **params):
        self.calls.append(params)
        item = self.script.pop(0)
        if isinstance(item, BaseException):
            raise item
        return item


def run(client, task="letter", **kw):
    return m.complete(lambda: client, [{"role": "user", "content": "hi"}], task=task, log=lambda _msg: None, **kw)


class Settings(unittest.TestCase):
    def setUp(self):
        patcher = mock.patch.dict(os.environ, {}, clear=False)
        patcher.start()
        self.addCleanup(patcher.stop)
        os.environ.pop("GROQ_MODEL", None)
        os.environ.pop("GROQ_FALLBACK_MODEL", None)

    def test_the_larger_model_is_the_default_and_the_small_one_is_the_fallback(self):
        self.assertEqual(m.primary_model(), "openai/gpt-oss-120b")
        self.assertEqual(m.fallback_model(), "openai/gpt-oss-20b")

    def test_groq_model_wins_for_everything_and_turns_the_fallback_off(self):
        os.environ["GROQ_MODEL"] = "openai/gpt-oss-20b"  # the instant way back to the old behaviour
        self.assertEqual(m.primary_model(), "openai/gpt-oss-20b")
        self.assertIsNone(m.fallback_model())

    def test_a_fallback_equal_to_the_main_model_means_no_fallback(self):
        os.environ["GROQ_FALLBACK_MODEL"] = "openai/gpt-oss-120b"
        self.assertIsNone(m.fallback_model())

    def test_every_task_has_room_for_thinking_and_a_timeout_that_fits_the_app(self):
        for name, task in m.TASKS.items():
            self.assertGreaterEqual(task.max_tokens, 3000, name)  # reasoning tokens count against this
            self.assertLessEqual(task.timeout_s * 2, 60, name)  # two attempts must fit inside the app's wait
        self.assertEqual(m.TASKS["posting"].effort, "low")  # extraction copies, it does not compose
        self.assertEqual(m.TASKS["letter"].effort, "medium")


class Plan(unittest.TestCase):
    def setUp(self):
        patcher = mock.patch.dict(os.environ, {}, clear=False)
        patcher.start()
        self.addCleanup(patcher.stop)
        os.environ.pop("GROQ_MODEL", None)
        os.environ.pop("GROQ_FALLBACK_MODEL", None)

    def test_a_good_first_answer_costs_one_call_on_the_main_model_at_the_tasks_thinking_level(self):
        client = FakeClient(reply(GOOD))
        self.assertEqual(run(client), GOOD)
        self.assertEqual(len(client.calls), 1)
        call = client.calls[0]
        self.assertEqual(call["model"], "openai/gpt-oss-120b")
        self.assertEqual(call["extra_body"], {"reasoning_effort": "medium"})
        self.assertEqual(call["max_completion_tokens"], m.TASKS["letter"].max_tokens)
        self.assertEqual(call["response_format"], {"type": "json_object"})
        self.assertEqual(client.options[0]["max_retries"], 0)  # the fallback model is the retry, not hidden SDK retries

    def test_a_rate_limit_on_the_main_model_goes_to_the_fallback_at_low_thinking(self):
        client = FakeClient(RuntimeError("429 rate limit"), reply(GOOD))
        self.assertEqual(run(client), GOOD)
        self.assertEqual([c["model"] for c in client.calls], ["openai/gpt-oss-120b", "openai/gpt-oss-20b"])
        self.assertEqual(client.calls[1]["extra_body"], {"reasoning_effort": "low"})

    def test_a_cut_off_reply_is_retried_on_the_same_model_thinking_less_with_more_room(self):
        client = FakeClient(reply('{"body": "half a le', finish="length"), reply(GOOD))
        self.assertEqual(run(client), GOOD)
        first, second = client.calls
        self.assertEqual(second["model"], first["model"])
        self.assertEqual(second["extra_body"], {"reasoning_effort": "low"})
        self.assertGreater(second["max_completion_tokens"], first["max_completion_tokens"])

    def test_an_empty_reply_is_retried_too(self):
        client = FakeClient(reply(""), reply(GOOD))
        self.assertEqual(run(client), GOOD)
        self.assertEqual(len(client.calls), 2)

    def test_broken_json_twice_then_the_fallback_model_answers(self):
        client = FakeClient(reply("not json"), reply("still not json"), reply(GOOD))
        self.assertEqual(run(client), GOOD)
        self.assertEqual([c["model"] for c in client.calls], ["openai/gpt-oss-120b"] * 2 + ["openai/gpt-oss-20b"])

    def test_nothing_usable_returns_the_last_reply_so_the_callers_own_error_handling_answers(self):
        client = FakeClient(reply("nope"), reply("nope"), reply("still nope"))
        self.assertEqual(run(client), "still nope")  # the caller turns this into "could not be read"
        self.assertEqual(len(client.calls), 3)

    def test_every_model_failing_raises_the_last_error(self):
        client = FakeClient(RuntimeError("down"), RuntimeError("also down"))
        with self.assertRaises(RuntimeError) as caught:
            run(client)
        self.assertIn("also down", str(caught.exception))
        self.assertEqual(len(client.calls), 2)  # main + fallback, never an endless loop

    def test_a_failed_main_model_after_a_bad_reply_does_not_hide_the_bad_reply(self):
        client = FakeClient(reply("nope"), RuntimeError("timeout"), RuntimeError("timeout again"))
        self.assertEqual(run(client), "nope")

    def test_one_model_chosen_by_the_operator_is_never_second_guessed(self):
        os.environ["GROQ_MODEL"] = "llama-3.3-70b-versatile"
        client = FakeClient(reply("nope"))
        self.assertEqual(run(client), "nope")
        self.assertEqual(len(client.calls), 1)  # no retry ladder, no fallback
        self.assertNotIn("extra_body", client.calls[0])  # only gpt-oss models take a thinking level

    def test_a_missing_key_is_not_a_model_failure(self):
        class NoKey(Exception):
            pass

        def get_client():
            raise NoKey("GROQ_API_KEY is not set")

        with self.assertRaises(NoKey):
            m.complete(get_client, [], task="letter", log=lambda _msg: None)

    def test_a_client_without_with_options_still_works(self):
        client = FakeClient(reply(GOOD))
        client.with_options = None
        self.assertEqual(run(client), GOOD)

    def test_the_temperature_can_be_overridden_per_call(self):
        client = FakeClient(reply(GOOD))
        run(client, task="summary", temperature=0.5)
        self.assertEqual(client.calls[0]["temperature"], 0.5)
        client = FakeClient(reply(GOOD))
        run(client, task="summary")
        self.assertEqual(client.calls[0]["temperature"], m.TASKS["summary"].temperature)


PLAN_ENV = ("GROQ_MODEL", "GROQ_FALLBACK_MODEL", *(f"GROQ_MODEL_{t.upper()}" for t in m.TIERS), *(f"AI_DAILY_{t.upper()}" for t in m.TIERS))


class PlanTestCase(unittest.TestCase):
    def setUp(self):
        patcher = mock.patch.dict(os.environ, {}, clear=False)
        patcher.start()
        self.addCleanup(patcher.stop)
        for name in PLAN_ENV:
            os.environ.pop(name, None)
        m.reset_usage()
        self.addCleanup(m.reset_usage)


class Plans(PlanTestCase):
    def test_each_plan_has_the_model_and_thinking_it_was_priced_for(self):
        free, plus, pro, top = (m.plan_for(t) for t in ("free", "plus", "pro", "max"))
        self.assertEqual(free.model, "openai/gpt-oss-20b")  # the cheapest model: this is what makes the free plan affordable
        for plan in (plus, pro, top):
            self.assertEqual(plan.model, "openai/gpt-oss-120b")
        # thinking: free and plus one step below the task's level, pro at it, max one step above
        self.assertEqual([p.effort_for("medium") for p in (free, plus, pro, top)], ["low", "low", "medium", "high"])
        self.assertEqual([p.effort_for("low") for p in (free, plus, pro, top)], ["low", "low", "low", "medium"])
        self.assertEqual(top.effort_for("high"), "high")  # never above the top

    def test_every_step_up_buys_more_thinking_room_or_more_use(self):
        order = [m.plan_for(t) for t in m.TIERS]
        self.assertEqual([p.tier for p in order], ["free", "plus", "pro", "max"])
        self.assertEqual([p.daily_credits for p in order], sorted({p.daily_credits for p in order}))  # strictly increasing
        self.assertGreater(order[3].budget_x, order[2].budget_x)

    def test_pro_is_exactly_what_every_premium_person_had_before_plans(self):
        pro = m.plan_for("pro")
        self.assertEqual(pro.model, m.primary_model())
        self.assertEqual(pro.fallback, m.fallback_model())
        self.assertEqual((pro.effort_shift, pro.budget_x), (0, 1.0))
        self.assertEqual(m.plan_for("something else").tier, "pro")  # an unknown plan is served as Pro, never as Max
        self.assertEqual(m.plan_for(None).tier, "pro")

    def test_the_free_plan_has_no_fallback_and_paid_plans_fall_back_to_the_small_model(self):
        self.assertIsNone(m.plan_for("free").fallback)
        for tier in ("plus", "pro", "max"):
            self.assertEqual(m.plan_for(tier).fallback, "openai/gpt-oss-20b")

    def test_one_plans_model_can_be_swapped_without_touching_the_others(self):
        os.environ["GROQ_MODEL_MAX"] = "some/better-model"
        self.assertEqual(m.plan_for("max").model, "some/better-model")
        self.assertEqual(m.plan_for("pro").model, "openai/gpt-oss-120b")
        self.assertEqual(m.plan_for("free").model, "openai/gpt-oss-20b")

    def test_groq_model_still_wins_for_every_plan_and_turns_every_fallback_off(self):
        os.environ["GROQ_MODEL"] = "openai/gpt-oss-20b"
        os.environ["GROQ_MODEL_MAX"] = "ignored/when-groq-model-is-set"
        for tier in m.TIERS:
            plan = m.plan_for(tier)
            self.assertEqual(plan.model, "openai/gpt-oss-20b", tier)
            self.assertIsNone(plan.fallback, tier)

    def test_an_answer_is_filed_per_plan_so_max_never_gets_plus_answers_or_the_other_way_round(self):
        ids = {m.plan_for(t).cache_id for t in m.TIERS}
        self.assertEqual(len(ids), 4)

    def test_the_free_plan_can_only_use_the_writing_assistant(self):
        self.assertTrue(m.allowed("free", "analyze"))
        for task in m.TASKS:
            if task != "analyze":
                self.assertFalse(m.allowed("free", task), task)
            self.assertTrue(m.allowed("plus", task), task)
            self.assertTrue(m.allowed("max", task), task)
        self.assertEqual(set(m.MIN_TIER), set(m.TASKS))  # a new kind of call must say who may use it

    def test_daily_allowances_can_be_changed_in_the_environment(self):
        os.environ["AI_DAILY_FREE"] = "3"
        os.environ["AI_DAILY_PLUS"] = "not a number"
        self.assertEqual(m.plan_for("free").daily_credits, 3)
        self.assertEqual(m.plan_for("plus").daily_credits, 25)  # a bad value falls back to the default


class PlanCalls(PlanTestCase):
    def test_max_thinks_high_with_more_room_where_pro_thinks_medium(self):
        pro_client, max_client = FakeClient(reply(GOOD)), FakeClient(reply(GOOD))
        run(pro_client, plan=m.plan_for("pro"))
        run(max_client, plan=m.plan_for("max"))
        self.assertEqual(pro_client.calls[0]["extra_body"], {"reasoning_effort": "medium"})
        self.assertEqual(max_client.calls[0]["extra_body"], {"reasoning_effort": "high"})
        self.assertEqual(max_client.calls[0]["max_completion_tokens"], int(m.TASKS["letter"].max_tokens * 1.3))
        self.assertGreater(max_client.calls[0]["max_completion_tokens"], pro_client.calls[0]["max_completion_tokens"])

    def test_free_runs_on_the_small_model_at_low_thinking(self):
        client = FakeClient(reply(GOOD))
        run(client, task="analyze", plan=m.plan_for("free"))
        self.assertEqual(client.calls[0]["model"], "openai/gpt-oss-20b")
        self.assertEqual(client.calls[0]["extra_body"], {"reasoning_effort": "low"})

    def test_plus_uses_the_large_model_with_little_thinking(self):
        client = FakeClient(reply(GOOD))
        run(client, task="analyze", plan=m.plan_for("plus"))
        self.assertEqual(client.calls[0]["model"], "openai/gpt-oss-120b")
        self.assertEqual(client.calls[0]["extra_body"], {"reasoning_effort": "low"})

    def test_the_free_plan_has_nothing_to_fall_back_to(self):
        client = FakeClient(RuntimeError("429 rate limit"))
        with self.assertRaises(RuntimeError):
            run(client, task="analyze", plan=m.plan_for("free"))
        self.assertEqual(len(client.calls), 1)

    def test_a_paid_plan_falls_back_to_the_small_model(self):
        client = FakeClient(RuntimeError("429 rate limit"), reply(GOOD))
        self.assertEqual(run(client, task="analyze", plan=m.plan_for("max")), GOOD)
        self.assertEqual([c["model"] for c in client.calls], ["openai/gpt-oss-120b", "openai/gpt-oss-20b"])

    def test_a_cut_off_max_reply_is_retried_with_room_but_never_beyond_the_cap(self):
        client = FakeClient(reply("{", finish="length"), reply(GOOD))
        run(client, task="letter", plan=m.plan_for("max"))
        first, second = client.calls
        self.assertEqual(second["extra_body"], {"reasoning_effort": "low"})
        self.assertGreater(second["max_completion_tokens"], first["max_completion_tokens"])
        self.assertLessEqual(second["max_completion_tokens"], int(8000 * 1.3))

    def test_no_plan_means_the_default_plan_so_older_callers_are_unchanged(self):
        client = FakeClient(reply(GOOD))
        run(client, task="letter")
        self.assertEqual(client.calls[0]["extra_body"], {"reasoning_effort": "medium"})


class Allowance(PlanTestCase):
    NOON = datetime.datetime(2026, 11, 13, 10, 0, tzinfo=m.SOUTH_AFRICA)

    def test_every_request_is_counted_until_the_days_allowance_is_used_up(self):
        for n in range(1, 7):
            self.assertEqual(m.spend("free", "acct-1", "analyze", now=self.NOON), (n, 6))
        with self.assertRaises(m.QuotaExceeded) as caught:
            m.spend("free", "acct-1", "analyze", now=self.NOON)
        self.assertEqual((caught.exception.tier, caught.exception.limit, caught.exception.used), ("free", 6, 6))
        self.assertEqual(m.usage("acct-1", "free", now=self.NOON), (6, 6))  # the refused request was not charged

    def test_a_letter_costs_two_and_is_refused_when_only_one_is_left(self):
        os.environ["AI_DAILY_PLUS"] = "5"
        self.assertEqual(m.spend("plus", "acct-1", "letter", now=self.NOON), (2, 5))
        self.assertEqual(m.spend("plus", "acct-1", "letter", now=self.NOON), (4, 5))
        with self.assertRaises(m.QuotaExceeded):
            m.spend("plus", "acct-1", "letter", now=self.NOON)
        self.assertEqual(m.spend("plus", "acct-1", "analyze", now=self.NOON), (5, 5))  # the last single credit still works

    def test_people_do_not_share_an_allowance(self):
        for _ in range(6):
            m.spend("free", "acct-1", "analyze", now=self.NOON)
        self.assertEqual(m.spend("free", "acct-2", "analyze", now=self.NOON), (1, 6))

    def test_the_day_starts_again_at_midnight_in_south_africa_not_in_utc(self):
        utc = datetime.timezone.utc
        for _ in range(6):
            m.spend("free", "acct-1", "analyze", now=datetime.datetime(2026, 11, 13, 21, 59, tzinfo=utc))  # 23:59 in SA
        with self.assertRaises(m.QuotaExceeded):
            m.spend("free", "acct-1", "analyze", now=datetime.datetime(2026, 11, 13, 21, 59, tzinfo=utc))
        # 22:00 UTC is 00:00 in South Africa: a new day
        self.assertEqual(m.spend("free", "acct-1", "analyze", now=datetime.datetime(2026, 11, 13, 22, 0, tzinfo=utc)), (1, 6))

    def test_a_plan_with_no_allowance_cannot_use_the_ai_at_all(self):
        os.environ["AI_DAILY_FREE"] = "0"
        with self.assertRaises(m.QuotaExceeded):
            m.spend("free", "acct-1", "analyze", now=self.NOON)

    def test_a_higher_plan_has_room_the_lower_one_does_not(self):
        for _ in range(6):
            m.spend("free", "acct-1", "analyze", now=self.NOON)
        # paying for Plus lifts the limit for the same account straight away
        self.assertEqual(m.spend("plus", "acct-1", "analyze", now=self.NOON), (7, 25))


class ReadingReplies(unittest.TestCase):
    def test_fences_and_stray_prose_are_tolerated(self):
        self.assertEqual(m.extract_json('```json\n{"a": 1}\n```'), {"a": 1})
        self.assertEqual(m.extract_json('Here you go: {"a": 1} hope that helps'), {"a": 1})

    def test_not_an_object_is_an_error(self):
        for bad in ("", "[1, 2]", "no braces at all"):
            with self.assertRaises(ValueError):
                m.extract_json(bad)


if __name__ == "__main__":
    unittest.main()
