import { db, getMeta, setMeta } from './db'
import { API_URL } from './providers/types'
import { isOnline } from './store'
import type { CorrectionLog, GlossaryEntry, SyncItem } from './types'

interface PullResult {
  corrections: CorrectionLog[]
}

interface SyncServer {
  name: string
  push(items: SyncItem[]): Promise<void>
  pull(since: number): Promise<PullResult>
}

/** Talks to the FastAPI server (`/sync/push`, `/sync/pull`). */
const httpServer: SyncServer = {
  name: 'server',
  async push(items) {
    const res = await fetch(`${API_URL}/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    if (!res.ok) throw new Error(`push ${res.status}`)
  },
  async pull(since) {
    const res = await fetch(`${API_URL}/sync/pull?since=${since}`)
    if (!res.ok) throw new Error(`pull ${res.status}`)
    return res.json()
  },
}

// In-browser stand-in used when no VITE_API_URL is set: keeps the pushed rows in
// localStorage so the whole queue → push → pull cycle can be demonstrated without a backend.
const mockServer: SyncServer = {
  name: 'mock',
  async push(items) {
    await new Promise((r) => setTimeout(r, 400))
    const store: Record<string, unknown> = JSON.parse(localStorage.getItem('katha.mockServer') ?? '{}')
    for (const it of items) {
      const k = `${it.table}/${it.key}`
      if (it.op === 'delete') delete store[k]
      else store[k] = it.payload
    }
    localStorage.setItem('katha.mockServer', JSON.stringify(store))
  },
  async pull() {
    const store: Record<string, unknown> = JSON.parse(localStorage.getItem('katha.mockServer') ?? '{}')
    const corrections = Object.entries(store)
      .filter(([k]) => k.startsWith('corrections/'))
      .map(([, v]) => v as CorrectionLog)
    return { corrections }
  },
}

export const syncServer = API_URL ? httpServer : mockServer

/**
 * Merge rule for glossary corrections: every correction is kept in the log with its
 * author and timestamp; the glossary shows the newest one. Everything else is last-write-wins.
 */
export async function mergeCorrections(incoming: CorrectionLog[]) {
  if (!incoming.length) return 0
  let added = 0
  await db.transaction('rw', db.corrections, db.glossary, async () => {
    for (const c of incoming) {
      if (await db.corrections.get(c.id)) continue
      await db.corrections.put(c)
      added++
      const id = `${c.lang}|${c.hiNorm}`
      const cur = await db.glossary.get(id)
      if (cur && cur.source === 'correction' && cur.updatedAt >= c.at) continue
      const entry: GlossaryEntry = {
        id,
        lang: c.lang,
        hiNorm: c.hiNorm,
        hi: c.hi,
        native: c.native,
        alt: c.alt,
        verified: true,
        source: 'correction',
        author: c.author,
        updatedAt: c.at,
      }
      await db.glossary.put(entry)
    }
  })
  return added
}

export interface SyncReport {
  ok: boolean
  pushed: number
  pulled: number
  reason?: 'offline' | 'error'
}

let running: Promise<SyncReport> | null = null

export function syncNow(): Promise<SyncReport> {
  running ??= run().finally(() => (running = null))
  return running
}

async function run(): Promise<SyncReport> {
  if (!isOnline()) return { ok: false, pushed: 0, pulled: 0, reason: 'offline' }
  try {
    const pending = await db.syncQueue.where('status').equals('pending').sortBy('at')
    if (pending.length) {
      await syncServer.push(pending)
      await db.syncQueue.bulkDelete(pending.map((p) => p.id!))
    }
    const since = (await getMeta<number>('lastSync')) ?? 0
    const pulled = await mergeCorrections((await syncServer.pull(since)).corrections)
    await setMeta('lastSync', Date.now())
    return { ok: true, pushed: pending.length, pulled }
  } catch {
    return { ok: false, pushed: 0, pulled: 0, reason: 'error' }
  }
}

/** Push whenever the network comes back, and once a minute while it is up. */
export function startAutoSync() {
  const tick = () => void syncNow()
  window.addEventListener('online', tick)
  const timer = setInterval(tick, 60_000)
  tick()
  return () => {
    window.removeEventListener('online', tick)
    clearInterval(timer)
  }
}
