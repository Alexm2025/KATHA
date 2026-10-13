import os
import tempfile

os.environ["KATHA_DB"] = os.path.join(tempfile.mkdtemp(), "test.db")

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.providers import norm_hi  # noqa: E402

client = TestClient(app)


def test_health_names_providers():
    body = client.get("/health").json()
    assert body["ok"] and body["mt"] == "server-glossary"


def test_norm_matches_web_client():
    assert norm_hi("कितने  आम हैं?") == "कितने आम हैं"
    assert norm_hi("सफ़ेद") == norm_hi("सफेद")
    assert norm_hi("पाँच") == norm_hi("पांच")


def test_seed_draft_is_translated_but_unverified():
    body = client.post("/translate", json={"text": "एक", "from": "hi", "to": "sat"}).json()
    assert body["available"] and body["native"] and body["verified"] is False


def test_unknown_sentence_is_never_invented():
    body = client.post("/translate", json={"text": "आज बारिश होगी।", "from": "hi", "to": "hoc"}).json()
    assert body == {**body, "available": False, "native": "", "alt": ""}


def test_correction_syncs_and_wins():
    correction = {
        "id": "c1", "lang": "hoc", "hi": "आज बारिश होगी।", "hiNorm": norm_hi("आज बारिश होगी।"),
        "native": "", "alt": "TEST-HO", "author": "tester", "at": 1000,
    }
    push = {"items": [
        {"table": "corrections", "op": "put", "key": "c1", "payload": correction, "at": 1000},
        {"table": "attempts", "op": "put", "key": "a1", "payload": {"id": "a1", "correct": 4}, "at": 1000},
    ]}
    assert client.post("/sync/push", json=push).json() == {"accepted": 2}
    # Pushing the same queue twice must not duplicate anything.
    client.post("/sync/push", json=push)

    body = client.post("/translate", json={"text": "आज बारिश होगी", "from": "hi", "to": "hoc"}).json()
    assert body["available"] and body["alt"] == "TEST-HO" and body["verified"] is True

    pulled = client.get("/sync/pull", params={"since": 0}).json()["corrections"]
    assert [c["id"] for c in pulled] == ["c1"]

    csv_text = client.get("/corrections/export", params={"format": "csv"}).text
    assert "TEST-HO" in csv_text and "author" in csv_text


def test_asr_and_tts_mocks_admit_they_are_mocks():
    asr = client.post("/asr", files={"audio": ("a.webm", b"\x00\x01", "audio/webm")}, data={"lang": "hi"}).json()
    assert asr["provider"] == "mock-asr" and asr["text"] == ""
    tts = client.post("/tts", json={"text": "एक", "lang": "sat"})
    assert tts.status_code == 204 and tts.headers["X-Katha-Status"] == "pending"
