import { useEffect, useState } from 'react'
import { CorrectDialog } from '@/components/CorrectDialog'
import { Btn, Card, Chip, cx, Empty, entryFor, Pic, ScriptToggle, TribalText, useClips, useGlossary } from '@/components/ui'
import { download } from '@/lib/glossary'
import { useTeach } from '@/lib/hooks'
import { LANGS, normHi, TRIBAL_LANGS } from '@/lib/lang'
import { renderWorksheet, worksheetPdf } from '@/lib/pdf'
import { tts } from '@/lib/providers'
import { usePrefs, useT } from '@/lib/store'
import type { LessonItem, TribalLang } from '@/lib/types'

const pick = (on: boolean) =>
  cx('min-h-12 rounded-xl border-2 px-3 font-bold', on ? 'border-terra bg-terra-soft text-terra-dark' : 'border-cream-deep bg-white')

/** Worksheet and flashcard generator: pick lesson + language → preview → PDF / print. */
export default function Materials() {
  const t = useT()
  const { user, cls, lessons, lesson: current } = useTeach()
  const altScript = usePrefs((s) => s.altScript)
  const [lessonId, setLessonId] = useState<string>()
  const [langPick, setLangPick] = useState<TribalLang>()
  const [pages, setPages] = useState<HTMLCanvasElement[]>([])
  const [fixing, setFixing] = useState<LessonItem>()
  const lang = langPick ?? cls?.lang ?? 'sat'
  const lesson = lessons?.find((l) => l.id === lessonId) ?? current ?? lessons?.[0]
  const glossary = useGlossary(lang)
  const clips = useClips(lang)

  // Re-draw the preview whenever the lesson, language, script or glossary changes.
  useEffect(() => {
    if (!lesson || !glossary) return
    let stale = false
    void renderWorksheet({ lesson, lang, glossary, useAlt: altScript, className: cls?.name }).then((p) => !stale && setPages(p))
    return () => {
      stale = true
    }
  }, [lesson, lang, glossary, altScript, cls?.name])

  if (!lessons || !glossary) return null
  if (!lesson) return <Empty>{t('कोई पाठ नहीं है।', 'There are no lessons yet.')}</Empty>

  async function savePdf() {
    const bytes = await worksheetPdf({ lesson: lesson!, lang, glossary: glossary!, useAlt: altScript }, pages)
    download(`katha-${lesson!.id}-${lang}.pdf`, bytes, 'application/pdf')
  }

  const words = lesson.items.filter((i) => i.kind === 'word')

  return (
    <div className="space-y-4">
      <Card className="no-print space-y-3">
        <h1 className="text-2xl font-bold">🧾 {t('वर्कशीट और फ़्लैशकार्ड', 'Worksheets & flashcards')}</h1>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('पाठ', 'Lesson')}>
          {lessons.map((l) => (
            <button key={l.id} type="button" aria-pressed={l.id === lesson.id} className={pick(l.id === lesson.id)} onClick={() => setLessonId(l.id)}>
              <span aria-hidden>{l.emoji}</span> {l.titleHi}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('भाषा', 'Language')}>
          {TRIBAL_LANGS.map((l) => (
            <button key={l} type="button" aria-pressed={l === lang} className={pick(l === lang)} onClick={() => setLangPick(l)}>
              {t(LANGS[l].hi, LANGS[l].en)}
            </button>
          ))}
          <ScriptToggle lang={lang} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={savePdf} disabled={!pages.length}>⬇ {t('PDF डाउनलोड करें', 'Download PDF')}</Btn>
          <Btn variant="outline" onClick={() => window.print()} disabled={!pages.length}>🖨 {t('प्रिंट करें', 'Print')}</Btn>
        </div>
      </Card>

      <section aria-label={t('वर्कशीट की झलक', 'Worksheet preview')} className="grid gap-3 md:grid-cols-2 print:block">
        {pages.map((p, i) => (
          <img key={i} src={p.toDataURL('image/jpeg', 0.85)} alt={`${t('वर्कशीट पृष्ठ', 'Worksheet page')} ${i + 1}`} className="w-full rounded-xl border border-cream-deep shadow-sm print:break-after-page print:rounded-none print:border-0 print:shadow-none" />
        ))}
      </section>

      <Card className="no-print">
        <h2 className="mb-3 text-xl font-bold">🃏 {t('फ़्लैशकार्ड', 'Flashcards')}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {words.map((it) => {
            const e = entryFor(glossary, it.hi)
            const hasClip = !!clips?.has(`${lang}|${normHi(it.hi)}`)
            return (
              <li key={it.id} className="flex flex-col items-center gap-2 rounded-2xl border-2 border-cream-deep p-3 text-center">
                <Pic item={it} lang={lang} className="text-5xl" />
                <p className="text-2xl font-bold">{it.hi}</p>
                <TribalText lang={lang} native={e?.native} alt={e?.alt} verified={!!e?.verified} className="text-2xl text-leaf-dark" />
                <div className="flex flex-wrap justify-center gap-2">
                  <Btn variant="soft" onClick={() => tts.speak(it.hi, 'hi')}>🔊 {t('हिंदी', 'Hindi')}</Btn>
                  {hasClip ? (
                    <Btn variant="soft" onClick={() => tts.speak(e?.native || e?.alt || '', lang, it.hi)}>🔊 {t(LANGS[lang].hi, LANGS[lang].en)}</Btn>
                  ) : (
                    <Chip>🔇 {t('आवाज़ बाकी', 'audio pending')}</Chip>
                  )}
                  <Btn variant="outline" onClick={() => setFixing(it)} aria-label={`${t('सुधारें', 'Correct')}: ${it.hi}`}>✏️</Btn>
                </div>
              </li>
            )
          })}
        </ul>
      </Card>

      {fixing && <CorrectDialog lang={lang} hi={fixing.hi} author={user?.name ?? 'teacher'} onClose={() => setFixing(undefined)} />}
    </div>
  )
}
