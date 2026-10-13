import { post } from './channel'
import { db } from './db'
import { uid } from './lang'
import { translator } from './providers'
import type { ClassRoom, Utterance } from './types'

const KEEP = 40

/**
 * One classroom utterance: translate the Hindi, store it, and broadcast it to the
 * students' tablets. `t0` is performance.now() at end-of-speech (or at the tap).
 * Pass `id` to re-send an existing utterance, e.g. after a correction.
 */
export async function sendUtterance(
  cls: ClassRoom,
  hi: string,
  source: Utterance['source'],
  t0: number,
  opts: { lessonId?: string; id?: string } = {},
): Promise<Utterance> {
  const translation = await translator.translate(hi, 'hi', cls.lang, { lessonId: opts.lessonId })
  const utterance: Utterance = {
    id: opts.id ?? uid(),
    classId: cls.id,
    lessonId: opts.lessonId,
    source,
    hi,
    translation,
    latencyMs: Math.round(performance.now() - t0),
    at: Date.now(),
  }
  await db.utterances.put(utterance)
  post({ type: 'utterance', utterance })
  void trim(cls.id)
  return utterance
}

async function trim(classId: string) {
  const all = await db.utterances.where('classId').equals(classId).sortBy('at')
  if (all.length > KEEP) await db.utterances.bulkDelete(all.slice(0, all.length - KEEP).map((u) => u.id))
}
