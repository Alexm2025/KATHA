import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '@/lib/db'
import { saveClip, saveCorrection } from '@/lib/glossary'
import { LANGS, normHi } from '@/lib/lang'
import { clipId, playBlob } from '@/lib/providers/tts'
import { useT } from '@/lib/store'
import type { TribalLang } from '@/lib/types'
import { Btn, Chip, Field, inputCls, Modal, RecordBtn } from './ui'

interface Props {
  lang: TribalLang
  hi: string
  author: string
  onClose: () => void
  onSaved?: () => void
}

/**
 * "Correct this translation": the teacher or a community helper types the right text
 * and can record how it is said. Saved entries are community-verified and used at once.
 */
export function CorrectDialog(props: Props) {
  const id = `${props.lang}|${normHi(props.hi)}`
  // undefined = still loading, null = no entry yet. The form mounts once, with the stored text.
  const entry = useLiveQuery(async () => (await db.glossary.get(id)) ?? null, [id])
  return entry === undefined ? null : <Form {...props} initial={entry} />
}

function Form({ lang, hi, author, onClose, onSaved, initial }: Props & { initial: { native: string; alt: string } | null }) {
  const t = useT()
  const info = LANGS[lang]
  const clip = useLiveQuery(() => db.audio.get(clipId(lang, hi)), [lang, hi])
  const [native, setNative] = useState(initial?.native ?? '')
  const [alt, setAlt] = useState(initial?.alt ?? '')
  const [helper, setHelper] = useState('')

  async function submit() {
    await saveCorrection({ lang, hi, native, alt, author: helper.trim() ? `${helper.trim()} · ${author}` : author })
    onSaved?.()
    onClose()
  }

  return (
    <Modal title={t('अनुवाद सुधारें', 'Correct this translation')} onClose={onClose}>
      <div className="space-y-4">
        <p className="rounded-xl bg-cream-deep/60 p-3 text-lg">
          <span className="text-sm font-bold text-ink-soft">{t('हिंदी', 'Hindi')}</span>
          <br />
          {hi}
        </p>
        <Field label={`${t(info.hi, info.en)} · ${info.nativeScript}`}>
          <input lang={lang} className={inputCls} value={native} onChange={(e) => setNative(e.target.value)} />
        </Field>
        {info.altScript && (
          <Field label={`${t(info.hi, info.en)} · ${info.altScript}`}>
            <input className={inputCls} value={alt} onChange={(e) => setAlt(e.target.value)} />
          </Field>
        )}
        <Field label={t('किसने बताया? (वैकल्पिक)', 'Who helped? (optional)')}>
          <input className={inputCls} value={helper} onChange={(e) => setHelper(e.target.value)} placeholder={t('जैसे: गाँव के सहायक', 'e.g. a community helper')} />
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          <RecordBtn label={t('बोलकर रिकॉर्ड करें', 'Record how it is said')} onDone={(blob) => saveClip(lang, hi, blob, author)} />
          {clip ? (
            <Btn variant="soft" onClick={() => playBlob(clip.blob)}>🔊 {t('सुनें', 'Play')}</Btn>
          ) : (
            <Chip>{t('आवाज़ बाकी', 'audio pending')}</Chip>
          )}
        </div>
        <p className="text-sm text-ink-soft">
          {t(
            'सहेजने पर यह "समुदाय-सत्यापित" माना जाएगा और अगली बार यही अनुवाद दिखेगा।',
            'Saving marks this as community-verified; the next translation of this sentence will use it.',
          )}
        </p>
        <Btn variant="leaf" className="w-full" disabled={!native.trim() && !alt.trim()} onClick={submit}>
          ✓ {t('सहेजें', 'Save')}
        </Btn>
      </div>
    </Modal>
  )
}
