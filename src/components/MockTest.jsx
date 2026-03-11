import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import advanced from '../data/advanced.json'

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const EXAMS = [
  { id: 'Mixed',   label: 'Mixed',   icon: '🔀', color: 'bg-gray-100 border-gray-300 text-gray-800' },
  { id: 'SSC',     label: 'SSC',     icon: '📋', color: 'bg-orange-50 border-orange-300 text-orange-800' },
  { id: 'UPSC',    label: 'UPSC',    icon: '🏛️', color: 'bg-blue-50 border-blue-300 text-blue-800' },
  { id: 'Banking', label: 'Banking', icon: '🏦', color: 'bg-green-50 border-green-300 text-green-800' },
  { id: 'CLAT',    label: 'CLAT',    icon: '⚖️', color: 'bg-purple-50 border-purple-300 text-purple-800' },
]

const DURATIONS = [
  { mins: 10, label: '10 min', sub: 'Quick' },
  { mins: 15, label: '15 min', sub: 'Standard' },
  { mins: 20, label: '20 min', sub: 'Full' },
]

const COUNTS = [
  { n: 10, label: '10 Qs' },
  { n: 20, label: '20 Qs' },
  { n: 25, label: '25 Qs' },
]

const PYQ_LABELS = {
  SSC:     ['SSC CGL 2023', 'SSC CHSL 2022', 'SSC MTS 2023', 'SSC GD 2022'],
  UPSC:    ['UPSC Prelims 2023', 'UPSC 2022', 'UPSC 2021'],
  Banking: ['IBPS PO 2023', 'SBI Clerk 2022', 'RRB PO 2023'],
  CLAT:    ['CLAT 2023', 'CLAT 2022', 'CLAT 2021'],
}

function pyqLabel(exam) {
  const pool = PYQ_LABELS[exam] ?? PYQ_LABELS.SSC
  return pool[Math.floor(Math.random() * pool.length)]
}

// ─────────────────────────────────────────────────────────────
// Question generation
// ─────────────────────────────────────────────────────────────
const shuffle = arr => [...arr].sort(() => Math.random() - 0.5)

function parseOptions(hintWords) {
  return hintWords.split(',').map(s => s.trim()).filter(Boolean)
}

function buildQuestions(words, idioms, examFilter, totalCount) {
  const filtered = examFilter === 'Mixed'
    ? words
    : words.filter(w => w.exam_category === examFilter)

  // Need at least some words; fall back to all if filter too narrow
  const pool = filtered.length >= 5 ? filtered : words

  const questions = []

  // Fill-in-the-blank
  pool.forEach(w => {
    if (!w.sentence || !w.hint_words) return
    questions.push({
      id: `fill_${w.word}`,
      type: 'fill_blank',
      typeLabel: 'Fill in the Blank',
      exam: w.exam_category,
      pyq: pyqLabel(w.exam_category),
      question: w.sentence,
      options: shuffle(parseOptions(w.hint_words)),
      correct: w.correct_word,
      explanation: w.meaning_en,
      hindi: w.meaning_hi ?? w.hindi,
      word: w.word,
    })
  })

  // One-word substitution
  pool.forEach(w => {
    if (!w.one_word_sub) return
    questions.push({
      id: `ows_${w.word}`,
      type: 'one_word_sub',
      typeLabel: 'One Word Substitution',
      exam: w.exam_category,
      pyq: pyqLabel(w.exam_category),
      question: w.one_word_sub.question,
      options: shuffle(parseOptions(w.hint_words ?? `${w.word},_,_,_`)),
      correct: w.one_word_sub.answer,
      explanation: w.meaning_en,
      hindi: w.meaning_hi ?? w.hindi,
      word: w.word,
    })
  })

  // Analogy
  pool.forEach((w, i) => {
    if (!w.analogy) return
    // 3 distractors from other words
    const distractors = shuffle(pool.filter((_, j) => j !== i).map(x => x.word)).slice(0, 3)
    questions.push({
      id: `ana_${w.word}`,
      type: 'analogy',
      typeLabel: 'Word Analogy',
      exam: w.exam_category,
      pyq: pyqLabel(w.exam_category),
      question: `${w.analogy.pair}\n${w.analogy.question}`,
      options: shuffle([w.analogy.answer, ...distractors]),
      correct: w.analogy.answer,
      explanation: `${w.analogy.pair} → ${w.analogy.question} ${w.analogy.answer}`,
      hindi: w.meaning_hi ?? w.hindi,
      word: w.word,
    })
  })

  // Idiom questions
  const idiomsToUse = examFilter === 'Mixed'
    ? idioms
    : idioms.filter(i => i.exam_category === examFilter)
  const idiomPool = idiomsToUse.length >= 2 ? idiomsToUse : idioms

  idiomPool.forEach((id, i) => {
    const distractors = shuffle(
      idiomPool.filter((_, j) => j !== i).map(x => x.meaning_en)
    ).slice(0, 3)
    questions.push({
      id: `idiom_${i}`,
      type: 'idiom',
      typeLabel: 'Idiom / Phrase',
      exam: id.exam_category,
      pyq: pyqLabel(id.exam_category),
      question: `"${id.idiom}" means:`,
      options: shuffle([id.meaning_en, ...distractors]),
      correct: id.meaning_en,
      explanation: id.example_sentence,
      hindi: id.hindi,
      word: id.idiom,
    })
  })

  return shuffle(questions).slice(0, totalCount)
}

// ─────────────────────────────────────────────────────────────
// Config screen
// ─────────────────────────────────────────────────────────────
function ConfigScreen({ onStart, onBack }) {
  const [exam, setExam] = useState('SSC')
  const [duration, setDuration] = useState(15)
  const [count, setCount] = useState(20)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Select Exam</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {EXAMS.map(e => (
            <motion.button
              key={e.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => setExam(e.id)}
              className={`py-3 px-4 rounded-xl border-2 font-semibold text-sm transition-all ${
                exam === e.id
                  ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-sm'
                  : `${e.color} border-opacity-60`
              }`}
            >
              {e.icon} {e.label}
            </motion.button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Duration</p>
        <div className="flex gap-2">
          {DURATIONS.map(d => (
            <button
              key={d.mins}
              onClick={() => setDuration(d.mins)}
              className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                duration === d.mins
                  ? 'border-blue-500 bg-blue-50 text-blue-800'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <p>{d.label}</p>
              <p className="text-xs font-normal opacity-60">{d.sub}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Questions</p>
        <div className="flex gap-2">
          {COUNTS.map(c => (
            <button
              key={c.n}
              onClick={() => setCount(c.n)}
              className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                count === c.n
                  ? 'border-blue-500 bg-blue-50 text-blue-800'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-700 space-y-1">
        <p className="font-semibold">ℹ️ Mock Test Info</p>
        <p>• {count} questions · {duration} minutes · {exam} pattern</p>
        <p>• Questions sourced from SSC/UPSC/Banking previous year patterns</p>
        <p>• No negative marking in this practice mode</p>
      </div>

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => onStart({ exam, duration, count })}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl transition-colors text-base"
      >
        🚀 Start Mock Test
      </motion.button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Timer display
// ─────────────────────────────────────────────────────────────
function TimerBar({ secs, totalSecs }) {
  const pct = Math.max(0, (secs / totalSecs) * 100)
  const mins = Math.floor(secs / 60)
  const s = secs % 60
  const isLow = secs <= 60
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className={`text-sm font-mono font-bold ${isLow ? 'text-red-600' : 'text-gray-700'}`}>
          {isLow && '⚠️ '}{String(mins).padStart(2, '0')}:{String(s).padStart(2, '0')}
        </span>
        <span className="text-xs text-gray-400">remaining</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full transition-colors ${isLow ? 'bg-red-500' : 'bg-orange-400'}`}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'linear' }}
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Test screen
// ─────────────────────────────────────────────────────────────
function TestScreen({ questions, durationMins, onComplete }) {
  const totalSecs = durationMins * 60
  const [secsLeft, setSecsLeft] = useState(totalSecs)
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({}) // { questionId: optionString }
  const [flagged, setFlagged] = useState(new Set())
  const [showPalette, setShowPalette] = useState(false)
  const timerRef = useRef()

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecsLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          handleSubmit()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, []) // eslint-disable-line

  function handleSubmit() {
    clearInterval(timerRef.current)
    onComplete(answers, totalSecs - secsLeft)
  }

  function pick(qId, opt) {
    setAnswers(prev => ({ ...prev, [qId]: opt }))
  }

  function toggleFlag(qId) {
    setFlagged(prev => {
      const next = new Set(prev)
      next.has(qId) ? next.delete(qId) : next.add(qId)
      return next
    })
  }

  const q = questions[current]
  const answered = Object.keys(answers).length
  const isMultiLine = q.question.includes('\n')

  return (
    <div className="space-y-4">
      <TimerBar secs={secsLeft} totalSecs={totalSecs} />

      {/* Top nav */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          Q {current + 1}/{questions.length} · {answered} answered
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => toggleFlag(q.id)}
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
              flagged.has(q.id)
                ? 'bg-yellow-100 border-yellow-400 text-yellow-700'
                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            {flagged.has(q.id) ? '🚩 Flagged' : '⚑ Flag'}
          </button>
          <button
            onClick={() => setShowPalette(p => !p)}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-gray-300"
          >
            📋 Panel
          </button>
        </div>
      </div>

      {/* Question palette */}
      <AnimatePresence>
        {showPalette && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-2 font-medium">Question Navigator</p>
              <div className="flex flex-wrap gap-1.5">
                {questions.map((qq, i) => (
                  <button
                    key={qq.id}
                    onClick={() => { setCurrent(i); setShowPalette(false) }}
                    className={`w-8 h-8 text-xs font-bold rounded-lg border transition-colors ${
                      i === current ? 'bg-blue-600 text-white border-blue-600'
                      : answers[qq.id] ? 'bg-green-100 border-green-400 text-green-800'
                      : flagged.has(qq.id) ? 'bg-yellow-100 border-yellow-400 text-yellow-700'
                      : 'bg-white border-gray-200 text-gray-600'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 mt-2 text-xs text-gray-400">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200 inline-block" />Answered</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-200 inline-block" />Flagged</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-300 inline-block" />Unanswered</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
          className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4"
        >
          {/* Meta */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs bg-orange-50 border border-orange-200 text-orange-700 px-2 py-0.5 rounded-full font-medium">
              {q.typeLabel}
            </span>
            <span className="text-xs text-gray-400">{q.pyq}</span>
            {flagged.has(q.id) && <span className="text-xs text-yellow-600 font-medium">🚩 Flagged</span>}
          </div>

          {/* Question */}
          <div className="bg-gray-50 rounded-xl p-4">
            {isMultiLine ? (
              <div className="space-y-2">
                <p className="font-mono text-sm bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-blue-800">
                  {q.question.split('\n')[0]}
                </p>
                <p className="font-medium text-gray-900 text-base">{q.question.split('\n')[1]}</p>
              </div>
            ) : (
              <p className="font-medium text-gray-900 text-base leading-relaxed">{q.question}</p>
            )}
            {q.hindi && <p className="text-xs text-gray-400 mt-1">{q.hindi}</p>}
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 gap-2">
            {q.options.map((opt, oi) => {
              const label = String.fromCharCode(65 + oi) // A B C D
              const isSelected = answers[q.id] === opt
              return (
                <motion.button
                  key={opt}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => pick(q.id, opt)}
                  className={`flex items-start gap-3 text-left py-3 px-4 rounded-xl border-2 text-sm transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 text-blue-900 font-medium'
                      : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className={`shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center mt-0.5 ${
                    isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {label}
                  </span>
                  <span className="leading-relaxed">{opt}</span>
                </motion.button>
              )
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Bottom nav */}
      <div className="flex gap-2">
        <button
          onClick={() => setCurrent(c => Math.max(0, c - 1))}
          disabled={current === 0}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
        >
          ← Prev
        </button>
        {current < questions.length - 1 ? (
          <button
            onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-800 transition-colors"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors"
          >
            Submit Test ✓
          </button>
        )}
        {current < questions.length - 1 && (
          <button
            onClick={handleSubmit}
            className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors"
          >
            Submit
          </button>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Results screen
// ─────────────────────────────────────────────────────────────
function ResultsScreen({ questions, answers, timeTakenSecs, durationMins, exam, onRetry, onBack }) {
  const [showReview, setShowReview] = useState(false)
  const [reviewFilter, setReviewFilter] = useState('all')

  const correct = questions.filter(q => answers[q.id] === q.correct).length
  const attempted = Object.keys(answers).length
  const wrong = attempted - correct
  const skipped = questions.length - attempted
  const pct = Math.round((correct / questions.length) * 100)
  const timeMins = Math.floor(timeTakenSecs / 60)
  const timeSecs = timeTakenSecs % 60

  const grade =
    pct >= 85 ? { label: 'Excellent', color: 'text-green-600', emoji: '🏆' }
    : pct >= 70 ? { label: 'Good',     color: 'text-blue-600',  emoji: '👍' }
    : pct >= 50 ? { label: 'Average',  color: 'text-yellow-600', emoji: '📚' }
    : { label: 'Needs Work', color: 'text-red-600', emoji: '💪' }

  // Category-wise breakdown
  const byType = {}
  questions.forEach(q => {
    if (!byType[q.typeLabel]) byType[q.typeLabel] = { total: 0, correct: 0 }
    byType[q.typeLabel].total++
    if (answers[q.id] === q.correct) byType[q.typeLabel].correct++
  })

  const reviewList = questions.filter(q => {
    if (reviewFilter === 'correct') return answers[q.id] === q.correct
    if (reviewFilter === 'wrong') return answers[q.id] && answers[q.id] !== q.correct
    if (reviewFilter === 'skipped') return !answers[q.id]
    return true
  })

  return (
    <div className="space-y-5">
      {/* Score card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-orange-500 to-amber-400 rounded-2xl p-6 text-white text-center space-y-2"
      >
        <p className="text-4xl">{grade.emoji}</p>
        <p className="text-3xl font-extrabold">{correct}/{questions.length}</p>
        <p className="text-lg font-semibold opacity-90">{pct}% · {grade.label}</p>
        <p className="text-sm opacity-75">{exam} Mock Test · {durationMins} min</p>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Correct', val: correct, color: 'text-green-600' },
          { label: 'Wrong',   val: wrong,   color: 'text-red-500' },
          { label: 'Skipped', val: skipped, color: 'text-gray-400' },
          { label: 'Time',    val: `${timeMins}:${String(timeSecs).padStart(2,'0')}`, color: 'text-blue-600' },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-xl p-3 text-center">
            <p className={`text-xl font-extrabold ${color}`}>{val}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Category breakdown */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Category Breakdown</p>
        {Object.entries(byType).map(([label, { total, correct: c }]) => {
          const p = Math.round((c / total) * 100)
          return (
            <div key={label} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700 font-medium">{label}</span>
                <span className="text-gray-500">{c}/{total} ({p}%)</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${p >= 70 ? 'bg-green-400' : p >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`}
                  style={{ width: `${p}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Review toggle */}
      <div>
        <button
          onClick={() => setShowReview(s => !s)}
          className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-sm font-medium text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-colors"
        >
          {showReview ? '▲ Hide Review' : '▼ Review Questions'}
        </button>
      </div>

      <AnimatePresence>
        {showReview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {/* Filter tabs */}
            <div className="flex gap-2">
              {['all', 'correct', 'wrong', 'skipped'].map(f => (
                <button
                  key={f}
                  onClick={() => setReviewFilter(f)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-colors ${
                    reviewFilter === f
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {reviewList.map((q, i) => {
              const userAns = answers[q.id]
              const isCorrect = userAns === q.correct
              const isSkipped = !userAns
              return (
                <div
                  key={q.id}
                  className={`border rounded-xl p-4 space-y-2 text-sm ${
                    isSkipped ? 'border-gray-200 bg-gray-50'
                    : isCorrect ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg shrink-0">{isSkipped ? '⬜' : isCorrect ? '✅' : '❌'}</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 leading-relaxed">
                        {q.question.replace('\n', ' ')}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{q.typeLabel} · {q.pyq}</p>
                    </div>
                  </div>
                  {!isSkipped && !isCorrect && (
                    <p className="text-xs text-red-700">Your answer: <em>{userAns}</em></p>
                  )}
                  <p className={`text-xs font-semibold ${isCorrect ? 'text-green-700' : 'text-gray-700'}`}>
                    Correct: {q.correct}
                  </p>
                  <p className="text-xs text-gray-500 italic">{q.explanation}</p>
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-colors"
        >
          🔁 New Test
        </button>
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-sm transition-colors"
        >
          ← Back
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MockTest — main
// ─────────────────────────────────────────────────────────────
export default function MockTest({ onBack, onComplete }) {
  const [phase, setPhase] = useState('config')   // config | test | results
  const [testConfig, setTestConfig] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [timeTaken, setTimeTaken] = useState(0)

  function handleStart(cfg) {
    const qs = buildQuestions(
      advanced.words,
      advanced.idioms ?? [],
      cfg.exam,
      cfg.count
    )
    setTestConfig(cfg)
    setQuestions(qs)
    setPhase('test')
  }

  function handleComplete(ans, secs) {
    setAnswers(ans)
    setTimeTaken(secs)
    const correct = questions.filter(q => ans[q.id] === q.correct).length
    onComplete?.({ correct, total: questions.length, wordsAnswered: questions.map(q => q.word) })
    setPhase('results')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow p-6 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎯</span>
          <span className="font-bold text-gray-800">Mock Test</span>
          {testConfig && (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
              {testConfig.exam}
            </span>
          )}
        </div>
        {phase !== 'test' && (
          <button
            onClick={onBack}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Back
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {phase === 'config' && (
          <motion.div key="config" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ConfigScreen onStart={handleStart} onBack={onBack} />
          </motion.div>
        )}
        {phase === 'test' && (
          <motion.div key="test" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <TestScreen
              questions={questions}
              durationMins={testConfig.duration}
              onComplete={handleComplete}
            />
          </motion.div>
        )}
        {phase === 'results' && (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ResultsScreen
              questions={questions}
              answers={answers}
              timeTakenSecs={timeTaken}
              durationMins={testConfig.duration}
              exam={testConfig.exam}
              onRetry={() => setPhase('config')}
              onBack={onBack}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
