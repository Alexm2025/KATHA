import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Chip, Pic, TribalText } from '@/components/ui'
import { useLive } from '@/lib/channel'
import { db } from '@/lib/db'
import { useLearn } from '@/lib/hooks'
import { normHi } from '@/lib/lang'
import { tts } from '@/lib/providers'
import { usePrefs } from '@/lib/store'
import type { AudioOutput, Utterance } from '@/lib/types'
import { KidBtn, sayHindi } from './kid'

/** "Listen to Teacher": the latest thing the teacher said, in the child's language. */
export default function Listen() {
  const { cls, lesson } = useLearn()
  const showTribal = usePrefs((s) => s.showTribal)
  const [audio, setAudio] = useState<AudioOutput['status']>()
  const latest = useLiveQuery(
    async () => (cls ? (await db.utterances.where('classId').equals(cls.id).sortBy('at')).at(-1) : undefined),
    [cls?.id],
  )

  const play = useCallback(
    async (u: Utterance) => {
      const tr = u.translation
      if (!cls || !tr.available) return setAudio(undefined)
      const out = await tts.speak(tr.native || tr.alt, cls.lang, tr.audioKey)
      setAudio(out.status)
    },
    [cls],
  )

  // Autoplay each new utterance as it arrives from the teacher's device.
  useLive((msg) => {
    if (msg.type === 'utterance' && msg.utterance.classId === cls?.id) void play(msg.utterance)
  })

  // Also play once when the screen opens on an utterance that is already there.
  const opened = useRef(false)
  useEffect(() => {
    if (latest && !opened.current) {
      opened.current = true
      void play(latest)
    }
  }, [latest, play])

  if (!cls) return null
  if (!latest) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <span className="animate-pulse text-9xl" aria-hidden>👂</span>
        <p className="text-2xl font-bold">शिक्षक का इंतज़ार…</p>
      </div>
    )
  }

  const tr = latest.translation
  const key = normHi(tr.matchedHi ?? latest.hi)
  const item = lesson?.items.find((it) => normHi(it.hi) === key)
  const tribal = showTribal && tr.available

  return (
    <div className="flex flex-col items-center gap-5 py-4 text-center" aria-live="polite">
      {item && <Pic item={item} lang={cls.lang} className="text-8xl" />}

      {tribal ? (
        <TribalText lang={cls.lang} native={tr.native} alt={tr.alt} verified={tr.verified} className="text-5xl text-leaf-dark" compactTag />
      ) : (
        <p className="text-5xl font-bold leading-relaxed">{latest.hi}</p>
      )}
      {showTribal && !tr.available && <Chip>⏳ अनुवाद ऑफ़लाइन उपलब्ध नहीं</Chip>}

      {tribal && <p className="text-2xl text-ink-soft">{latest.hi}</p>}

      <div className="flex flex-wrap items-center justify-center gap-3">
        {tribal && audio !== 'pending' && <KidBtn icon="🔁" label="फिर सुनो" tone="leaf" onClick={() => play(latest)} />}
        <KidBtn icon="🔊" label="हिंदी" tone="soft" onClick={() => sayHindi(latest.hi)} />
      </div>
      {tribal && audio === 'pending' && <Chip>🔇 आवाज़ बाकी / audio pending</Chip>}
    </div>
  )
}
