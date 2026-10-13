import { db } from '../db'
import { normHi } from '../lang'
import { isOnline } from '../store'
import type { GlossaryEntry, LangCode, LessonContext, TribalLang, Translation } from '../types'
import { API_URL, type TranslationProvider } from './types'

const isTribal = (l: LangCode): l is TribalLang => l === 'sat' || l === 'hoc' || l === 'unr'

const bigrams = (s: string) => {
  const out = new Map<string, number>()
  for (let i = 0; i < s.length - 1; i++) {
    const g = s.slice(i, i + 2)
    out.set(g, (out.get(g) ?? 0) + 1)
  }
  return out
}

/** Dice coefficient over character bigrams, 0..1. */
export function similarity(a: string, b: string): number {
  if (a === b) return 1
  if (a.length < 2 || b.length < 2) return 0
  const A = bigrams(a)
  const B = bigrams(b)
  let overlap = 0
  for (const [g, n] of A) overlap += Math.min(n, B.get(g) ?? 0)
  return (2 * overlap) / (a.length - 1 + b.length - 1)
}

// A fuzzy match has to be this close before we trust it; anything less is "not available".
const FUZZY_MIN = 0.86

const filled = (e?: GlossaryEntry) => !!e && (!!e.native || !!e.alt)

/**
 * Offline default. Looks sentences and phrases up in the local glossary (seed corpus +
 * teacher corrections). It never composes or invents text: an unknown sentence comes
 * back with `available: false`.
 */
export class GlossaryTranslator implements TranslationProvider {
  name = 'glossary-offline'

  async translate(text: string, from: LangCode, to: LangCode): Promise<Translation> {
    const t0 = performance.now()
    const miss = (): Translation => ({
      provider: this.name,
      confidence: 0,
      latencyMs: Math.round(performance.now() - t0),
      verified: false,
      from,
      to,
      sourceText: text,
      available: false,
      native: '',
      alt: '',
    })
    if (from !== 'hi' || !isTribal(to)) return miss()

    const whole = await this.lookup(normHi(text), to)
    const parts = whole ? [whole] : await this.byPhrase(text, to)
    if (!parts) return miss()

    const join = (k: 'native' | 'alt') =>
      parts.every((p) => p.entry[k]) ? parts.map((p) => p.entry[k]).join(' ') : ''
    const fuzzy = parts.some((p) => p.score < 1)
    return {
      provider: this.name,
      confidence: Math.min(...parts.map((p) => p.score)),
      latencyMs: Math.round(performance.now() - t0),
      verified: parts.every((p) => p.entry.verified),
      from,
      to,
      sourceText: text,
      available: true,
      native: join('native'),
      alt: join('alt') || (join('native') ? '' : parts.map((p) => p.entry.alt || p.entry.native).join(' ')),
      matchedHi: fuzzy ? parts.map((p) => p.entry.hi).join(' ') : undefined,
    }
  }

  private async lookup(norm: string, to: TribalLang) {
    if (!norm) return null
    const exact = await db.glossary.get(`${to}|${norm}`)
    if (filled(exact)) return { entry: exact!, score: 1 }
    let best: { entry: GlossaryEntry; score: number } | null = null
    await db.glossary
      .where('lang')
      .equals(to)
      .each((entry) => {
        if (!filled(entry)) return
        const score = similarity(norm, entry.hiNorm)
        if (score >= FUZZY_MIN && (!best || score > best.score)) best = { entry, score }
      })
    return best as { entry: GlossaryEntry; score: number } | null
  }

  /** "जोहार। एक, दो" → every phrase between punctuation must be known, or the whole thing misses. */
  private async byPhrase(text: string, to: TribalLang) {
    const phrases = text.split(/[।॥.,!?;]+/).map(normHi).filter(Boolean)
    if (phrases.length < 2) return null
    const parts = []
    for (const p of phrases) {
      const hit = await this.lookup(p, to)
      if (!hit) return null
      parts.push(hit)
    }
    return parts
  }
}

/** Client for the FastAPI `/translate` endpoint (IndicTrans2 / LLM behind it). */
export class ServerTranslator implements TranslationProvider {
  name = 'server'

  async translate(text: string, from: LangCode, to: LangCode, ctx?: LessonContext): Promise<Translation> {
    const t0 = performance.now()
    const res = await fetch(`${API_URL}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, from, to, lessonId: ctx?.lessonId }),
      signal: AbortSignal.timeout(2500),
    })
    if (!res.ok) throw new Error(`translate ${res.status}`)
    const body = await res.json()
    return {
      provider: body.provider ?? this.name,
      confidence: body.confidence ?? 0,
      latencyMs: Math.round(performance.now() - t0),
      // Machine output is never "verified" until a person confirms it.
      verified: false,
      from,
      to,
      sourceText: text,
      available: !!body.available,
      native: body.native ?? '',
      alt: body.alt ?? '',
    }
  }
}

/** Glossary first (so teacher corrections always win), server only for what it cannot answer. */
export class ChainTranslator implements TranslationProvider {
  name = 'chain'
  private local = new GlossaryTranslator()
  private remote = new ServerTranslator()

  async translate(text: string, from: LangCode, to: LangCode, ctx?: LessonContext): Promise<Translation> {
    const t0 = performance.now()
    const local = await this.local.translate(text, from, to)
    if (local.available || !API_URL || !isOnline()) return local
    try {
      const remote = await this.remote.translate(text, from, to, ctx)
      return remote.available ? remote : local
    } catch {
      return { ...local, latencyMs: Math.round(performance.now() - t0) }
    }
  }
}
