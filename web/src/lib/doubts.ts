import { post } from './channel'
import { save } from './db'
import { uid } from './lang'
import { translator } from './providers'
import type { ClassRoom, Doubt, User } from './types'

// Picture doubt-cards: a child who cannot yet explain a doubt taps one. Each has a fixed
// Hindi meaning, so the teacher gets a reliable Hindi reading with no speech model.
export const DOUBT_CARDS = [
  { id: 'again', icon: '🔁', hi: 'फिर से बताइए' },
  { id: 'slow', icon: '🐢', hi: 'धीरे बोलिए' },
  { id: 'what', icon: '❓', hi: 'यह क्या है?' },
  { id: 'lost', icon: '😕', hi: 'मुझे समझ नहीं आया' },
] as const

export async function askDoubt(student: User, cls: ClassRoom, input: { audio?: Blob; cardId?: string }) {
  const card = DOUBT_CARDS.find((c) => c.id === input.cardId)
  const doubt: Doubt = {
    id: uid(),
    classId: cls.id,
    studentId: student.id,
    lang: cls.lang,
    audio: input.audio,
    cardId: card?.id,
    hi: card?.hi,
    at: Date.now(),
    status: 'new',
  }
  // Stored locally first; the queue carries it to the server when there is a network.
  await save('doubts', doubt.id, doubt)
  post({ type: 'doubt', classId: cls.id, doubtId: doubt.id })
  return doubt
}

export async function replyToDoubt(doubt: Doubt, replyHi: string) {
  const replyTr = await translator.translate(replyHi, 'hi', doubt.lang)
  const next: Doubt = { ...doubt, status: 'answered', replyHi, replyTr, replyAt: Date.now(), heard: false }
  await save('doubts', next.id, next)
  post({ type: 'reply', classId: doubt.classId, studentId: doubt.studentId, doubtId: doubt.id })
}
