import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Btn, Card, Chip, cx, Empty } from '@/components/ui'
import { post } from '@/lib/channel'
import { db, save } from '@/lib/db'
import { useTeach } from '@/lib/hooks'
import { sendUtterance } from '@/lib/live'
import { nextStep, PASS, pct, STEP_LABEL } from '@/lib/progress'
import { useT } from '@/lib/store'
import type { Attempt, Evaluation } from '@/lib/types'

export default function Evaluate() {
  const t = useT()
  const { cls, lesson, students } = useTeach()
  const [quizAt, setQuizAt] = useState<number>()
  const attempts = useLiveQuery(
    async () => (cls && lesson ? (await db.attempts.where('classId').equals(cls.id).toArray()).filter((a) => a.lessonId === lesson.id) : []),
    [cls?.id, lesson?.id],
  )
  const evaluations = useLiveQuery(
    () => (lesson ? db.evaluations.where('lessonId').equals(lesson.id).toArray() : []),
    [lesson?.id],
  )
  if (!cls) return null
  if (!lesson) {
    return (
      <Empty>
        {t('पहले डैशबोर्ड पर एक पाठ चुनें।', 'Choose a lesson on the dashboard first.')}{' '}
        <Link className="font-bold text-terra-dark underline" to="/teacher">{t('डैशबोर्ड', 'Dashboard')}</Link>
      </Empty>
    )
  }

  const mark = (studentId: string, understood: boolean) => {
    const ev: Evaluation = { id: `${lesson.id}|${studentId}`, lessonId: lesson.id, studentId, classId: cls.id, understood, at: Date.now() }
    return save('evaluations', ev.id, ev)
  }
  const latestQuiz = (studentId: string): Attempt | undefined =>
    attempts?.filter((a) => a.studentId === studentId && a.kind === 'quiz').sort((a, b) => b.at - a.at)[0]

  function startQuiz() {
    post({ type: 'quiz', classId: cls!.id, lessonId: lesson!.id })
    setQuizAt(Date.now())
  }

  // Oral questions and activity instructions come straight from the lesson script.
  const questions = lesson.items.filter((i) => i.kind === 'sentence' && i.hi.includes('?'))
  const activities = lesson.items.filter((i) => i.kind === 'sentence' && !i.hi.includes('?'))
  const say = (hi: string) => sendUtterance(cls, hi, 'tap', performance.now(), { lessonId: lesson.id })
  const quizzed = students?.filter((s) => latestQuiz(s.id)) ?? []

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">
        ✅ {t('पाठ का मूल्यांकन', 'Lesson evaluation')} · <span aria-hidden>{lesson.emoji}</span> {lesson.titleHi}
      </h1>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <h2 className="mb-2 font-bold">🗣 {t('मौखिक प्रश्न', 'Oral questions')}</h2>
          {questions.length ? questions.map((q) => (
            <button key={q.id} type="button" onClick={() => say(q.hi)} className="mb-2 block min-h-12 w-full rounded-xl bg-cream-deep/60 px-3 py-2 text-left hover:bg-leaf-soft">{q.hi}</button>
          )) : <p className="text-sm text-ink-soft">{t('इस पाठ में प्रश्न नहीं हैं।', 'This lesson has no question lines.')}</p>}
          <p className="text-sm text-ink-soft">{t('छूने पर बच्चों की स्क्रीन पर जाता है।', "Tap to send to the students' screens.")}</p>
        </Card>
        <Card>
          <h2 className="mb-2 font-bold">🤸 {t('गतिविधि जाँच', 'Activity check')}</h2>
          {activities.slice(0, 3).map((a) => (
            <button key={a.id} type="button" onClick={() => say(a.hi)} className="mb-2 block min-h-12 w-full rounded-xl bg-cream-deep/60 px-3 py-2 text-left hover:bg-leaf-soft">{a.hi}</button>
          ))}
          <p className="text-sm text-ink-soft">{t('देखें कि बच्चे करके दिखा पाते हैं या नहीं।', 'Watch whether the children can act on it.')}</p>
        </Card>
        <Card>
          <h2 className="mb-2 font-bold">⚡ {t('झटपट क्विज़', 'Quick quiz')}</h2>
          <Btn className="w-full" onClick={startQuiz}>{t('कक्षा के लिए क्विज़ शुरू करें', 'Start quiz for the class')}</Btn>
          <p className="mt-2 text-sm text-ink-soft" role="status">
            {quizAt ? t('क्विज़ बच्चों के टैबलेट पर खुल गया।', "The quiz has opened on the students' tablets.") : t('चित्र वाले 5 सवाल।', '5 picture questions.')}{' '}
            {quizzed.length}/{students?.length ?? 0} {t('ने पूरा किया', 'finished')}
          </p>
          <Btn
            variant="outline"
            className="mt-2 w-full"
            disabled={!quizzed.length}
            onClick={() => quizzed.forEach((s) => mark(s.id, pct(latestQuiz(s.id)!) >= PASS))}
          >
            {t('क्विज़ से भरें', 'Fill in from quiz')}
          </Btn>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-bold">{t('हर बच्चे के लिए चुनें', 'Mark each child')}</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {students?.map((s) => {
            const ev = evaluations?.find((e) => e.studentId === s.id)
            const quiz = latestQuiz(s.id)
            const step = STEP_LABEL[nextStep(ev, attempts?.filter((a) => a.studentId === s.id) ?? [])]
            return (
              <li key={s.id} className="rounded-2xl border-2 border-cream-deep p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-3xl" aria-hidden>{s.avatar}</span>
                  <span className="text-lg font-bold">{s.name}</span>
                  {quiz && <Chip>{'⭐'.repeat(quiz.correct) || '–'} {quiz.correct}/{quiz.total}</Chip>}
                  {ev && <span className="ml-auto"><Chip tone={ev.understood ? 'good' : 'warn'}>{step.emoji} {t(step.hi, step.en)}</Chip></span>}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" aria-pressed={ev?.understood === true} onClick={() => mark(s.id, true)} className={cx('min-h-12 rounded-xl border-2 font-bold', ev?.understood === true ? 'border-leaf bg-leaf text-white' : 'border-leaf bg-white text-leaf-dark')}>
                    ✅ {t('समझ गया', 'Understood')}
                  </button>
                  <button type="button" aria-pressed={ev?.understood === false} onClick={() => mark(s.id, false)} className={cx('min-h-12 rounded-xl border-2 font-bold', ev?.understood === false ? 'border-terra bg-terra text-white' : 'border-terra bg-white text-terra-dark')}>
                    🤝 {t('नहीं समझा', 'Not understood')}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
        <p className="mt-3 text-sm text-ink-soft">
          {t(
            'समझ गया → अभ्यास → जाँच → अगला कदम। नहीं समझा → दोबारा समझाना (आसान उदाहरण, मातृभाषा में आवाज़) → अभ्यास।',
            'Understood → Practice → Check → next step. Not understood → Remedial (simpler example, mother-tongue audio) → Practice.',
          )}
        </p>
      </Card>
    </div>
  )
}
