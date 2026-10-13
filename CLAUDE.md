# KATHA

SIH 2026 (SIH26042) project by team JustWeMet: a teacher's Hindi becomes Ho / Mundari / Santali
text and audio for Class 1–3 children. Offline-first PWA in `web/`, optional FastAPI server in
`server/`, seed corpus in `content/lessons.json`. Read `README.md` and `docs/architecture.md` first.

## Rules that must hold

- Never present guessed tribal-language text as correct. Unknown translations stay empty
  placeholders; anything not confirmed by a person is `verified: false` and is shown with the
  "needs verification" tag. Put tribal text on screen only through `TribalText`.
- Translation never invents output: an unknown sentence is shown in Hindi with the
  "translation not available offline" chip.
- A synthetic Hindi voice must not read tribal text. No recording means "audio pending".
- Student screens must work without reading: icon + audio on every control, 64 px targets,
  no typing, no scores that shame.
- Hindi-first UI copy via `useT()('हिंदी', 'English')`.
- Keep initial JS under 300 KB gzipped; role apps and charts stay lazily loaded.

## Ask the team before

- Adding any paid API.
- Sending audio or data to a third-party service.
- Changing the core user flow (teach → doubt → evaluate → practice/remedial → next step).

## Commands

```bash
cd web && npm run dev        # develop
cd web && npm run build      # type-check + build
cd web && npm run preview    # serve the build on :4173, then in another shell:
cd web && npm run e2e        # two-tab browser test, incl. offline
cd server && .venv/Scripts/python -m pytest
```

Commit after each working phase.
