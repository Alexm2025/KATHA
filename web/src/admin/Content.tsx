import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { CorrectDialog } from '@/components/CorrectDialog'
import { Btn, Card, cx, Field, inputCls, Pic } from '@/components/ui'
import { db, remove, save } from '@/lib/db'
import { allLessons, useMe } from '@/lib/hooks'
import { LANGS, normHi, OUTCOMES, SUBJECTS, TRIBAL_LANGS, uid } from '@/lib/lang'
import { glossaryRows } from '@/lib/seed'
import { useT } from '@/lib/store'
import type { Grade, Lesson, LessonItem, Outcome, Subject, TribalLang } from '@/lib/types'

/** Shrinks an uploaded picture to a small WebP so language packs stay light. */
async function toWebp(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, 384 / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  return new Promise((res) => canvas.toBlob((b) => res(b!), 'image/webp', 0.8))
}

function LessonEditor({ lesson, author }: { lesson: Lesson; author: string }) {
  const t = useT()
  const [draft, setDraft] = useState(lesson)
  const [dirty, setDirty] = useState(false)
  const [fixing, setFixing] = useState<{ lang: TribalLang; hi: string }>()
  const glossary = useLiveQuery(async () => new Map((await db.glossary.toArray()).map((e) => [e.id, e])))

  const edit = (patch: Partial<Lesson>) => (setDraft({ ...draft, ...patch }), setDirty(true))
  const editItem = (id: string, patch: Partial<LessonItem>) =>
    edit({ items: draft.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })

  async function submit() {
    const clean = { ...draft, custom: true, items: draft.items.filter((i) => i.hi.trim()) }
    await save('lessons', clean.id, clean)
    // New lines need (empty) glossary rows so they show up as "to translate".
    const rows = glossaryRows([clean], Date.now())
    const have = new Set(await db.glossary.where('id').anyOf(rows.map((r) => r.id)).primaryKeys())
    await db.glossary.bulkAdd(rows.filter((r) => !have.has(r.id)))
    setDraft(clean)
    setDirty(false)
  }

  async function upload(item: LessonItem, file?: File) {
    if (!file) return
    const id = `img-${item.id}`
    await db.media.put({ id, blob: await toWebp(file) })
    editItem(item.id, { imageId: id })
  }

  return (
    <Card className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[4rem_2fr_2fr_1fr_1fr_1.5fr]">
        <Field label={t('चित्र', 'Icon')}>
          <input className={inputCls} value={draft.emoji} onChange={(e) => edit({ emoji: e.target.value })} />
        </Field>
        <Field label={t('शीर्षक (हिंदी)', 'Title (Hindi)')}>
          <input className={inputCls} value={draft.titleHi} onChange={(e) => edit({ titleHi: e.target.value })} />
        </Field>
        <Field label={t('शीर्षक (अंग्रेज़ी)', 'Title (English)')}>
          <input className={inputCls} value={draft.titleEn} onChange={(e) => edit({ titleEn: e.target.value })} />
        </Field>
        <Field label={t('कक्षा', 'Grade')}>
          <select className={inputCls} value={draft.grade} onChange={(e) => edit({ grade: Number(e.target.value) as Grade })}>
            {[1, 2, 3].map((g) => <option key={g}>{g}</option>)}
          </select>
        </Field>
        <Field label={t('विषय', 'Subject')}>
          <select className={inputCls} value={draft.subject} onChange={(e) => edit({ subject: e.target.value as Subject })}>
            {(Object.keys(SUBJECTS) as Subject[]).map((s) => <option key={s} value={s}>{t(SUBJECTS[s].hi, SUBJECTS[s].en)}</option>)}
          </select>
        </Field>
        <Field label={t('FLN क्षेत्र', 'FLN area')}>
          <select className={inputCls} value={draft.outcome} onChange={(e) => edit({ outcome: e.target.value as Outcome })}>
            {(Object.keys(OUTCOMES) as Outcome[]).map((o) => <option key={o} value={o}>{t(OUTCOMES[o].hi, OUTCOMES[o].en)}</option>)}
          </select>
        </Field>
      </div>

      <ul className="space-y-2">
        {draft.items.map((it) => (
          <li key={it.id} className="grid items-center gap-2 rounded-xl border-2 border-cream-deep p-2 sm:grid-cols-[4.5rem_6rem_2fr_1.5fr_auto]">
            <span className="flex min-h-12 items-center justify-center gap-1 rounded-xl bg-cream-deep/60">
              {it.imageId ? <Pic item={it} /> : <input className="w-10 bg-transparent text-center text-2xl" aria-label={t('इमोजी', 'Emoji')} value={it.emoji ?? ''} onChange={(e) => editItem(it.id, { emoji: e.target.value })} />}
              <label className="flex size-10 cursor-pointer items-center justify-center rounded-lg hover:bg-saffron-soft" title={t('चित्र अपलोड करें', 'Upload a picture')}>
                <span aria-hidden>📷</span>
                <input type="file" accept="image/*" className="sr-only" aria-label={t('चित्र अपलोड करें', 'Upload a picture')} onChange={(e) => upload(it, e.target.files?.[0])} />
              </label>
            </span>
            <select className={inputCls} aria-label={t('प्रकार', 'Kind')} value={it.kind} onChange={(e) => editItem(it.id, { kind: e.target.value as LessonItem['kind'] })}>
              <option value="word">{t('शब्द', 'Word')}</option>
              <option value="sentence">{t('वाक्य', 'Sentence')}</option>
            </select>
            <input className={inputCls} aria-label={t('हिंदी', 'Hindi')} placeholder={t('हिंदी', 'Hindi')} value={it.hi} onChange={(e) => editItem(it.id, { hi: e.target.value })} />
            <input className={inputCls} aria-label="English" placeholder="English" value={it.en ?? ''} onChange={(e) => editItem(it.id, { en: e.target.value })} />
            <span className="flex flex-wrap items-center gap-1">
              {TRIBAL_LANGS.map((lang) => {
                const e = glossary?.get(`${lang}|${normHi(it.hi)}`)
                const state = e && (e.native || e.alt) ? (e.verified ? 'ok' : 'draft') : 'empty'
                return (
                  <button
                    key={lang}
                    type="button"
                    disabled={!it.hi.trim()}
                    onClick={() => setFixing({ lang, hi: it.hi })}
                    aria-label={`${LANGS[lang].en}: ${state}`}
                    className={cx(
                      'min-h-12 rounded-xl px-2 text-sm font-bold',
                      state === 'ok' ? 'bg-leaf-soft text-leaf-dark' : state === 'draft' ? 'bg-saffron-soft text-terra-dark' : 'bg-cream-deep text-ink-soft',
                    )}
                  >
                    {state === 'ok' ? '✓' : state === 'draft' ? '⚠' : '○'} {t(LANGS[lang].hi, LANGS[lang].en)}
                  </button>
                )
              })}
              <Btn variant="ghost" aria-label={`${t('हटाएँ', 'Delete')}: ${it.hi}`} onClick={() => edit({ items: draft.items.filter((i) => i.id !== it.id) })}>🗑</Btn>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-sm text-ink-soft">
        ✓ {t('सत्यापित', 'verified')} · ⚠ {t('जाँच बाकी', 'needs verification')} · ○ {t('अनुवाद नहीं है', 'no translation yet')} — {t('भाषा के बटन से अनुवाद और आवाज़ जोड़ें।', 'use a language button to add the translation and audio.')}
      </p>

      <div className="flex flex-wrap gap-2">
        <Btn variant="outline" onClick={() => edit({ items: [...draft.items, { id: `i-${uid()}`, kind: 'word', hi: '', emoji: '' }] })}>＋ {t('शब्द / वाक्य जोड़ें', 'Add word / sentence')}</Btn>
        <Btn variant="leaf" disabled={!dirty || !draft.titleHi.trim()} onClick={submit}>💾 {t('पाठ सहेजें', 'Save lesson')}</Btn>
        <Btn variant="ghost" className="ml-auto" onClick={() => confirm(`${lesson.titleHi} — ${t('हटाएँ?', 'delete?')}`) && remove('lessons', lesson.id)}>🗑 {t('पाठ हटाएँ', 'Delete lesson')}</Btn>
      </div>

      {fixing && <CorrectDialog lang={fixing.lang} hi={fixing.hi} author={author} onClose={() => setFixing(undefined)} />}
    </Card>
  )
}

export default function Content() {
  const t = useT()
  const { user } = useMe('admin')
  const lessons = useLiveQuery(allLessons)
  const [selected, setSelected] = useState<string>()
  if (!lessons) return null
  const lesson = lessons.find((l) => l.id === selected) ?? lessons[0]

  async function add() {
    const id = `l-${uid()}`
    const fresh: Lesson = { id, grade: 1, subject: 'hindi', outcome: 'vocab', emoji: '📘', titleHi: t('नया पाठ', 'New lesson'), titleEn: 'New lesson', items: [], order: Date.now(), custom: true }
    await save('lessons', id, fresh)
    setSelected(id)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">📚 {t('पाठ सामग्री', 'Lesson content')}</h1>
      <div className="flex flex-wrap gap-2">
        {lessons.map((l) => (
          <button
            key={l.id}
            type="button"
            aria-pressed={l.id === lesson?.id}
            onClick={() => setSelected(l.id)}
            className={cx('min-h-12 rounded-xl border-2 px-3 font-bold', l.id === lesson?.id ? 'border-terra bg-terra-soft text-terra-dark' : 'border-cream-deep bg-white')}
          >
            <span aria-hidden>{l.emoji}</span> {l.titleHi} <span className="text-sm font-normal text-ink-soft">· {l.grade}</span>
          </button>
        ))}
        <Btn variant="leaf" onClick={add}>＋ {t('नया पाठ', 'New lesson')}</Btn>
      </div>
      {lesson && <LessonEditor key={lesson.id} lesson={lesson} author={user?.name ?? 'admin'} />}
    </div>
  )
}
