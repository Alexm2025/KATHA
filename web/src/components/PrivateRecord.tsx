import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { decryptJson, encryptJson } from '@/lib/crypto'
import { db, save } from '@/lib/db'
import { useT } from '@/lib/store'
import type { StudentPrivate } from '@/lib/types'
import { Btn, Chip, Field, inputCls } from './ui'

/** Guardian and notes for one student: decrypted only with a PIN-unlocked data key. */
export function PrivateRecord({ studentId, dataKey }: { studentId: string; dataKey?: string }) {
  const t = useT()
  const record = useLiveQuery(async () => (await db.records.get(studentId)) ?? null, [studentId])
  const [value, setValue] = useState<StudentPrivate>()
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!dataKey || record === undefined) return
    if (!record) return setValue({ guardian: '', notes: '' })
    decryptJson<StudentPrivate>(dataKey, record).then(setValue, () => setValue(undefined))
  }, [record, dataKey])

  if (!dataKey) return <Chip>🔒 {t('निजी जानकारी देखने के लिए PIN से लॉगिन करें', 'Log in with a PIN to see private details')}</Chip>
  if (!value) return null

  async function submit() {
    const box = await encryptJson(dataKey!, value)
    await save('records', studentId, { studentId, ...box })
    setSaved(true)
  }

  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
      <Field label={t('अभिभावक', 'Guardian')}>
        <input className={inputCls} value={value.guardian} onChange={(e) => (setSaved(false), setValue({ ...value, guardian: e.target.value }))} />
      </Field>
      <Field label={t('शिक्षक की टिप्पणी', "Teacher's notes")}>
        <input className={inputCls} value={value.notes} onChange={(e) => (setSaved(false), setValue({ ...value, notes: e.target.value }))} />
      </Field>
      <Btn variant="outline" onClick={submit}>{saved ? `✓ ${t('सहेजा', 'Saved')}` : `🔐 ${t('सहेजें', 'Save')}`}</Btn>
    </div>
  )
}
