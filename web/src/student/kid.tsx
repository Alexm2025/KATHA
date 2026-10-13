import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cx } from '@/components/ui'
import { tts } from '@/lib/providers'
import type { GlossaryEntry, TribalLang } from '@/lib/types'

/** Speak a Hindi label or word (recorded clip if there is one, else the Hindi voice). */
export const sayHindi = (hi: string) => void tts.speak(hi, 'hi')

/**
 * Say a word for a child: the mother-tongue recording when one exists, otherwise the
 * Hindi word in a Hindi voice. Tribal text is never read out by a synthetic voice.
 */
export async function sayWord(lang: TribalLang, hi: string, entry?: GlossaryEntry) {
  if (entry && (entry.native || entry.alt)) {
    const out = await tts.speak(entry.native || entry.alt, lang, hi)
    if (out.status === 'played') return
  }
  sayHindi(hi)
}

/** Round speaker button: every student-facing control has one, so no reading is needed. */
export function Say({ hi, onSay, className }: { hi: string; onSay?: () => void; className?: string }) {
  return (
    <button
      type="button"
      aria-label={`सुनो: ${hi}`}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (onSay) onSay()
        else sayHindi(hi)
      }}
      className={cx('flex size-16 shrink-0 items-center justify-center rounded-full bg-saffron-soft text-3xl hover:bg-saffron', className)}
    >
      🔊
    </button>
  )
}

const TONES = {
  terra: 'bg-terra-soft border-terra',
  leaf: 'bg-leaf-soft border-leaf',
  saffron: 'bg-saffron-soft border-saffron',
  cream: 'bg-white border-cream-deep',
}

/** Big picture tile that navigates; its speaker button says the label. */
export function KidTile({
  to,
  icon,
  hi,
  tone = 'cream',
  badge,
  children,
}: {
  to: string
  icon: string
  hi: string
  tone?: keyof typeof TONES
  badge?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className={cx('relative flex min-h-40 flex-col rounded-3xl border-4', TONES[tone])}>
      <Link to={to} aria-label={hi} className="flex flex-1 flex-col items-center justify-center gap-1 rounded-3xl p-4 text-center">
        <span className="text-7xl leading-none" aria-hidden>{icon}</span>
        <span className="text-xl font-bold">{hi}</span>
        {children}
      </Link>
      <Say hi={hi} className="absolute right-2 top-2" />
      {badge && <span className="absolute left-2 top-2 rounded-full bg-terra px-3 py-1 text-lg font-bold text-white">{badge}</span>}
    </div>
  )
}

export function KidBtn({
  icon,
  label,
  onClick,
  tone = 'terra',
  disabled,
}: {
  icon: string
  label: string
  onClick: () => void
  tone?: 'terra' | 'leaf' | 'soft'
  disabled?: boolean
}) {
  const cls = { terra: 'bg-terra text-white', leaf: 'bg-leaf text-white', soft: 'bg-cream-deep text-ink' }[tone]
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cx('inline-flex min-h-16 min-w-16 items-center justify-center gap-2 rounded-2xl px-5 text-2xl font-bold disabled:opacity-40', cls)}
    >
      <span aria-hidden>{icon}</span>
      <span className="text-lg">{label}</span>
    </button>
  )
}
