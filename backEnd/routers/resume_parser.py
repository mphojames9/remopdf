# backEnd/routers/resume_parser.py
#
# Forwards an uploaded resume to the APILayer Resume Parser and returns its JSON.
# The API key lives only in the server environment (APILAYER_RESUME_KEY),
# so it never reaches the browser bundle.

import os

import httpx
from fastapi import APIRouter, HTTPException, Request, Response

router = APIRouter()

APILAYER_URL = "https://api.apilayer.com/resume_parser/upload"
MAX_BYTES = 5 * 1024 * 1024  # same 5 MB limit as the frontend


@router.post("/resume-parser")
async def resume_parser(request: Request):
    api_key = os.environ.get("APILAYER_RESUME_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Resume parser is not configured.")

    # The frontend sends the raw file as the request body (application/octet-stream).
    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="File too large.")

    body = await request.body()
    if not body:
        raise HTTPException(status_code=400, detail="No file received.")
    if len(body) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="File too large.")

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            upstream = await client.post(
                APILAYER_URL,
                content=body,
                headers={"apikey": api_key, "Content-Type": "application/octet-stream"},
            )
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Could not reach the resume service.")

    # Pass APILayer's status code through; the frontend turns 401/403/413/429/5xx
    # into friendly messages.
    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        media_type="application/json",
    )
