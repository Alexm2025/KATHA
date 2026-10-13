"""Swappable ASR / translation / TTS providers, mirroring web/src/lib/providers.

Every result carries provider, confidence, latencyMs and verified. The mock providers
here never invent tribal-language text: what they cannot answer comes back as
"not available". Real models plug in by implementing the same three protocols and
being registered in `build_providers`.
"""

from __future__ import annotations

import json
import os
import re
import unicodedata
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Callable, Protocol

TRIBAL = ("sat", "hoc", "unr")  # Santali, Ho, Mundari


def norm_hi(text: str) -> str:
    """Glossary key. Must stay identical to normHi() in web/src/lib/lang.ts."""
    s = unicodedata.normalize("NFC", text).lower()
    s = re.sub(r"[।॥.,!?;:\"'()\-–—…]", " ", s)
    s = s.replace("़", "").replace("ँ", "ं")
    return re.sub(r"\s+", " ", s).strip()


@dataclass
class Transcript:
    text: str
    lang: str
    provider: str
    confidence: float = 0.0
    latencyMs: int = 0
    verified: bool = False
    available: bool = False


@dataclass
class Translation:
    native: str
    alt: str
    available: bool
    provider: str
    confidence: float = 0.0
    latencyMs: int = 0
    verified: bool = False


@dataclass
class Speech:
    audio: bytes | None
    mime: str
    provider: str
    status: str  # "ok" | "pending"
    confidence: float = 0.0
    latencyMs: int = 0
    verified: bool = False


class ASRProvider(Protocol):
    name: str

    def transcribe(self, audio: bytes, lang: str) -> Transcript: ...


class TranslationProvider(Protocol):
    name: str

    def translate(self, text: str, src: str, dst: str) -> Translation: ...


class TTSProvider(Protocol):
    name: str

    def speak(self, text: str, lang: str) -> Speech: ...


class MockASR:
    """Placeholder until Whisper (Hindi) / IndicWav2Vec is wired in. Says so; hears nothing."""

    name = "mock-asr"

    def transcribe(self, audio: bytes, lang: str) -> Transcript:
        return Transcript(text="", lang=lang, provider=self.name)


class GlossaryTranslator:
    """Seed corpus + synced teacher corrections. Corrections always win over seed drafts."""

    name = "server-glossary"

    def __init__(self, content_path: Path, corrections: Callable[[str], dict[str, dict]]):
        self._seed: dict[str, dict[str, dict]] = {lang: {} for lang in TRIBAL}
        self._corrections = corrections
        if content_path.exists():
            for lesson in json.loads(content_path.read_text(encoding="utf-8"))["lessons"]:
                for item in lesson["items"]:
                    for lang, entry in (item.get("tr") or {}).items():
                        if entry.get("native") or entry.get("alt"):
                            self._seed[lang][norm_hi(item["hi"])] = entry

    def translate(self, text: str, src: str, dst: str) -> Translation:
        miss = Translation(native="", alt="", available=False, provider=self.name)
        if src != "hi" or dst not in TRIBAL:
            return miss
        key = norm_hi(text)
        fixed = self._corrections(dst).get(key)
        if fixed:
            return Translation(fixed["native"], fixed["alt"], True, self.name, confidence=1.0, verified=True)
        seed = self._seed[dst].get(key)
        if seed:
            return Translation(seed.get("native", ""), seed.get("alt", ""), True, self.name, confidence=1.0)
        return miss


class IndicTrans2Translator:
    """Where AI4Bharat IndicTrans2 goes. It covers Santali (sat_Olck) but NOT Ho or Mundari,
    so those two languages always fall through to the glossary."""

    name = "indictrans2"
    covered = ("sat",)

    def __init__(self, fallback: TranslationProvider):
        self._fallback = fallback

    def translate(self, text: str, src: str, dst: str) -> Translation:
        local = self._fallback.translate(text, src, dst)
        if local.available or dst not in self.covered:
            return local
        # TODO(model): load ai4bharat/indictrans2-indic-indic and translate hin_Deva → sat_Olck.
        return local


class MockTTS:
    """Placeholder until recorded-audio packs / an Indic TTS model are served from here."""

    name = "mock-tts"

    def speak(self, text: str, lang: str) -> Speech:
        return Speech(audio=None, mime="audio/ogg", provider=self.name, status="pending")


@dataclass
class Providers:
    asr: ASRProvider
    mt: TranslationProvider
    tts: TTSProvider


def build_providers(corrections: Callable[[str], dict[str, dict]]) -> Providers:
    """Choose implementations from the environment (KATHA_MT=glossary|indictrans2)."""
    default = Path(__file__).resolve().parents[2] / "content" / "lessons.json"
    content = Path(os.environ.get("KATHA_CONTENT", default))
    mt: TranslationProvider = GlossaryTranslator(content, corrections)
    if os.environ.get("KATHA_MT") == "indictrans2":
        mt = IndicTrans2Translator(mt)
    return Providers(asr=MockASR(), mt=mt, tts=MockTTS())


def as_json(result) -> dict:
    data = asdict(result)
    data.pop("audio", None)
    return data
