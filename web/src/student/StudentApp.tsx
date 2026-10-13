import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { cx } from '@/components/ui'
import { useLive } from '@/lib/channel'
import { useLearn } from '@/lib/hooks'
import { LANGS } from '@/lib/lang'
import { useOnline, usePrefs, useSessions } from '@/lib/store'
import AskDoubt from './AskDoubt'
import Home from './Home'
import LessonView from './LessonView'
import Listen from './Listen'
import Play from './Play'
import Practice from './Practice'
import Stars from './Stars'

const iconBtn = 'flex size-16 items-center justify-center rounded-2xl border-2 border-cream-deep bg-white text-3xl hover:bg-cream-deep'

export default function StudentApp() {
  const { user, cls } = useLearn()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const online = useOnline()
  const { showTribal, altScript, set } = usePrefs()
  const logout = useSessions((s) => s.logout)

  // The teacher can start a class quiz from any screen the child is on.
  useLive((msg) => {
    if (msg.type === 'quiz' && msg.classId === cls?.id) navigate(`/student/play?mode=quiz&lesson=${msg.lessonId}`)
  })

  if (!user || !cls) return null
  const info = LANGS[cls.lang]

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-2 border-b-4 border-leaf-soft bg-white p-2">
        {pathname !== '/student' && (
          <Link to="/student" aria-label="घर / Home" className={iconBtn}>🏠</Link>
        )}
        <span className="flex items-center gap-2 text-xl font-bold">
          <span className="text-4xl" aria-hidden>{user.avatar}</span>
          {user.name}
        </span>
        <span className="ml-auto flex items-center gap-2">
          <span aria-label={online ? 'Online' : 'Offline'} role="status" className={cx('size-4 rounded-full', online ? 'bg-leaf' : 'bg-saffron')} />
          <button
            type="button"
            className={cx(iconBtn, 'w-auto px-3 text-lg font-bold')}
            aria-pressed={showTribal}
            aria-label={`${info.en} / Hindi`}
            onClick={() => set({ showTribal: !showTribal })}
          >
            🗣 {showTribal ? info.hi : 'हिंदी'}
          </button>
          {info.altScript && showTribal && (
            <button type="button" className={iconBtn} aria-label={`Script: ${altScript ? info.altScript : info.nativeScript}`} aria-pressed={altScript} onClick={() => set({ altScript: !altScript })}>
              🔤
            </button>
          )}
          <button
            type="button"
            className={iconBtn}
            aria-label="बाहर / Log out"
            onClick={() => {
              logout('student')
              navigate('/login')
            }}
          >
            🚪
          </button>
        </span>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 p-3">
        <Routes>
          <Route index element={<Home />} />
          <Route path="listen" element={<Listen />} />
          <Route path="ask" element={<AskDoubt />} />
          <Route path="lesson" element={<LessonView />} />
          <Route path="play" element={<Play />} />
          <Route path="practice" element={<Practice />} />
          <Route path="stars" element={<Stars />} />
        </Routes>
      </main>
    </div>
  )
}
