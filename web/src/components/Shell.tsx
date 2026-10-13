import { useLiveQuery } from 'dexie-react-hooks'
import type { ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { db, getMeta } from '@/lib/db'
import { useOnline, useSessions, useT } from '@/lib/store'
import type { Role } from '@/lib/types'
import { Btn, Chip, cx, LangToggle, Logo } from './ui'

export function OnlineBadge() {
  const t = useT()
  const online = useOnline()
  const lastSync = useLiveQuery(() => getMeta<number>('lastSync'))
  const pending = useLiveQuery(() => db.syncQueue.where('status').equals('pending').count())
  const when = lastSync
    ? new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : t('कभी नहीं', 'never')
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5" role="status">
      <Chip tone={online ? 'good' : 'warn'}>{online ? `● ${t('ऑनलाइन', 'Online')}` : `○ ${t('ऑफ़लाइन', 'Offline')}`}</Chip>
      <span className="text-xs text-ink-soft">
        {t('सिंक', 'Synced')}: {when}
        {pending ? ` · ${pending} ${t('बाकी', 'queued')}` : ''}
      </span>
    </span>
  )
}

export interface NavItem {
  to: string
  icon: string
  hi: string
  en: string
  badge?: number
}

/** Header + navigation shared by the teacher and admin apps. */
export function Shell({ role, nav, children }: { role: Role; nav: NavItem[]; children: ReactNode }) {
  const t = useT()
  const navigate = useNavigate()
  const { logout, demo } = useSessions()
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="no-print border-b border-cream-deep bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2">
          <Link to="/" aria-label="KATHA home">
            <Logo small />
          </Link>
          <OnlineBadge />
          <span className="ml-auto flex items-center gap-2">
            {demo && <Chip tone="warn">{t('डेमो', 'Demo')}</Chip>}
            <LangToggle />
            <Btn
              variant="ghost"
              onClick={() => {
                logout(role)
                navigate('/login')
              }}
            >
              {t('बाहर', 'Log out')}
            </Btn>
          </span>
        </div>
        <nav aria-label="Sections" className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 pb-2">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end
              className={({ isActive }) =>
                cx(
                  'flex min-h-12 shrink-0 items-center gap-2 rounded-xl px-3 font-bold',
                  isActive ? 'bg-terra text-white' : 'text-ink hover:bg-cream-deep',
                )
              }
            >
              <span aria-hidden>{n.icon}</span>
              {t(n.hi, n.en)}
              {!!n.badge && (
                <span className="rounded-full bg-saffron px-2 text-sm text-ink">{n.badge}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sohrai-band" aria-hidden />
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 p-3 sm:p-4">{children}</main>
    </div>
  )
}
