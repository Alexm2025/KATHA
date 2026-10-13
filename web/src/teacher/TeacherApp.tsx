import { useLiveQuery } from 'dexie-react-hooks'
import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Shell, type NavItem } from '@/components/Shell'
import { db } from '@/lib/db'
import { useTeach } from '@/lib/hooks'
import Dashboard from './Dashboard'
import Doubts from './Doubts'
import Evaluate from './Evaluate'
import LiveTeach from './LiveTeach'
import Materials from './Materials'

// Charts pull in Recharts; keep it out of the classroom path.
const Reports = lazy(() => import('./Reports'))

export default function TeacherApp() {
  const { cls } = useTeach()
  const newDoubts = useLiveQuery(
    async () => (cls ? (await db.doubts.where('classId').equals(cls.id).toArray()).filter((d) => d.status === 'new').length : 0),
    [cls?.id],
  )
  const nav: NavItem[] = [
    { to: '/teacher', icon: '🏠', hi: 'डैशबोर्ड', en: 'Dashboard' },
    { to: '/teacher/live', icon: '🎙', hi: 'लाइव पढ़ाएँ', en: 'Live Teach' },
    { to: '/teacher/doubts', icon: '🙋', hi: 'सवाल', en: 'Doubts', badge: newDoubts },
    { to: '/teacher/evaluate', icon: '✅', hi: 'मूल्यांकन', en: 'Evaluate' },
    { to: '/teacher/materials', icon: '🧾', hi: 'वर्कशीट', en: 'Worksheets' },
    { to: '/teacher/reports', icon: '📊', hi: 'प्रगति', en: 'Progress' },
  ]
  return (
    <Shell role="teacher" nav={nav}>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="live" element={<LiveTeach />} />
        <Route path="doubts" element={<Doubts />} />
        <Route path="evaluate" element={<Evaluate />} />
        <Route path="materials" element={<Materials />} />
        <Route path="reports" element={<Reports />} />
      </Routes>
    </Shell>
  )
}
