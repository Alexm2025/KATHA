# KATHA — समझो, सीखो

AI-powered vernacular pedagogy and real-time translation for mother-tongue primary education.
Smart India Hackathon 2026 · Problem Statement **SIH26042** · Smart Education · Team **JustWeMet** (ID 119072).

A teacher speaks or taps Hindi; KATHA shows it to Class 1–3 children as Ho, Mundari or Santali
text and audio, takes their doubts back to the teacher, and generates bilingual worksheets,
flashcards and quizzes. It is an installable PWA that keeps working with no network.

## Run it

Needs Node 20+ (and Python 3.11+ only if you want the optional server).

```bash
cd web
npm install
npm run dev          # http://localhost:5173
```

Open the site and press **डेमो देखें / Try the Demo**. No login is needed.

| Role | How to log in |
|---|---|
| Teacher (सुनीता मैम) | PIN `1234` |
| Admin (प्रधानाध्यापक) | PIN `0000` |
| Student | pick the class, then tap an avatar (no PIN, no typing) |

To see teacher and student as two devices, open `/teacher/live` and `/student/listen` in two
tabs of the same browser, or use the split screen at `/demo`.

### Production build and tests

```bash
npm run build        # type-check + build to web/dist
npm run preview      # serve the build on http://localhost:4173
npm run e2e          # browser test against the preview (uses installed Chrome)
```

`npm run e2e` drives a teacher tab and a student tab through the whole flow, including an
offline reload, and saves screenshots to `web/e2e/shots/`.

### Optional server

```bash
cd server
python -m venv .venv
.venv/Scripts/pip install -r requirements-dev.txt     # macOS/Linux: .venv/bin/pip
.venv/Scripts/python -m uvicorn app.main:app --reload # http://localhost:8000/docs
.venv/Scripts/python -m pytest
```

Point the web app at it by creating `web/.env.local` with `VITE_API_URL=http://localhost:8000`.
Without that variable the app uses an in-browser mock server, so the demo needs no backend.

Docker (build from the repository root so the seed corpus is included):

```bash
docker build -f server/Dockerfile -t katha-server .
docker run -p 8000:8000 -v katha-data:/data katha-server
```

The Dockerfile has not been built on the development machine (Docker was not installed there).

## What is real and what is a placeholder

| Part | Status |
|---|---|
| Hindi → tribal translation, offline | **Working.** Glossary lookup (exact, then fuzzy ≥ 0.86) over the seed corpus and teacher corrections. Unknown sentences are shown in Hindi with a "translation not available offline" chip. Nothing is generated. |
| Tribal-language content | **Mostly empty on purpose.** Only the greeting "Johar" and the number words 1–10 are filled in, as unverified drafts from general reference knowledge. Everything else waits for linguists. Every unverified entry is shown with a "जाँच बाकी / needs verification" tag, on screen and in PDFs. |
| Ho in Warang Citi | Numerals render in Warang Citi. Ho words are in Devanagari until someone supplies Warang Citi text. |
| Tribal-language audio | **No recordings are bundled.** Teachers and helpers record clips in the app ("Correct this translation" → record); those are stored on the device and play offline. Text with no clip shows "audio pending". A Hindi voice never reads tribal text. |
| Hindi speech recognition | Chrome Web Speech API, **online only**: audio goes to Google's speech service. It is off until the teacher turns it on. Offline, the teacher taps lines of the lesson script. |
| Speech recognition for Ho / Mundari / Santali | **Not available.** Voice doubts reach the teacher as a recording; picture doubt-cards give a Hindi meaning without any model. |
| IndicTrans2 | **Not connected.** It covers Santali but not Ho or Mundari; the Language packs screen says so. `ServerTranslator` and the `/translate` endpoint are ready for it. |
| Sync | Working against the mock server and against the FastAPI server. |
| Student record encryption | Guardian and notes are AES-GCM encrypted with a key unlocked by the staff PIN. Names, avatars and scores are not encrypted. |
| Progress data | Two lessons of sample history are seeded for the demo class and labelled "includes sample data". |
| Lesson pictures | Emoji, so they cost no storage. Admins can upload real images per item. |
| NIPUN Bharat alignment | Lessons are tagged with four FLN areas (oral language, vocabulary, number sense, environment awareness). Mapping to official Lakshya codes has not been validated. |

## Checked on the build

Measured with `npm run e2e` and Lighthouse (mobile) against `npm run preview`:

- Offline after first load: reload, open a lesson, tap a line, student tab shows the tribal text and plays the recorded clip.
- A teacher correction changes the next translation of the same sentence and reaches the student tab at once.
- Worksheet PDFs for Santali (Ol Chiki), Ho (Warang Citi numerals, Devanagari words) and Mundari (Devanagari) render correctly.
- Latency badge: 4–60 ms for glossary translations (target < 3000 ms).
- Lighthouse: performance 92, accessibility 100, best practices 100. Initial JavaScript 90 KB gzipped (budget 300 KB).
- Installable: manifest, 192/512 icons and an active service worker.

Not yet tested on a real 2 GB Android tablet.

## Layout

```
web/       React + TypeScript PWA (landing, teacher, student, admin)
server/    FastAPI: /asr /translate /tts /sync/push /sync/pull /corrections/export
content/   Seed lessons and glossary (lessons.json)
docs/      architecture.md, demo-script.md
```

## Adding verified translations

Three ways, all of which mark the entry community-verified and log who supplied it:

1. In class: **Correct this translation** on any Live Teach result or flashcard.
2. Admin → **Content** → a language button beside any line.
3. Admin → **Language packs** → import a corrections file (JSON or CSV, same columns as the export).

To change the shipped seed instead, edit `content/lessons.json` and raise its `version`.

## Deploying the web app

Static hosting works; the app is a single-page app, so unknown paths must serve `index.html`.

- **Vercel:** root directory `web`, framework Vite. `web/vercel.json` has the rewrite.
- **Netlify:** base directory `web`. `web/netlify.toml` has the build settings and the redirect.

Both must be allowed to read `../content` (the default when the whole repository is checked out).
Set `VITE_API_URL` in the host's environment to use a deployed server.

## Team

Alex Mathew · Anannya Khadakkar · Nihal Nainan · Philson Philip · Shrea Shetty · Tanishq Kabir
