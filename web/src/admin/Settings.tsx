import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Btn, Card, Chip } from '@/components/ui'
import { db, getMeta } from '@/lib/db'
import { API_URL } from '@/lib/providers'
import { resetAll } from '@/lib/seed'
import { useOnline, usePrefs, useT } from '@/lib/store'
import { syncNow, syncServer, type SyncReport } from '@/lib/sync'

const mb = (n?: number) => (n === undefined ? '–' : `${(n / 1_048_576).toFixed(1)} MB`)

export default function Settings() {
  const t = useT()
  const online = useOnline()
  const { offlineMode, set } = usePrefs()
  const lastSync = useLiveQuery(() => getMeta<number>('lastSync'))
  const pending = useLiveQuery(() => db.syncQueue.where('status').equals('pending').count())
  const [report, setReport] = useState<SyncReport>()
  const [busy, setBusy] = useState(false)
  const [storage, setStorage] = useState<StorageEstimate>()

  useEffect(() => {
    void navigator.storage?.estimate().then(setStorage)
  }, [pending])

  async function sync() {
    setBusy(true)
    setReport(await syncNow())
    setBusy(false)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">⚙️ {t('सिस्टम सेटिंग', 'System settings')}</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="font-bold">📴 {t('ऑफ़लाइन मोड', 'Offline mode')}</h2>
          <p className="text-sm text-ink-soft">
            {t(
              'चालू होने पर ऐप नेटवर्क का उपयोग नहीं करता: सिंक रुक जाता है और केवल ऑफ़लाइन शब्दकोश व रिकॉर्ड की गई आवाज़ चलती है।',
              'When on, the app makes no network calls: sync pauses and only the offline glossary and recorded audio are used.',
            )}
          </p>
          <Btn variant={offlineMode ? 'primary' : 'outline'} aria-pressed={offlineMode} onClick={() => set({ offlineMode: !offlineMode })}>
            {offlineMode ? `✓ ${t('ऑफ़लाइन मोड चालू है', 'Offline mode is ON')}` : t('ऑफ़लाइन मोड चालू करें', 'Turn offline mode on')}
          </Btn>
          <p><Chip tone={online ? 'good' : 'warn'}>{online ? t('अभी ऑनलाइन', 'Currently online') : t('अभी ऑफ़लाइन', 'Currently offline')}</Chip></p>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-bold">🔄 {t('सिंक', 'Sync')}</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt className="text-ink-soft">{t('पिछला सिंक', 'Last synced')}</dt>
            <dd>{lastSync ? new Date(lastSync).toLocaleString() : t('कभी नहीं', 'never')}</dd>
            <dt className="text-ink-soft">{t('कतार में', 'In the queue')}</dt>
            <dd>{pending ?? 0}</dd>
            <dt className="text-ink-soft">{t('सर्वर', 'Server')}</dt>
            <dd>{API_URL || t('नकली सर्वर (इसी ब्राउज़र में)', 'mock server (in this browser)')} <Chip>{syncServer.name}</Chip></dd>
          </dl>
          <Btn onClick={sync} disabled={busy}>{busy ? '…' : `🔄 ${t('अभी सिंक करें', 'Sync now')}`}</Btn>
          {report && (
            <p role="status">
              {report.ok ? (
                <Chip tone="good">✓ {report.pushed} {t('भेजे', 'pushed')} · {report.pulled} {t('मिले', 'pulled')}</Chip>
              ) : (
                <Chip tone="warn">{report.reason === 'offline' ? t('ऑफ़लाइन — बदलाव कतार में सुरक्षित हैं', 'Offline — changes are safe in the queue') : t('सिंक नहीं हो सका', 'Sync failed')}</Chip>
              )}
            </p>
          )}
        </Card>

        <Card className="space-y-2">
          <h2 className="font-bold">💾 {t('स्टोरेज', 'Storage')}</h2>
          <p className="text-2xl font-bold">{mb(storage?.usage)}</p>
          <p className="text-sm text-ink-soft">{t('उपलब्ध', 'Available')}: {mb(storage?.quota)}</p>
        </Card>

        <Card className="space-y-2">
          <h2 className="font-bold">🧹 {t('डेमो डेटा रीसेट', 'Reset demo data')}</h2>
          <p className="text-sm text-ink-soft">{t('इस टैबलेट का सारा डेटा मिटाकर शुरुआती नमूना डेटा वापस लाता है।', 'Erases everything on this tablet and reloads the seed data.')}</p>
          <Btn variant="outline" onClick={() => confirm(t('सारा स्थानीय डेटा मिट जाएगा। जारी रखें?', 'All local data will be erased. Continue?')) && resetAll()}>
            {t('रीसेट करें', 'Reset')}
          </Btn>
        </Card>
      </div>
    </div>
  )
}
