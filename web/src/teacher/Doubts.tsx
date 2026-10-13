import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import { Btn, Card, Chip, Empty, inputCls, TribalText } from '@/components/ui'
import { db } from '@/lib/db'
import { DOUBT_CARDS, replyToDoubt } from '@/lib/doubts'
import { useTeach } from '@/lib/hooks'
import { LANGS } from '@/lib/lang'
import { liveAsr } from '@/lib/providers'
import { playBlob } from '@/lib/providers/tts'
import { useOnline, usePrefs, useT } from '@/lib/store'
import type { Doubt, User } from '@/lib/types'

const QUICK = ['फिर से सुनो।', 'ध्यान से सुनो।', 'मेरे साथ बोलो।', 'बहुत अच्छा सवाल है।']

function DoubtCard({ d, student }: { d: Doubt; student?: User }) {
  const t = useT()
  const online = useOnline()
  const onlineAsr = usePrefs((s) => s.onlineAsr)
  const [reply, setReply] = useState('')
  const [dictating, setDictating] = useState(false)
  const handle = useRef<{ stop: () => void } | null>(null)
  const card = DOUBT_CARDS.find((c) => c.id === d.cardId)
  const lang = LANGS[d.lang]

  // Voice reply: dictate one Hindi sentence into the reply box (online ASR, if enabled).
  function dictate() {
    if (dictating) return handle.current?.stop()
    setDictating(true)
    handle.current = liveAsr.listen('hi', {
      interim: () => {},
      final: (tr) => {
        setReply((r) => `${r} ${tr.text}`.trim())
        handle.current?.stop()
      },
      error: () => {},
      end: () => setDictating(false),
    })
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-4xl" aria-hidden>{student?.avatar ?? '🧒'}</span>
        <span className="text-lg font-bold">{student?.name}</span>
        <Chip>{t(lang.hi, lang.en)}</Chip>
        <span className="text-sm text-ink-soft">{new Date(d.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        <span className="ml-auto">{d.status === 'new' ? <Chip tone="warn">{t('नया', 'New')}</Chip> : <Chip tone="good">✓ {t('जवाब दिया', 'Answered')}</Chip>}</span>
      </div>

      <div className="mt-3 rounded-xl bg-cream-deep/60 p-3">
        {d.audio && (
          <Btn variant="soft" className="mb-2" onClick={() => playBlob(d.audio!)}>
            ▶️ {t('बच्चे की आवाज़ सुनें', "Play the child's recording")}
          </Btn>
        )}
        {card ? (
          <p className="text-xl">
            <span aria-hidden>{card.icon}</span> <strong>{card.hi}</strong>
            <span className="ml-2 text-sm text-ink-soft">({t('सवाल-कार्ड से', 'from a doubt card')})</span>
          </p>
        ) : (
          <p className="text-sm text-ink-soft">
            {t(
              `${lang.hi} की आवाज़ को हिंदी में बदलने वाला मॉडल अभी उपलब्ध नहीं है — रिकॉर्डिंग सुनें या किसी सहायक से पूछें।`,
              `Turning ${lang.en} speech into Hindi needs a speech model that is not available yet — listen to the recording or ask a helper.`,
            )}
          </p>
        )}
      </div>

      {d.status === 'answered' ? (
        <div className="mt-3 border-l-4 border-leaf pl-3">
          <p className="text-lg">{d.replyHi}</p>
          {d.replyTr && <TribalText lang={d.lang} native={d.replyTr.native} alt={d.replyTr.alt} verified={d.replyTr.verified} className="text-xl text-leaf-dark" />}
        </div>
      ) : (
        <form
          className="mt-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (reply.trim()) void replyToDoubt(d, reply.trim())
          }}
        >
          <div className="flex flex-wrap gap-2">
            {QUICK.map((q) => (
              <button key={q} type="button" className="min-h-12 rounded-full bg-saffron-soft px-3 font-bold hover:bg-saffron" onClick={() => setReply(q)}>
                {q}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input className={inputCls} value={reply} onChange={(e) => setReply(e.target.value)} placeholder={t('हिंदी में जवाब…', 'Reply in Hindi…')} aria-label={t('जवाब', 'Reply')} />
            {liveAsr.supported() && onlineAsr && online && (
              <Btn variant={dictating ? 'primary' : 'outline'} onClick={dictate} aria-pressed={dictating} aria-label={t('बोलकर जवाब दें', 'Dictate the reply')}>
                🎙
              </Btn>
            )}
            <Btn type="submit" variant="leaf" disabled={!reply.trim()}>{t('भेजें', 'Send')}</Btn>
          </div>
        </form>
      )}
    </Card>
  )
}

export default function Doubts() {
  const t = useT()
  const { cls, students } = useTeach()
  const doubts = useLiveQuery(
    async () => (cls ? (await db.doubts.where('classId').equals(cls.id).sortBy('at')).reverse() : []),
    [cls?.id],
  )
  if (!cls || !doubts) return null
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">🙋 {t('बच्चों के सवाल', "Children's doubts")} · {cls.name}</h1>
      {doubts.length ? (
        doubts.map((d) => <DoubtCard key={d.id} d={d} student={students?.find((s) => s.id === d.studentId)} />)
      ) : (
        <Empty>{t('अभी कोई सवाल नहीं। बच्चे अपने टैबलेट से मातृभाषा में पूछ सकते हैं।', 'No doubts yet. Children can ask in their mother tongue from their tablets.')}</Empty>
      )}
    </div>
  )
}
