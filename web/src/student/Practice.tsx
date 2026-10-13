import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cx, entryFor, Pic, TribalText, useGlossary } from '@/components/ui'
import { download } from '@/lib/glossary'
import { useLearn } from '@/lib/hooks'
import { hasText } from '@/lib/lang'
import { usePrefs } from '@/lib/store'
import type { GlossaryEntry, LessonItem, TribalLang } from '@/lib/types'
import { KidBtn, Say, sayWord } from './kid'

/** Picture on the front, the word on the back; tap to flip, speaker to hear it. */
export function Flashcard({ item, lang, entry }: { item: LessonItem; lang: TribalLang; entry?: GlossaryEntry }) {
  const [flipped, setFlipped] = useState(false)
  const showTribal = usePrefs((s) => s.showTribal)
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={item.en ?? item.hi}
        aria-pressed={flipped}
        onClick={() => {
          setFlipped(!flipped)
          if (!flipped) void sayWord(lang, item.hi, showTribal ? entry : undefined)
        }}
        className={cx(
          'flex min-h-44 w-full flex-col items-center justify-center gap-1 rounded-3xl border-4 p-3 text-center',
          flipped ? 'border-leaf bg-leaf-soft' : 'border-saffron bg-white',
        )}
      >
        {flipped ? (
          <>
            {showTribal && hasText(entry) && (
              <TribalText lang={lang} native={entry!.native} alt={entry!.alt} verified={entry!.verified} className="text-3xl text-leaf-dark" compactTag />
            )}
            <span className={showTribal && hasText(entry) ? 'text-xl text-ink-soft' : 'text-3xl font-bold'}>{item.hi}</span>
          </>
        ) : (
          <Pic item={item} lang={lang} className="text-7xl" />
        )}
      </button>
      <Say hi={item.hi} onSay={() => sayWord(lang, item.hi, showTribal ? entry : undefined)} className="absolute -right-1 -top-1 size-14 text-2xl" />
    </div>
  )
}

export default function Practice() {
  const { cls, lessons, lesson: current } = useLearn()
  const [lessonId, setLessonId] = useState<string>()
  const altScript = usePrefs((s) => s.altScript)
  const glossary = useGlossary(cls?.lang)
  const [busy, setBusy] = useState(false)
  const lesson = lessons?.find((l) => l.id === lessonId) ?? current
  if (!cls || !lesson || !glossary) return null

  async function worksheet() {
    setBusy(true)
    try {
      const { worksheetPdf } = await import('@/lib/pdf')
      const bytes = await worksheetPdf({ lesson: lesson!, lang: cls!.lang, glossary: glossary!, useAlt: altScript })
      download(`katha-${lesson!.id}-${cls!.lang}.pdf`, bytes, 'application/pdf')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="पाठ">
        {lessons?.map((l) => (
          <button
            key={l.id}
            type="button"
            role="tab"
            aria-selected={l.id === lesson.id}
            aria-label={l.titleHi}
            onClick={() => setLessonId(l.id)}
            className={cx('flex size-20 shrink-0 items-center justify-center rounded-3xl border-4 text-5xl', l.id === lesson.id ? 'border-terra bg-terra-soft' : 'border-cream-deep bg-white')}
          >
            {l.emoji}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link to={`/student/play?mode=practice&lesson=${lesson.id}`} aria-label="खेलो" className="flex min-h-16 items-center gap-2 rounded-2xl bg-leaf px-5 text-2xl font-bold text-white">
          🎯 <span className="text-lg">खेलो</span>
        </Link>
        <KidBtn icon="🧾" label={busy ? '…' : 'वर्कशीट'} tone="soft" disabled={busy} onClick={worksheet} />
        <Say hi="कार्ड छूकर शब्द देखो और सुनो" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {lesson.items
          .filter((i) => i.kind === 'word')
          .map((it) => (
            <Flashcard key={it.id} item={it} lang={cls.lang} entry={entryFor(glossary, it.hi)} />
          ))}
      </div>
    </div>
  )
}
