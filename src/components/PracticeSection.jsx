import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSpeech } from '../hooks/useSpeech'
import SpeakButton from './SpeakButton'
import WordPanel from './WordPanel'
import beginners from '../data/beginners.json'
import intermediate from '../data/intermediate.json'
import advanced from '../data/advanced.json'

const TOTAL_QUESTIONS = 10
const QUESTION_TIME = 15
const MASTERY_REQUIRED = 8

// Maps the difficulty filter value used in ControlPanel → speech level
const SPEECH_LEVEL = {
  easy: 'beginners',
  medium: 'intermediate',
  hard: 'advanced',
  mixed: 'intermediate',
}

function shuffleArray(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

// Pass 1: normalise all fields
const ALL_WORDS_RAW = [
  ...beginners.words,
  ...intermediate.words,
  ...advanced.words,
].map(w => {
  const wx = /** @type {any} */ (w)
  const correctWord = wx.correct_word ?? wx.word ?? ''
  // Use a pre-made blank sentence if available; otherwise punch a blank into example_sentence
  let sentence = wx.sentence ?? wx.fill_blank
  if (!sentence && wx.example_sentence && correctWord) {
    sentence = wx.example_sentence.replace(
      new RegExp(`\\b${correctWord}\\b`, 'i'),
      '______'
    )
  }
  return {
    ...w,
    sentence:     sentence ?? '',
    correct_word: correctWord,
    hint_words:   wx.hint_words ?? '',
    meaning_hi:   wx.meaning_hi ?? wx.hindi ?? '',
  }
})

// Pass 2: for words without hint_words (e.g. beginners), auto-generate
// 3 distractors from the same difficulty level so MCQ always has 4 options.
const ALL_WORDS = ALL_WORDS_RAW.map((w, _, arr) => {
  if (w.hint_words) return w
  const pool = arr.filter(x => x.difficulty === w.difficulty && x.correct_word !== w.correct_word)
  const distractors = shuffleArray(pool).slice(0, 3).map(x => x.correct_word)
  return { ...w, hint_words: distractors.join(', ') }
})

// Bump this version whenever the word normalisation format changes,
// so old localStorage caches are automatically discarded.
const CACHE_VERSION = 'v3'

function getTodayKey(level) {
  const d = new Date()
  return `daily_${CACHE_VERSION}_${level}_${d.getFullYear()}_${d.getMonth() + 1}_${d.getDate()}`
}

export default function PracticeSection({ config, onBack, onSessionEnd }) {
  const { mode, category, level, shuffle, timer: timerOn } = config

  const [words, setWords] = useState([])
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Speech
  const { speak, stop, speaking } = useSpeech()
  const [activeLang, setActiveLang] = useState(null) // 'en' | 'hi' | null
  const speechLevel = SPEECH_LEVEL[level] ?? 'intermediate'

  const timerRef = useRef(null)
  const inputRef = useRef(null)

  // ── Stop speech when question changes ────────────────────────
  useEffect(() => {
    stop()
    setActiveLang(null)
  }, [index]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Prepare words from local JSON ────────────────────────────
  useEffect(() => {
    try {
      let filtered = ALL_WORDS

      if (mode === 'category') {
        filtered = filtered.filter(w => w.category === category)
      }

      if (level !== 'mixed') {
        filtered = filtered.filter(w => w.difficulty === level)
      }

      // Only keep words that have a sentence to display
      filtered = filtered.filter(w => w.sentence)

      if (mode === 'daily') {
        const key = getTodayKey(level)
        const saved = localStorage.getItem(key)
        let savedWords = null
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            // Reject stale data: must be non-empty and have a difficulty field (local JSON format)
            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].difficulty) {
              savedWords = parsed
            } else {
              localStorage.removeItem(key)
            }
          } catch {
            localStorage.removeItem(key)
          }
        }
        if (savedWords) {
          setWords(savedWords)
        } else {
          const daily = (shuffle ? shuffleArray(filtered) : filtered).slice(0, TOTAL_QUESTIONS)
          localStorage.setItem(key, JSON.stringify(daily))
          setWords(daily)
        }
      } else {
        const prepared = (shuffle ? shuffleArray(filtered) : filtered).slice(0, TOTAL_QUESTIONS)
        setWords(prepared)
      }
    } catch {
      setError('Failed to prepare vocabulary data.')
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Timer ────────────────────────────────────────────────────
  const handleTimeout = useCallback(() => checkAnswer(true), []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!timerOn || loading || done || feedback) return
    setTimeLeft(QUESTION_TIME)
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          handleTimeout()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [index, loading, done, feedback, timerOn]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Focus input ──────────────────────────────────────────────
  useEffect(() => {
    if (!loading && !done && !feedback) inputRef.current?.focus()
  }, [index, loading, done, feedback])

  // ── Answer check ─────────────────────────────────────────────
  function checkAnswer(isTimeout = false) {
    clearInterval(timerRef.current)
    stop()
    setActiveLang(null)
    const word = words[index]
    const isCorrect = !isTimeout && answer.trim().toLowerCase() === word.correct_word.toLowerCase()

    if (isCorrect) {
      setCorrect(c => c + 1)
      setScore(s => s + 10 + (streak >= 2 ? 5 : 0))
      setStreak(s => s + 1)
    } else {
      setStreak(0)
    }

    setFeedback({ correct: isCorrect, word })
  }

  function next() {
    setFeedback(null)
    setAnswer('')
    if (index + 1 >= words.length) {
      setDone(true)
      const levelId = level === 'easy' ? 'beginners' : level === 'medium' ? 'intermediate' : 'advanced'
      onSessionEnd?.({
        level: levelId,
        format: mode === 'category' ? 'fill_blanks' : mode,
        score: correct + (feedback?.correct ? 1 : 0),
        total: words.length,
        wordsAnswered: words.map(w => w.correct_word).filter(Boolean),
      })
    } else {
      setIndex(i => i + 1)
    }
  }

  function pickHint(opt) {
    setAnswer(opt)
    inputRef.current?.focus()
  }

  // ── Speech handlers ───────────────────────────────────────────
  function handleSpeak(text, lang) {
    if (speaking && activeLang === lang) {
      stop()
      setActiveLang(null)
      return
    }
    setActiveLang(lang)
    speak(text, { lang, level: speechLevel })
  }

  function handleStop() {
    stop()
    setActiveLang(null)
  }

  // ── Render helpers ───────────────────────────────────────────
  const modeLabel =
    mode === 'daily' ? 'Daily Challenge'
    : mode === 'mixed' ? 'Mixed Mode'
    : category?.toUpperCase() ?? ''

  // Must be computed unconditionally before any early returns so that
  // useMemo is always called in the same order (Rules of Hooks).
  const word = words[index]
  const progress = words.length > 0 ? (index / words.length) * 100 : 0
  const hasHindi = !!(word?.meaning_hi || word?.correct_word)

  const hintOptions = useMemo(() => {
    if (!word) return []
    let opts = word.hint_words ? word.hint_words.split(',').map(o => o.trim()) : []
    if (!opts.includes(word.correct_word)) opts.push(word.correct_word)
    return shuffleArray(opts)
  }, [word]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-500">
        Loading vocabulary…
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow p-10 text-center text-red-500">
        {error}
      </div>
    )
  }

  if (words.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-500">
        No questions available for this level.
        <button onClick={onBack} className="mt-4 block mx-auto bg-blue-600 text-white px-6 py-2 rounded-xl">
          Back
        </button>
      </div>
    )
  }

  if (done) {
    const mastery = correct >= MASTERY_REQUIRED
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow p-10 text-center space-y-3"
      >
        <div className="text-5xl">{mastery ? '🎯' : '📚'}</div>
        <h2 className="text-2xl font-bold">{mastery ? 'Mastery Achieved!' : 'Keep Practising!'}</h2>
        <p className="text-gray-500">Score: <span className="font-semibold text-gray-800">{score}</span></p>
        <p className="text-gray-500">Correct: <span className="font-semibold text-gray-800">{correct}/{words.length}</span></p>
        <button onClick={onBack} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors">
          Back to Menu
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow p-6 space-y-4"
    >
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="font-bold text-gray-800">{modeLabel}</span>
        <div className="flex gap-2 flex-wrap">
          <Pill>Score: {score}</Pill>
          <Pill>Streak: {streak}</Pill>
          <Pill>{timerOn ? `Time: ${timeLeft}` : 'Timer Off'}</Pill>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-600 to-sky-400 rounded-full"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Question card */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 space-y-4">

        {/* Sentence row: text + speak buttons */}
        <div className="flex items-start gap-3">
          <AnimatePresence mode="wait">
            <motion.p
              key={index}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 text-lg font-medium text-gray-900 leading-relaxed"
            >
              {word.sentence}
            </motion.p>
          </AnimatePresence>

          {/* EN / HI speak buttons */}
          <div className="flex gap-2 shrink-0 pt-0.5">
            <SpeakButton
              isActive={speaking && activeLang === 'en'}
              onSpeak={() => handleSpeak(word.sentence, 'en')}
              onStop={handleStop}
              label="EN"
              size="sm"
            />
            {hasHindi && (
              <SpeakButton
                isActive={speaking && activeLang === 'hi'}
                onSpeak={() => handleSpeak(word.correct_word, 'hi')}
                onStop={handleStop}
                label="अ"
                size="sm"
              />
            )}
          </div>
        </div>

        {/* Hint chips */}
        {hintOptions.length > 0 && (
          <div className="flex flex-col sm:flex-row flex-wrap gap-2">
            {hintOptions.map(opt => (
              <button
                key={opt}
                onClick={() => pickHint(opt)}
                className="flex-1 text-center text-sm font-medium bg-sky-100 border border-sky-200 text-sky-900 px-3 py-2.5 rounded-xl hover:bg-sky-200 transition-colors"
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !feedback) { e.preventDefault(); checkAnswer() } }}
          placeholder="Type your answer"
          disabled={!!feedback}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white disabled:opacity-60"
        />

        {!feedback && (
          <button
            onClick={() => checkAnswer()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Submit
          </button>
        )}

        {/* Feedback */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`rounded-xl p-4 text-sm leading-relaxed space-y-2 ${
                feedback.correct
                  ? 'bg-green-50 border border-green-200 text-green-900'
                  : 'bg-red-50 border border-red-200 text-red-900'
              }`}
            >
              {/* Header row with speak button */}
              <div className="flex items-center justify-between gap-2">
                {feedback.correct
                  ? <p className="font-bold text-base">Correct! 🎉</p>
                  : (
                    <p className="font-bold text-base">
                      Correct word:{' '}
                      <span className="underline">{word.correct_word}</span>
                    </p>
                  )
                }
                {/* Speak the correct word in feedback */}
                <div className="flex gap-1.5 shrink-0">
                  <SpeakButton
                    isActive={speaking && activeLang === 'en'}
                    onSpeak={() => handleSpeak(word.correct_word, 'en')}
                    onStop={handleStop}
                    label="EN"
                    size="sm"
                  />
                  {hasHindi && (
                    <SpeakButton
                      isActive={speaking && activeLang === 'hi'}
                      onSpeak={() => handleSpeak(word.meaning_hi ?? word.correct_word, 'hi')}
                      onStop={handleStop}
                      label="अ"
                      size="sm"
                    />
                  )}
                </div>
              </div>

              <p>{word.meaning_en}</p>
              {word.meaning_hi && <p className="text-gray-600">{word.meaning_hi}</p>}
              {word.example_sentence && (
                <p className="italic text-gray-500">{word.example_sentence}</p>
              )}

              <button
                onClick={next}
                className="mt-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-xl transition-colors"
              >
                Next Question
              </button>

              {/* Dictionary panel — level-specific content */}
              <WordPanel word={word.correct_word} level={speechLevel} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Back */}
      <button
        onClick={() => { stop(); onBack() }}
        className="bg-gray-500 hover:bg-gray-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
      >
        Back
      </button>
    </motion.div>
  )
}

function Pill({ children }) {
  return (
    <span className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full">
      {children}
    </span>
  )
}
