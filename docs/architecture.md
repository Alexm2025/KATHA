# KATHA architecture

## Shape

```
 Teacher tablet                         Student tablet
┌──────────────────────┐   BroadcastChannel   ┌──────────────────────┐
│ Live Teach           │ ───────────────────▶ │ Listen to Teacher    │
│  ASR → Translation   │   (same origin)      │  text + TTS          │
│ Doubts inbox         │ ◀─────────────────── │ Ask a Doubt          │
└─────────┬────────────┘                      └──────────┬───────────┘
          │            IndexedDB (Dexie), one per device │
          └───────────────┬──────────────────────────────┘
                          │ sync queue (when online)
                   ┌──────▼───────┐
                   │ FastAPI      │  /asr /translate /tts
                   │ SQLite       │  /sync/push /sync/pull /corrections/export
                   └──────────────┘
```

Everything a classroom needs runs in the browser. The server is optional: it carries data
between devices and is where real models will run.

## Web app (`/web`)

React 19, TypeScript, Vite, Tailwind 4, React Router, Zustand, Dexie, vite-plugin-pwa.

| Path | Purpose |
|---|---|
| `src/pages` | Landing, Login, Demo (split screen: two same-origin iframes) |
| `src/teacher`, `src/student`, `src/admin` | One lazily loaded app per role |
| `src/components` | Shared UI. `base.tsx` has no database imports, so the landing page stays small |
| `src/lib/providers` | ASR, translation and TTS behind interfaces (below) |
| `src/lib/db.ts` | Dexie schema and `save()` / `remove()`, which write locally and queue for sync |
| `src/lib/sync.ts` | Queue push, corrections pull and merge, mock and HTTP servers |
| `src/lib/glossary.ts` | Correction loop, audio clips, corrections import/export |
| `src/lib/progress.ts` | The understood / not-understood branching |
| `src/lib/pdf.ts` | Worksheet rendering |
| `src/lib/crypto.ts` | PIN verification and record encryption |

### Providers

```ts
interface TranslationProvider { translate(text, from, to, ctx?): Promise<Translation> }
interface TTSProvider         { speak(text, lang, sourceHi?): Promise<AudioOutput> }
interface ASRProvider         { transcribe(audio, lang): Promise<Transcript> }
interface StreamingASR        { listen(lang, callbacks): { stop() } }
```

Every result carries `provider`, `confidence`, `latencyMs` and `verified`.
`src/lib/providers/index.ts` is the only place implementations are chosen.

| Provider | Implementation | Notes |
|---|---|---|
| Translation | `ChainTranslator` = `GlossaryTranslator`, then `ServerTranslator` | Glossary first, so teacher corrections always win. Server is used only when `VITE_API_URL` is set, the device is online and the glossary has no answer. |
| `GlossaryTranslator` | exact key, then character-bigram Dice ≥ 0.86, then phrase by phrase | A phrase split only succeeds if every phrase is known. It never composes word-by-word output. A fuzzy hit is shown to the teacher with the sentence it matched. |
| TTS | `ChainTTS` = `RecordedTTS`, then `BrowserTTS` | Recordings from IndexedDB. Speech synthesis is used for Hindi only; tribal text with no clip returns `pending`. |
| ASR (live) | `BrowserASR` | Web Speech API, `hi-IN`, online, opt-in. |
| ASR (clips) | `ServerASR`, or `MockASR` with no backend | For transcribing children's recorded doubts once a model exists. |

Glossary keys are `lang|normHi(hindi)`. `normHi` lowercases, strips punctuation and nukta, and
unifies chandrabindu with anusvara. The Python `norm_hi` in `server/app/providers.py` must stay
identical; a server test checks it.

### Languages and scripts

| Language | Code | `native` field | `alt` field |
|---|---|---|---|
| Santali | `sat` | Ol Chiki | Latin |
| Ho | `hoc` | Warang Citi | Devanagari |
| Mundari | `unr` | Devanagari | none |

Noto Sans Devanagari, Ol Chiki and Warang Citi are self-hosted and precached. A toggle switches
between `native` and `alt`; if the preferred one is empty the other is shown.

`TribalText` (in `components/ui.tsx`) is the only component that puts tribal text on screen.
It always renders the verification state beside it, and a "not available" chip when there is
no text. `pdf.ts` does the same with `*` and `✓` marks and a footnote.

### Data (IndexedDB)

`users`, `classes`, `lessons`, `glossary`, `corrections`, `audio`, `media`, `utterances`,
`doubts`, `evaluations`, `attempts`, `records`, `syncQueue`, `meta`.

- `glossary` holds the current text per sentence; `corrections` is the append-only log of who
  changed what and when. That log is the retraining dataset.
- `audio` and `media` hold Blobs and stay on the device. `save()` strips Blobs before queueing.
- `utterances` is the live feed (last 40 per class), so a student tab that opens late catches up.

### Sync

Every write goes through `save()`: local put plus a `syncQueue` row in one transaction.
`syncNow()` pushes pending rows, pulls corrections, and records `lastSync`. It runs when the
network returns, once a minute, and on demand from Admin → System.

Conflict rules: rows are last-write-wins by client timestamp. Corrections are never overwritten:
each one is kept with author and time, and the glossary shows the newest.

Live classroom events (utterance, doubt, reply, quiz start, lesson change) go over
`BroadcastChannel('katha-live')`. That reaches other tabs and frames of the same browser, which
is what the demo uses. Separate physical tablets need the server: doubts, results and
corrections already sync; relaying live utterances between devices (WebSocket or local hotspot)
is not built yet.

### Offline

Workbox precaches the shell, all role chunks, fonts and the lesson corpus (about 1.6 MB).
Navigation falls back to `index.html`. After one online load the app runs with no network;
only Hindi speech recognition and sync need a connection.

### Security

- PINs: PBKDF2-SHA256, 100,000 iterations, random salt. Half the output is the stored verifier,
  the other half wraps the data key.
- One random AES-GCM data key encrypts student `records` (guardian, notes). Each staff user
  stores a copy wrapped with their PIN-derived key.
- The unlocked key lives in `sessionStorage` for the life of the tab.
- Demo mode has no PIN, so private records stay locked there.
- Students have no PIN; their names, avatars and scores are stored in the clear.

### Learning flow

`nextStep(evaluation, attempts)` in `progress.ts`:

```
no evaluation        → learn the lesson
Understood           → practice → exam → next lesson
Not understood       → remedial → practice → exam
any step below 60%   → remedial
```

Activities are generated from a lesson's word items: pick the picture, count and choose the
numeral, match pictures to words. Remedial shows and says each word again, then asks an easier
two-picture question. Children only ever see stars earned.

### Worksheets

`pdf.ts` draws each A4 page on a canvas at 150 dpi and embeds the pages as JPEG with pdf-lib.
PDF libraries do not shape Devanagari conjuncts or supplementary-plane scripts reliably; the
browser's text engine does. The cost is that PDF text is not selectable and each file is about
270 KB. The on-screen preview is the same canvases.

## Server (`/server`)

FastAPI, stdlib `sqlite3`.

| Endpoint | Behaviour today |
|---|---|
| `GET /health` | Names the active providers |
| `POST /translate` | Seed corpus + synced corrections; `available: false` for anything else |
| `POST /asr` | `MockASR`: empty transcript, labelled `mock-asr` |
| `POST /tts` | `MockTTS`: `204` with `X-Katha-Status: pending` |
| `POST /sync/push` | Stores the device queue; idempotent |
| `GET /sync/pull?since=` | Corrections received since then |
| `GET /corrections/export?format=json\|csv&lang=` | The corrections dataset |

To add a model, implement the matching protocol in `app/providers.py` and register it in
`build_providers`. `IndicTrans2Translator` is a stub marking where Santali MT goes; it falls
back to the glossary and always does so for Ho and Mundari.

## Not built yet

- Verified translations and recorded audio for the curriculum.
- Live relay between separate physical devices.
- Real ASR/MT/TTS models on the server.
- Server-side accounts and authentication (the sync endpoints are open).
- Testing on a 2 GB Android tablet.
