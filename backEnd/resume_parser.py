"""
Resume parser proxy (APILayer Resume Parser API).

Keeps the APILayer key on the server. The React app (resumeParser.js) calls:

    POST /api/resume-parser
        body: the raw file bytes (Content-Type: application/octet-stream)
        -> APILayer's JSON reply, passed through unchanged

Setup: set APILAYER_RESUME_KEY in the backend's environment (Render -> your web service ->
Environment). The static site does not need it.
"""
import os

import requests
from fastapi import APIRouter, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse, Response

router = APIRouter(prefix="/api/resume-parser", tags=["Resume parser"])

APILAYER_URL = "https://api.apilayer.com/resume_parser/upload"
MAX_BYTES = 5 * 1024 * 1024  # same limit as the front end
TIMEOUT_S = 60  # parsing a document can take a while


def _forward(api_key: str, body: bytes) -> requests.Response:
    return requests.post(
        APILAYER_URL,
        data=body,
        headers={"Content-Type": "application/octet-stream", "apikey": api_key},
        timeout=TIMEOUT_S,
    )


@router.post("")
async def parse_resume(request: Request):
    api_key = (os.getenv("APILAYER_RESUME_KEY") or "").strip()
    if not api_key:
        return JSONResponse({"error": "Parser is not configured"}, status_code=500)

    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > MAX_BYTES:
        return JSONResponse({"error": "File too large"}, status_code=413)

    chunks, size = [], 0
    async for chunk in request.stream():
        size += len(chunk)
        if size > MAX_BYTES:
            return JSONResponse({"error": "File too large"}, status_code=413)
        chunks.append(chunk)
    body = b"".join(chunks)
    if not body:
        return JSONResponse({"error": "Empty file"}, status_code=400)

    try:
        upstream = await run_in_threadpool(_forward, api_key, body)
    except requests.RequestException:
        print("[resume-parser] could not reach APILayer")  # never log the key
        return JSONResponse({"error": "Could not reach the resume service"}, status_code=502)

    if not upstream.ok:
        print(f"[resume-parser] APILayer replied {upstream.status_code}")
    return Response(content=upstream.content, status_code=upstream.status_code, media_type="application/json")
