import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { useRecorder } from '@/lib/audio'
import { db } from '@/lib/db'
import { LANGS, nativeDigits, normHi, pickScript } from '@/lib/lang'
import { usePrefs, useT } from '@/lib/store'
import type { GlossaryEntry, LessonItem, TribalLang } from '@/lib/types'

const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ')
export { cx }

const BTN = {
  primary: 'bg-terra text-white hover:bg-terra-dark',
  leaf: 'bg-leaf text-white hover:bg-leaf-dark',
  soft: 'bg-cream-deep text-ink hover:bg-saffron-soft',
  ghost: 'bg-transparent text-ink hover:bg-cream-deep',
  outline: 'bg-white text-terra-dark border-2 border-terra hover:bg-terra-soft',
}

export function Btn({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BTN }) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-2 font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        BTN[variant],
        className,
      )}
    />
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cx('rounded-2xl border border-cream-deep bg-white p-4 shadow-sm', className)}>
      {children}
    </div>
  )
}

const CHIP = {
  neutral: 'bg-cream-deep text-ink',
  good: 'bg-leaf-soft text-leaf-dark',
  warn: 'bg-saffron-soft text-terra-dark',
  bad: 'bg-terra-soft text-terra-dark',
}

export function Chip({ tone = 'neutral', children }: { tone?: keyof typeof CHIP; children: ReactNode }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-bold', CHIP[tone])}>
      {children}
    </span>
  )
}

export function Logo({ small }: { small?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 font-bold text-terra-dark">
      <img src="/favicon.svg" alt="" className={small ? 'size-7' : 'size-9'} />
      <span className={small ? 'text-lg' : 'text-2xl'}>KATHA</span>
    </span>
  )
}

export function LangToggle() {
  const { uiLang, set } = usePrefs()
  return (
    <button
      type="button"
      onClick={() => set({ uiLang: uiLang === 'hi' ? 'en' : 'hi' })}
      aria-label={uiLang === 'hi' ? 'Switch to English' : 'हिंदी में बदलें'}
      className="min-h-12 rounded-xl border-2 border-cream-deep bg-white px-3 font-bold text-ink hover:bg-cream-deep"
    >
      {uiLang === 'hi' ? 'English' : 'हिंदी'}
    </button>
  )
}

/** The verification state of a piece of tribal-language text. Always shown next to it. */
export function VerifyTag({ verified }: { verified: boolean }) {
  const t = useT()
  return verified ? (
    <Chip tone="good">✓ {t('समुदाय-सत्यापित', 'community-verified')}</Chip>
  ) : (
    <Chip tone="warn">⚠ {t('जाँच बाकी', 'needs verification')}</Chip>
  )
}

/**
 * The only way tribal-language text is put on screen. It carries the verification tag
 * with it, and shows a clear "not available" state instead of anything invented.
 */
export function TribalText({
  lang,
  native,
  alt,
  verified,
  className = 'text-2xl',
  compactTag,
}: {
  lang: TribalLang
  native?: string
  alt?: string
  verified: boolean
  className?: string
  compactTag?: boolean
}) {
  const t = useT()
  const useAlt = usePrefs((s) => s.altScript)
  const text = pickScript({ native, alt }, useAlt)
  if (!text) {
    return <Chip tone="neutral">⏳ {t('अनुवाद ऑफ़लाइन उपलब्ध नहीं', 'translation not available offline')}</Chip>
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
      <span lang={lang} className={cx('font-bold leading-relaxed', className)}>
        {text}
      </span>
      {compactTag && verified ? null : <VerifyTag verified={verified} />}
    </span>
  )
}

export function ScriptToggle({ lang }: { lang: TribalLang }) {
  const { altScript, set } = usePrefs()
  const info = LANGS[lang]
  if (!info.altScript) return null
  return (
    <button
      type="button"
      onClick={() => set({ altScript: !altScript })}
      className="min-h-12 rounded-xl border-2 border-cream-deep bg-white px-3 text-sm font-bold hover:bg-cream-deep"
    >
      🔤 {altScript ? info.altScript : info.nativeScript}
    </button>
  )
}

export function LatencyBadge({ ms }: { ms: number }) {
  // Target is under 3 seconds from end of speech to output.
  const tone = ms < 1500 ? 'good' : ms < 3000 ? 'warn' : 'bad'
  return (
    <Chip tone={tone}>
      <span aria-hidden>⏱</span> {ms} ms
    </Chip>
  )
}

/** Live map of the glossary for one language, keyed by normalised Hindi. */
export function useGlossary(lang?: TribalLang) {
  return useLiveQuery(async () => {
    const map = new Map<string, GlossaryEntry>()
    if (lang) await db.glossary.where('lang').equals(lang).each((e) => map.set(e.hiNorm, e))
    return map
  }, [lang])
}

export const entryFor = (g: Map<string, GlossaryEntry> | undefined, hi: string) => g?.get(normHi(hi))

/** Ids of the recorded clips for one language. */
export function useClips(lang?: TribalLang) {
  return useLiveQuery(
    async () => new Set(lang ? await db.audio.where('lang').equals(lang).primaryKeys() : []),
    [lang],
  )
}

function useObjectUrl(blob?: Blob) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!blob) return setUrl(undefined)
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}

/** A lesson item's picture: uploaded image, counters for number words, or its emoji. */
export function Pic({ item, lang, className = 'text-6xl' }: { item: LessonItem; lang?: TribalLang; className?: string }) {
  const media = useLiveQuery(() => (item.imageId ? db.media.get(item.imageId) : undefined), [item.imageId])
  const url = useObjectUrl(media?.blob)
  if (url) return <img src={url} alt={item.en ?? item.hi} className="size-24 rounded-xl object-cover" />
  if (item.digit) {
    return (
      <span className="flex flex-col items-center" role="img" aria-label={String(item.digit)}>
        <span className={cx('font-bold text-terra-dark', className)}>
          {lang ? nativeDigits(lang, item.digit) : item.digit}
          {lang && <span className="ml-2 text-[0.5em] text-ink-soft">{item.digit}</span>}
        </span>
        <span className="max-w-40 text-center text-xl leading-tight">{'🥭'.repeat(item.digit)}</span>
      </span>
    )
  }
  return (
    <span role="img" aria-label={item.en ?? item.hi} className={cx('leading-none', className)}>
      {item.emoji ?? '🔤'}
    </span>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-3 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">{title}</h2>
          <Btn variant="ghost" onClick={onClose} aria-label="Close">
            ✕
          </Btn>
        </div>
        {children}
      </div>
    </div>
  )
}

/** Tap to start, tap to stop. Used for pronunciation clips and voice doubts. */
export function RecordBtn({ onDone, label }: { onDone: (blob: Blob) => void; label: string }) {
  const t = useT()
  const { recording, error, start, stop } = useRecorder(onDone)
  return (
    <span className="inline-flex items-center gap-2">
      <Btn variant={recording ? 'primary' : 'outline'} onClick={recording ? stop : start} aria-pressed={recording}>
        {recording ? `⏹ ${t('रोकें', 'Stop')}` : `🎙 ${label}`}
      </Btn>
      {error && <Chip tone="bad">{t('माइक नहीं मिला', 'No microphone')}</Chip>}
    </span>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-ink-soft">{label}</span>
      {children}
    </label>
  )
}

export const inputCls =
  'min-h-12 w-full rounded-xl border-2 border-cream-deep bg-white px-3 py-2 text-lg focus:border-terra'

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-cream-deep/60 p-6 text-center text-ink-soft">{children}</p>
}
