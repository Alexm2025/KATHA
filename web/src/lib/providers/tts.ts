import { db } from '../db'
import { normHi } from '../lang'
import type { AudioOutput, LangCode } from '../types'
import type { TTSProvider } from './types'

let current: HTMLAudioElement | null = null

export function playBlob(blob: Blob): Promise<void> {
  current?.pause()
  speechSynthesis?.cancel()
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  current = audio
  return new Promise((resolve, reject) => {
    audio.onended = audio.onpause = () => {
      URL.revokeObjectURL(url)
      resolve()
    }
    audio.onerror = () => reject(new Error('audio playback failed'))
    audio.play().catch(reject)
  })
}

export const clipId = (lang: LangCode, sourceHi: string) => `${lang}|${normHi(sourceHi)}`

/** Pre-recorded clips from the language pack (IndexedDB). Works offline. */
export class RecordedTTS implements TTSProvider {
  name = 'recorded'

  async speak(text: string, lang: LangCode, sourceHi?: string): Promise<AudioOutput> {
    const t0 = performance.now()
    const clip = await db.audio.get(clipId(lang, sourceHi ?? text))
    const meta = (ok: boolean): AudioOutput => ({
      provider: this.name,
      confidence: ok ? 1 : 0,
      latencyMs: Math.round(performance.now() - t0),
      verified: ok,
      kind: ok ? 'recorded' : 'none',
      status: ok ? 'played' : 'pending',
    })
    if (!clip) return meta(false)
    // Latency is time-to-first-sound, so don't wait for the clip to finish.
    void playBlob(clip.blob).catch(() => {})
    return meta(true)
  }
}

/** Browser speech synthesis. Only ever used for Hindi: a Hindi voice must not read tribal text. */
export class BrowserTTS implements TTSProvider {
  name = 'browser-synth'

  async speak(text: string, lang: LangCode): Promise<AudioOutput> {
    const t0 = performance.now()
    const meta = (status: AudioOutput['status']): AudioOutput => ({
      provider: this.name,
      confidence: status === 'played' ? 0.8 : 0,
      latencyMs: Math.round(performance.now() - t0),
      verified: false,
      kind: status === 'played' ? 'synth' : 'none',
      status,
    })
    if (lang !== 'hi' && lang !== 'en') return meta('pending')
    if (!('speechSynthesis' in window)) return meta('unsupported')
    current?.pause()
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang === 'hi' ? 'hi-IN' : 'en-IN'
    u.rate = 0.85
    speechSynthesis.speak(u)
    return meta('played')
  }
}

/** Recording first; synthesis only as the Hindi fallback; tribal text without a clip → pending. */
export class ChainTTS implements TTSProvider {
  name = 'chain'
  private recorded = new RecordedTTS()
  private synth = new BrowserTTS()

  async speak(text: string, lang: LangCode, sourceHi?: string): Promise<AudioOutput> {
    const rec = await this.recorded.speak(text, lang, sourceHi)
    if (rec.status === 'played' || (lang !== 'hi' && lang !== 'en')) return rec
    return this.synth.speak(text, lang)
  }
}
