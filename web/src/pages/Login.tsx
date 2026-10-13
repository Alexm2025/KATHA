import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Btn, Card, Chip, cx, LangToggle, Logo } from '@/components/ui'
import { unlockWithPin } from '@/lib/crypto'
import { db } from '@/lib/db'
import { DEMO_ADMIN_PIN, DEMO_TEACHER_PIN } from '@/lib/seed'
import { useSessions, useT } from '@/lib/store'
import type { Role, User } from '@/lib/types'

const ROLES: { role: Role; icon: string; hi: string; en: string }[] = [
  { role: 'teacher', icon: '👩‍🏫', hi: 'शिक्षक', en: 'Teacher' },
  { role: 'student', icon: '🧒', hi: 'विद्यार्थी', en: 'Student' },
  { role: 'admin', icon: '🏫', hi: 'एडमिन', en: 'Admin' },
]

function PinPad({ user, onBack }: { user: User; onBack: () => void }) {
  const t = useT()
  const navigate = useNavigate()
  const login = useSessions((s) => s.login)
  const [pin, setPin] = useState('')
  const [state, setState] = useState<'idle' | 'checking' | 'wrong'>('idle')

  async function press(d: string) {
    if (state === 'checking') return
    const next = (state === 'wrong' ? '' : pin) + d
    setState('idle')
    setPin(next)
    if (next.length < 4) return
    setState('checking')
    const dataKey = await unlockWithPin(next, user)
    if (!dataKey) {
      setState('wrong')
      setPin('')
      return
    }
    login({ userId: user.id, role: user.role, dataKey })
    navigate(`/${user.role}`)
  }

  return (
    <Card className="mx-auto max-w-sm text-center">
      <div className="text-5xl" aria-hidden>{user.avatar}</div>
      <h2 className="mt-1 text-xl font-bold">{user.name}</h2>
      <p className="mt-3 text-ink-soft">{t('अपना 4 अंकों का PIN डालें', 'Enter your 4-digit PIN')}</p>
      <div className="my-4 flex justify-center gap-3" aria-label={`${pin.length} / 4`} role="status">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cx('size-4 rounded-full border-2 border-terra', i < pin.length && 'bg-terra')} />
        ))}
      </div>
      {state === 'wrong' && <p className="mb-3 font-bold text-terra-dark" role="alert">{t('PIN गलत है, फिर कोशिश करें', 'Wrong PIN, try again')}</p>}
      <div className="grid grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <Btn key={d} variant="soft" className="min-h-16 text-2xl" onClick={() => press(d)}>{d}</Btn>
        ))}
        <Btn variant="ghost" className="min-h-16" onClick={onBack}>← {t('वापस', 'Back')}</Btn>
        <Btn variant="soft" className="min-h-16 text-2xl" onClick={() => press('0')}>0</Btn>
        <Btn variant="ghost" className="min-h-16" onClick={() => setPin(pin.slice(0, -1))} aria-label={t('मिटाएँ', 'Delete')}>⌫</Btn>
      </div>
      <p className="mt-4 text-sm text-ink-soft">
        {t('डेमो PIN', 'Demo PIN')}: {user.role === 'admin' ? DEMO_ADMIN_PIN : DEMO_TEACHER_PIN}
      </p>
    </Card>
  )
}

export default function Login() {
  const t = useT()
  const navigate = useNavigate()
  const login = useSessions((s) => s.login)
  const [role, setRole] = useState<Role>()
  const [classId, setClassId] = useState<string>()
  const [picked, setPicked] = useState<User>()
  const users = useLiveQuery(() => db.users.toArray())
  const classes = useLiveQuery(() => db.classes.toArray())

  const staff = users?.filter((u) => u.role === role) ?? []
  const pupils = users?.filter((u) => u.role === 'student' && u.classId === classId) ?? []

  return (
    <div className="sohrai-dots min-h-dvh">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link to="/" aria-label="KATHA home"><Logo /></Link>
        <LangToggle />
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-10">
        {picked ? (
          <PinPad user={picked} onBack={() => setPicked(undefined)} />
        ) : !role ? (
          <>
            <h1 className="mb-5 text-center text-3xl font-bold">{t('आप कौन हैं?', 'Who are you?')}</h1>
            <div className="grid gap-4 sm:grid-cols-3">
              {ROLES.map((r) => (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => setRole(r.role)}
                  className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-3xl border-2 border-cream-deep bg-white p-6 text-2xl font-bold shadow-sm hover:border-terra"
                >
                  <span className="text-7xl" aria-hidden>{r.icon}</span>
                  {t(r.hi, r.en)}
                </button>
              ))}
            </div>
            <p className="mt-6 text-center">
              <Link to="/demo" className="font-bold text-terra-dark underline">
                {t('बिना लॉगिन डेमो देखें', 'Try the demo without logging in')}
              </Link>
            </p>
          </>
        ) : (
          <>
            <Btn variant="ghost" className="mb-3" onClick={() => (classId ? setClassId(undefined) : setRole(undefined))}>
              ← {t('वापस', 'Back')}
            </Btn>
            {role !== 'student' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {staff.map((u) => (
                  <button key={u.id} type="button" onClick={() => setPicked(u)} className="flex min-h-24 items-center gap-4 rounded-2xl border-2 border-cream-deep bg-white p-4 text-left text-xl font-bold hover:border-terra">
                    <span className="text-5xl" aria-hidden>{u.avatar}</span>
                    {u.name}
                  </button>
                ))}
              </div>
            ) : !classId ? (
              // Students never type: pick the class, then tap their own picture.
              <div className="grid gap-4 sm:grid-cols-2">
                {classes?.map((c) => (
                  <button key={c.id} type="button" onClick={() => setClassId(c.id)} className="flex min-h-32 flex-col items-center justify-center rounded-3xl border-2 border-cream-deep bg-white text-2xl font-bold hover:border-leaf">
                    <span className="text-6xl" aria-hidden>{['', '1️⃣', '2️⃣', '3️⃣'][c.grade]}</span>
                    {c.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {pupils.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      login({ userId: u.id, role: 'student' })
                      navigate('/student')
                    }}
                    className="flex min-h-36 flex-col items-center justify-center rounded-3xl border-2 border-cream-deep bg-white text-xl font-bold hover:border-leaf"
                  >
                    <span className="text-6xl" aria-hidden>{u.avatar}</span>
                    {u.name}
                  </button>
                ))}
              </div>
            )}
            {role !== 'student' && <p className="mt-4"><Chip>{t('PIN इसी टैबलेट पर सुरक्षित रहता है', 'PINs are checked on this tablet only')}</Chip></p>}
          </>
        )}
      </main>
    </div>
  )
}
