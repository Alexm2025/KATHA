"""KATHA backend: speech/translation endpoints behind swappable providers, plus sync.

Run locally:  uvicorn app.main:app --reload   (from the server/ directory)
"""

from __future__ import annotations

import csv
import io
import os
import time
from typing import Any, Literal

from fastapi import FastAPI, File, Form, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .providers import as_json, build_providers
from .store import Store

app = FastAPI(title="KATHA server", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("KATHA_ORIGINS", "http://localhost:5173,http://localhost:4173").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

store = Store()
providers = build_providers(store.latest_corrections)


def timed(fn, *args):
    t0 = time.perf_counter()
    result = fn(*args)
    result.latencyMs = round((time.perf_counter() - t0) * 1000)
    return result


@app.get("/health")
def health() -> dict:
    return {"ok": True, "asr": providers.asr.name, "mt": providers.mt.name, "tts": providers.tts.name}


@app.post("/asr")
async def asr(audio: UploadFile = File(...), lang: str = Form("hi")) -> dict:
    return as_json(timed(providers.asr.transcribe, await audio.read(), lang))


class TranslateIn(BaseModel):
    text: str
    # "from"/"to" on the wire, matching the web client.
    src: str = Field("hi", alias="from")
    dst: str = Field(alias="to")
    lessonId: str | None = None


@app.post("/translate")
def translate(body: TranslateIn) -> dict:
    return as_json(timed(providers.mt.translate, body.text, body.src, body.dst))


class SpeakIn(BaseModel):
    text: str
    lang: str


@app.post("/tts")
def tts(body: SpeakIn) -> Response:
    speech = timed(providers.tts.speak, body.text, body.lang)
    if speech.audio is None:
        # No recording or voice for this text: the client shows "audio pending".
        return Response(status_code=204, headers={"X-Katha-Provider": speech.provider, "X-Katha-Status": speech.status})
    return Response(content=speech.audio, media_type=speech.mime, headers={"X-Katha-Provider": speech.provider})


class SyncItem(BaseModel):
    table: str
    op: Literal["put", "delete"]
    key: str
    payload: Any = None
    at: int


class PushIn(BaseModel):
    items: list[SyncItem]


@app.post("/sync/push")
def sync_push(body: PushIn) -> dict:
    return {"accepted": store.push([i.model_dump() for i in body.items])}


@app.get("/sync/pull")
def sync_pull(since: int = 0) -> dict:
    # A little overlap guards against clock differences; the client de-duplicates by id.
    return {"corrections": store.corrections(since=max(0, since - 300_000)), "serverTime": int(time.time() * 1000)}


@app.get("/corrections/export")
def corrections_export(format: Literal["json", "csv"] = "json", lang: str | None = None):
    """The dialect-adaptation dataset: every teacher correction with author and time."""
    rows = store.corrections(lang=lang)
    if format == "json":
        return {"corrections": rows}
    out = io.StringIO()
    cols = ["id", "lang", "hi", "native", "alt", "prevNative", "prevAlt", "author", "at"]
    writer = csv.DictWriter(out, fieldnames=cols, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)
    return Response(content="﻿" + out.getvalue(), media_type="text/csv; charset=utf-8")
