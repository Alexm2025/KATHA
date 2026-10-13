import content from '@content/lessons.json'
import { encryptJson, makePin, newDataKey } from './crypto'
import { db, setMeta } from './db'
import { BASE } from './store'
import { normHi, TRIBAL_LANGS } from './lang'
import type { Attempt, ClassRoom, Evaluation, GlossaryEntry, Lesson, StudentRecord, User } from './types'

const SEED_LESSONS = (content.lessons as unknown as Lesson[]).map((l, order) => ({ ...l, order }))

// Demo credentials, shown on the login screen.
export const DEMO_TEACHER_PIN = '1234'
export const DEMO_ADMIN_PIN = '0000'

const CLASSES: ClassRoom[] = [
  { id: 'c1', name: 'कक्षा 1 (अ)', grade: 1, lang: 'sat', teacherId: 't1' },
  { id: 'c2', name: 'कक्षा 2 (अ)', grade: 2, lang: 'hoc', teacherId: 't1' },
]

const STUDENTS: [string, string, string, string][] = [
  ['s1', 'बिरसा', '🐯', 'c1'],
  ['s2', 'सुमी', '🦚', 'c1'],
  ['s3', 'मंगल', '🐘', 'c1'],
  ['s4', 'फूलो', '🌺', 'c1'],
  ['s5', 'सोमा', '🐒', 'c1'],
  ['s6', 'चांदो', '🌙', 'c1'],
  ['s7', 'लखन', '🦜', 'c1'],
  ['s8', 'रानी', '🦋', 'c1'],
  ['s9', 'जुनास', '🐢', 'c2'],
  ['s10', 'मालती', '🌻', 'c2'],
  ['s11', 'सुखराम', '🐓', 'c2'],
  ['s12', 'बाहा', '🌸', 'c2'],
]

/** Glossary rows for a lesson. Existing rows are never overwritten (corrections win). */
export function glossaryRows(lessons: Lesson[], now: number): GlossaryEntry[] {
  const rows = new Map<string, GlossaryEntry>()
  for (const lesson of lessons) {
    for (const item of lesson.items) {
      for (const lang of TRIBAL_LANGS) {
        const hiNorm = normHi(item.hi)
        const id = `${lang}|${hiNorm}`
        const tr = item.tr?.[lang]
        const prev = rows.get(id)
        if (prev && (prev.native || prev.alt)) continue
        rows.set(id, {
          id,
          lang,
          hiNorm,
          hi: item.hi,
          native: tr?.native ?? '',
          alt: tr?.alt ?? '',
          verified: false,
          source: 'seed',
          updatedAt: now,
        })
      }
    }
  }
  return [...rows.values()]
}

// Sample history so the judges' progress report is not empty. Flagged demo: true.
function demoHistory(now: number) {
  const attempts: Attempt[] = []
  const evaluations: Evaluation[] = []
  const pattern = [5, 4, 2, 5, 3, 4, 1, 5]
  ;['l-greet', 'l-family'].forEach((lessonId, li) => {
    STUDENTS.filter((s) => s[3] === 'c1').forEach(([studentId], si) => {
      const correct = pattern[(si + li * 3) % pattern.length]
      const at = now - (3 - li) * 86_400_000
      attempts.push({
        id: `demo-${lessonId}-${studentId}`,
        studentId,
        classId: 'c1',
        lessonId,
        kind: 'exam',
        correct,
        total: 5,
        at,
        demo: true,
      })
      evaluations.push({
        id: `${lessonId}|${studentId}`,
        lessonId,
        studentId,
        classId: 'c1',
        understood: correct >= 3,
        at: at - 3_600_000,
      })
    })
  })
  return { attempts, evaluations }
}

let seeding: Promise<void> | null = null

/** Loads the seed corpus and demo school on first run (or when the corpus version changes). */
export function ensureSeed(): Promise<void> {
  seeding ??= seed()
  return seeding
}

async function seed() {
  const current = await db.meta.get('seedVersion')
  const firstRun = !current
  if (current?.value === content.version) return

  // Web Crypto promises would end a Dexie transaction, so do that work up front.
  const now = Date.now()
  const dataKey = newDataKey()
  const users: User[] = firstRun
    ? [
        { id: 'a1', role: 'admin', name: 'प्रधानाध्यापक', avatar: '🏫', ...(await makePin(DEMO_ADMIN_PIN, dataKey)) },
        { id: 't1', role: 'teacher', name: 'सुनीता मैम', avatar: '👩‍🏫', ...(await makePin(DEMO_TEACHER_PIN, dataKey)) },
        ...STUDENTS.map(([id, name, avatar, classId]): User => ({ id, role: 'student', name, avatar, classId })),
      ]
    : []
  const records: StudentRecord[] = []
  if (firstRun) {
    for (const [studentId, name] of STUDENTS) {
      const box = await encryptJson(dataKey, { guardian: `${name} के अभिभावक (नमूना)`, notes: '' })
      records.push({ studentId, ...box })
    }
  }
  const history = demoHistory(now)

  await db.transaction('rw', db.tables, async () => {
    // Another tab (the split-screen demo opens two) may have seeded while we hashed PINs.
    const again = await db.meta.get('seedVersion')
    if (again?.value === content.version) return
    await db.lessons.bulkPut(SEED_LESSONS)
    const rows = glossaryRows(SEED_LESSONS, now)
    const existing = new Set(await db.glossary.where('id').anyOf(rows.map((r) => r.id)).primaryKeys())
    await db.glossary.bulkAdd(rows.filter((r) => !existing.has(r.id)))
    if (!again) {
      await db.users.bulkPut(users)
      await db.classes.bulkPut(CLASSES)
      await db.records.bulkPut(records)
      await db.attempts.bulkPut(history.attempts)
      await db.evaluations.bulkPut(history.evaluations)
    }
    await setMeta('seedVersion', content.version)
  })
}

/** Wipes local data and reloads the seed (admin settings → reset demo data). */
export async function resetAll() {
  await db.delete()
  localStorage.removeItem('katha.mockServer')
  sessionStorage.removeItem('katha.sessions')
  location.assign(`${BASE}/`)
}
