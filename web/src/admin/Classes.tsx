import { useLiveQuery } from 'dexie-react-hooks'
import { Btn, Card, Field, inputCls } from '@/components/ui'
import { db, remove, save } from '@/lib/db'
import { LANGS, TRIBAL_LANGS, uid } from '@/lib/lang'
import { useT } from '@/lib/store'
import type { ClassRoom, Grade, TribalLang } from '@/lib/types'

export default function Classes() {
  const t = useT()
  const classes = useLiveQuery(() => db.classes.toArray())
  const users = useLiveQuery(() => db.users.toArray())
  if (!classes || !users) return null
  const teachers = users.filter((u) => u.role === 'teacher')
  const put = (c: ClassRoom) => save('classes', c.id, c)

  async function add() {
    const id = `c-${uid()}`
    await put({ id, name: t('नई कक्षा', 'New class'), grade: 1, lang: 'sat', teacherId: teachers[0]?.id ?? '' })
  }

  function del(c: ClassRoom) {
    const n = users!.filter((u) => u.classId === c.id).length
    if (n) return alert(t(`पहले इस कक्षा के ${n} विद्यार्थियों को दूसरी कक्षा में भेजें।`, `Move this class's ${n} students to another class first.`))
    if (confirm(`${c.name} — ${t('हटाएँ?', 'delete?')}`)) void remove('classes', c.id)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">🏫 {t('कक्षाएँ', 'Classrooms')}</h1>
      {classes.map((c) => (
        <Card key={c.id}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.5fr_auto] lg:items-end">
            <Field label={t('नाम', 'Name')}>
              <input className={inputCls} defaultValue={c.name} onBlur={(e) => e.target.value.trim() && put({ ...c, name: e.target.value.trim() })} />
            </Field>
            <Field label={t('कक्षा स्तर', 'Grade')}>
              <select className={inputCls} value={c.grade} onChange={(e) => put({ ...c, grade: Number(e.target.value) as Grade })}>
                {[1, 2, 3].map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
            <Field label={t('मातृभाषा', 'Mother tongue')}>
              <select className={inputCls} value={c.lang} onChange={(e) => put({ ...c, lang: e.target.value as TribalLang })}>
                {TRIBAL_LANGS.map((l) => <option key={l} value={l}>{t(LANGS[l].hi, LANGS[l].en)}</option>)}
              </select>
            </Field>
            <Field label={t('शिक्षक', 'Teacher')}>
              <select className={inputCls} value={c.teacherId} onChange={(e) => put({ ...c, teacherId: e.target.value })}>
                {teachers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </Field>
            <Btn variant="ghost" onClick={() => del(c)}>🗑 {t('हटाएँ', 'Delete')}</Btn>
          </div>
          <p className="mt-2 text-sm text-ink-soft">{users.filter((u) => u.classId === c.id).length} {t('विद्यार्थी', 'students')}</p>
        </Card>
      ))}
      <Btn variant="leaf" onClick={add}>＋ {t('कक्षा जोड़ें', 'Add classroom')}</Btn>
    </div>
  )
}
