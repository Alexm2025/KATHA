import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CorrectDialog } from '@/components/CorrectDialog'
import { Btn, Card, Chip, cx, Empty, inputCls, LatencyBadge, ScriptToggle, TribalText, useClips } from '@/components/ui'
import { db } from '@/lib/db'
import { useTeach } from '@/lib/hooks'
import { LANGS } from '@/lib/lang'
import { sendUtterance } from '@/lib/live'
import { liveAsr, tts } from '@/lib/providers'
import { useOnline, usePrefs, useT } from '@/lib/store'
import type { ClassRoom, Utterance } from '@/lib/types'

function UtteranceCard({ u, cls, author, hasClip }: { u: Utterance; cls: ClassRoom; author: string; hasClip: boolean }) {
  const t = useT()
  const [fixing, setFixing] = useState(false)
  const tr = u.translation
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <LatencyBadge ms={u.latencyMs} />
        <Chip>{u.source === 'speech' ? '🎙' : u.source === 'tap' ? '👆' : '⌨️'} {tr.provider}</Chip>
        {tr.matchedHi && (
          <Chip tone="warn">≈ {t('मिलता-जुलता', 'closest match')}: “{tr.matchedHi}” · {Math.round(tr.confidence * 100)}%</Chip>
        )}
      </div>
      <p className="mt-2 text-lg text-ink-soft">{u.hi}</p>
      <div className="mt-1">
        <TribalText lang={cls.lang} native={tr.native} alt={tr.alt} verified={tr.verified} className="text-3xl text-leaf-dark" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {tr.available &&
          (hasClip ? (
            <Btn variant="soft" onClick={() => tts.speak(tr.native || tr.alt, cls.lang, tr.audioKey)}>🔊 {t('सुनें', 'Play')}</Btn>
          ) : (
            <Chip>🔇 {t('आवाज़ बाकी', 'audio pending')}</Chip>
          ))}
        <Btn variant="outline" onClick={() => setFixing(true)}>✏️ {t('अनुवाद सुधारें', 'Correct this translation')}</Btn>
      </div>
      {fixing && (
        <CorrectDialog
          lang={cls.lang}
          hi={tr.matchedHi ?? u.hi}
          author={author}
          onClose={() => setFixing(false)}
          // Re-send so the students' screens show the corrected text straight away.
          onSaved={() => sendUtterance(cls, u.hi, u.source, performance.now(), { lessonId: u.lessonId, id: u.id })}
        />
      )}
    </Card>
  )
}

export default function LiveTeach() {
  const t = useT()
  const { user, cls, lesson } = useTeach()
  const online = useOnline()
  const { onlineAsr, set } = usePrefs()
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [typed, setTyped] = useState('')
  const [asrError, setAsrError] = useState('')
  const handle = useRef<{ stop: () => void } | null>(null)
  const clips = useClips(cls?.lang)
  const feed = useLiveQuery(
    async () => (cls ? (await db.utterances.where('classId').equals(cls.id).sortBy('at')).reverse().slice(0, 15) : []),
    [cls?.id],
  )

  useEffect(() => () => handle.current?.stop(), [])

  if (!cls) return null
  if (!lesson) {
    return (
      <Empty>
        {t('पहले डैशबोर्ड पर एक पाठ चुनें।', 'Choose a lesson on the dashboard first.')}{' '}
        <Link className="font-bold text-terra-dark underline" to="/teacher">{t('डैशबोर्ड', 'Dashboard')}</Link>
      </Empty>
    )
  }

  const send = (hi: string, source: Utterance['source'], t0: number) =>
    hi.trim() && sendUtterance(cls, hi.trim(), source, t0, { lessonId: lesson.id })

  function toggleMic() {
    if (listening) return handle.current?.stop()
    setAsrError('')
    setListening(true)
    handle.current = liveAsr.listen('hi', {
      interim: setInterim,
      final: (tr, endedAt) => void send(tr.text, 'speech', endedAt),
      error: setAsrError,
      end: () => {
        setListening(false)
        setInterim('')
      },
    })
  }

  const micReady = liveAsr.supported() && online && onlineAsr

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section aria-label={t('पाठ', 'Lesson script')}>
        <Card className="lg:sticky lg:top-3">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <span aria-hidden>{lesson.emoji}</span> {lesson.titleHi}
            <span className="ml-auto"><ScriptToggle lang={cls.lang} /></span>
          </h2>
          <p className="mb-3 text-sm text-ink-soft">
            {cls.name} · {t(LANGS[cls.lang].hi, LANGS[cls.lang].en)} · {t('वाक्य छूकर भेजें (ऑफ़लाइन चलता है)', 'tap a line to send it (works offline)')}
          </p>
          <ul className="max-h-[60dvh] space-y-2 overflow-y-auto pr-1">
            {lesson.items.map((it) => (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => send(it.hi, 'tap', performance.now())}
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl border-2 border-cream-deep bg-cream/60 px-3 py-2 text-left text-lg hover:border-leaf hover:bg-leaf-soft"
                >
                  <span aria-hidden className="w-8 text-center text-2xl">{it.emoji ?? (it.digit ? it.digit : '💬')}</span>
                  {it.hi}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section aria-label={t('लाइव अनुवाद', 'Live translation')} className="space-y-3">
        <Card className="text-center">
          {!liveAsr.supported() ? (
            <Chip tone="warn">{t('इस ब्राउज़र में आवाज़ पहचान नहीं है — वाक्य छूकर पढ़ाएँ', 'No speech recognition in this browser — teach by tapping lines')}</Chip>
          ) : !onlineAsr ? (
            <div className="space-y-2 text-left">
              <p className="font-bold">🎙 {t('बोलकर पढ़ाना (ऑनलाइन)', 'Teach by speaking (online)')}</p>
              <p className="text-sm text-ink-soft">
                {t(
                  'यह Chrome की ऑनलाइन आवाज़ पहचान का उपयोग करता है: आपकी आवाज़ Google की सेवा को भेजी जाती है। बिना इंटरनेट के, बाईं ओर के वाक्य छूकर पढ़ाएँ।',
                  "This uses Chrome's online speech recognition: your audio is sent to Google's speech service. Without internet, teach by tapping the lines on the left.",
                )}
              </p>
              <Btn variant="outline" onClick={() => set({ onlineAsr: true })}>{t('ठीक है, चालू करें', 'OK, turn it on')}</Btn>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={toggleMic}
                disabled={!micReady}
                aria-pressed={listening}
                aria-label={listening ? t('रोकें', 'Stop listening') : t('हिंदी में बोलें', 'Speak in Hindi')}
                className={cx(
                  'mx-auto flex size-28 items-center justify-center rounded-full text-5xl text-white shadow-lg transition disabled:opacity-40',
                  listening ? 'animate-pulse bg-leaf' : 'bg-terra hover:bg-terra-dark',
                )}
              >
                {listening ? '⏹' : '🎙'}
              </button>
              <p className="mt-2 font-bold">
                {!online ? t('ऑफ़लाइन — वाक्य छूकर पढ़ाएँ', 'Offline — teach by tapping lines') : listening ? t('सुन रहा हूँ… हिंदी में बोलें', 'Listening… speak in Hindi') : t('बोलने के लिए दबाएँ', 'Tap to speak')}
              </p>
              <p className="mt-1 flex flex-wrap items-center justify-center gap-2 text-sm">
                <Chip tone="warn">{t('ऑनलाइन ASR', 'online ASR')}</Chip>
                <button type="button" className="underline" onClick={() => { handle.current?.stop(); set({ onlineAsr: false }) }}>{t('बंद करें', 'turn off')}</button>
              </p>
              {interim && <p className="mt-2 text-lg italic text-ink-soft" aria-live="polite">{interim}…</p>}
              {asrError && <p className="mt-2"><Chip tone="bad">{t('आवाज़ पहचान में दिक्कत', 'Speech recognition problem')}: {asrError}</Chip></p>}
            </>
          )}
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              void send(typed, 'typed', performance.now())
              setTyped('')
            }}
          >
            <input className={inputCls} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={t('या हिंदी में लिखें…', 'or type in Hindi…')} aria-label={t('हिंदी वाक्य', 'Hindi sentence')} />
            <Btn type="submit" variant="leaf" disabled={!typed.trim()}>{t('भेजें', 'Send')}</Btn>
          </form>
        </Card>

        {feed?.length ? (
          feed.map((u) => (
            <UtteranceCard key={u.id} u={u} cls={cls} author={user?.name ?? 'teacher'} hasClip={!!clips?.has(`${cls.lang}|${u.translation.audioKey}`)} />
          ))
        ) : (
          <Empty>{t('बोलें या कोई वाक्य छुएँ — अनुवाद यहाँ और बच्चों की स्क्रीन पर दिखेगा।', "Speak or tap a line — the translation appears here and on the students' screens.")}</Empty>
        )}
      </section>
    </div>
  )
}
