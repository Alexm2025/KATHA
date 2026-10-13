import { useCallback, useEffect, useRef, useState } from 'react'

/** Microphone recorder (Opus in WebM where the browser supports it). */
export function useRecorder(onDone: (blob: Blob) => void) {
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState(false)
  const rec = useRef<MediaRecorder | null>(null)
  const done = useRef(onDone)
  done.current = onDone
  // A quick tap can call stop() before getUserMedia resolves.
  const wanted = useRef(false)

  const stop = useCallback(() => {
    wanted.current = false
    if (rec.current?.state === 'recording') rec.current.stop()
  }, [])

  const start = useCallback(async () => {
    if (rec.current?.state === 'recording') return
    wanted.current = true
    setError(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((m) =>
        MediaRecorder.isTypeSupported(m),
      )
      const r = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 24_000 } : undefined)
      const chunks: Blob[] = []
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data)
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        setRecording(false)
        const blob = new Blob(chunks, { type: r.mimeType })
        if (blob.size > 800) done.current(blob)
      }
      rec.current = r
      r.start()
      setRecording(true)
      if (!wanted.current) setTimeout(() => r.state === 'recording' && r.stop(), 300)
    } catch {
      setError(true)
      setRecording(false)
    }
  }, [])

  useEffect(() => stop, [stop])

  return { recording, error, start, stop }
}

let ctx: AudioContext | null = null

function tone(freqs: number[], step: number, type: OscillatorType, gain: number) {
  try {
    ctx ??= new AudioContext()
    const t0 = ctx.currentTime
    freqs.forEach((f, i) => {
      const osc = ctx!.createOscillator()
      const g = ctx!.createGain()
      osc.type = type
      osc.frequency.value = f
      g.gain.setValueAtTime(0, t0 + i * step)
      g.gain.linearRampToValueAtTime(gain, t0 + i * step + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, t0 + i * step + step * 1.6)
      osc.connect(g).connect(ctx!.destination)
      osc.start(t0 + i * step)
      osc.stop(t0 + i * step + step * 1.7)
    })
  } catch {
    // Sound is a nicety; never let it break an activity.
  }
}

/** Friendly feedback sounds, synthesised so they need no audio files. */
export const sounds = {
  correct: () => tone([523, 659, 784], 0.11, 'sine', 0.25),
  tryAgain: () => tone([392, 349], 0.16, 'sine', 0.12),
  star: () => tone([659, 784, 988, 1319], 0.09, 'triangle', 0.2),
}
