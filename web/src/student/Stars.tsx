import { useLiveQuery } from 'dexie-react-hooks'
import { cx } from '@/components/ui'
import { db } from '@/lib/db'
import { useLearn } from '@/lib/hooks'
import { mastery, PASS, stars } from '@/lib/progress'
import { Say } from './kid'

/** "My Stars": what the child has earned. No marks, ranks or percentages. */
export default function Stars() {
  const { user, lessons } = useLearn()
  const attempts = useLiveQuery(() => (user ? db.attempts.where('studentId').equals(user.id).toArray() : []), [user?.id])
  if (!user || !attempts || !lessons) return null

  const total = stars(attempts)
  const best = mastery(attempts)
  const tried = new Set(attempts.map((a) => a.lessonId))

  return (
    <div className="flex flex-col items-center gap-6 py-4 text-center">
      <div className="flex items-center gap-3">
        <p className="text-7xl font-bold text-terra-dark" aria-label={`${total} तारे`}>
          ⭐ {total}
        </p>
        <Say hi={`तुम्हारे पास ${total} तारे हैं। शाबाश!`} />
      </div>
      <p className="max-w-full break-words text-3xl leading-snug" aria-hidden>
        {'⭐'.repeat(Math.min(total, 60))}
      </p>

      <ul className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
        {lessons.map((l) => {
          const earned = (best.get(l.id) ?? 0) >= PASS
          return (
            <li
              key={l.id}
              className={cx(
                'flex min-h-36 flex-col items-center justify-center rounded-3xl border-4 p-3',
                earned ? 'border-leaf bg-leaf-soft' : tried.has(l.id) ? 'border-saffron bg-saffron-soft' : 'border-cream-deep bg-white',
              )}
            >
              <span className="text-6xl" aria-hidden>{l.emoji}</span>
              <span className="font-bold">{l.titleHi}</span>
              <span className="text-3xl" role="img" aria-label={earned ? 'बिल्ला मिला' : tried.has(l.id) ? 'सीख रहे हैं' : 'अभी बाकी'}>
                {earned ? '🏅' : tried.has(l.id) ? '🌱' : '·'}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
