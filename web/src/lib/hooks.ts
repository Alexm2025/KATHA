import { useLiveQuery } from 'dexie-react-hooks'
import { db, getMeta } from './db'
import { usePrefs, useSessions } from './store'
import type { Role } from './types'

export function useMe(role: Role) {
  const session = useSessions((s) => s.sessions[role])
  const user = useLiveQuery(() => (session ? db.users.get(session.userId) : undefined), [session?.userId])
  return { session, user }
}

/** The teacher's working context: chosen class and lesson (remembered between visits). */
export function useTeach() {
  const { user } = useMe('teacher')
  const teach = usePrefs((s) => s.teach)
  const classes = useLiveQuery(
    () => (user ? db.classes.where('teacherId').equals(user.id).toArray() : []),
    [user?.id],
  )
  const cls = classes?.find((c) => c.id === teach.classId) ?? classes?.[0]
  const lessons = useLiveQuery(() => db.lessons.toArray())
  const lesson = lessons?.find((l) => l.id === teach.lessonId)
  const students = useLiveQuery(
    () => (cls ? db.users.where('classId').equals(cls.id).toArray() : []),
    [cls?.id],
  )
  return { user, classes, cls, lessons, lesson, students, subject: teach.subject }
}

/** The student's context: their class and the lesson the teacher has open for it. */
export function useLearn() {
  const { user } = useMe('student')
  const cls = useLiveQuery(() => (user?.classId ? db.classes.get(user.classId) : undefined), [user?.classId])
  const lessons = useLiveQuery(
    async () => (cls ? (await db.lessons.toArray()).filter((l) => l.grade === cls.grade) : []),
    [cls?.grade],
  )
  const currentId = useLiveQuery(
    () => (cls ? getMeta<string>(`current:${cls.id}`) : undefined),
    [cls?.id],
  )
  const lesson = lessons?.find((l) => l.id === currentId) ?? lessons?.[0]
  return { user, cls, lessons, lesson }
}
