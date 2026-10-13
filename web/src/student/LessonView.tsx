import { Link } from 'react-router-dom'
import { entryFor, Pic, TribalText, useGlossary } from '@/components/ui'
import { useLearn } from '@/lib/hooks'
import { hasText } from '@/lib/lang'
import { usePrefs } from '@/lib/store'
import { Say, sayWord } from './kid'

/** Lesson content: every word and sentence with its picture, text and audio. */
export default function LessonView() {
  const { cls, lesson } = useLearn()
  const showTribal = usePrefs((s) => s.showTribal)
  const glossary = useGlossary(cls?.lang)
  if (!cls || !lesson) return null

  return (
    <div className="space-y-3">
      <h1 className="flex items-center justify-center gap-3 text-3xl font-bold">
        <span className="text-5xl" aria-hidden>{lesson.emoji}</span>
        {lesson.titleHi}
        <Say hi={lesson.titleHi} />
      </h1>
      <ul className="space-y-3">
        {lesson.items.map((it) => {
          const e = entryFor(glossary, it.hi)
          const tribal = showTribal && hasText(e)
          return (
            <li key={it.id} className="flex items-center gap-4 rounded-3xl border-4 border-cream-deep bg-white p-3">
              {it.kind === 'word' ? <Pic item={it} lang={cls.lang} className="text-5xl" /> : <span className="text-4xl" aria-hidden>💬</span>}
              <div className="min-w-0 flex-1">
                {tribal ? (
                  <>
                    <TribalText lang={cls.lang} native={e!.native} alt={e!.alt} verified={e!.verified} className="text-3xl text-leaf-dark" compactTag />
                    <p className="text-xl text-ink-soft">{it.hi}</p>
                  </>
                ) : (
                  <p className="text-3xl font-bold">{it.hi}</p>
                )}
              </div>
              <Say hi={it.hi} onSay={() => sayWord(cls.lang, it.hi, showTribal ? e : undefined)} />
            </li>
          )
        })}
      </ul>
      <Link
        to={`/student/play?mode=practice&lesson=${lesson.id}`}
        aria-label="अभ्यास करो"
        className="flex min-h-20 items-center justify-center gap-3 rounded-3xl bg-leaf text-3xl font-bold text-white"
      >
        ✏️ <span className="text-xl">अभ्यास करो</span>
      </Link>
    </div>
  )
}
