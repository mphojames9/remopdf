"""
Reading a job posting for the cover letter (used by POST /api/writing/job-posting in routers/writing_ai.py).

This file does the part that needs no AI and no accounts:

    read_posting_url(url)   download the page the person pasted and return what is on it
                            (page text, the site's own "JobPosting" data when it has some)
    read_posting_text(text) the same shape, from a job description the person pasted instead
    clean_posting_fields()  keeps only what the AI extracted if the page really says it

Only the standard library is used, so there is nothing new to install.

SAFETY. The server downloads an address that a visitor typed, so the address is treated as hostile:
  - only http and https, only ports 80 and 443, no user:password@ in the address;
  - the host name is resolved here and EVERY address it resolves to must be a public one (no localhost, private
    networks, link-local addresses such as the cloud metadata address 169.254.169.254, and so on);
  - the connection is then made to that exact address, so the name cannot be pointed somewhere else between the
    check and the download (DNS rebinding); the certificate is still checked against the real host name;
  - every redirect is checked the same way, and at most MAX_REDIRECTS are followed;
  - the download is cut off after MAX_BYTES and after TOTAL_TIMEOUT_S seconds; only text pages are accepted.

WHEN A LINK CANNOT BE READ. Every way the download can fail ends in a PostingError whose `message` says what happened
in plain words (timed out, refused, closed the connection, blocked us ...) and whose `reason` holds the technical
detail. The reason is printed to the server log and sent back with the error, so a refusal can be traced from the
browser's Network tab or the Render logs instead of guessing.
"""
import functools
import html as html_lib
import http.client
import ipaddress
import json
import os
import re
import socket
import ssl
import time
import zlib
from html.parser import HTMLParser
from typing import Dict, List, Optional
from urllib.parse import quote, urljoin, urlsplit

MAX_BYTES = 1_500_000  # a job page is far smaller; more than this is cut off, not an error
MAX_REDIRECTS = 4
CONNECT_TIMEOUT_S = 10  # how long to wait for a website to accept the connection
READ_TIMEOUT_S = 15  # how long to wait for it to send (the next piece of) the page; a busy job board can be slow
TOTAL_TIMEOUT_S = 25  # the whole download, redirects included
MAX_ADDRESSES = 3  # a website can have several addresses: try up to this many before giving up
TEXT_LIMIT = 14000  # characters of page text handed to the AI
MIN_TEXT_CHARS = 200  # less than this means the page holds no job description (or it only loads in a browser)

# Job boards commonly answer a browser and drop the connection (or refuse) for anything that calls itself a robot, so
# the page is asked for the way a normal browser asks. Browser versions age: set JOB_READER_USER_AGENT in the
# environment (Render) to change it without touching the code, or bump CHROME_MAJOR here now and then.
CHROME_MAJOR = "142"
_DEFAULT_USER_AGENT = f"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{CHROME_MAJOR}.0.0.0 Safari/537.36"
USER_AGENT = (os.environ.get("JOB_READER_USER_AGENT") or "").strip() or _DEFAULT_USER_AGENT

REQUEST_HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-ZA,en;q=0.9",
    "Accept-Encoding": "gzip",  # the only compression _read_body can unpack
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
}
if USER_AGENT == _DEFAULT_USER_AGENT:  # browser hints must agree with the User-Agent, or they give the game away
    REQUEST_HEADERS.update({
        "Sec-CH-UA": f'"Chromium";v="{CHROME_MAJOR}", "Google Chrome";v="{CHROME_MAJOR}", "Not_A Brand";v="99"',
        "Sec-CH-UA-Mobile": "?0",
        "Sec-CH-UA-Platform": '"Windows"',
    })


class PostingError(Exception):
    """Something the person can act on. code: badlink | unreadable | nodetails.

    message  what the person sees.
    reason   for whoever is debugging (server log, the browser's Network tab): the technical detail. May be empty.
    """

    def __init__(self, code: str, message: str, reason: str = ""):
        super().__init__(message)
        self.code = code
        self.message = message
        self.reason = reason


PASTE_HINT = "Paste the job description into the box instead."


# --------------------------------------------------------------------------- #
#                                  the address                                #
# --------------------------------------------------------------------------- #

_SCHEME_RE = re.compile(r"^[a-z][a-z0-9+.\-]*://", re.I)
_BLOCKED_NAME_SUFFIXES = (".localhost", ".local", ".internal", ".lan", ".home", ".corp", ".intranet")


def _is_public(ip_text: str) -> bool:
    try:
        ip = ipaddress.ip_address(ip_text.split("%")[0])
    except ValueError:
        return False
    mapped = getattr(ip, "ipv4_mapped", None)  # ::ffff:127.0.0.1 is 127.0.0.1
    if mapped is not None:
        ip = mapped
    return ip.is_global and not ip.is_multicast


def parse_job_url(raw: str):
    """-> (scheme, host, port, path_and_query). Raises PostingError('badlink')."""
    value = (raw or "").strip()
    if not value or len(value) > 2000 or re.search(r"\s", value):
        raise PostingError("badlink", "That doesn't look like a web address.")
    if not _SCHEME_RE.match(value):
        value = "https://" + value  # "www.pnet.co.za/..." typed without https://
    try:
        parts = urlsplit(value)
        port = parts.port
    except ValueError:
        raise PostingError("badlink", "That doesn't look like a web address.")

    if parts.scheme.lower() not in ("http", "https"):
        raise PostingError("badlink", "Only web addresses starting with http:// or https:// can be used.")
    if parts.username or parts.password:
        raise PostingError("badlink", "That web address can't be used.")
    host = (parts.hostname or "").rstrip(".").lower()
    if not host:
        raise PostingError("badlink", "That doesn't look like a web address.")
    scheme = parts.scheme.lower()
    default_port = 443 if scheme == "https" else 80
    if port is not None and port not in (80, 443):
        raise PostingError("badlink", "That web address can't be used.")
    port = port or default_port

    try:
        host = host.encode("idna").decode("ascii")
    except UnicodeError:
        raise PostingError("badlink", "That doesn't look like a web address.")
    if host == "localhost" or host.endswith(_BLOCKED_NAME_SUFFIXES):
        raise PostingError("badlink", "That web address can't be used.")

    path = parts.path or "/"
    if parts.query:
        path = f"{path}?{parts.query}"
    # A web address copied from a page can hold letters a request line cannot carry (an accent, a long dash, a curly
    # quote). They are sent as %XX, the way a browser does it; escapes that are already there stay as they are.
    path = quote(path, safe="/%:@!$&'()*+,;=~-._?[]")
    return scheme, host, port, path


def _resolve_public(host: str, port: int) -> List[str]:
    """Every address to try, best first. Every address the name resolves to must be public."""
    try:
        infos = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except (socket.gaierror, UnicodeError, OSError) as err:
        raise PostingError(
            "unreadable",
            "That website could not be found. Check the link, or paste the job description into the box instead.",
            f"dns: {type(err).__name__}: {str(err)[:120]}",
        )
    addresses = []
    for info in infos:
        ip = info[4][0]
        if ip not in addresses:
            addresses.append(ip)
    if not addresses or not all(_is_public(ip) for ip in addresses):
        raise PostingError("badlink", "That web address can't be used.")
    # Prefer IPv4: some hosts publish an IPv6 address they cannot actually serve. The rest are the fallbacks.
    addresses.sort(key=lambda ip: ":" in ip)
    return addresses


# --------------------------------------------------------------------------- #
#                                 the download                                #
# --------------------------------------------------------------------------- #

@functools.lru_cache(maxsize=1)
def _tls_context() -> ssl.SSLContext:
    context = ssl.create_default_context()  # certificate and host name are checked
    context.set_alpn_protocols(["http/1.1"])  # say so, as a browser does (this code only speaks HTTP/1.1)
    return context


class _PinnedHTTP(http.client.HTTPConnection):
    """Connects to one chosen address (`ip`), whatever the host name resolves to later."""

    def __init__(self, host, port, ip, connect_timeout, read_timeout):
        super().__init__(host, port, timeout=read_timeout)
        self._ip = ip
        self._connect_timeout = connect_timeout

    def connect(self):
        sock = socket.create_connection((self._ip, self.port), self._connect_timeout)
        sock.settimeout(self.timeout)  # from here on the limit is how long the site may stay silent
        self.sock = sock


class _PinnedHTTPS(http.client.HTTPSConnection):
    def __init__(self, host, port, ip, connect_timeout, read_timeout):
        super().__init__(host, port, timeout=read_timeout, context=_tls_context())
        self._ip = ip
        self._connect_timeout = connect_timeout

    def connect(self):
        sock = socket.create_connection((self._ip, self.port), self._connect_timeout)
        sock.settimeout(self.timeout)
        try:
            self.sock = self._context.wrap_socket(sock, server_hostname=self.host)  # certificate checked for the host name
        except BaseException:
            sock.close()
            raise


class _NetworkFailure(Exception):
    """One failed attempt to reach a website. kind: certificate | timeout | refused | closed | unreachable | other."""

    def __init__(self, kind: str, reason: str):
        super().__init__(reason)
        self.kind = kind
        self.reason = reason


# What the person is told for each kind of failure. The honest cause is far more useful than one catch-all line:
# "closed the connection" means the website is turning robots away, "timed out" means it was too slow.
_FAILURE_TEXT = {
    "certificate": "That website's security certificate could not be verified. ",
    "timeout": "That website took too long to answer. ",
    "refused": "That website refused the connection. ",
    "closed": "That website closed the connection without showing the page, which job boards often do to automated readers. ",
    "unreachable": "We could not connect to that website. ",
    "other": "That page could not be reached. ",
}


def _classify(err: BaseException) -> _NetworkFailure:
    reason = type(err).__name__ + (f": {str(err)[:150]}" if str(err) else "")
    text = str(err).lower()
    if isinstance(err, ssl.SSLCertVerificationError):
        kind = "certificate"
    elif isinstance(err, (socket.timeout, TimeoutError)) or "timed out" in text:
        kind = "timeout"
    elif isinstance(err, ConnectionRefusedError):
        kind = "refused"
    elif isinstance(err, (ssl.SSLError, ConnectionError, http.client.RemoteDisconnected, http.client.BadStatusLine, http.client.IncompleteRead)):
        # A reset, a dropped connection, an empty answer, or a refused secure handshake: the site hung up on us.
        kind = "closed"
    elif isinstance(err, OSError) and err.errno in (101, 113, 51, 65, 10051, 10065):  # network / host unreachable (Linux, macOS, Windows)
        kind = "unreachable"
    else:
        kind = "other"
    return _NetworkFailure(kind, reason)


def _remember_cookies(jar: Dict[str, str], response) -> None:
    """Keeps the cookies a site sets while redirecting us, for the next step of the same download (some sites send
    "set a cookie, then try again" and would otherwise redirect forever). Never kept beyond this one download."""
    for header in response.msg.get_all("Set-Cookie") or []:
        pair = header.split(";", 1)[0].strip()
        name, _, value = pair.partition("=")
        name = name.strip()
        if not name:
            continue
        if not value or "max-age=0" in header.lower():
            jar.pop(name, None)
        elif len(jar) < 20:
            jar[name] = value.strip()[:1000]


def _attempt(scheme: str, host: str, port: int, ip: str, path: str, headers: Dict[str, str], deadline: float):
    """One try at one address. -> (connection, response); the caller closes the connection. Raises _NetworkFailure."""
    left = deadline - time.monotonic()
    if left <= 0:
        raise _NetworkFailure("timeout", "the time limit for the whole download ran out")
    connection_class = _PinnedHTTPS if scheme == "https" else _PinnedHTTP
    connection = connection_class(host, port, ip, min(CONNECT_TIMEOUT_S, left), min(READ_TIMEOUT_S, left))
    try:
        connection.request("GET", path, headers=headers)
        return connection, connection.getresponse()
    except (OSError, http.client.HTTPException) as err:
        connection.close()
        raise _classify(err)


def _connect(scheme: str, host: str, port: int, addresses: List[str], path: str, headers: Dict[str, str], deadline: float):
    """Tries the website's addresses in turn until one answers. -> (connection, response). Raises PostingError."""
    tries = addresses[:MAX_ADDRESSES]
    if len(tries) == 1:
        tries = tries * 2  # a site with one address gets a second go: one that drops the first connection often answers the next
    failure: Optional[_NetworkFailure] = None
    timed_out = set()
    for ip in tries:
        if ip in timed_out:
            continue  # it was too slow a moment ago; a second wait would only use up the time limit
        try:
            return _attempt(scheme, host, port, ip, path, headers, deadline)
        except _NetworkFailure as err:
            failure = err
            print(f"[job_posting] {host}: {err.kind}: {err.reason}")  # the host only, never the full link (it can carry tokens)
            if err.kind == "timeout":
                timed_out.add(ip)
            elif err.kind == "certificate":
                break  # another address will not fix a certificate
    failure = failure or _NetworkFailure("timeout", "the time limit for the whole download ran out")
    raise PostingError("unreadable", _FAILURE_TEXT[failure.kind] + PASTE_HINT, f"{failure.kind}: {failure.reason}")


def _charset(content_type: str, head: bytes) -> str:
    match = re.search(r"charset\s*=\s*[\"']?([\w\-]+)", content_type or "", re.I)
    if not match:
        match = re.search(rb"<meta[^>]+charset\s*=\s*[\"']?([\w\-]+)", head[:4096], re.I)
        name = match.group(1).decode("ascii", "ignore") if match else ""
    else:
        name = match.group(1)
    try:
        if name:
            "".encode(name)  # is it a codec Python knows?
            return name
    except LookupError:
        pass
    return "utf-8"


def _read_body(response, deadline: float) -> bytes:
    encoding = (response.getheader("Content-Encoding") or "identity").lower().strip()
    if encoding in ("gzip", "x-gzip"):
        inflater = zlib.decompressobj(16 + zlib.MAX_WBITS)
    elif encoding == "deflate":
        inflater = zlib.decompressobj()
    elif encoding in ("identity", ""):
        inflater = None
    else:
        raise PostingError("unreadable", "That page could not be read. " + PASTE_HINT, f"unsupported Content-Encoding: {encoding[:20]}")

    chunks: List[bytes] = []
    size = 0
    while size < MAX_BYTES:
        if time.monotonic() > deadline:
            break  # a slow page: use what has arrived
        try:
            chunk = response.read1(65536)  # whatever has arrived, not "wait until 64 KB is here"
        except (OSError, http.client.HTTPException):
            if chunks:
                break  # the site stalled or hung up part-way: use what came
            raise
        if not chunk:
            break
        if inflater is not None:
            try:
                chunk = inflater.decompress(chunk, MAX_BYTES - size)  # bounded, so a "zip bomb" cannot grow
            except zlib.error:
                break
        chunks.append(chunk)
        size += len(chunk)
    return b"".join(chunks)[:MAX_BYTES]


def fetch_page(url: str) -> Dict[str, str]:
    """Downloads the page. -> {'html': str, 'url': final address}. Raises PostingError."""
    deadline = time.monotonic() + TOTAL_TIMEOUT_S
    current = url
    cookies: Dict[str, Dict[str, str]] = {}  # per host, for the redirects of this one download only

    for _ in range(MAX_REDIRECTS + 1):
        scheme, host, port, path = parse_job_url(current)
        addresses = _resolve_public(host, port)
        jar = cookies.setdefault(host, {})
        headers = dict(REQUEST_HEADERS)
        if jar:
            headers["Cookie"] = "; ".join(f"{name}={value}" for name, value in jar.items())

        connection, response = _connect(scheme, host, port, addresses, path, headers, deadline)
        try:
            status = response.status
            if status in (301, 302, 303, 307, 308):
                location = response.getheader("Location")
                if not location:
                    raise PostingError("unreadable", "That page could not be read. " + PASTE_HINT, f"HTTP {status} with no Location header")
                _remember_cookies(jar, response)
                current = urljoin(f"{scheme}://{host}{path}", location)
                continue
            if status in (401, 403, 429, 999):
                print(f"[job_posting] {host}: HTTP {status}")
                raise PostingError("unreadable", "That site doesn't let us read the page automatically. " + PASTE_HINT, f"HTTP {status}")
            if status in (404, 410):
                raise PostingError("unreadable", "That page wasn't found. The advert may have closed, or the link is incomplete.", f"HTTP {status}")
            if status != 200:
                print(f"[job_posting] {host}: HTTP {status}")
                raise PostingError("unreadable", "That page could not be read. " + PASTE_HINT, f"HTTP {status}")

            content_type = (response.getheader("Content-Type") or "").lower()
            if content_type and not any(t in content_type for t in ("text/html", "application/xhtml", "text/plain")):
                raise PostingError("unreadable", "That link isn't a web page we can read. " + PASTE_HINT, f"content type {content_type[:60]}")

            try:
                raw = _read_body(response, deadline)
            except (OSError, http.client.HTTPException) as err:
                failure = _classify(err)
                print(f"[job_posting] {host}: while reading the page: {failure.kind}: {failure.reason}")
                raise PostingError("unreadable", "That page could not be read. " + PASTE_HINT, f"reading the page: {failure.reason}")
            return {"html": raw.decode(_charset(content_type, raw), errors="replace"), "url": current}
        finally:
            connection.close()

    raise PostingError("unreadable", "That link redirects too many times. " + PASTE_HINT, f"more than {MAX_REDIRECTS} redirects")


# --------------------------------------------------------------------------- #
#                                 reading HTML                                #
# --------------------------------------------------------------------------- #

_BLOCK_TAGS = {
    "p", "div", "br", "ul", "ol", "tr", "table", "section", "article", "main", "header", "dl", "dd", "dt",
    "h1", "h2", "h3", "h4", "h5", "h6", "hr", "blockquote", "pre", "form", "fieldset", "li",
}
# Only tags that always have an end tag: skipping a void tag such as <embed> would hide the rest of the page.
_ALWAYS_SKIP = {"script", "style", "noscript", "svg", "template", "iframe", "canvas", "object"}
_CHROME_SKIP = {"nav", "footer"}


class _Page(HTMLParser):
    def __init__(self, skip_chrome: bool = True):
        super().__init__(convert_charrefs=True)
        self.skip = set(_ALWAYS_SKIP) | (_CHROME_SKIP if skip_chrome else set())
        self.depth = 0
        self.parts: List[str] = []
        self.title = ""
        self.meta: Dict[str, str] = {}
        self._in_title = False

    def handle_starttag(self, tag, attrs):
        if tag == "title":
            self._in_title = True
        elif tag == "meta":
            a = {k.lower(): (v or "") for k, v in attrs}
            key = (a.get("property") or a.get("name") or "").lower()
            if key in ("og:site_name", "og:title", "description", "og:description") and a.get("content"):
                self.meta.setdefault(key, a["content"].strip())
        if tag in self.skip:
            self.depth += 1
            return
        if self.depth:
            return
        if tag == "li":
            self.parts.append("\n- ")
        elif tag in _BLOCK_TAGS:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False
        if tag in self.skip:
            self.depth = max(0, self.depth - 1)
            return
        if not self.depth and tag in _BLOCK_TAGS:
            self.parts.append("\n")

    def handle_data(self, data):
        if self._in_title:
            self.title += data
            return
        if not self.depth:
            self.parts.append(data)


def _tidy(text: str) -> str:
    lines = []
    for raw in text.replace("\xa0", " ").split("\n"):
        line = re.sub(r"[ \t\r\f\v]+", " ", raw).strip()
        if line and line != "-" and (not lines or lines[-1] != line):
            lines.append(line)
    return "\n".join(lines)


def html_to_text(markup: str, skip_chrome: bool = True) -> str:
    parser = _Page(skip_chrome)
    try:
        parser.feed(markup)
        parser.close()
    except Exception:  # very broken markup: use what was read so far
        pass
    return _tidy("".join(parser.parts))


def _page_details(markup: str):
    parser = _Page(True)
    try:
        parser.feed(markup)
        parser.close()
    except Exception:
        pass
    text = _tidy("".join(parser.parts))
    if len(text) < MIN_TEXT_CHARS:  # an unclosed <nav> or <footer> can hide the whole page: read it without that rule
        text = html_to_text(markup, skip_chrome=False)
    return text, _tidy(parser.title), parser.meta


# ---- the site's own job data (schema.org "JobPosting", used by most job boards for Google) ----

_LD_RE = re.compile(r"<script[^>]+type\s*=\s*[\"']?application/ld\+json[\"']?[^>]*>(.*?)</script>", re.I | re.S)


def _walk(node, found: List[dict], depth: int = 0):
    if depth > 6:
        return
    if isinstance(node, list):
        for item in node:
            _walk(item, found, depth + 1)
    elif isinstance(node, dict):
        kind = node.get("@type")
        kinds = kind if isinstance(kind, list) else [kind]
        if "JobPosting" in kinds:
            found.append(node)
        for key in ("@graph", "mainEntity", "itemListElement", "item"):
            if key in node:
                _walk(node[key], found, depth + 1)


def _text_of(value) -> str:
    if isinstance(value, dict):
        value = value.get("name") or ""
    return re.sub(r"\s+", " ", html_lib.unescape(str(value or ""))).strip() if isinstance(value, (str, int, float)) else ""


def _address_of(place) -> str:
    if isinstance(place, list):
        for item in place:
            found = _address_of(item)
            if found:
                return found
        return ""
    if isinstance(place, str):
        return _text_of(place)
    if not isinstance(place, dict):
        return ""
    address = place.get("address", place)
    if isinstance(address, str):
        return _text_of(address)
    if not isinstance(address, dict):
        return ""
    parts: List[str] = []
    for key in ("streetAddress", "addressLocality", "addressRegion", "postalCode", "addressCountry"):
        text = _text_of(address.get(key))
        if text and text.lower() not in (p.lower() for p in parts):
            parts.append(text)
    return ", ".join(parts)


def structured_posting(markup: str) -> Dict[str, str]:
    """What the page says about itself as a job: {'title','company','address','description'} (any may be '')."""
    found: List[dict] = []
    for match in _LD_RE.finditer(markup):
        blob = match.group(1).strip()
        blob = re.sub(r"^\s*(<!--|//<!\[CDATA\[|/\*<!\[CDATA\[\*/)\s*|\s*(-->|//\]\]>|/\*\]\]>\*/)\s*$", "", blob)
        try:
            _walk(json.loads(blob), found)
        except (ValueError, RecursionError):
            continue
    if not found:
        return {"title": "", "company": "", "address": "", "description": ""}

    job = found[0]
    org = job.get("hiringOrganization")
    description = html_lib.unescape(str(job.get("description") or ""))
    if "<" in description:
        description = html_to_text(description)
    return {
        "title": _text_of(job.get("title")),
        "company": _text_of(job.get("hiringOrganization")),
        "address": _address_of(job.get("jobLocation")) or (_address_of(org) if isinstance(org, dict) else ""),
        "description": _tidy(description),
    }


class Posting:
    """What was read from a link or from pasted text."""

    def __init__(self, text: str, title: str = "", site: str = "", structured: Optional[Dict[str, str]] = None, url: str = ""):
        self.text = text
        self.title = title
        self.site = site
        self.structured = structured or {"title": "", "company": "", "address": "", "description": ""}
        self.url = url

    @property
    def haystack(self) -> str:
        s = self.structured
        return "\n".join(x for x in (self.title, self.site, s["title"], s["company"], s["address"], self.text) if x)


def read_posting_url(url: str) -> Posting:
    page = fetch_page(url)
    markup = page["html"]
    text, title, meta = _page_details(markup)
    structured = structured_posting(markup)
    body = structured["description"] if len(structured["description"]) >= MIN_TEXT_CHARS else text
    if len(body) < MIN_TEXT_CHARS and not structured["title"]:
        raise PostingError(
            "unreadable",
            "That page didn't show a job description we could read. It may need you to sign in, or it only loads in a browser. " + PASTE_HINT,
        )
    return Posting(body[:TEXT_LIMIT], title, meta.get("og:site_name", ""), structured, page["url"])


def read_posting_text(text: str) -> Posting:
    body = _tidy(re.sub(r"<[^>]+>", " ", text or ""))
    if len(body) < 80:
        raise PostingError("nodetails", "That is too short to be a job description. Paste the whole advert.")
    return Posting(body[:TEXT_LIMIT])


# --------------------------------------------------------------------------- #
#                  keeping only what the page really says                     #
# --------------------------------------------------------------------------- #

def _tokens(text: str) -> List[str]:
    return re.findall(r"[a-z0-9]+", (text or "").lower())


def _coverage(value: str, haystack: set, min_len: int = 2) -> float:
    tokens = [t for t in _tokens(value) if len(t) >= min_len]
    if not tokens:
        return 0.0
    return sum(1 for t in tokens if t in haystack) / len(tokens)


def _one_line(value, limit: int) -> str:
    return re.sub(r"\s+", " ", value).strip()[:limit] if isinstance(value, str) else ""


def _items(value, haystack: set, limit: int, item_chars: int) -> List[str]:
    """A list the AI returned, minus anything the page does not support (the AI can make things up)."""
    out: List[str] = []
    seen = set()
    for raw in value if isinstance(value, list) else []:
        text = re.sub(r"^\s*(?:[-*\u2022]+|\d{1,2}[.)])\s+", "", _one_line(raw, item_chars + 40))[:item_chars].strip()
        if len(text) < 6 or text.lower() in seen:
            continue
        long_words = [t for t in _tokens(text) if len(t) >= 4]
        enough = _coverage(text, haystack, 4 if len(long_words) >= 2 else 2) >= 0.6
        if enough:
            seen.add(text.lower())
            out.append(text)
        if len(out) >= limit:
            break
    return out


def clean_posting_fields(data: dict, posting: Posting) -> Dict[str, object]:
    """
    The AI's answer -> {'job_title','company','address','requirements','duties'}.
    Title, company and address from the page's own job data win. Anything the AI added that the page does not
    contain (a guessed address, an invented requirement) is dropped, because it would end up in a real letter.
    """
    haystack = set(_tokens(posting.haystack))
    s = posting.structured

    def pick(structured_value: str, ai_value, limit: int) -> str:
        if structured_value:
            return _one_line(structured_value, limit)
        text = _one_line(ai_value, limit)
        return text if text and _coverage(text, haystack) >= 0.8 else ""

    return {
        "job_title": pick(s["title"], data.get("job_title"), 120),
        "company": pick(s["company"], data.get("company"), 120),
        "address": pick(s["address"], data.get("address"), 200),
        "requirements": _items(data.get("requirements"), haystack, 12, 200),
        "duties": _items(data.get("duties"), haystack, 8, 200),
    }
