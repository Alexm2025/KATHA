import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { CorrectDialog } from '@/components/CorrectDialog'
import { Btn, Card, Chip, cx, inputCls, TribalText } from '@/components/ui'
import { db } from '@/lib/db'
import { correctionsToCsv, download, parseCorrections } from '@/lib/glossary'
import { useMe } from '@/lib/hooks'
import { LANGS, TRIBAL_LANGS } from '@/lib/lang'
import { useT } from '@/lib/store'
import { mergeCorrections } from '@/lib/sync'
import type { GlossaryEntry, TribalLang } from '@/lib/types'

const filled = (e: GlossaryEntry) => !!(e.native || e.alt)

export default function Packs() {
  const t = useT()
  const { user } = useMe('admin')
  const glossary = useLiveQuery(() => db.glossary.toArray())
  const corrections = useLiveQuery(() => db.corrections.toArray())
  const clips = useLiveQuery(() => db.audio.toArray())
  const [lang, setLang] = useState<TribalLang>('sat')
  const [query, setQuery] = useState('')
  const [fixing, setFixing] = useState<GlossaryEntry>()
  const [imported, setImported] = useState<string>()
  if (!glossary || !corrections || !clips) return null

  const stamp = new Date().toISOString().slice(0, 10)

  async function importFile(file?: File) {
    if (!file) return
    try {
      const rows = parseCorrections(await file.text(), file.name.toLowerCase().endsWith('.csv'))
      const added = await mergeCorrections(rows)
      setImported(t(`${added} नए सुधार जोड़े गए (${rows.length} पढ़े)`, `${added} new corrections merged (${rows.length} read)`))
    } catch {
      setImported(t('फ़ाइल पढ़ी नहीं जा सकी', 'Could not read that file'))
    }
  }

  const rows = glossary
    .filter((e) => e.lang === lang && (!query || e.hi.includes(query) || e.native.includes(query) || e.alt.toLowerCase().includes(query.toLowerCase())))
    .sort((a, b) => Number(filled(b)) - Number(filled(a)) || a.hi.localeCompare(b.hi, 'hi'))

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">🗂 {t('भाषा पैक और मॉडल डेटा', 'Language packs & model data')}</h1>

      <div className="grid gap-4 lg:grid-cols-3">
        {TRIBAL_LANGS.map((l) => {
          const info = LANGS[l]
          const entries = glossary.filter((e) => e.lang === l)
          const verified = entries.filter((e) => filled(e) && e.verified).length
          const drafts = entries.filter((e) => filled(e) && !e.verified).length
          const empty = entries.length - verified - drafts
          const pct = (n: number) => `${entries.length ? (n / entries.length) * 100 : 0}%`
          return (
            <Card key={l} className="space-y-2">
              <h2 className="text-xl font-bold">
                {t(info.hi, info.en)} <span className="text-sm font-normal text-ink-soft">{info.nativeScript}{info.altScript ? ` · ${info.altScript}` : ''}</span>
              </h2>
              <p className="text-sm font-bold text-ink-soft">{t('शब्दकोश पैक', 'Glossary pack')}: {entries.length} {t('प्रविष्टियाँ', 'entries')}</p>
              <div className="flex h-4 overflow-hidden rounded-full bg-cream-deep" role="img" aria-label={`${verified} verified, ${drafts} need verification, ${empty} empty`}>
                <span className="bg-leaf" style={{ width: pct(verified) }} />
                <span className="bg-saffron" style={{ width: pct(drafts) }} />
              </div>
              <p className="flex flex-wrap gap-1">
                <Chip tone="good">✓ {verified} {t('सत्यापित', 'verified')}</Chip>
                <Chip tone="warn">⚠ {drafts} {t('जाँच बाकी', 'need verification')}</Chip>
                <Chip>○ {empty} {t('खाली', 'empty')}</Chip>
              </p>
              <p className="text-sm">
                <strong>{t('आवाज़ पैक', 'Audio pack')}:</strong> {clips.filter((c) => c.lang === l).length} {t('रिकॉर्डिंग', 'recordings')}
                {' · '}
                <strong>{t('सुधार', 'Corrections')}:</strong> {corrections.filter((c) => c.lang === l).length}
              </p>
              <p className={cx('rounded-xl p-2 text-sm', info.mtCovered ? 'bg-leaf-soft' : 'bg-saffron-soft')}>
                <strong>{t('मशीन अनुवाद', 'Machine translation')}:</strong> {t(info.mtHi, info.mtEn)}
              </p>
            </Card>
          )
        })}
      </div>

      <Card className="space-y-3">
        <h2 className="font-bold">{t('सुधार डेटासेट (मॉडल प्रशिक्षण के लिए)', 'Correction dataset (for model retraining)')}</h2>
        <p className="text-sm text-ink-soft">
          {t('हर सुधार लेखक और समय के साथ सुरक्षित रहता है।', 'Every correction is kept with its author and timestamp.')} {corrections.length} {t('कुल', 'total')}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Btn variant="outline" onClick={() => download(`katha-corrections-${stamp}.json`, JSON.stringify({ exportedAt: new Date().toISOString(), corrections }, null, 2), 'application/json')}>⬇ JSON</Btn>
          <Btn variant="outline" onClick={() => download(`katha-corrections-${stamp}.csv`, `﻿${correctionsToCsv(corrections)}`, 'text/csv')}>⬇ CSV</Btn>
          <label className="inline-flex min-h-12 cursor-pointer items-center rounded-xl bg-leaf px-4 font-bold text-white hover:bg-leaf-dark">
            ⬆ {t('JSON / CSV आयात करें', 'Import JSON / CSV')}
            <input type="file" accept=".json,.csv,application/json,text/csv" className="sr-only" onChange={(e) => importFile(e.target.files?.[0])} />
          </label>
          {imported && <Chip tone="good">{imported}</Chip>}
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="font-bold">{t('शब्दकोश', 'Glossary')}</h2>
          {TRIBAL_LANGS.map((l) => (
            <button key={l} type="button" aria-pressed={l === lang} onClick={() => setLang(l)} className={cx('min-h-12 rounded-xl border-2 px-3 font-bold', l === lang ? 'border-terra bg-terra-soft text-terra-dark' : 'border-cream-deep bg-white')}>
              {t(LANGS[l].hi, LANGS[l].en)}
            </button>
          ))}
          <input className={`${inputCls} max-w-60`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`🔍 ${t('खोजें', 'Search')}`} aria-label={t('खोजें', 'Search')} />
        </div>
        <ul className="max-h-[28rem] divide-y divide-cream-deep overflow-y-auto">
          {rows.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
              <span className="w-56 text-lg">{e.hi}</span>
              <span className="flex-1"><TribalText lang={e.lang} native={e.native} alt={e.alt} verified={e.verified} className="text-xl" /></span>
              {e.author && <span className="text-sm text-ink-soft">{e.author}</span>}
              <Btn variant="ghost" onClick={() => setFixing(e)} aria-label={`${t('बदलें', 'Edit')}: ${e.hi}`}>✏️</Btn>
            </li>
          ))}
        </ul>
      </Card>

      {fixing && <CorrectDialog lang={fixing.lang} hi={fixing.hi} author={user?.name ?? 'admin'} onClose={() => setFixing(undefined)} />}
    </div>
  )
}
