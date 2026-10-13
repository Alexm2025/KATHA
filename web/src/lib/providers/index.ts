import { BrowserASR, MockASR, ServerASR } from './asr'
import { ChainTranslator } from './translation'
import { ChainTTS } from './tts'
import { API_URL, type ASRProvider, type StreamingASR, type TranslationProvider, type TTSProvider } from './types'

// The one place providers are chosen. Swap an implementation here and nothing else changes.
export const translator: TranslationProvider = new ChainTranslator()
export const tts: TTSProvider = new ChainTTS()
export const liveAsr: StreamingASR = new BrowserASR()
export const clipAsr: ASRProvider = API_URL ? new ServerASR() : new MockASR()

export * from './types'
