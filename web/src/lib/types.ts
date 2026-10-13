// ISO 639-3: Santali = sat, Ho = hoc, Mundari = unr.
export type TribalLang = 'sat' | 'hoc' | 'unr'
export type LangCode = 'hi' | 'en' | TribalLang
export type Role = 'teacher' | 'student' | 'admin'
export type Subject = 'hindi' | 'ganit' | 'paryavaran'
export type Grade = 1 | 2 | 3
/** FLN outcome areas the lessons are tagged with (see lib/lang.ts OUTCOMES). */
export type Outcome = 'oral' | 'vocab' | 'numeracy' | 'evs'

/** `native` and `alt` scripts per language are described in lib/lang.ts. */
export interface TribalEntry {
  native?: string
  alt?: string
}

export interface LessonItem {
  id: string
  kind: 'word' | 'sentence'
  hi: string
  en?: string
  emoji?: string
  /** For number words: the quantity, drawn as counters and native numerals. */
  digit?: number
  /** Uploaded picture (key into the media table); falls back to emoji. */
  imageId?: string
  tr?: Partial<Record<TribalLang, TribalEntry>>
}

export interface Lesson {
  id: string
  grade: Grade
  subject: Subject
  outcome: Outcome
  emoji: string
  titleHi: string
  titleEn: string
  items: LessonItem[]
  custom?: boolean
}

export interface User {
  id: string
  role: Role
  name: string
  avatar: string
  classId?: string
  /** PIN verifier + wrapped data key; teachers and admins only. */
  salt?: string
  pinHash?: string
  wrappedKey?: string
  wrapIv?: string
}

export interface ClassRoom {
  id: string
  name: string
  grade: Grade
  lang: TribalLang
  teacherId: string
}

export interface GlossaryEntry {
  /** `${lang}|${hiNorm}` */
  id: string
  lang: TribalLang
  hiNorm: string
  hi: string
  native: string
  alt: string
  /** true only once a teacher/community helper has confirmed the text. */
  verified: boolean
  source: 'seed' | 'correction' | 'admin' | 'server'
  author?: string
  updatedAt: number
}

/** Append-only log of corrections: the retraining dataset. Never overwritten on sync. */
export interface CorrectionLog {
  id: string
  lang: TribalLang
  hi: string
  hiNorm: string
  native: string
  alt: string
  prevNative?: string
  prevAlt?: string
  author: string
  at: number
}

export interface AudioClip {
  /** `${lang}|${hiNorm}` */
  id: string
  lang: LangCode
  hiNorm: string
  blob: Blob
  author: string
  at: number
}

export interface MediaBlob {
  id: string
  blob: Blob
}

/** Every provider result carries these four fields. */
export interface ResultMeta {
  provider: string
  confidence: number
  latencyMs: number
  verified: boolean
}

export interface Transcript extends ResultMeta {
  text: string
  lang: LangCode
}

export interface Translation extends ResultMeta {
  from: LangCode
  to: LangCode
  sourceText: string
  /** false = no translation known; UI shows the Hindi with a chip, never invented text. */
  available: boolean
  native: string
  alt: string
  /** Set when a fuzzy match was used, so the teacher can see what was matched. */
  matchedHi?: string
  /** Normalised Hindi that identifies the recorded clip for this translation. */
  audioKey: string
}

export interface AudioOutput extends ResultMeta {
  kind: 'recorded' | 'synth' | 'none'
  /** pending = no recording exists for this tribal text yet. */
  status: 'played' | 'pending' | 'unsupported'
}

export interface LessonContext {
  lessonId?: string
}

export interface Utterance {
  id: string
  classId: string
  lessonId?: string
  source: 'speech' | 'tap' | 'typed'
  hi: string
  translation: Translation
  /** End of speech (or tap) → translation on screen, in ms. */
  latencyMs: number
  at: number
}

export interface Doubt {
  id: string
  classId: string
  studentId: string
  lang: TribalLang
  /** Mother-tongue recording. Stays on the device; not pushed by the sync queue. */
  audio?: Blob
  /** Picture doubt-card the child tapped, if any (gives a reliable Hindi meaning). */
  cardId?: string
  /** Hindi meaning: from the doubt card, or from a tribal-language ASR provider when one exists. */
  hi?: string
  at: number
  status: 'new' | 'answered'
  replyHi?: string
  replyTr?: Translation
  replyAt?: number
  heard?: boolean
}

export interface Evaluation {
  /** `${lessonId}|${studentId}` */
  id: string
  lessonId: string
  studentId: string
  classId: string
  understood: boolean
  at: number
}

export type AttemptKind = 'quiz' | 'practice' | 'remedial' | 'exam'

export interface Attempt {
  id: string
  studentId: string
  classId: string
  lessonId: string
  kind: AttemptKind
  correct: number
  total: number
  at: number
  /** Seeded sample data for the judges' demo. */
  demo?: boolean
}

/** Sensitive student details, AES-GCM encrypted with the PIN-protected data key. */
export interface StudentRecord {
  studentId: string
  iv: string
  data: string
}

export interface StudentPrivate {
  guardian: string
  notes: string
}

export interface SyncItem {
  id?: number
  table: string
  op: 'put' | 'delete'
  key: string
  payload: unknown
  at: number
  status: 'pending' | 'done'
}

export interface Meta {
  key: string
  value: unknown
}
