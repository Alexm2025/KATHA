import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Chip, cx, TribalText } from '@/components/ui'
import { useRecorder } from '@/lib/audio'
import { db } from '@/lib/db'
import { askDoubt, DOUBT_CARDS } from '@/lib/doubts'
import { useLearn } from '@/lib/hooks'
import { tts } from '@/lib/providers'
import { playBlob } from '@/lib/providers/tts'
import type { Doubt } from '@/lib/types'
import { KidBtn, Say, sayHindi } from './kid'

function Reply({ d }: { d: Doubt }) {
  const tr = d.replyTr
  // Opening the screen counts as having seen the answer.
  useEffect(() => {
    if (!d.heard) void db.doubts.update(d.id, { heard: true })
  }, [d.id, d.heard])
  return (
    <div className="rounded-3xl border-4 border-leaf bg-leaf-soft p-4 text-center">
      <p className="text-4xl" aria-hidden>👩‍🏫💬</p>
      {tr?.available && (
        <div className="my-2">
          <TribalText lang={d.lang} native={tr.native} alt={tr.alt} verified={tr.verified} className="text-3xl" compactTag />
        </div>
      )}
      <p className="text-2xl">{d.replyHi}</p>
      <div className="mt-3 flex flex-wrap justify-center gap-3">
        {tr?.available && <KidBtn icon="🔊" label="सुनो" tone="leaf" onClick={() => tts.speak(tr.native || tr.alt, d.lang, tr.audioKey)} />}
        <KidBtn icon="🔊" label="हिंदी" tone="soft" onClick={() => sayHindi(d.replyHi ?? '')} />
      </div>
    </div>
  )
}

export default function AskDoubt() {
  const { user, cls } = useLearn()
  const [sent, setSent] = useState(false)
  const mine = useLiveQuery(
    async () => (user ? (await db.doubts.where('studentId').equals(user.id).sortBy('at')).reverse().slice(0, 6) : []),
    [user?.id],
  )
  const flash = () => {
    setSent(true)
    setTimeout(() => setSent(false), 2500)
  }
  const { recording, error, start, stop } = useRecorder((audio) => {
    if (user && cls) void askDoubt(user, cls, { audio }).then(flash)
  })
  if (!user || !cls) return null

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      {/* Hold to talk, in the mother tongue. */}
      <button
        type="button"
        aria-label="दबाकर बोलो / Hold to talk"
        aria-pressed={recording}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          void start()
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && !e.repeat && void start()}
        onKeyUp={(e) => (e.key === ' ' || e.key === 'Enter') && stop()}
        onContextMenu={(e) => e.preventDefault()}
        className={cx(
          'flex size-44 touch-none select-none items-center justify-center rounded-full text-8xl text-white shadow-xl',
          recording ? 'scale-110 animate-pulse bg-leaf' : 'bg-terra',
        )}
      >
        🎙
      </button>
      <div className="flex items-center gap-2">
        <p className="text-2xl font-bold">{recording ? 'बोलो…' : 'दबाकर बोलो'}</p>
        <Say hi="बटन दबाकर अपनी भाषा में सवाल पूछो" />
      </div>
      {error && <Chip tone="bad">🎙✕</Chip>}
      {sent && <p className="rounded-full bg-leaf px-6 py-2 text-2xl font-bold text-white" role="status">✓ भेज दिया</p>}

      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
        {DOUBT_CARDS.map((c) => (
          <div key={c.id} className="relative">
            <button
              type="button"
              aria-label={c.hi}
              onClick={() => askDoubt(user, cls, { cardId: c.id }).then(flash)}
              className="flex min-h-32 w-full flex-col items-center justify-center rounded-3xl border-4 border-saffron bg-saffron-soft p-2 text-center font-bold"
            >
              <span className="text-6xl" aria-hidden>{c.icon}</span>
              {c.hi}
            </button>
            <Say hi={c.hi} className="absolute -right-1 -top-1 size-12 text-xl" />
          </div>
        ))}
      </div>

      <ul className="w-full space-y-3">
        {mine?.map((d) => (
          <li key={d.id}>
            {d.status === 'answered' ? (
              <Reply d={d} />
            ) : (
              <div className="flex items-center gap-3 rounded-3xl border-4 border-cream-deep bg-white p-3">
                <span className="text-4xl" aria-hidden>{DOUBT_CARDS.find((c) => c.id === d.cardId)?.icon ?? '🎙'}</span>
                {d.audio && <KidBtn icon="▶️" label="मेरा सवाल" tone="soft" onClick={() => playBlob(d.audio!)} />}
                <span className="ml-auto text-3xl" aria-label="शिक्षक के जवाब का इंतज़ार" role="img">⏳</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
