import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { PrivateRecord } from '@/components/PrivateRecord'
import { Btn, Card, Chip, Field, inputCls } from '@/components/ui'
import { makePin } from '@/lib/crypto'
import { db, remove, save } from '@/lib/db'
import { useMe } from '@/lib/hooks'
import { uid } from '@/lib/lang'
import { useT } from '@/lib/store'
import type { User } from '@/lib/types'

const AVATARS = ['🐯', '🦚', '🐘', '🌺', '🐒', '🌙', '🦜', '🦋', '🐢', '🌻', '🐓', '🌸', '🦌', '🐝', '🌳', '🐠']

export default function Users() {
  const t = useT()
  const { session } = useMe('admin')
  const users = useLiveQuery(() => db.users.toArray())
  const classes = useLiveQuery(() => db.classes.toArray())
  const [teacher, setTeacher] = useState({ name: '', pin: '' })
  const [student, setStudent] = useState({ name: '', avatar: AVATARS[0], classId: '' })
  const [open, setOpen] = useState<string>()
  if (!users || !classes) return null

  const staff = users.filter((u) => u.role !== 'student')
  const classId = student.classId || classes[0]?.id

  async function addTeacher() {
    // The new teacher's PIN wraps the same data key, so they can read student records too.
    if (!session?.dataKey) return
    const id = `t-${uid()}`
    const user: User = { id, role: 'teacher', name: teacher.name.trim(), avatar: '👩‍🏫', ...(await makePin(teacher.pin, session.dataKey)) }
    await save('users', id, user)
    setTeacher({ name: '', pin: '' })
  }

  async function addStudent() {
    const id = `s-${uid()}`
    await save('users', id, { id, role: 'student', name: student.name.trim(), avatar: student.avatar, classId } satisfies User)
    setStudent({ ...student, name: '' })
  }

  const del = (u: User) => confirm(`${u.name} — ${t('हटाएँ?', 'delete?')}`) && remove('users', u.id)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">👥 {t('उपयोगकर्ता', 'Users')}</h1>

      <Card>
        <h2 className="mb-3 font-bold">{t('शिक्षक और एडमिन', 'Teachers and admins')}</h2>
        <ul className="mb-4 divide-y divide-cream-deep">
          {staff.map((u) => (
            <li key={u.id} className="flex items-center gap-3 py-2">
              <span className="text-3xl" aria-hidden>{u.avatar}</span>
              <span className="font-bold">{u.name}</span>
              <Chip>{u.role === 'admin' ? t('एडमिन', 'Admin') : t('शिक्षक', 'Teacher')}</Chip>
              {u.role === 'teacher' && staff.filter((s) => s.role === 'teacher').length > 1 && (
                <Btn variant="ghost" className="ml-auto" onClick={() => del(u)}>🗑 {t('हटाएँ', 'Delete')}</Btn>
              )}
            </li>
          ))}
        </ul>
        <form className="grid gap-2 sm:grid-cols-[2fr_1fr_auto] sm:items-end" onSubmit={(e) => (e.preventDefault(), void addTeacher())}>
          <Field label={t('नए शिक्षक का नाम', "New teacher's name")}>
            <input className={inputCls} value={teacher.name} onChange={(e) => setTeacher({ ...teacher, name: e.target.value })} />
          </Field>
          <Field label={t('4 अंकों का PIN', '4-digit PIN')}>
            <input className={inputCls} inputMode="numeric" maxLength={4} value={teacher.pin} onChange={(e) => setTeacher({ ...teacher, pin: e.target.value.replace(/\D/g, '') })} />
          </Field>
          <Btn type="submit" variant="leaf" disabled={!teacher.name.trim() || teacher.pin.length !== 4 || !session?.dataKey}>＋ {t('जोड़ें', 'Add')}</Btn>
        </form>
        {!session?.dataKey && <p className="mt-2"><Chip tone="warn">🔒 {t('शिक्षक जोड़ने के लिए PIN से लॉगिन करें', 'Log in with a PIN to add teachers')}</Chip></p>}
      </Card>

      <Card>
        <h2 className="mb-3 font-bold">{t('विद्यार्थी', 'Students')}</h2>
        {classes.map((c) => (
          <section key={c.id} className="mb-4">
            <h3 className="mb-1 font-bold text-ink-soft">{c.name}</h3>
            <ul className="divide-y divide-cream-deep">
              {users.filter((u) => u.classId === c.id).map((u) => (
                <li key={u.id} className="py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-3xl" aria-hidden>{u.avatar}</span>
                    <input
                      className={`${inputCls} max-w-48`}
                      aria-label={t('नाम', 'Name')}
                      defaultValue={u.name}
                      onBlur={(e) => e.target.value.trim() && e.target.value !== u.name && save('users', u.id, { ...u, name: e.target.value.trim() })}
                    />
                    <select className={`${inputCls} w-auto`} aria-label={t('कक्षा', 'Class')} value={u.classId} onChange={(e) => save('users', u.id, { ...u, classId: e.target.value })}>
                      {classes.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
                    </select>
                    <Btn variant="ghost" aria-expanded={open === u.id} onClick={() => setOpen(open === u.id ? undefined : u.id)}>🔐 {t('निजी जानकारी', 'Private details')}</Btn>
                    <Btn variant="ghost" className="ml-auto" onClick={() => del(u)} aria-label={`${t('हटाएँ', 'Delete')} ${u.name}`}>🗑</Btn>
                  </div>
                  {open === u.id && <div className="mt-2"><PrivateRecord studentId={u.id} dataKey={session?.dataKey} /></div>}
                </li>
              ))}
            </ul>
          </section>
        ))}
        <form className="grid gap-2 border-t border-cream-deep pt-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end" onSubmit={(e) => (e.preventDefault(), void addStudent())}>
          <Field label={t('नए विद्यार्थी का नाम', "New student's name")}>
            <input className={inputCls} value={student.name} onChange={(e) => setStudent({ ...student, name: e.target.value })} />
          </Field>
          <Field label={t('कक्षा', 'Class')}>
            <select className={inputCls} value={classId} onChange={(e) => setStudent({ ...student, classId: e.target.value })}>
              {classes.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
          </Field>
          <Btn type="submit" variant="leaf" disabled={!student.name.trim() || !classId}>＋ {t('जोड़ें', 'Add')}</Btn>
          <div className="flex flex-wrap gap-1 sm:col-span-3" role="radiogroup" aria-label={t('चित्र चुनें', 'Choose a picture')}>
            {AVATARS.map((a) => (
              <button key={a} type="button" role="radio" aria-checked={student.avatar === a} aria-label={a} onClick={() => setStudent({ ...student, avatar: a })} className={`size-12 rounded-xl border-2 text-2xl ${student.avatar === a ? 'border-terra bg-terra-soft' : 'border-cream-deep bg-white'}`}>
                {a}
              </button>
            ))}
          </div>
        </form>
      </Card>
    </div>
  )
}
