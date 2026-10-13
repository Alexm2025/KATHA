import type { Outcome, Subject, TribalEntry, TribalLang } from './types'

export const TRIBAL_LANGS: TribalLang[] = ['sat', 'hoc', 'unr']

interface LangInfo {
  hi: string
  en: string
  nativeScript: string
  altScript?: string
  /** Honest status of machine translation for this language. */
  mtHi: string
  mtEn: string
  mtCovered: boolean
}

export const LANGS: Record<TribalLang, LangInfo> = {
  sat: {
    hi: 'संथाली',
    en: 'Santali',
    nativeScript: 'Ol Chiki',
    altScript: 'Latin',
    mtCovered: true,
    mtHi: 'IndicTrans2 (AI4Bharat) संथाली को कवर करता है — सर्वर से जुड़ने पर उपलब्ध।',
    mtEn: 'Covered by AI4Bharat IndicTrans2 — available once the server model is connected.',
  },
  hoc: {
    hi: 'हो',
    en: 'Ho',
    nativeScript: 'Warang Citi',
    altScript: 'Devanagari',
    mtCovered: false,
    mtHi: 'IndicTrans2 में नहीं है। योजना: शब्दकोश + शिक्षक सुधार + LLM-सहायता, मातृभाषी द्वारा जाँच।',
    mtEn: 'Not covered by IndicTrans2. Plan: glossary + teacher corrections + LLM-assisted drafts, verified by native speakers.',
  },
  unr: {
    hi: 'मुंडारी',
    en: 'Mundari',
    nativeScript: 'Devanagari',
    mtCovered: false,
    mtHi: 'IndicTrans2 में नहीं है। योजना: शब्दकोश + शिक्षक सुधार + LLM-सहायता, मातृभाषी द्वारा जाँच।',
    mtEn: 'Not covered by IndicTrans2. Plan: glossary + teacher corrections + LLM-assisted drafts, verified by native speakers.',
  },
}

export const SUBJECTS: Record<Subject, { hi: string; en: string; emoji: string }> = {
  hindi: { hi: 'हिंदी भाषा', en: 'Hindi Bhasha', emoji: '📖' },
  ganit: { hi: 'गणित', en: 'Ganit', emoji: '🔢' },
  paryavaran: { hi: 'पर्यावरण', en: 'Paryavaran', emoji: '🌳' },
}

// Outcome areas the seed lessons are tagged with. They follow the NIPUN Bharat FLN
// goal areas; the mapping to official Lakshya codes still has to be validated.
export const OUTCOMES: Record<Outcome, { hi: string; en: string }> = {
  oral: { hi: 'मौखिक भाषा', en: 'Oral language' },
  vocab: { hi: 'शब्द भंडार', en: 'Vocabulary' },
  numeracy: { hi: 'संख्या ज्ञान', en: 'Number sense' },
  evs: { hi: 'आस-पास की समझ', en: 'Environment awareness' },
}

/** Lowercase, strip punctuation/nukta, unify nasal marks: the glossary lookup key. */
export function normHi(s: string): string {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[।॥.,!?;:"'()\-–—…]/g, ' ')
    .replace(/़/g, '')
    .replace(/ँ/g, 'ं')
    .replace(/\s+/g, ' ')
    .trim()
}

export const hasText = (e?: TribalEntry | null) => !!(e && (e.native || e.alt))

/** Text to show for an entry, honouring the script toggle and falling back to whichever exists. */
export function pickScript(e: TribalEntry, useAlt: boolean): string {
  return (useAlt ? e.alt || e.native : e.native || e.alt) ?? ''
}

const DIGIT_BASE: Record<TribalLang, number> = {
  sat: 0x1c50, // Ol Chiki digits
  hoc: 0x118e0, // Warang Citi digits
  unr: 0x0966, // Devanagari digits
}

/** Numerals in the language's own script (a Unicode fact, not a translation). */
export function nativeDigits(lang: TribalLang, n: number): string {
  return [...String(n)].map((d) => String.fromCodePoint(DIGIT_BASE[lang] + Number(d))).join('')
}

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
