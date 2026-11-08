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
"""
import html as html_lib
import http.client
import ipaddress
import json
import re
import socket
import ssl
import time
import zlib
from html.parser import HTMLParser
from typing import Dict, List, Optional
from urllib.parse import urljoin, urlsplit

MAX_BYTES = 1_500_000  # a job page is far smaller; more than this is cut off, not an error
MAX_REDIRECTS = 4
CONNECT_TIMEOUT_S = 8
TOTAL_TIMEOUT_S = 20
TEXT_LIMIT = 14000  # characters of page text handed to the AI
MIN_TEXT_CHARS = 200  # less than this means the page holds no job description (or it only loads in a browser)
USER_AGENT = "Mozilla/5.0 (compatible; RemoPDF-JobReader/1.0; +https://remopdf.site)"


class PostingError(Exception):
    """Something the person can act on. code: badlink | unreadable | nodetails."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


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
    return scheme, host, port, path


def _resolve_public(host: str, port: int) -> str:
    """The one address to connect to. Every address the name resolves to must be public."""
    try:
        infos = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except (socket.gaierror, UnicodeError, OSError):
        raise PostingError("unreadable", "That website could not be found. Check the link, or paste the job description into the box instead.")
    addresses = []
    for info in infos:
        ip = info[4][0]
        if ip not in addresses:
            addresses.append(ip)
    if not addresses or not all(_is_public(ip) for ip in addresses):
        raise PostingError("badlink", "That web address can't be used.")
    # Prefer IPv4: some hosts publish an IPv6 address they cannot actually serve.
    addresses.sort(key=lambda ip: ":" in ip)
    return addresses[0]


# --------------------------------------------------------------------------- #
#                                 the download                                #
# --------------------------------------------------------------------------- #

class _PinnedHTTP(http.client.HTTPConnection):
    def __init__(self, host, port, ip, timeout):
        super().__init__(host, port, timeout=timeout)
        self._ip = ip

    def connect(self):
        self.sock = socket.create_connection((self._ip, self.port), self.timeout)


class _PinnedHTTPS(http.client.HTTPSConnection):
    def __init__(self, host, port, ip, timeout):
        super().__init__(host, port, timeout=timeout, context=ssl.create_default_context())
        self._ip = ip

    def connect(self):
        sock = socket.create_connection((self._ip, self.port), self.timeout)
        self.sock = self._context.wrap_socket(sock, server_hostname=self.host)  # certificate checked for the host name


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
        raise PostingError("unreadable", "That page could not be read. " + PASTE_HINT)

    chunks: List[bytes] = []
    size = 0
    while size < MAX_BYTES:
        if time.monotonic() > deadline:
            break  # a slow page: use what has arrived
        chunk = response.read(65536)
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

    for _ in range(MAX_REDIRECTS + 1):
        scheme, host, port, path = parse_job_url(current)
        ip = _resolve_public(host, port)
        connection_class = _PinnedHTTPS if scheme == "https" else _PinnedHTTP
        connection = connection_class(host, port, ip, CONNECT_TIMEOUT_S)
        try:
            try:
                connection.request(
                    "GET",
                    path,
                    headers={
                        "User-Agent": USER_AGENT,
                        "Accept": "text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.5",
                        "Accept-Language": "en",
                        "Accept-Encoding": "gzip, identity",
                    },
                )
                response = connection.getresponse()
            except ssl.SSLError:
                raise PostingError("unreadable", "That website's security certificate could not be verified. " + PASTE_HINT)
            except (OSError, http.client.HTTPException):
                raise PostingError("unreadable", "That page could not be reached. " + PASTE_HINT)

            status = response.status
            if status in (301, 302, 303, 307, 308):
                location = response.getheader("Location")
                if not location:
                    raise PostingError("unreadable", "That page could not be read. " + PASTE_HINT)
                current = urljoin(f"{scheme}://{host}{path}", location)
                continue
            if status in (401, 403, 429, 999):
                raise PostingError("unreadable", "That site doesn't let us read the page automatically. " + PASTE_HINT)
            if status in (404, 410):
                raise PostingError("unreadable", "That page wasn't found. The advert may have closed, or the link is incomplete.")
            if status != 200:
                raise PostingError("unreadable", "That page could not be read. " + PASTE_HINT)

            content_type = (response.getheader("Content-Type") or "").lower()
            if content_type and not any(t in content_type for t in ("text/html", "application/xhtml", "text/plain")):
                raise PostingError("unreadable", "That link isn't a web page we can read. " + PASTE_HINT)

            try:
                raw = _read_body(response, deadline)
            except (OSError, http.client.HTTPException):
                raise PostingError("unreadable", "That page could not be read. " + PASTE_HINT)
            return {"html": raw.decode(_charset(content_type, raw), errors="replace"), "url": current}
        finally:
            connection.close()

    raise PostingError("unreadable", "That link redirects too many times. " + PASTE_HINT)


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
