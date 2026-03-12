import { useState } from 'react'
import { motion } from 'framer-motion'
import { FORMAT_META, LEVEL_FORMATS } from './QuizEngine'
import { useDailyTarget } from '../hooks/useDailyTarget'

const CATEGORIES = {
  beginners:    ['home', 'office', 'friends', 'travel', 'school', 'food', 'health', 'shopping', 'emotions', 'actions'],
  intermediate: ['friends', 'emotions', 'health', 'social', 'environment', 'literature', 'science', 'history', 'geography', 'economics'],
  advanced:     ['home', 'office', 'travel', 'school', 'food', 'health', 'shopping', 'emotions', 'actions', 'general'],
}

const LEVEL_MAP = {
  beginners: 'easy',
  intermediate: 'medium',
  advanced: 'hard',
}

const ACCENT = {
  sky:     'bg-sky-50 border-sky-200 text-sky-800 hover:bg-sky-100',
  blue:    'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100',
  purple:  'bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100',
  green:   'bg-green-50 border-green-200 text-green-800 hover:bg-green-100',
  teal:    'bg-teal-50 border-teal-200 text-teal-800 hover:bg-teal-100',
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100',
  orange:  'bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100',
  red:     'bg-red-50 border-red-200 text-red-800 hover:bg-red-100',
  indigo:  'bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100',
  amber:   'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100',
}

export default function ControlPanel({ defaultLevel = 'beginners', onStartPractice, onBack, onLevelChange }) {
  const [level, setLevel] = useState(LEVEL_MAP[defaultLevel] ?? 'easy')
  const [shuffle, setShuffle] = useState(true)
  const [timer, setTimer] = useState(true)

  // Map filter level → json level key for QuizEngine
  const quizLevel = { easy: 'beginners', medium: 'intermediate', hard: 'advanced' }[level] ?? 'beginners'
  const formats = LEVEL_FORMATS[quizLevel] ?? []
  const isAdvanced = quizLevel === 'advanced'

  const daily = useDailyTarget(quizLevel)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-2xl shadow p-6 space-y-5"
    >
      {onBack && (
        <button
          onClick={onBack}
          className="text-sm text-gray-400 hover:text-gray-600 font-medium -mb-1"
        >
          ← Back to levels
        </button>
      )}

      {/* Controls row */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-600 block mb-1">Level</label>
          <select
            value={level}
            onChange={e => {
              setLevel(e.target.value)
              const jsonKey = { easy: 'beginners', medium: 'intermediate', hard: 'advanced' }[e.target.value]
              if (jsonKey && onLevelChange) onLevelChange(jsonKey)
            }}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:border-blue-500"
          >
            <option value="easy">Beginner</option>
            <option value="medium">Intermediate</option>
            <option value="hard">Advanced</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-600 cursor-pointer">
          <input type="checkbox" checked={shuffle} onChange={e => setShuffle(e.target.checked)} className="accent-blue-600" />
          Shuffle
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-600 cursor-pointer">
          <input type="checkbox" checked={timer} onChange={e => setTimer(e.target.checked)} className="accent-blue-600" />
          Timer
        </label>
      </div>

      <hr className="border-gray-100" />

      {/* Quick modes */}
      <div className="flex flex-col sm:flex-row gap-3">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onStartPractice({ mode: 'daily', level, shuffle, timer })}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          📅 Daily Challenge
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onStartPractice({ mode: 'mixed', level, shuffle, timer })}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          🔀 Mixed Mode
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onStartPractice({ mode: 'conversation', level: quizLevel })}
          className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          💬 Conversations
        </motion.button>
      </div>

      <hr className="border-gray-100" />

      {/* Format practice for this level */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">
          Format Practice · {quizLevel}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {formats.map(fmt => {
            const m = FORMAT_META[fmt]
            return (
              <motion.button
                key={fmt}
                whileTap={{ scale: 0.97 }}
                onClick={() => onStartPractice({ mode: 'quiz', format: fmt, level: quizLevel })}
                className={`flex items-center gap-3 py-3 px-4 rounded-xl border font-medium text-sm transition-colors ${ACCENT[m.color] ?? ACCENT.blue}`}
              >
                <span className="text-lg">{m.icon}</span>
                <span>{m.label}</span>
                {m.batch && <span className="ml-auto text-xs opacity-60">5 at a time</span>}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Advanced-only section */}
      {isAdvanced && (
        <>
          <hr className="border-gray-100" />
          <div className="space-y-3">
            {/* Daily target */}
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
                  📅 Daily Target
                </p>
                <span className={`text-xs font-bold ${daily.isComplete ? 'text-green-600' : 'text-orange-600'}`}>
                  {daily.count}/{daily.target} words
                  {daily.isComplete && ' ✓'}
                </span>
              </div>
              <div className="h-2.5 bg-orange-100 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${daily.isComplete ? 'bg-green-500' : 'bg-orange-400'}`}
                  animate={{ width: `${daily.pct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
              <p className="text-xs text-orange-600">
                {daily.isComplete
                  ? '🎉 Target complete! Keep going for extra practice.'
                  : `${daily.remaining} more words to reach today's target`}
              </p>
            </div>

            {/* Exam filter */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">
                Exam-wise Practice
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'SSC',     label: 'SSC',      icon: '📋', cls: 'bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100' },
                  { id: 'UPSC',    label: 'UPSC',     icon: '🏛️', cls: 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100' },
                  { id: 'Banking', label: 'Banking',  icon: '🏦', cls: 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100' },
                  { id: 'CLAT',    label: 'CLAT',     icon: '⚖️', cls: 'bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100' },
                ].map(e => (
                  <motion.button
                    key={e.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onStartPractice({ mode: 'quiz', format: 'one_word_sub', level: 'advanced', examFilter: e.id })}
                    className={`flex items-center gap-2 py-3 px-4 rounded-xl border font-medium text-sm transition-colors ${e.cls}`}
                  >
                    <span>{e.icon}</span>
                    <span>{e.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Mock test */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => onStartPractice({ mode: 'mocktest' })}
              className="w-full flex items-center justify-between bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-5 rounded-xl transition-colors"
            >
              <span className="flex items-center gap-2">
                <span className="text-xl">🎯</span>
                <span>Mock Test</span>
              </span>
              <span className="text-xs opacity-75 font-normal">SSC · UPSC · Banking · CLAT</span>
            </motion.button>
          </div>
        </>
      )}

      <hr className="border-gray-100" />

      {/* Category grid */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">Category Practice</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {(CATEGORIES[quizLevel] ?? CATEGORIES.beginners).map(cat => (
            <motion.button
              key={cat}
              whileTap={{ scale: 0.97 }}
              onClick={() => onStartPractice({ mode: 'category', category: cat, level, shuffle, timer })}
              className="capitalize py-3 px-2 rounded-xl border border-blue-100 bg-blue-50 text-blue-800 text-sm font-medium hover:bg-blue-100 hover:border-blue-300 transition-colors"
            >
              {cat === 'actions' ? 'Daily Actions' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
