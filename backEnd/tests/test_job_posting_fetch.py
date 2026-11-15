"""Run with:  python -m unittest tests.test_job_posting_fetch   (from the backEnd folder; needs nothing installed)

Reading a job advert from a link (routers/job_posting.py) fails in many different ways: the website drops the
connection, answers too slowly, refuses robots, sets a cookie and redirects, or the link holds an accent. These tests
start small web servers on this computer and check that each case ends the way the person needs: the page is read, or
the message says what really happened and the reason is kept for whoever debugs it.

Only plain http is used here (no certificates to set up); the connection code is the same for https apart from the
secure handshake.
"""
import http.server
import socket
import struct
import threading
import time
import unittest
from unittest import mock

from routers import job_posting as jp

JOB_PAGE = (
    "<html><head><title>Quality Controller</title>"
    '<script type="application/ld+json">{"@type":"JobPosting","title":"Quality Controller",'
    '"hiringOrganization":{"name":"Acme Foods"},'
    '"description":"We need a quality controller to inspect incoming goods, keep records and report defects to the '
    'production manager. Matric is required. Experience with sampling and inspection of food products is an advantage."}'
    "</script></head><body><main><h1>Quality Controller</h1></main></body></html>"
)


def send(handler, body=JOB_PAGE, status=200, headers=None):
    data = body.encode()
    handler.send_response(status)
    handler.send_header("Content-Type", "text/html; charset=utf-8")
    for key, value in (headers or {}).items():
        handler.send_header(key, value)
    handler.send_header("Content-Length", str(len(data)))
    handler.end_headers()
    handler.wfile.write(data)


def hang_up(handler):
    handler.connection.close()
    handler.close_connection = True


def reset(handler):
    handler.connection.setsockopt(socket.SOL_SOCKET, socket.SO_LINGER, struct.pack("ii", 1, 0))
    hang_up(handler)


class Site:
    """A throwaway website. `behaviour(handler, n)` answers request number n (1, 2, ...)."""

    def __init__(self, behaviour):
        seen = self.seen = []

        class Handler(http.server.BaseHTTPRequestHandler):
            protocol_version = "HTTP/1.1"

            def log_message(self, *args):
                pass

            def do_GET(self):
                seen.append({"path": self.path, "headers": dict(self.headers)})
                behaviour(self, len(seen))

        self.server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.server.daemon_threads = True
        self.port = self.server.server_address[1]
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def close(self):
        self.server.shutdown()
        self.server.server_close()


class FetchTest(unittest.TestCase):
    def read(self, behaviour, path="/jobs/1", addresses=("127.0.0.1",), **limits):
        """Reads `path` from a throwaway site. -> (Posting or PostingError, requests the site saw)."""
        site = Site(behaviour)
        self.addCleanup(site.close)
        real_parse = jp.parse_job_url
        patches = [
            mock.patch.object(jp, "_resolve_public", lambda host, port: list(addresses)),  # "jobs.test" lives here
            mock.patch.object(jp, "parse_job_url", lambda raw: real_parse(raw)[:2] + (site.port,) + real_parse(raw)[3:]),
        ] + [mock.patch.object(jp, name, value) for name, value in limits.items()]
        for patch in patches:
            patch.start()
            self.addCleanup(patch.stop)
        try:
            return jp.read_posting_url("http://jobs.test" + path), site.seen
        except jp.PostingError as err:
            return err, site.seen


class ReadingAPage(FetchTest):
    def test_a_normal_page_is_read(self):
        result, _ = self.read(lambda h, n: send(h))
        self.assertEqual(result.structured["title"], "Quality Controller")
        self.assertEqual(result.structured["company"], "Acme Foods")

    def test_the_request_is_the_one_a_browser_makes(self):
        _, seen = self.read(lambda h, n: send(h))
        headers = seen[0]["headers"]
        self.assertIn("Chrome/", headers["User-Agent"])
        self.assertNotIn("robot", headers["User-Agent"].lower())
        self.assertEqual(headers["Sec-Fetch-Mode"], "navigate")
        self.assertIn("text/html", headers["Accept"])

    def test_the_query_string_is_sent_as_it_was_typed(self):
        _, seen = self.read(lambda h, n: send(h), path="/jobs--QC--4286391-inline.html?rltr=1_1_25_seorl_m_0_0_0")
        self.assertEqual(seen[0]["path"], "/jobs--QC--4286391-inline.html?rltr=1_1_25_seorl_m_0_0_0")

    def test_an_accent_or_long_dash_in_the_link_does_not_crash(self):
        # The request line can only carry ASCII: it used to raise UnicodeEncodeError (an HTTP 500 for the person).
        result, seen = self.read(lambda h, n: send(h), path="/jobs/Café–Manager?q=é")
        self.assertEqual(seen[0]["path"], "/jobs/Caf%C3%A9%E2%80%93Manager?q=%C3%A9")
        self.assertEqual(result.structured["title"], "Quality Controller")

    def test_escapes_already_in_the_link_are_left_alone(self):
        _, seen = self.read(lambda h, n: send(h), path="/a%20b/c?x=1&y=%2F")
        self.assertEqual(seen[0]["path"], "/a%20b/c?x=1&y=%2F")

    def test_a_site_that_sets_a_cookie_and_redirects_back_is_followed(self):
        def gate(h, n):
            if "seen=1" in (h.headers.get("Cookie") or ""):
                send(h)
            else:
                send(h, "", 302, {"Set-Cookie": "seen=1; Path=/; HttpOnly", "Location": "/jobs/1"})

        result, seen = self.read(gate)
        self.assertEqual(len(seen), 2)
        self.assertEqual(result.structured["title"], "Quality Controller")

    def test_an_endless_redirect_stops(self):
        result, seen = self.read(lambda h, n: send(h, "", 302, {"Location": "/jobs/1"}))
        self.assertIsInstance(result, jp.PostingError)
        self.assertIn("redirects too many times", result.message)
        self.assertEqual(len(seen), jp.MAX_REDIRECTS + 1)


class WhenTheSiteHangsUp(FetchTest):
    def test_the_message_says_so_and_the_reason_is_kept(self):
        result, seen = self.read(lambda h, n: hang_up(h))
        self.assertIsInstance(result, jp.PostingError)
        self.assertIn("closed the connection", result.message)
        self.assertTrue(result.reason.startswith("closed:"), result.reason)
        self.assertEqual(len(seen), 2)  # one address: it gets a second go

    def test_a_reset_is_the_same(self):
        result, _ = self.read(lambda h, n: reset(h))
        self.assertIn("closed the connection", result.message)

    def test_a_flaky_first_connection_does_not_fail_the_link(self):
        result, seen = self.read(lambda h, n: hang_up(h) if n == 1 else send(h))
        self.assertEqual(len(seen), 2)
        self.assertEqual(result.structured["title"], "Quality Controller")

    def test_the_next_address_is_tried_when_the_first_refuses(self):
        # 127.0.0.2 has nobody listening (the site is on 127.0.0.1 only), so it refuses; the next address answers.
        result, _ = self.read(lambda h, n: send(h), addresses=("127.0.0.2", "127.0.0.1"))
        self.assertEqual(result.structured["title"], "Quality Controller")


class WhenTheSiteIsSlow(FetchTest):
    def test_a_site_that_never_answers_gets_a_clear_message_and_one_wait(self):
        started = time.monotonic()
        result, seen = self.read(lambda h, n: time.sleep(3), READ_TIMEOUT_S=1)
        self.assertIn("took too long", result.message)
        self.assertTrue(result.reason.startswith("timeout:"), result.reason)
        self.assertEqual(len(seen), 1)  # not asked a second time: it would only use up the time limit
        self.assertLess(time.monotonic() - started, 2.5)

    def test_a_site_that_stalls_part_way_still_gives_what_arrived(self):
        def stall(h, n):
            data = JOB_PAGE.encode()
            h.send_response(200)
            h.send_header("Content-Type", "text/html; charset=utf-8")
            h.send_header("Content-Length", str(len(data) + 5000))  # promises more than it sends
            h.end_headers()
            h.wfile.write(data)
            h.wfile.flush()
            time.sleep(3)

        result, _ = self.read(stall, READ_TIMEOUT_S=1)
        self.assertEqual(result.structured["title"], "Quality Controller")


class OtherAnswers(FetchTest):
    def test_forbidden(self):
        result, _ = self.read(lambda h, n: send(h, "", 403))
        self.assertIn("doesn't let us read", result.message)
        self.assertEqual(result.reason, "HTTP 403")

    def test_not_found(self):
        result, _ = self.read(lambda h, n: send(h, "", 404))
        self.assertIn("wasn't found", result.message)

    def test_a_server_error_keeps_its_status_as_the_reason(self):
        result, _ = self.read(lambda h, n: send(h, "", 503))
        self.assertEqual(result.reason, "HTTP 503")

    def test_nothing_listening(self):
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", 0))
            port = probe.getsockname()[1]  # free again as soon as the probe closes
        with mock.patch.object(jp, "_resolve_public", lambda host, p: ["127.0.0.1"]), mock.patch.object(
            jp, "parse_job_url", lambda raw: ("http", "jobs.test", port, "/")
        ):
            with self.assertRaises(jp.PostingError) as caught:
                jp.read_posting_url("http://jobs.test/")
        self.assertIn("refused the connection", caught.exception.message)


class StillSafe(unittest.TestCase):
    """The address is typed by a visitor, so none of these may ever be downloaded (no DNS needed: they are literals)."""

    def test_private_and_local_addresses_are_refused(self):
        for url in (
            "http://127.0.0.1/",
            "http://169.254.169.254/latest/meta-data/",
            "http://10.0.0.5/",
            "http://[::1]/",
            "http://[::ffff:127.0.0.1]/",
            "http://localhost/",
            "http://jobs.internal/",
            "http://user:secret@example.com/",
            "http://example.com:8080/",
            "ftp://example.com/",
        ):
            with self.subTest(url=url):
                with self.assertRaises(jp.PostingError) as caught:
                    jp.fetch_page(url)
                self.assertEqual(caught.exception.code, "badlink")

    def test_a_redirect_to_a_private_address_is_refused(self):
        site = Site(lambda h, n: send(h, "", 302, {"Location": "http://169.254.169.254/latest/"}))
        self.addCleanup(site.close)
        real_parse, real_resolve = jp.parse_job_url, jp._resolve_public
        with mock.patch.object(jp, "_resolve_public", lambda host, p: ["127.0.0.1"] if host == "jobs.test" else real_resolve(host, p)), mock.patch.object(
            jp, "parse_job_url", lambda raw: (lambda t: t[:2] + (site.port if t[1] == "jobs.test" else t[2],) + t[3:])(real_parse(raw))
        ):
            with self.assertRaises(jp.PostingError) as caught:
                jp.fetch_page("http://jobs.test/x")
        self.assertEqual(caught.exception.code, "badlink")


if __name__ == "__main__":
    unittest.main()
