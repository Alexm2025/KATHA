import { useEffect, useRef } from 'react'
import type { Utterance } from './types'

// Teacher and student devices are two tabs (or the two halves of the split-screen demo)
// on one origin; BroadcastChannel carries the live classroom events between them.
// Persistent data still goes through IndexedDB, so a tab that opens late catches up.

export type LiveMsg =
  | { type: 'utterance'; utterance: Utterance }
  | { type: 'doubt'; classId: string; doubtId: string }
  | { type: 'reply'; classId: string; studentId: string; doubtId: string }
  | { type: 'quiz'; classId: string; lessonId: string }
  | { type: 'lesson'; classId: string; lessonId: string }

const NAME = 'katha-live'
let sender: BroadcastChannel | null = null

export function post(msg: LiveMsg) {
  sender ??= new BroadcastChannel(NAME)
  sender.postMessage(msg)
}

/** Subscribe to live events. Uses its own channel object so same-page senders are heard too. */
export function useLive(handler: (msg: LiveMsg) => void) {
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => {
    const ch = new BroadcastChannel(NAME)
    ch.onmessage = (e: MessageEvent<LiveMsg>) => ref.current(e.data)
    return () => ch.close()
  }, [])
}
