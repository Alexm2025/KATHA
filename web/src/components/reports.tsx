import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { OUTCOMES } from '@/lib/lang'
import { mastery } from '@/lib/progress'
import { useT } from '@/lib/store'
import type { Attempt, Evaluation, Lesson, Outcome } from '@/lib/types'

const LEAF = '#2f6b34'
const TERRA = '#b84a22'
const SAFFRON = '#e8851c'

/** Average best score (0–100) per FLN outcome area across the given students. */
export function outcomeData(lessons: Lesson[], attempts: Attempt[], t: (hi: string, en: string) => string) {
  const byStudent = new Map<string, Attempt[]>()
  for (const a of attempts) byStudent.set(a.studentId, [...(byStudent.get(a.studentId) ?? []), a])
  return (Object.keys(OUTCOMES) as Outcome[]).map((o) => {
    const ids = new Set(lessons.filter((l) => l.outcome === o).map((l) => l.id))
    const scores: number[] = []
    for (const list of byStudent.values()) {
      for (const [lessonId, score] of mastery(list)) if (ids.has(lessonId)) scores.push(score)
    }
    const value = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) : 0
    return { name: t(OUTCOMES[o].hi, OUTCOMES[o].en), value, n: scores.length }
  })
}

export function OutcomeChart({ data }: { data: { name: string; value: number }[] }) {
  const t = useT()
  return (
    <div className="h-64" role="img" aria-label={data.map((d) => `${d.name} ${d.value}%`).join(', ')}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 13 }} interval={0} />
          <YAxis domain={[0, 100]} unit="%" />
          <Tooltip />
          <Bar dataKey="value" name={t('औसत समझ', 'Average mastery')} fill={LEAF} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function UnderstoodChart({ lessons, evaluations }: { lessons: Lesson[]; evaluations: Evaluation[] }) {
  const t = useT()
  const data = lessons
    .map((l) => {
      const evs = evaluations.filter((e) => e.lessonId === l.id)
      return { name: `${l.emoji} ${l.titleHi}`, yes: evs.filter((e) => e.understood).length, no: evs.filter((e) => !e.understood).length }
    })
    .filter((d) => d.yes + d.no > 0)
  if (!data.length) return <p className="text-ink-soft">{t('अभी कोई मूल्यांकन नहीं हुआ।', 'No evaluations yet.')}</p>
  return (
    <div className="h-64" role="img" aria-label={data.map((d) => `${d.name}: ${d.yes} / ${d.no}`).join(', ')}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 13 }} interval={0} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="yes" stackId="a" name={t('समझ गए', 'Understood')} fill={LEAF} />
          <Bar dataKey="no" stackId="a" name={t('दोबारा समझाना है', 'Need support')} fill={SAFFRON} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ClassChart({ data }: { data: { name: string; value: number }[] }) {
  const t = useT()
  return (
    <div className="h-64" role="img" aria-label={data.map((d) => `${d.name} ${d.value}%`).join(', ')}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" interval={0} />
          <YAxis domain={[0, 100]} unit="%" />
          <Tooltip />
          <Bar dataKey="value" name={t('औसत समझ', 'Average mastery')} fill={TERRA} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
