import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { useLearn } from '@/lib/hooks'
import { nextStep, stars, type Step } from '@/lib/progress'
import { KidTile } from './kid'

// Where the "what next" tile takes the child, following the teacher's evaluation.
const NEXT: Record<Step, { to: (lessonId: string) => string; icon: string; hi: string; tone: 'leaf' | 'saffron' | 'terra' }> = {
  learn: { to: () => '/student/lesson', icon: '📖', hi: 'पाठ देखो', tone: 'leaf' },
  practice: { to: (l) => `/student/play?mode=practice&lesson=${l}`, icon: '✏️', hi: 'अभ्यास करो', tone: 'leaf' },
  remedial: { to: (l) => `/student/play?mode=remedial&lesson=${l}`, icon: '🤝', hi: 'फिर से सीखो', tone: 'saffron' },
  exam: { to: (l) => `/student/play?mode=exam&lesson=${l}`, icon: '📝', hi: 'दिखाओ क्या सीखा', tone: 'terra' },
  next: { to: () => '/student/practice', icon: '🎉', hi: 'शाबाश! और खेलो', tone: 'leaf' },
}

export default function Home() {
  const { user, lesson } = useLearn()
  const attempts = useLiveQuery(() => (user ? db.attempts.where('studentId').equals(user.id).toArray() : []), [user?.id])
  const evaluation = useLiveQuery(
    () => (user && lesson ? db.evaluations.get(`${lesson.id}|${user.id}`) : undefined),
    [user?.id, lesson?.id],
  )
  const replies = useLiveQuery(
    async () =>
      user ? (await db.doubts.where('studentId').equals(user.id).toArray()).filter((d) => d.status === 'answered' && !d.heard).length : 0,
    [user?.id],
  )
  if (!user || !lesson || !attempts) return null

  const step = nextStep(evaluation, attempts.filter((a) => a.lessonId === lesson.id))
  const next = NEXT[step]

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      <div className="col-span-2">
        <KidTile to={next.to(lesson.id)} icon={lesson.emoji} hi={`${lesson.titleHi} — ${next.hi}`} tone={next.tone}>
          <span className="text-4xl" aria-hidden>{next.icon}</span>
        </KidTile>
      </div>
      <KidTile to="/student/listen" icon="👂" hi="शिक्षक को सुनो" tone="terra" />
      <KidTile to="/student/ask" icon="🙋" hi="सवाल पूछो" tone="saffron" badge={replies ? `💬 ${replies}` : undefined} />
      <KidTile to="/student/practice" icon="✏️" hi="अभ्यास" tone="leaf" />
      <KidTile to="/student/stars" icon="⭐" hi="मेरे तारे" badge={`⭐ ${stars(attempts)}`} />
    </div>
  )
}
