import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Role, Subject } from './types'

/** Path the app is served under, without a trailing slash ('' at the domain root). */
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

interface Prefs {
  uiLang: 'hi' | 'en'
  /** Show the alternate script (Latin for Santali, Devanagari for Ho). */
  altScript: boolean
  /** Student screens: show the mother tongue first (off = Hindi only). */
  showTribal: boolean
  /** Admin switch: behave as if there were no network at all. */
  offlineMode: boolean
  /** Teacher has agreed to Chrome's online speech recognition (audio leaves the device). */
  onlineAsr: boolean
  teach: { classId?: string; subject?: Subject; lessonId?: string }
  set: (p: Partial<Omit<Prefs, 'set' | 'setTeach'>>) => void
  setTeach: (t: Partial<Prefs['teach']>) => void
}

export const usePrefs = create<Prefs>()(
  persist(
    (set) => ({
      uiLang: 'hi',
      altScript: false,
      showTribal: true,
      offlineMode: false,
      onlineAsr: false,
      teach: {},
      set: (p) => set(p),
      setTeach: (t) => set((s) => ({ teach: { ...s.teach, ...t } })),
    }),
    { name: 'katha.prefs' },
  ),
)

export interface Session {
  userId: string
  role: Role
  /** Unlocked data key; only present after a PIN login. Lives for the tab only. */
  dataKey?: string
}

interface Sessions {
  // One slot per role so the split-screen demo can hold a teacher and a student at once.
  sessions: Partial<Record<Role, Session>>
  demo: boolean
  login: (s: Session) => void
  logout: (role: Role) => void
  setDemo: (demo: boolean) => void
}

export const useSessions = create<Sessions>()(
  persist(
    (set) => ({
      sessions: {},
      demo: false,
      login: (s) => set((st) => ({ sessions: { ...st.sessions, [s.role]: s } })),
      logout: (role) => set((st) => ({ sessions: { ...st.sessions, [role]: undefined } })),
      setDemo: (demo) => set({ demo }),
    }),
    { name: 'katha.sessions', storage: createJSONStorage(() => sessionStorage) },
  ),
)

/** Bilingual UI copy helper: `t('नमस्ते', 'Hello')`. Hindi is the default. */
export function useT() {
  const uiLang = usePrefs((s) => s.uiLang)
  return (hi: string, en: string) => (uiLang === 'hi' ? hi : en)
}

export function useOnline() {
  const offlineMode = usePrefs((s) => s.offlineMode)
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return online && !offlineMode
}

export const isOnline = () => navigator.onLine && !usePrefs.getState().offlineMode
