// PIN login and at-rest encryption of student records, all with Web Crypto.
//
// One random AES-GCM data key protects the records. Each teacher/admin holds a copy of
// it wrapped with a key derived from their PIN (PBKDF2), so no PIN, no records.

const enc = new TextEncoder()
const dec = new TextDecoder()

export const toB64 = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer)))
export const fromB64 = (s: string) =>
  Uint8Array.from(atob(s), (c) => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>

const random = (n: number) => crypto.getRandomValues(new Uint8Array(n))

/** PBKDF2 → 512 bits: first half is the stored verifier, second half wraps the data key. */
async function derive(pin: string, salt: Uint8Array<ArrayBuffer>) {
  const base = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 },
    base,
    512,
  )
  const kek = await crypto.subtle.importKey('raw', bits.slice(32), 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ])
  return { verifier: toB64(bits.slice(0, 32)), kek }
}

export const newDataKey = () => toB64(random(32))

export interface PinFields {
  salt: string
  pinHash: string
  wrappedKey: string
  wrapIv: string
}

/** Fields to store on a user so `pin` can later unlock `dataKey`. */
export async function makePin(pin: string, dataKey: string): Promise<PinFields> {
  const salt = random(16)
  const iv = random(12)
  const { verifier, kek } = await derive(pin, salt)
  const wrapped = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, kek, fromB64(dataKey))
  return { salt: toB64(salt), pinHash: verifier, wrappedKey: toB64(wrapped), wrapIv: toB64(iv) }
}

/** Returns the data key if the PIN is right, otherwise null. */
export async function unlockWithPin(pin: string, f: Partial<PinFields>): Promise<string | null> {
  if (!f.salt || !f.pinHash || !f.wrappedKey || !f.wrapIv) return null
  const { verifier, kek } = await derive(pin, fromB64(f.salt))
  if (verifier !== f.pinHash) return null
  const raw = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(f.wrapIv) },
    kek,
    fromB64(f.wrappedKey),
  )
  return toB64(raw)
}

const aesKey = (dataKey: string) =>
  crypto.subtle.importKey('raw', fromB64(dataKey), 'AES-GCM', false, ['encrypt', 'decrypt'])

export async function encryptJson(dataKey: string, value: unknown) {
  const iv = random(12)
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await aesKey(dataKey),
    enc.encode(JSON.stringify(value)),
  )
  return { iv: toB64(iv), data: toB64(data) }
}

export async function decryptJson<T>(dataKey: string, box: { iv: string; data: string }): Promise<T> {
  const raw = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(box.iv) },
    await aesKey(dataKey),
    fromB64(box.data),
  )
  return JSON.parse(dec.decode(raw)) as T
}
