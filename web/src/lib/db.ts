import Dexie, { type Table } from 'dexie'
import type {
  Attempt,
  AudioClip,
  ClassRoom,
  CorrectionLog,
  Doubt,
  Evaluation,
  GlossaryEntry,
  Lesson,
  MediaBlob,
  Meta,
  StudentRecord,
  SyncItem,
  User,
  Utterance,
} from './types'

class KathaDB extends Dexie {
  users!: Table<User, string>
  classes!: Table<ClassRoom, string>
  lessons!: Table<Lesson, string>
  glossary!: Table<GlossaryEntry, string>
  corrections!: Table<CorrectionLog, string>
  audio!: Table<AudioClip, string>
  media!: Table<MediaBlob, string>
  utterances!: Table<Utterance, string>
  doubts!: Table<Doubt, string>
  evaluations!: Table<Evaluation, string>
  attempts!: Table<Attempt, string>
  records!: Table<StudentRecord, string>
  syncQueue!: Table<SyncItem, number>
  meta!: Table<Meta, string>

  constructor() {
    super('katha')
    this.version(1).stores({
      users: 'id, role, classId',
      classes: 'id, teacherId',
      lessons: 'id, grade, subject',
      glossary: 'id, lang',
      corrections: 'id, lang, at',
      audio: 'id, lang',
      media: 'id',
      utterances: 'id, classId, at',
      doubts: 'id, classId, studentId, status, at',
      evaluations: 'id, lessonId, studentId, classId',
      attempts: 'id, studentId, classId, lessonId, at',
      records: 'studentId',
      syncQueue: '++id, status, at',
      meta: 'key',
    })
  }
}

export const db = new KathaDB()

export type SyncedTable =
  | 'users'
  | 'classes'
  | 'lessons'
  | 'glossary'
  | 'corrections'
  | 'doubts'
  | 'evaluations'
  | 'attempts'
  | 'records'

// Recordings stay on the device; only JSON-safe fields go into the queue.
const withoutBlobs = (obj: object) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => !(v instanceof Blob)))

/** Local-first write: store, then queue for the next sync. */
export async function save<T extends object>(table: SyncedTable, key: string, obj: T) {
  await db.transaction('rw', db.table(table), db.syncQueue, async () => {
    await db.table(table).put(obj)
    await db.syncQueue.add({
      table,
      op: 'put',
      key,
      payload: withoutBlobs(obj),
      at: Date.now(),
      status: 'pending',
    })
  })
}

export async function remove(table: SyncedTable, key: string) {
  await db.transaction('rw', db.table(table), db.syncQueue, async () => {
    await db.table(table).delete(key)
    await db.syncQueue.add({ table, op: 'delete', key, payload: null, at: Date.now(), status: 'pending' })
  })
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined
}

export const setMeta = (key: string, value: unknown) => db.meta.put({ key, value })
