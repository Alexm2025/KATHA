import { db, save } from './db'
import { normHi, uid } from './lang'
import { clipId } from './providers/tts'
import type { CorrectionLog, GlossaryEntry, LangCode, TribalLang } from './types'

/**
 * The dialect-adaptation loop: a teacher or community helper fixes a translation, the
 * glossary is updated at once (so the next translation uses it) and the change is logged
 * with author + time for model retraining.
 */
export async function saveCorrection(input: {
  lang: TribalLang
  hi: string
  native: string
  alt: string
  author: string
}) {
  const hiNorm = normHi(input.hi)
  const id = `${input.lang}|${hiNorm}`
  const at = Date.now()
  const prev = await db.glossary.get(id)
  const entry: GlossaryEntry = {
    id,
    lang: input.lang,
    hiNorm,
    hi: input.hi,
    native: input.native.trim(),
    alt: input.alt.trim(),
    verified: true,
    source: 'correction',
    author: input.author,
    updatedAt: at,
  }
  const log: CorrectionLog = {
    id: uid(),
    lang: input.lang,
    hi: input.hi,
    hiNorm,
    native: entry.native,
    alt: entry.alt,
    prevNative: prev?.native,
    prevAlt: prev?.alt,
    author: input.author,
    at,
  }
  await save('glossary', id, entry)
  await save('corrections', log.id, log)
  return entry
}

export const saveClip = (lang: LangCode, sourceHi: string, blob: Blob, author: string) =>
  db.audio.put({ id: clipId(lang, sourceHi), lang, hiNorm: normHi(sourceHi), blob, author, at: Date.now() })

const CSV_COLS = ['id', 'lang', 'hi', 'native', 'alt', 'prevNative', 'prevAlt', 'author', 'at'] as const

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`

export function correctionsToCsv(rows: CorrectionLog[]) {
  return [CSV_COLS.join(','), ...rows.map((r) => CSV_COLS.map((c) => csvCell(r[c])).join(','))].join('\n')
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') (cell += '"'), i++
      else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') (row.push(cell), (cell = ''))
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell || row.length) (row.push(cell), rows.push(row))
  return rows.filter((r) => r.some(Boolean))
}

/** Reads a corrections dataset exported as JSON or CSV. */
export function parseCorrections(text: string, isCsv: boolean): CorrectionLog[] {
  let raw: Record<string, unknown>[]
  if (isCsv) {
    const [head, ...body] = parseCsv(text)
    raw = body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])))
  } else {
    const json = JSON.parse(text)
    raw = Array.isArray(json) ? json : (json.corrections ?? [])
  }
  return raw
    .filter((r) => (r.lang === 'sat' || r.lang === 'hoc' || r.lang === 'unr') && r.hi && (r.native || r.alt))
    .map((r) => ({
      id: String(r.id || uid()),
      lang: r.lang as TribalLang,
      hi: String(r.hi),
      hiNorm: normHi(String(r.hi)),
      native: String(r.native ?? ''),
      alt: String(r.alt ?? ''),
      prevNative: r.prevNative ? String(r.prevNative) : undefined,
      prevAlt: r.prevAlt ? String(r.prevAlt) : undefined,
      author: String(r.author || 'import'),
      at: Number(r.at) || Date.now(),
    }))
}

export function download(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
