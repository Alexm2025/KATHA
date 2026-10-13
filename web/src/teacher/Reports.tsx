import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { PrivateRecord } from '@/components/PrivateRecord'
import { outcomeData, OutcomeChart, UnderstoodChart } from '@/components/reports'
import { Btn, Card, Chip } from '@/components/ui'
import { db } from '@/lib/db'
import { useMe, useTeach } from '@/lib/hooks'
import { mastery, nextStep, PASS, stars, STEP_LABEL } from '@/lib/progress'
import { useT } from '@/lib/store'

export default function Reports() {
  const t = useT()
  const { session } = useMe('teacher')
  const { cls, lessons, lesson, students } = useTeach()
  const [open, setOpen] = useState<string>()
  const attempts = useLiveQuery(() => (cls ? db.attempts.where('classId').equals(cls.id).toArray() : []), [cls?.id])
  const evaluations = useLiveQuery(() => (cls ? db.evaluations.where('classId').equals(cls.id).toArray() : []), [cls?.id])
  if (!cls || !lessons || !attempts || !evaluations || !students) return null

  const classLessons = lessons.filter((l) => l.grade === cls.grade)

  return (
    <div className="space-y-4">
      <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">
        📊 {t('प्रगति रिपोर्ट', 'Progress report')} · {cls.name}
        {attempts.some((a) => a.demo) && <Chip tone="warn">{t('नमूना डेटा शामिल', 'includes sample data')}</Chip>}
      </h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-bold">{t('निपुण भारत FLN क्षेत्रों में कक्षा की समझ', 'Class mastery by NIPUN Bharat FLN area')}</h2>
          <p className="mb-2 text-sm text-ink-soft">{t('हर बच्चे के सबसे अच्छे प्रयास का औसत', "Average of each child's best attempt")}</p>
          <OutcomeChart data={outcomeData(classLessons, attempts, t)} />
        </Card>
        <Card>
          <h2 className="mb-2 font-bold">{t('पाठ के अनुसार: कौन समझा, किसे मदद चाहिए', 'By lesson: who understood, who needs support')}</h2>
          <UnderstoodChart lessons={classLessons} evaluations={evaluations} />
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-bold">{t('हर बच्चे की प्रगति', 'Each child')}</h2>
        <ul className="divide-y divide-cream-deep">
          {students.map((s) => {
            const mine = attempts.filter((a) => a.studentId === s.id)
            const best = mastery(mine)
            const done = [...best.values()].filter((v) => v >= PASS).length
            const step = lesson
              ? STEP_LABEL[nextStep(evaluations.find((e) => e.id === `${lesson.id}|${s.id}`), mine.filter((a) => a.lessonId === lesson.id))]
              : undefined
            return (
              <li key={s.id} className="py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-3xl" aria-hidden>{s.avatar}</span>
                  <span className="w-24 text-lg font-bold">{s.name}</span>
                  <Chip>⭐ {stars(mine)}</Chip>
                  <Chip tone="good">🏅 {done}/{classLessons.length} {t('पाठ', 'lessons')}</Chip>
                  {step && <Chip tone={step === STEP_LABEL.remedial ? 'warn' : 'neutral'}>{step.emoji} {t(step.hi, step.en)}</Chip>}
                  <Btn variant="ghost" className="ml-auto" aria-expanded={open === s.id} onClick={() => setOpen(open === s.id ? undefined : s.id)}>
                    {t('विवरण', 'Details')} {open === s.id ? '▲' : '▼'}
                  </Btn>
                </div>
                {open === s.id && (
                  <div className="mt-3 space-y-3 rounded-xl bg-cream/70 p-3">
                    <div className="flex flex-wrap gap-2">
                      {classLessons.map((l) => {
                        const v = best.get(l.id)
                        return (
                          <Chip key={l.id} tone={v === undefined ? 'neutral' : v >= PASS ? 'good' : 'warn'}>
                            {l.emoji} {l.titleHi}: {v === undefined ? '–' : `${Math.round(v * 100)}%`}
                          </Chip>
                        )
                      })}
                    </div>
                    <PrivateRecord studentId={s.id} dataKey={session?.dataKey} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}
