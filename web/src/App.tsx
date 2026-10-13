import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ensureSeed } from './lib/seed'
import { useSessions } from './lib/store'
import { startAutoSync } from './lib/sync'
import type { Role } from './lib/types'
import Landing from './pages/Landing'

// Each role app is its own chunk so a student tablet never downloads the admin screens.
const Login = lazy(() => import('./pages/Login'))
const Demo = lazy(() => import('./pages/Demo'))
const TeacherApp = lazy(() => import('./teacher/TeacherApp'))
const StudentApp = lazy(() => import('./student/StudentApp'))
const AdminApp = lazy(() => import('./admin/AdminApp'))

const Loading = () => (
  <div className="flex min-h-dvh items-center justify-center text-4xl" role="status" aria-label="Loading">
    <span className="animate-pulse">📖</span>
  </div>
)

/** Everything behind the landing page needs the local database seeded first. */
function Ready({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    void ensureSeed().then(() => setReady(true))
  }, [])
  return ready ? <Suspense fallback={<Loading />}>{children}</Suspense> : <Loading />
}

function Guard({ role, children }: { role: Role; children: ReactNode }) {
  const session = useSessions((s) => s.sessions[role])
  return session ? <Ready>{children}</Ready> : <Navigate to="/login" replace />
}

export default function App() {
  useEffect(() => startAutoSync(), [])
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Ready><Login /></Ready>} />
        <Route path="/demo" element={<Ready><Demo /></Ready>} />
        <Route path="/teacher/*" element={<Guard role="teacher"><TeacherApp /></Guard>} />
        <Route path="/student/*" element={<Guard role="student"><StudentApp /></Guard>} />
        <Route path="/admin/*" element={<Guard role="admin"><AdminApp /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
