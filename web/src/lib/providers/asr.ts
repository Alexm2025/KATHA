import type { LangCode, Transcript } from '../types'
import { API_URL, type ASRProvider, type StreamingASR } from './types'

// Minimal shape of the (prefixed) Web Speech API we rely on.
interface SpeechRec {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }> & { isFinal: boolean }> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

const SpeechRecCtor = (): (new () => SpeechRec) | undefined => {
  const w = window as unknown as Record<string, new () => SpeechRec>
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

const BCP47: Partial<Record<LangCode, string>> = { hi: 'hi-IN', en: 'en-IN' }

/**
 * Chrome's Web Speech API for the teacher's Hindi. ONLINE: Chrome sends the audio to
 * Google's speech service, so the UI asks the teacher before turning it on.
 */
export class BrowserASR implements StreamingASR {
  name = 'browser-webspeech'
  online = true

  supported() {
    return !!SpeechRecCtor()
  }

  listen(lang: LangCode, on: Parameters<StreamingASR['listen']>[1]) {
    const Ctor = SpeechRecCtor()
    if (!Ctor || !BCP47[lang]) {
      on.error('unsupported')
      on.end()
      return { stop: () => {} }
    }
    const rec = new Ctor()
    rec.lang = BCP47[lang]
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (!r.isFinal) {
          interim += r[0].transcript
          continue
        }
        const endedAt = performance.now()
        on.final(
          {
            provider: this.name,
            confidence: r[0].confidence || 0,
            latencyMs: 0,
            verified: false,
            text: r[0].transcript.trim(),
            lang,
          },
          endedAt,
        )
      }
      on.interim(interim)
    }
    rec.onerror = (e) => on.error(e.error)
    rec.onend = () => on.end()
    rec.start()
    return { stop: () => rec.stop() }
  }
}

/** Client for the FastAPI `/asr` endpoint (Whisper / IndicWav2Vec behind it). */
export class ServerASR implements ASRProvider {
  name = 'server'
  online = true

  async transcribe(audio: Blob | MediaStream, lang: LangCode): Promise<Transcript> {
    if (!(audio instanceof Blob)) throw new Error('ServerASR needs a recorded Blob')
    const t0 = performance.now()
    const form = new FormData()
    form.append('audio', audio, 'audio.webm')
    form.append('lang', lang)
    const res = await fetch(`${API_URL}/asr`, { method: 'POST', body: form })
    if (!res.ok) throw new Error(`asr ${res.status}`)
    const body = await res.json()
    return {
      provider: body.provider ?? this.name,
      confidence: body.confidence ?? 0,
      latencyMs: Math.round(performance.now() - t0),
      verified: false,
      text: body.text ?? '',
      lang,
    }
  }
}

/** Stand-in when no backend is configured: says so instead of pretending to hear. */
export class MockASR implements ASRProvider {
  name = 'mock'
  online = false

  async transcribe(_audio: Blob | MediaStream, lang: LangCode): Promise<Transcript> {
    return { provider: this.name, confidence: 0, latencyMs: 0, verified: false, text: '', lang }
  }
}
