import type { AudioOutput, LangCode, LessonContext, Transcript, Translation } from '../types'

export interface ASRProvider {
  name: string
  /** true = audio leaves the device. Shown to the teacher. */
  online: boolean
  transcribe(audio: Blob | MediaStream, lang: LangCode): Promise<Transcript>
}

/** Live dictation: interim text while speaking, a Transcript per finished utterance. */
export interface StreamingASR {
  name: string
  online: boolean
  supported(): boolean
  listen(
    lang: LangCode,
    on: {
      interim: (text: string) => void
      /** `endedAt` = performance.now() at end-of-speech, the start of the latency clock. */
      final: (t: Transcript, endedAt: number) => void
      error: (code: string) => void
      end: () => void
    },
  ): { stop: () => void }
}

export interface TranslationProvider {
  name: string
  translate(text: string, from: LangCode, to: LangCode, ctx?: LessonContext): Promise<Translation>
}

export interface TTSProvider {
  name: string
  /** `sourceHi` identifies the recording when `text` is a tribal-language translation. */
  speak(text: string, lang: LangCode, sourceHi?: string): Promise<AudioOutput>
}

export const API_URL: string = import.meta.env.VITE_API_URL ?? ''
