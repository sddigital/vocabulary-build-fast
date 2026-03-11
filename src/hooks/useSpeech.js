import { useState, useEffect, useCallback } from 'react'

// ─── Speech rate per level ────────────────────────────────────────────────────
const RATES = {
  beginners: 0.75,
  intermediate: 1.0,
  advanced: 1.25,
}

// ─── ResponsiveVoice voice names ──────────────────────────────────────────────
const RV_VOICE = {
  en: 'UK English Female',
  hi: 'Hindi Female',
}

// ─── Lazy-load ResponsiveVoice (free fallback) ────────────────────────────────
let _rvPromise = null

function ensureResponsiveVoice() {
  if (_rvPromise) return _rvPromise
  _rvPromise = new Promise(resolve => {
    if (window.responsiveVoice) { resolve(true); return }
    const s = document.createElement('script')
    s.src = 'https://code.responsivevoice.org/responsivevoice.js?key=FREE'
    s.onload = () => resolve(true)
    s.onerror = () => { _rvPromise = null; resolve(false) }
    document.head.appendChild(s)
  })
  return _rvPromise
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSpeech() {
  const [speaking, setSpeaking] = useState(false)
  const synth = typeof window !== 'undefined' && 'speechSynthesis' in window
    ? window.speechSynthesis
    : null

  // Prime Chrome's async voice list
  useEffect(() => {
    if (!synth) return
    const load = () => synth.getVoices()
    load()
    synth.addEventListener('voiceschanged', load)
    return () => synth.removeEventListener('voiceschanged', load)
  }, [synth])

  const stop = useCallback(() => {
    synth?.cancel()
    window.responsiveVoice?.cancel()
    setSpeaking(false)
  }, [synth])

  const speak = useCallback(async (text, { lang = 'en', level = 'intermediate' } = {}) => {
    if (!text) return
    stop()

    const rate = RATES[level] ?? 1.0
    const langCode = lang === 'hi' ? 'hi-IN' : 'en-IN'

    // ── ResponsiveVoice fallback (called when native fails or is absent) ──
    async function tryRV() {
      const ok = await ensureResponsiveVoice()
      if (!ok || !window.responsiveVoice) { setSpeaking(false); return }
      setSpeaking(true)
      window.responsiveVoice.speak(text, RV_VOICE[lang] ?? RV_VOICE.en, {
        rate,
        onstart: () => setSpeaking(true),
        onend: () => setSpeaking(false),
        onerror: () => setSpeaking(false),
      })
    }

    if (synth) {
      const utt = new SpeechSynthesisUtterance(text)
      utt.lang = langCode
      utt.rate = rate

      // Pick best available voice for the language
      const voices = synth.getVoices()
      const prefix = lang === 'hi' ? 'hi' : 'en'
      const voice =
        voices.find(v => v.lang === langCode) ??
        voices.find(v => v.lang.startsWith(prefix))
      if (voice) utt.voice = voice

      utt.onstart = () => setSpeaking(true)
      utt.onend = () => setSpeaking(false)
      utt.onerror = () => {
        setSpeaking(false)
        tryRV()
      }

      setSpeaking(true)
      synth.speak(utt)

      // Chrome bug: speech sometimes silently fails without onerror —
      // use a watchdog that falls back after 500 ms of no onstart
      const watchdog = setTimeout(() => {
        if (!synth.speaking && !synth.pending) {
          setSpeaking(false)
          tryRV()
        }
      }, 500)
      utt.onstart = () => { setSpeaking(true); clearTimeout(watchdog) }
    } else {
      await tryRV()
    }
  }, [synth, stop])

  return { speak, stop, speaking }
}
