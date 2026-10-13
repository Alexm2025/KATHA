import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { Card, Chip, cx, Empty } from '@/components/ui'
import { post } from '@/lib/channel'
import { db, save, setMeta } from '@/lib/db'
import { useTeach } from '@/lib/hooks'
import { LANGS, SUBJECTS, TRIBAL_LANGS } from '@/lib/lang'
import { usePrefs, useT } from '@/lib/store'
import type { Subject } from '@/lib/types'

const pick = (on: boolean) =>
  cx(
    'flex min-h-14 items-center gap-2 rounded-2xl border-2 px-4 text-lg font-bold',
    on ? 'border-terra bg-terra-soft text-terra-dark' : 'border-cream-deep bg-white hover:border-terra',
  )

export default function Dashboard() {
  const t = useT()
  const { user, classes, cls, lessons, lesson, students, subject } = useTeach()
  const setTeach = usePrefs((s) => s.setTeach)
  const newDoubts = useLiveQuery(
    async () => (cls ? (await db.doubts.where('classId').equals(cls.id).toArray()).filter((d) => d.status === 'new').length : 0),
    [cls?.id],
  )
  if (!cls || !lessons) return null

  const subj: Subject = subject ?? 'hindi'
  const options = lessons.filter((l) => l.grade === cls.grade && l.subject === subj)

  async function chooseLesson(lessonId: string) {
    setTeach({ lessonId })
    // Tell the class's tablets which lesson is open.
    await setMeta(`current:${cls!.id}`, lessonId)
    post({ type: 'lesson', classId: cls!.id, lessonId })
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">
        {t('नमस्ते', 'Hello')}, {user?.name} 🙏
      </h1>

      <Card>
        <h2 className="mb-2 font-bold text-ink-soft">1 · {t('कक्षा', 'Class')}</h2>
        <div className="flex flex-wrap gap-2">
          {classes?.map((c) => (
            <button key={c.id} type="button" aria-pressed={c.id === cls.id} className={pick(c.id === cls.id)} onClick={() => setTeach({ classId: c.id, lessonId: undefined })}>
              🏫 {c.name}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-ink-soft">
          {students?.length ?? 0} {t('विद्यार्थी', 'students')}
          {!!newDoubts && <> · <Link className="font-bold text-terra-dark underline" to="/teacher/doubts">{newDoubts} {t('नए सवाल', 'new doubts')}</Link></>}
        </p>
      </Card>

      <Card>
        <h2 className="mb-2 font-bold text-ink-soft">2 · {t('बच्चों की मातृभाषा', "Children's mother tongue")}</h2>
        <div className="flex flex-wrap gap-2">
          {TRIBAL_LANGS.map((l) => (
            <button key={l} type="button" aria-pressed={cls.lang === l} className={pick(cls.lang === l)} onClick={() => save('classes', cls.id, { ...cls, lang: l })}>
              {t(LANGS[l].hi, LANGS[l].en)}
              <span className="text-sm font-normal text-ink-soft">{LANGS[l].nativeScript}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 font-bold text-ink-soft">3 · {t('विषय', 'Subject')}</h2>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SUBJECTS) as Subject[]).map((s) => (
            <button key={s} type="button" aria-pressed={subj === s} className={pick(subj === s)} onClick={() => setTeach({ subject: s })}>
              <span aria-hidden>{SUBJECTS[s].emoji}</span> {t(SUBJECTS[s].hi, SUBJECTS[s].en)}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 font-bold text-ink-soft">4 · {t('पाठ', 'Lesson')}</h2>
        {options.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {options.map((l) => (
              <button key={l.id} type="button" aria-pressed={lesson?.id === l.id} className={pick(lesson?.id === l.id)} onClick={() => chooseLesson(l.id)}>
                <span className="text-3xl" aria-hidden>{l.emoji}</span>
                <span className="text-left">
                  {l.titleHi}
                  <span className="block text-sm font-normal text-ink-soft">{l.titleEn}</span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <Empty>{t('इस कक्षा और विषय के लिए अभी कोई पाठ नहीं है। एडमिन पाठ जोड़ सकते हैं।', 'No lesson for this class and subject yet. An admin can add one.')}</Empty>
        )}
      </Card>

      {lesson ? (
        <Link to="/teacher/live" className="flex min-h-20 items-center justify-center gap-3 rounded-2xl bg-terra text-2xl font-bold text-white hover:bg-terra-dark">
          🎙 {t('पढ़ाना शुरू करें', 'Start Live Teach')}
        </Link>
      ) : (
        <p><Chip tone="warn">{t('पढ़ाने के लिए एक पाठ चुनें', 'Choose a lesson to start teaching')}</Chip></p>
      )}
    </div>
  )
}
