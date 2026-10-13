import { useLiveQuery } from 'dexie-react-hooks'
import { motion, MotionConfig } from 'framer-motion'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { cx, entryFor, Pic, TribalText, useGlossary } from '@/components/ui'
import { sounds } from '@/lib/audio'
import { db, save } from '@/lib/db'
import { useLearn } from '@/lib/hooks'
import { hasText, nativeDigits, uid } from '@/lib/lang'
import { lessonAfter, nextStep } from '@/lib/progress'
import { usePrefs } from '@/lib/store'
import type { AttemptKind, GlossaryEntry, LessonItem, TribalLang } from '@/lib/types'
import { KidBtn, Say, sayHindi, sayWord } from './kid'

type Q =
  | { type: 'teach'; item: LessonItem }
  | { type: 'pick'; item: LessonItem; options: LessonItem[] }
  | { type: 'count'; item: LessonItem; options: number[] }
  | { type: 'match'; items: LessonItem[] }

const shuffle = <T,>(a: T[]): T[] => {
  const out = [...a]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Picture questions built from the lesson's words; nothing needs to be read. */
function build(mode: AttemptKind, words: LessonItem[]): Q[] {
  const others = (item: LessonItem, n: number) => shuffle(words.filter((w) => w.id !== item.id)).slice(0, n)
  const pick = (item: LessonItem, n: number): Q => ({ type: 'pick', item, options: shuffle([item, ...others(item, n - 1)]) })
  const pool = shuffle(words)
  // Remedial: show and say the word again, then ask an easier two-picture question.
  if (mode === 'remedial') return pool.slice(0, 4).flatMap((item): Q[] => [{ type: 'teach', item }, pick(item, 2)])
  const qs = pool.slice(0, mode === 'practice' ? 6 : 5).map((item, i): Q => {
    if (!item.digit || i % 2 === 0) return pick(item, 3)
    const wrong = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((n) => n !== item.digit)).slice(0, 2)
    return { type: 'count', item, options: shuffle([item.digit, ...wrong]) }
  })
  if (mode === 'practice' && words.length >= 3) qs.push({ type: 'match', items: pool.slice(0, 3) })
  return qs
}

type Mark = 'good' | 'bad' | undefined

function Option({ mark, onClick, label, children }: { mark: Mark; onClick: () => void; label: string; children: ReactNode }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={mark === 'bad'}
      animate={mark === 'good' ? { scale: [1, 1.12, 1] } : mark === 'bad' ? { x: [0, -8, 8, -5, 5, 0] } : {}}
      transition={{ duration: 0.4 }}
      className={cx(
        'flex min-h-36 items-center justify-center rounded-3xl border-4 bg-white p-3',
        mark === 'good' ? 'border-leaf bg-leaf-soft' : mark === 'bad' ? 'border-cream-deep opacity-40' : 'border-saffron',
      )}
    >
      {children}
    </motion.button>
  )
}

function Word({ item, lang, entry, big }: { item: LessonItem; lang: TribalLang; entry?: GlossaryEntry; big?: boolean }) {
  const showTribal = usePrefs((s) => s.showTribal)
  const size = big ? 'text-5xl' : 'text-2xl'
  return showTribal && hasText(entry) ? (
    <TribalText lang={lang} native={entry!.native} alt={entry!.alt} verified={entry!.verified} className={cx(size, 'text-leaf-dark')} compactTag />
  ) : (
    <span className={cx(size, 'font-bold')}>{item.hi}</span>
  )
}

function Match({ items, lang, glossary, onDone }: { items: LessonItem[]; lang: TribalLang; glossary?: Map<string, GlossaryEntry>; onDone: (clean: boolean) => void }) {
  const words = useMemo(() => shuffle(items), [items])
  const [sel, setSel] = useState<string>()
  const [matched, setMatched] = useState<string[]>([])
  const [wrong, setWrong] = useState<string>()
  const clean = useRef(true)

  function choose(wordId: string) {
    if (!sel) return
    if (wordId !== sel) {
      clean.current = false
      setWrong(wordId)
      sounds.tryAgain()
      setTimeout(() => setWrong(undefined), 500)
      return
    }
    sounds.correct()
    const next = [...matched, wordId]
    setMatched(next)
    setSel(undefined)
    if (next.length === items.length) setTimeout(() => onDone(clean.current), 800)
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-3">
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            aria-label={it.en ?? it.hi}
            aria-pressed={sel === it.id}
            disabled={matched.includes(it.id)}
            onClick={() => setSel(it.id)}
            className={cx(
              'flex min-h-28 w-full items-center justify-center rounded-3xl border-4 bg-white',
              matched.includes(it.id) ? 'border-leaf bg-leaf-soft opacity-60' : sel === it.id ? 'border-terra bg-terra-soft' : 'border-saffron',
            )}
          >
            <Pic item={it} lang={lang} className="text-5xl" />
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {words.map((it) => {
          const e = entryFor(glossary, it.hi)
          return (
            <div key={it.id} className="flex items-center gap-2">
              <motion.button
                type="button"
                disabled={matched.includes(it.id)}
                onClick={() => choose(it.id)}
                animate={wrong === it.id ? { x: [0, -8, 8, -5, 5, 0] } : {}}
                className={cx(
                  'flex min-h-28 flex-1 items-center justify-center rounded-3xl border-4 bg-white px-2',
                  matched.includes(it.id) ? 'border-leaf bg-leaf-soft opacity-60' : 'border-saffron',
                )}
              >
                <Word item={it} lang={lang} entry={e} />
              </motion.button>
              <Say hi={it.hi} onSay={() => sayWord(lang, it.hi, e)} className="size-14 text-2xl" />
            </div>
          )
        })}
      </div>
    </div>
  )
}

const PRAISE = ['शाबाश!', 'बहुत बढ़िया!', 'वाह!']

/** Remounts for each mode/lesson so a quiz started by the teacher always begins fresh. */
export default function PlayRoute() {
  const { search } = useLocation()
  return <Play key={search} />
}

function Play() {
  const [params] = useSearchParams()
  const mode = (params.get('mode') ?? 'practice') as AttemptKind
  const { user, cls, lessons, lesson: current } = useLearn()
  const lesson = lessons?.find((l) => l.id === params.get('lesson')) ?? current
  const glossary = useGlossary(cls?.lang)
  const showTribal = usePrefs((s) => s.showTribal)
  const [round, setRound] = useState(0)
  const [idx, setIdx] = useState(0)
  const [marks, setMarks] = useState<Record<string, Mark>>({})
  const [correct, setCorrect] = useState(0)
  const firstTry = useRef(true)
  const saved = useRef(false)

  const words = useMemo(() => lesson?.items.filter((i) => i.kind === 'word') ?? [], [lesson])
  // `round` is a dependency only so that "play again" reshuffles the questions.
  const questions = useMemo(() => build(mode, words), [mode, words, round])
  const total = questions.filter((q) => q.type !== 'teach').length
  const q = questions[idx]
  const done = questions.length > 0 && idx >= questions.length

  const evaluation = useLiveQuery(
    () => (user && lesson ? db.evaluations.get(`${lesson.id}|${user.id}`) : undefined),
    [user?.id, lesson?.id],
  )
  const attempts = useLiveQuery(
    async () => (user && lesson ? (await db.attempts.where('studentId').equals(user.id).toArray()).filter((a) => a.lessonId === lesson.id) : []),
    [user?.id, lesson?.id],
  )

  // Say the prompt as soon as a question appears.
  useEffect(() => {
    if (!cls || !q || q.type === 'match') return
    void sayWord(cls.lang, q.item.hi, entryFor(glossary, q.item.hi))
    // Deliberately not keyed on the glossary contents: speak once per question.
  }, [idx, round, cls?.lang, !!glossary])

  useEffect(() => {
    if (!done || saved.current || !user || !cls || !lesson) return
    saved.current = true
    sounds.star()
    const id = uid()
    void save('attempts', id, { id, studentId: user.id, classId: cls.id, lessonId: lesson.id, kind: mode, correct, total, at: Date.now() })
  }, [done, user, cls, lesson, mode, correct, total])

  if (!user || !cls || !lesson || !glossary) return null

  function advance() {
    firstTry.current = true
    setMarks({})
    setIdx((i) => i + 1)
  }

  function answer(key: string, right: boolean) {
    if (Object.values(marks).includes('good')) return
    if (!right) {
      firstTry.current = false
      sounds.tryAgain()
      setMarks((m) => ({ ...m, [key]: 'bad' }))
      return
    }
    sounds.correct()
    if (firstTry.current) setCorrect((c) => c + 1)
    setMarks((m) => ({ ...m, [key]: 'good' }))
    setTimeout(advance, 900)
  }

  function restart() {
    saved.current = false
    firstTry.current = true
    setMarks({})
    setCorrect(0)
    setIdx(0)
    setRound((r) => r + 1)
  }

  if (done) {
    const step = attempts && mode !== 'quiz' ? nextStep(evaluation, attempts) : undefined
    const upcoming = lessonAfter(lessons ?? [], lesson.id)
    return (
      <MotionConfig reducedMotion="user">
        <div className="flex flex-col items-center gap-5 py-6 text-center">
          <motion.p initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-8xl" aria-hidden>
            🎉
          </motion.p>
          <div className="flex items-center gap-2">
            <h1 className="text-4xl font-bold text-leaf-dark">{PRAISE[correct % PRAISE.length]}</h1>
            <Say hi={PRAISE[correct % PRAISE.length]} />
          </div>
          {/* Only what was earned is shown: stars, never a mark out of a total. */}
          <p className="text-5xl leading-snug" role="img" aria-label={`${correct} तारे`}>
            {'⭐'.repeat(Math.max(correct, 1))}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {step === 'remedial' && <Link className="flex min-h-16 items-center gap-2 rounded-2xl bg-saffron px-5 text-xl font-bold" to={`/student/play?mode=remedial&lesson=${lesson.id}`}>🤝 फिर से सीखो</Link>}
            {step === 'practice' && <Link className="flex min-h-16 items-center gap-2 rounded-2xl bg-leaf px-5 text-xl font-bold text-white" to={`/student/play?mode=practice&lesson=${lesson.id}`}>✏️ अभ्यास करो</Link>}
            {step === 'exam' && <Link className="flex min-h-16 items-center gap-2 rounded-2xl bg-terra px-5 text-xl font-bold text-white" to={`/student/play?mode=exam&lesson=${lesson.id}`}>📝 दिखाओ क्या सीखा</Link>}
            {step === 'next' && upcoming && <Link className="flex min-h-16 items-center gap-2 rounded-2xl bg-leaf px-5 text-xl font-bold text-white" to={`/student/play?mode=practice&lesson=${upcoming.id}`}>⏭️ {upcoming.emoji} {upcoming.titleHi}</Link>}
            {step === 'next' && !upcoming && <Link className="flex min-h-16 items-center gap-2 rounded-2xl bg-leaf px-5 text-xl font-bold text-white" to="/student/stars">🏅 मेरे तारे</Link>}
            <KidBtn icon="🔁" label="फिर खेलो" tone="soft" onClick={restart} />
            <Link to="/student" aria-label="घर" className="flex min-h-16 min-w-16 items-center justify-center rounded-2xl bg-cream-deep px-5 text-3xl">🏠</Link>
          </div>
        </div>
      </MotionConfig>
    )
  }

  if (!q) return <p className="py-16 text-center text-6xl" aria-label="इस पाठ में अभी शब्द नहीं हैं">📭</p>

  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-5">
        <div className="flex items-center gap-2" aria-label={`${idx + 1} / ${questions.length}`} role="status">
          {questions.map((_, i) => (
            <span key={i} className={cx('h-3 flex-1 rounded-full', i < idx ? 'bg-leaf' : i === idx ? 'bg-saffron' : 'bg-cream-deep')} />
          ))}
        </div>

        {q.type === 'match' ? (
          <Match key={`${round}-${idx}`} items={q.items} lang={cls.lang} glossary={glossary} onDone={(clean) => { if (clean) setCorrect((c) => c + 1); advance() }} />
        ) : (
          <>
            <div className="flex items-center justify-center gap-4 rounded-3xl bg-white p-4">
              <Say hi={q.item.hi} onSay={() => sayWord(cls.lang, q.item.hi, entryFor(glossary, q.item.hi))} className="size-20 text-4xl" />
              {q.type === 'count' ? (
                <span className="max-w-xs text-center text-4xl leading-snug" role="img" aria-label="गिनो">{'🥭'.repeat(q.item.digit!)}</span>
              ) : (
                <div className="text-center">
                  <Word item={q.item} lang={cls.lang} entry={entryFor(glossary, q.item.hi)} big />
                  {showTribal && hasText(entryFor(glossary, q.item.hi)) && (
                    <button type="button" className="mt-1 block min-h-12 w-full text-xl text-ink-soft" onClick={() => sayHindi(q.item.hi)}>{q.item.hi}</button>
                  )}
                </div>
              )}
            </div>

            {q.type === 'teach' && (
              <div className="flex flex-col items-center gap-4">
                <Pic item={q.item} lang={cls.lang} className="text-9xl" />
                <KidBtn icon="👉" label="आगे" tone="leaf" onClick={advance} />
              </div>
            )}

            {q.type === 'pick' && (
              <div className={cx('grid gap-3', q.options.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
                {q.options.map((o) => (
                  <Option key={o.id} label={o.en ?? o.hi} mark={marks[o.id]} onClick={() => answer(o.id, o.id === q.item.id)}>
                    <Pic item={o} lang={cls.lang} className="text-6xl" />
                  </Option>
                ))}
              </div>
            )}

            {q.type === 'count' && (
              <div className="grid grid-cols-3 gap-3">
                {q.options.map((n) => (
                  <Option key={n} label={String(n)} mark={marks[n]} onClick={() => answer(String(n), n === q.item.digit)}>
                    <span className="text-6xl font-bold text-terra-dark">
                      {nativeDigits(cls.lang, n)}
                      <span className="ml-2 text-3xl text-ink-soft">{n}</span>
                    </span>
                  </Option>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </MotionConfig>
  )
}
