"""Run with:  python -m unittest tests.test_ai_models   (from the backEnd folder; needs nothing installed)

routers/ai_models.py decides which Groq model answers, how hard it thinks, and what happens when it fails. These tests
use a FAKE client, so no key and no network are needed.
"""
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
