"""SQLite storage for synced rows and the corrections dataset (stdlib sqlite3, no ORM)."""

from __future__ import annotations

import json
import os
import sqlite3
import threading
import time
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS rows (
    tbl TEXT NOT NULL,
    key TEXT NOT NULL,
    payload TEXT,
    client_at INTEGER NOT NULL,
    received_at INTEGER NOT NULL,
    PRIMARY KEY (tbl, key)
);
CREATE TABLE IF NOT EXISTS corrections (
    id TEXT PRIMARY KEY,
    lang TEXT NOT NULL,
    hi TEXT NOT NULL,
    hi_norm TEXT NOT NULL,
    native TEXT NOT NULL,
    alt TEXT NOT NULL,
    prev_native TEXT,
    prev_alt TEXT,
    author TEXT NOT NULL,
    at INTEGER NOT NULL,
    received_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS corrections_lang ON corrections (lang, hi_norm, at);
"""


class Store:
    def __init__(self, path: str | None = None):
        self.path = path or os.environ.get("KATHA_DB", str(Path(__file__).resolve().parents[1] / "katha.db"))
        self._lock = threading.Lock()
        self._db = sqlite3.connect(self.path, check_same_thread=False)
        self._db.row_factory = sqlite3.Row
        self._db.executescript(SCHEMA)

    def push(self, items: list[dict]) -> int:
        """Apply a device's queue. Rows are last-write-wins by client time; corrections
        are append-only, so two teachers correcting the same sentence are both kept."""
        now = int(time.time() * 1000)
        with self._lock, self._db:
            for it in items:
                if it["table"] == "corrections" and it["op"] == "put":
                    c = it["payload"]
                    self._db.execute(
                        "INSERT OR IGNORE INTO corrections VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                        (c["id"], c["lang"], c["hi"], c["hiNorm"], c.get("native", ""), c.get("alt", ""),
                         c.get("prevNative"), c.get("prevAlt"), c.get("author", ""), c["at"], now),
                    )
                elif it["op"] == "delete":
                    self._db.execute("DELETE FROM rows WHERE tbl = ? AND key = ?", (it["table"], it["key"]))
                else:
                    self._db.execute(
                        """INSERT INTO rows VALUES (?,?,?,?,?)
                           ON CONFLICT (tbl, key) DO UPDATE SET
                             payload = excluded.payload, client_at = excluded.client_at, received_at = excluded.received_at
                           WHERE excluded.client_at >= rows.client_at""",
                        (it["table"], it["key"], json.dumps(it["payload"], ensure_ascii=False), it["at"], now),
                    )
        return len(items)

    @staticmethod
    def _correction(r: sqlite3.Row) -> dict:
        return {
            "id": r["id"], "lang": r["lang"], "hi": r["hi"], "hiNorm": r["hi_norm"], "native": r["native"],
            "alt": r["alt"], "prevNative": r["prev_native"], "prevAlt": r["prev_alt"], "author": r["author"], "at": r["at"],
        }

    def corrections(self, since: int = 0, lang: str | None = None) -> list[dict]:
        sql = "SELECT * FROM corrections WHERE received_at > ?"
        args: list = [since]
        if lang:
            sql += " AND lang = ?"
            args.append(lang)
        with self._lock:
            return [self._correction(r) for r in self._db.execute(sql + " ORDER BY at", args)]

    def latest_corrections(self, lang: str) -> dict[str, dict]:
        """Newest correction per sentence: what translation should use."""
        out: dict[str, dict] = {}
        for c in self.corrections(lang=lang):
            out[c["hiNorm"]] = c
        return out

    def count(self, tbl: str) -> int:
        with self._lock:
            return self._db.execute("SELECT COUNT(*) FROM rows WHERE tbl = ?", (tbl,)).fetchone()[0]
