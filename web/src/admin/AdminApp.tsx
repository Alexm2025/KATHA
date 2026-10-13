import { Route, Routes } from 'react-router-dom'
import { Shell, type NavItem } from '@/components/Shell'
import AdminReports from './AdminReports'
import Classes from './Classes'
import Content from './Content'
import Packs from './Packs'
import Settings from './Settings'
import Users from './Users'

const NAV: NavItem[] = [
  { to: '/admin', icon: '⚙️', hi: 'सिस्टम', en: 'System' },
  { to: '/admin/users', icon: '👥', hi: 'उपयोगकर्ता', en: 'Users' },
  { to: '/admin/classes', icon: '🏫', hi: 'कक्षाएँ', en: 'Classrooms' },
  { to: '/admin/content', icon: '📚', hi: 'पाठ सामग्री', en: 'Content' },
  { to: '/admin/packs', icon: '🗂', hi: 'भाषा पैक', en: 'Language packs' },
  { to: '/admin/reports', icon: '📊', hi: 'रिपोर्ट', en: 'Reports' },
]

export default function AdminApp() {
  return (
    <Shell role="admin" nav={NAV}>
      <Routes>
        <Route index element={<Settings />} />
        <Route path="users" element={<Users />} />
        <Route path="classes" element={<Classes />} />
        <Route path="content" element={<Content />} />
        <Route path="packs" element={<Packs />} />
        <Route path="reports" element={<AdminReports />} />
      </Routes>
    </Shell>
  )
}
