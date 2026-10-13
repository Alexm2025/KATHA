import { useLiveQuery } from 'dexie-react-hooks'
import { lazy } from 'react'
import { Card, Chip } from '@/components/ui'
import { db } from '@/lib/db'
import { LANGS } from '@/lib/lang'
import { mastery } from '@/lib/progress'
import { useT } from '@/lib/store'

// Recharts is heavy; load the charts only when this screen opens.
const Charts = lazy(() => import('./AdminCharts'))

export default function AdminReports() {
  const t = useT()
  const data = useLiveQuery(async () => ({
    classes: await db.classes.toArray(),
    users: await db.users.toArray(),
    lessons: await db.lessons.toArray(),
    attempts: await db.attempts.toArray(),
    evaluations: await db.evaluations.toArray(),
    doubts: await db.doubts.count(),
    corrections: await db.corrections.count(),
  }))
  if (!data) return null
  const { classes, users, lessons, attempts, evaluations } = data

  const perClass = classes.map((c) => {
    const scores = users
      .filter((u) => u.classId === c.id)
      .flatMap((u) => [...mastery(attempts.filter((a) => a.studentId === u.id)).values()])
    return {
      name: `${c.name} · ${LANGS[c.lang].en}`,
      value: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) : 0,
    }
  })
  const understood = evaluations.filter((e) => e.understood).length

  const tiles: [string, string, number | string][] = [
    ['🏫', t('कक्षाएँ', 'Classrooms'), classes.length],
    ['🧒', t('विद्यार्थी', 'Students'), users.filter((u) => u.role === 'student').length],
    ['👩‍🏫', t('शिक्षक', 'Teachers'), users.filter((u) => u.role === 'teacher').length],
    ['📚', t('पाठ', 'Lessons'), lessons.length],
    ['🙋', t('सवाल', 'Doubts'), data.doubts],
    ['✏️', t('अनुवाद सुधार', 'Corrections'), data.corrections],
    ['✅', t('"समझ गए" मूल्यांकन', '"Understood" marks'), evaluations.length ? `${Math.round((understood / evaluations.length) * 100)}%` : '–'],
  ]

  return (
    <div className="space-y-4">
      <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">
        📊 {t('रिपोर्ट और विश्लेषण', 'Reports & analytics')}
        {attempts.some((a) => a.demo) && <Chip tone="warn">{t('नमूना डेटा शामिल', 'includes sample data')}</Chip>}
      </h1>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {tiles.map(([icon, label, value]) => (
          <li key={label}>
            <Card className="h-full text-center">
              <span className="text-3xl" aria-hidden>{icon}</span>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-sm text-ink-soft">{label}</p>
            </Card>
          </li>
        ))}
      </ul>
      <Charts perClass={perClass} lessons={lessons} attempts={attempts} evaluations={evaluations} />
    </div>
  )
}
