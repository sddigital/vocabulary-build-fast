import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import data from '../data/conversations.json'

// ─────────────────────────────────────────────────────────────
// TTS helper
// ─────────────────────────────────────────────────────────────
function speak(text, lang = 'en-IN', onEnd) {
  if (!window.speechSynthesis) { onEnd?.(); return }
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang
  u.rate = 0.88
  u.onend = onEnd ?? null
  window.speechSynthesis.speak(u)
}

const SPEAKER_COLORS = {
  A: {
    bubble: 'bg-blue-50 border border-blue-200 text-blue-900',
    name:   'text-blue-600',
    dot:    'bg-blue-400',
    side:   'items-start',
    tts:    'bg-blue-100 hover:bg-blue-200 text-blue-700',
  },
  B: {
    bubble: 'bg-emerald-50 border border-emerald-200 text-emerald-900',
    name:   'text-emerald-600',
    dot:    'bg-emerald-400',
    side:   'items-end',
    tts:    'bg-emerald-100 hover:bg-emerald-200 text-emerald-700',
  },
}

// ─────────────────────────────────────────────────────────────
// Scenario Picker
// ─────────────────────────────────────────────────────────────
function ScenarioPicker({ level, onSelect }) {
  const scenarios = data[level] ?? []
  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
        Choose a scenario · {level}
      </p>
      <div className="grid grid-cols-1 gap-3">
        {scenarios.map((s, i) => (
          <motion.button
            key={s.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(s)}
            className="flex items-center gap-4 bg-white border border-gray-200 rounded-2xl p-4 hover:border-blue-300 hover:shadow-sm transition-all text-left"
          >
            <span className="text-3xl">{s.icon}</span>
            <div>
              <p className="font-semibold text-gray-800">{s.scenario}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {s.speakers.A} · {s.speakers.B} · {s.lines.length} lines
              </p>
            </div>
            <span className="ml-auto text-gray-300 text-lg">›</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Chat Bubble
// ─────────────────────────────────────────────────────────────
function Bubble({ line, speakerLabel, showHindi, isLatest, isSpeaking, onSpeak }) {
  const c = SPEAKER_COLORS[line.speaker]
  return (
    <motion.div
      initial={{ opacity: 0, x: line.speaker === 'A' ? -24 : 24, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      className={`flex flex-col max-w-[85%] ${c.side}`}
    >
      <span className={`text-xs font-semibold mb-1 px-1 ${c.name}`}>{speakerLabel}</span>
      <div className={`rounded-2xl px-4 py-3 space-y-1.5 ${c.bubble} ${isLatest ? 'shadow-sm' : ''}`}>
        <p className="text-sm leading-relaxed font-medium">{line.text}</p>
        <AnimatePresence>
          {showHindi && line.hindi && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-xs text-gray-500 leading-relaxed"
            >
              {line.hindi}
            </motion.p>
          )}
        </AnimatePresence>
        <button
          onClick={() => onSpeak(line.text)}
          className={`text-xs px-2 py-1 rounded-lg transition-colors flex items-center gap-1 ${c.tts} ${isSpeaking ? 'ring-2 ring-offset-1 ring-current' : ''}`}
        >
          {isSpeaking ? '■' : '▶'} {isSpeaking ? 'Stop' : 'Listen'}
        </button>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────
// Typing indicator (3 animated dots)
// ─────────────────────────────────────────────────────────────
function TypingDots({ speaker }) {
  const c = SPEAKER_COLORS[speaker]
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`flex flex-col max-w-[85%] ${c.side}`}
    >
      <div className={`rounded-2xl px-4 py-3 ${c.bubble} flex items-center gap-1`}>
        {[0, 1, 2].map(i => (
          <motion.span
            key={i}
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.15 }}
            className={`w-2 h-2 rounded-full ${c.dot}`}
          />
        ))}
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────
// Chat View
// ─────────────────────────────────────────────────────────────
function ChatView({ scenario, onBack, onDone }) {
  const [revealed, setRevealed] = useState(0)    // lines shown so far (0 = none)
  const [autoPlay, setAutoPlay] = useState(false)
  const [showHindi, setShowHindi] = useState(false)
  const [speaking, setSpeaking] = useState(null)  // index of line being spoken
  const [typing, setTyping] = useState(null)      // speaker letter showing dots
  const chatRef = useRef()
  const autoRef = useRef(false)

  const lines = scenario.lines
  const isDone = revealed >= lines.length

  // Auto-scroll to bottom when new line appears
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
  }, [revealed, typing])

  // Auto-play engine: typing → reveal → speak → next
  useEffect(() => {
    autoRef.current = autoPlay
    if (!autoPlay) {
      window.speechSynthesis?.cancel()
      setSpeaking(null)
      setTyping(null)
    }
  }, [autoPlay])

  function runAutoLine(idx) {
    if (!autoRef.current || idx >= lines.length) {
      setTyping(null)
      setSpeaking(null)
      return
    }
    const line = lines[idx]
    setTyping(line.speaker)
    // 800ms "typing" delay, then reveal
    const typingTimer = setTimeout(() => {
      if (!autoRef.current) return
      setTyping(null)
      setRevealed(idx + 1)
      setSpeaking(idx)
      speak(line.text, 'en-IN', () => {
        setSpeaking(null)
        // pause between lines
        setTimeout(() => runAutoLine(idx + 1), 600)
      })
    }, 800)
    return () => clearTimeout(typingTimer)
  }

  function startAuto() {
    setAutoPlay(true)
    autoRef.current = true
    const startFrom = revealed
    // small delay before starting
    setTimeout(() => runAutoLine(startFrom), 300)
  }

  function stopAuto() {
    setAutoPlay(false)
    autoRef.current = false
    window.speechSynthesis?.cancel()
    setSpeaking(null)
    setTyping(null)
  }

  function next() {
    if (revealed < lines.length) setRevealed(r => r + 1)
  }

  function handleSpeak(text, idx) {
    if (speaking === idx) {
      window.speechSynthesis?.cancel()
      setSpeaking(null)
      return
    }
    setSpeaking(idx)
    speak(text, 'en-IN', () => setSpeaking(null))
  }

  function replay() {
    window.speechSynthesis?.cancel()
    setRevealed(0)
    setSpeaking(null)
    setTyping(null)
    setAutoPlay(false)
    autoRef.current = false
  }

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Scenario header */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{scenario.icon}</span>
          <div className="flex-1">
            <h2 className="font-bold text-gray-900">{scenario.scenario}</h2>
            <p className="text-xs text-gray-400">
              <span className="text-blue-600 font-medium">{scenario.speakers.A}</span>
              {' · '}
              <span className="text-emerald-600 font-medium">{scenario.speakers.B}</span>
            </p>
          </div>
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={showHindi}
              onChange={e => setShowHindi(e.target.checked)}
              className="accent-blue-600"
            />
            हिं
          </label>
        </div>
      </div>

      {/* Chat area */}
      <div
        ref={chatRef}
        className="flex-1 overflow-y-auto bg-gray-50 rounded-2xl p-4 space-y-3 min-h-64 max-h-96"
      >
        {revealed === 0 && !typing && (
          <p className="text-center text-sm text-gray-400 mt-8">
            Press <strong>Auto Play</strong> or <strong>Next Line →</strong> to begin
          </p>
        )}

        {lines.slice(0, revealed).map((line, i) => (
          <div
            key={i}
            className={`flex ${line.speaker === 'A' ? 'justify-start' : 'justify-end'}`}
          >
            <Bubble
              line={line}
              speakerLabel={scenario.speakers[line.speaker]}
              showHindi={showHindi}
              isLatest={i === revealed - 1}
              isSpeaking={speaking === i}
              onSpeak={text => handleSpeak(text, i)}
            />
          </div>
        ))}

        {/* Typing indicator */}
        <AnimatePresence>
          {typing && (
            <div className={`flex ${typing === 'A' ? 'justify-start' : 'justify-end'}`}>
              <TypingDots speaker={typing} />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-1.5">
        {lines.map((_, i) => (
          <motion.span
            key={i}
            animate={{ scale: i < revealed ? 1 : 0.7 }}
            className={`w-2 h-2 rounded-full transition-colors ${
              i < revealed ? 'bg-blue-400' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Controls */}
      {!isDone ? (
        <div className="flex gap-2">
          {!autoPlay ? (
            <>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={startAuto}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
              >
                ▶ Auto Play
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={next}
                disabled={revealed >= lines.length}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 rounded-xl transition-colors text-sm disabled:opacity-40"
              >
                Next Line →
              </motion.button>
            </>
          ) : (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={stopAuto}
              className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 font-semibold py-3 rounded-xl transition-colors text-sm"
            >
              ■ Stop
            </motion.button>
          )}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center space-y-3"
        >
          <p className="text-green-800 font-bold">Conversation complete! 🎉</p>
          <div className="flex gap-2">
            <button
              onClick={replay}
              className="flex-1 bg-white border border-green-300 text-green-700 font-semibold py-2.5 rounded-xl text-sm hover:bg-green-50 transition-colors"
            >
              ↩ Replay
            </button>
            <button
              onClick={onDone}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
            >
              Next Scenario →
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// ConversationPractice — main export
// ─────────────────────────────────────────────────────────────
export default function ConversationPractice({ config, onBack }) {
  const { level } = config
  const [scenario, setScenario] = useState(null)

  function handleDone() {
    window.speechSynthesis?.cancel()
    setScenario(null)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow p-6 space-y-4"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">💬</span>
          <span className="font-bold text-gray-800">Conversations</span>
          <span className="text-xs text-gray-400 capitalize">{level}</span>
        </div>
        <button
          onClick={() => { window.speechSynthesis?.cancel(); onBack() }}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← Back
        </button>
      </div>

      <AnimatePresence mode="wait">
        {!scenario ? (
          <motion.div
            key="picker"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <ScenarioPicker level={level} onSelect={setScenario} />
          </motion.div>
        ) : (
          <motion.div
            key={scenario.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Sub-nav */}
            <button
              onClick={() => { window.speechSynthesis?.cancel(); setScenario(null) }}
              className="text-sm text-gray-400 hover:text-gray-600 mb-3 flex items-center gap-1"
            >
              ‹ All scenarios
            </button>
            <ChatView
              scenario={scenario}
              onBack={() => { window.speechSynthesis?.cancel(); setScenario(null) }}
              onDone={handleDone}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
