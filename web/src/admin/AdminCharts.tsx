import { ClassChart, outcomeData, OutcomeChart, UnderstoodChart } from '@/components/reports'
import { Card } from '@/components/ui'
import { useT } from '@/lib/store'
import type { Attempt, Evaluation, Lesson } from '@/lib/types'

export default function AdminCharts({
  perClass,
  lessons,
  attempts,
  evaluations,
}: {
  perClass: { name: string; value: number }[]
  lessons: Lesson[]
  attempts: Attempt[]
  evaluations: Evaluation[]
}) {
  const t = useT()
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <h2 className="mb-2 font-bold">{t('कक्षा के अनुसार औसत समझ', 'Average mastery by classroom')}</h2>
        <ClassChart data={perClass} />
      </Card>
      <Card>
        <h2 className="mb-2 font-bold">{t('निपुण भारत FLN क्षेत्र (सभी कक्षाएँ)', 'NIPUN Bharat FLN areas (all classrooms)')}</h2>
        <OutcomeChart data={outcomeData(lessons, attempts, t)} />
      </Card>
      <Card className="lg:col-span-2">
        <h2 className="mb-2 font-bold">{t('पाठ के अनुसार मूल्यांकन', 'Evaluations by lesson')}</h2>
        <UnderstoodChart lessons={lessons} evaluations={evaluations} />
      </Card>
    </div>
  )
}
