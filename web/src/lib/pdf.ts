import { db } from './db'
import { hasText, LANGS, nativeDigits, normHi, pickScript } from './lang'
import type { GlossaryEntry, Lesson, LessonItem, TribalLang } from './types'

// Worksheets are drawn on a canvas and placed in the PDF as page images. PDF libraries
// do not shape Devanagari conjuncts or handle Ol Chiki / Warang Citi reliably; the
// browser's own text engine does, so what the teacher previews is exactly what prints.

const W = 1240 // A4 at 150 dpi
const H = 1754
const M = 80
const FONT = '"Noto Sans Devanagari", "Noto Sans Ol Chiki", "Noto Sans Warang Citi", sans-serif'
const EMOJI = '"Segoe UI Emoji", "Noto Color Emoji", "Apple Color Emoji", sans-serif'
const INK = '#2b1d14'
const SOFT = '#6b5444'
const TERRA = '#b84a22'
const LEAF = '#2f6b34'
const LINE = '#d9c7a8'

export interface WorksheetInput {
  lesson: Lesson
  lang: TribalLang
  glossary: Map<string, GlossaryEntry>
  useAlt: boolean
  className?: string
}

type Ctx = CanvasRenderingContext2D

function text(ctx: Ctx, s: string, x: number, y: number, size: number, opts: { color?: string; bold?: boolean; max?: number; align?: CanvasTextAlign; font?: string } = {}) {
  let px = size
  const set = () => (ctx.font = `${opts.bold ? '700' : '400'} ${px}px ${opts.font ?? FONT}`)
  set()
  // Shrink to fit the column rather than overflow it.
  while (opts.max && ctx.measureText(s).width > opts.max && px > 16) {
    px -= 2
    set()
  }
  ctx.fillStyle = opts.color ?? INK
  ctx.textAlign = opts.align ?? 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(s, x, y)
  return ctx.measureText(s).width
}

function rule(ctx: Ctx, x1: number, y: number, x2: number, dashed = false) {
  ctx.save()
  ctx.strokeStyle = dashed ? SOFT : LINE
  ctx.lineWidth = 2
  if (dashed) ctx.setLineDash([4, 8])
  ctx.beginPath()
  ctx.moveTo(x1, y)
  ctx.lineTo(x2, y)
  ctx.stroke()
  ctx.restore()
}

function page(): { canvas: HTMLCanvasElement; ctx: Ctx } {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = TERRA
  ctx.fillRect(0, 0, W, 18)
  ctx.fillStyle = LEAF
  ctx.fillRect(0, 18, W, 8)
  return { canvas, ctx }
}

async function picture(ctx: Ctx, item: LessonItem, lang: TribalLang, cx: number, cy: number, size: number) {
  if (item.imageId) {
    const media = await db.media.get(item.imageId)
    if (media) {
      const bmp = await createImageBitmap(media.blob)
      ctx.drawImage(bmp, cx - size / 2, cy - size / 2, size, size)
      return
    }
  }
  if (item.digit) {
    text(ctx, nativeDigits(lang, item.digit), cx - 6, cy, size * 0.8, { bold: true, color: TERRA, align: 'right' })
    text(ctx, String(item.digit), cx + 10, cy + 6, size * 0.45, { color: SOFT })
    return
  }
  text(ctx, item.emoji ?? '', cx, cy, size * 0.8, { align: 'center', font: EMOJI })
}

/** Draws a tribal-language cell. Returns true if it printed unverified text. */
function tribalCell(ctx: Ctx, e: GlossaryEntry | undefined, useAlt: boolean, x: number, y: number, max: number, size: number) {
  if (!hasText(e)) {
    // No translation yet: leave a line for the teacher or a community helper to fill in.
    rule(ctx, x, y + size * 0.5, x + max - 20, true)
    return false
  }
  const w = text(ctx, pickScript(e!, useAlt), x, y, size, { bold: true, color: LEAF, max: max - 50 })
  text(ctx, e!.verified ? '✓' : '*', x + w + 10, y - size * 0.25, size * 0.6, { bold: true, color: e!.verified ? LEAF : TERRA })
  return !e!.verified
}

function footer(ctx: Ctx, n: number, of: number, unverified: boolean) {
  rule(ctx, M, H - 110, W - M)
  if (unverified) {
    text(ctx, '* जाँच बाकी — यह अनुवाद अभी मातृभाषी द्वारा जाँचा नहीं गया है (needs verification by a native speaker).', M, H - 80, 22, { color: TERRA, max: W - 2 * M })
  }
  text(ctx, '✓ समुदाय-सत्यापित (community-verified)', M, H - 48, 22, { color: LEAF })
  text(ctx, `KATHA · ${n} / ${of}`, W - M, H - 48, 22, { color: SOFT, align: 'right' })
}

export async function renderWorksheet(input: WorksheetInput): Promise<HTMLCanvasElement[]> {
  const { lesson, lang, glossary, useAlt } = input
  const info = LANGS[lang]
  await Promise.all(
    ['"Noto Sans Devanagari"', '"Noto Sans Ol Chiki"', '"Noto Sans Warang Citi"'].flatMap((f) => [
      document.fonts.load(`400 40px ${f}`, 'क ᱚ 𑢡'),
      document.fonts.load(`700 40px ${f}`, 'क ᱚ 𑢡'),
    ]),
  )
  const entry = (it: LessonItem) => glossary.get(normHi(it.hi))
  const words = lesson.items.filter((i) => i.kind === 'word').slice(0, 10)
  const sentences = lesson.items.filter((i) => i.kind === 'sentence').slice(0, 5)
  const script = useAlt && info.altScript ? info.altScript : info.nativeScript

  // ---- Page 1: look, read and write ---------------------------------------------------
  const p1 = page()
  let c = p1.ctx
  let flagged = false
  text(c, 'KATHA', M, 80, 34, { bold: true, color: TERRA })
  text(c, 'समझो, सीखो', W - M, 80, 28, { color: LEAF, align: 'right' })
  text(c, lesson.titleHi, M, 160, 58, { bold: true, max: W - 2 * M })
  text(c, `${lesson.titleEn} · हिंदी + ${info.hi} (${script})`, M, 222, 26, { color: SOFT })
  text(c, `नाम: ______________________     कक्षा: ${input.className ?? '__________'}`, M, 290, 28)
  text(c, '1. देखो, पढ़ो और लिखो', M, 370, 34, { bold: true, color: TERRA })

  const cols = [M, M + 190, M + 500, M + 810]
  let y = 430
  ;['चित्र', 'हिंदी', info.hi, 'लिखो'].forEach((h, i) => text(c, h, cols[i] + 10, y, 24, { bold: true, color: SOFT }))
  rule(c, M, y + 26, W - M)
  y += 30
  const rowH = 112
  for (const it of words) {
    const mid = y + rowH / 2
    await picture(c, it, lang, cols[0] + 90, mid, 90)
    text(c, it.hi, cols[1] + 10, mid, 46, { bold: true, max: 290 })
    flagged = tribalCell(c, entry(it), useAlt, cols[2] + 10, mid, 300, 44) || flagged
    rule(c, cols[3] + 10, mid + 26, W - M, true)
    rule(c, M, y + rowH, W - M)
    y += rowH
  }
  footer(c, 1, 2, flagged)

  // ---- Page 2: match, count or draw, speak ----------------------------------------------
  const p2 = page()
  c = p2.ctx
  flagged = false
  text(c, '2. चित्र को शब्द से मिलाओ', M, 100, 34, { bold: true, color: TERRA })
  const pairs = words.slice(0, 5)
  // Rotate the word column so no picture sits opposite its own word.
  const rotated = pairs.map((_, i) => pairs[(i + 2) % pairs.length])
  y = 150
  for (let i = 0; i < pairs.length; i++) {
    const mid = y + 60
    await picture(c, pairs[i], lang, M + 90, mid, 90)
    c.fillStyle = INK
    c.beginPath()
    c.arc(M + 230, mid, 8, 0, Math.PI * 2)
    c.arc(W - M - 520, mid, 8, 0, Math.PI * 2)
    c.fill()
    const e = entry(rotated[i])
    const x = W - M - 490
    if (hasText(e)) {
      flagged = tribalCell(c, e, useAlt, x, mid - 22, 480, 40) || flagged
      text(c, rotated[i].hi, x, mid + 28, 28, { color: SOFT })
    } else {
      text(c, rotated[i].hi, x, mid, 42, { bold: true })
    }
    y += 120
  }

  y += 40
  const counts = words.filter((w) => w.digit).slice(0, 4)
  if (counts.length) {
    text(c, '3. गिनो और लिखो', M, y, 34, { bold: true, color: TERRA })
    y += 50
    for (const it of counts) {
      text(c, '🥭'.repeat(it.digit!), M, y + 40, 44, { font: EMOJI, max: W - 2 * M - 180 })
      c.strokeStyle = INK
      c.lineWidth = 3
      c.strokeRect(W - M - 130, y, 110, 80)
      y += 100
    }
  } else {
    text(c, '3. अपनी पसंद का चित्र बनाओ', M, y, 34, { bold: true, color: TERRA })
    c.strokeStyle = LINE
    c.lineWidth = 3
    c.strokeRect(M, y + 40, W - 2 * M, 300)
    y += 360
  }

  if (sentences.length && y < H - 420) {
    y += 40
    text(c, '4. शिक्षक के साथ बोलो', M, y, 34, { bold: true, color: TERRA })
    y += 60
    for (const it of sentences) {
      if (y > H - 190) break
      text(c, it.hi, M, y, 32, { max: (W - 2 * M) / 2 - 20 })
      flagged = tribalCell(c, entry(it), useAlt, W / 2 + 10, y, W / 2 - M - 10, 32) || flagged
      y += 64
    }
  }
  footer(c, 2, 2, flagged)

  return [p1.canvas, p2.canvas]
}

export async function worksheetPdf(input: WorksheetInput, canvases?: HTMLCanvasElement[]): Promise<Uint8Array<ArrayBuffer>> {
  const pages = canvases ?? (await renderWorksheet(input))
  const { PDFDocument } = await import('pdf-lib')
  const doc = await PDFDocument.create()
  doc.setTitle(`KATHA — ${input.lesson.titleEn} (${LANGS[input.lang].en})`)
  for (const canvas of pages) {
    const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', 0.9))
    const jpg = await doc.embedJpg(await blob.arrayBuffer())
    const p = doc.addPage([595.28, 841.89])
    p.drawImage(jpg, { x: 0, y: 0, width: 595.28, height: 841.89 })
  }
  return (await doc.save()) as Uint8Array<ArrayBuffer>
}
