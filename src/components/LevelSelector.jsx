import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Level config ────────────────────────────────────────────────────────────

const LEVELS = [
  {
    id: 'beginners',
    label: 'Beginners',
    icon: '🌱',
    target: 'Class 5-8 CBSE / State Board',
    wordTarget: 1500,
    formats: [
      { id: 'word_hindi', label: 'Word ↔ Hindi' },
      { id: 'audio_word', label: 'Listen & Spell' },
    ],
  },
  {
    id: 'intermediate',
    label: 'Intermediate',
    icon: '📘',
    target: 'Class 9-10',
    wordTarget: 2500,
    formats: [
      { id: 'synonyms_4opt', label: 'Synonyms' },
      { id: 'antonyms', label: 'Antonyms' },
      { id: 'fill_blanks', label: 'Fill in Blanks' },
    ],
  },
  {
    id: 'advanced',
    label: 'Advanced',
    icon: '🔥',
    target: 'Class 11-12 + SSC / UPSC / Banking',
    wordTarget: 5000,
    formats: [
      { id: 'one_word_sub', label: 'One Word Sub.' },
      { id: 'idioms_phrases', label: 'Idioms' },
      { id: 'word_analogy', label: 'Word Analogy' },
      { id: 'cloze_test', label: 'Cloze Test' },
    ],
  },
]

// Per-level Tailwind colour tokens (must be static strings for Tailwind JIT)
const STYLES = {
  beginners: {
    gradient: 'from-emerald-700 to-teal-500',
    bar: 'from-emerald-400 to-teal-400',
    formatBar: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-800',
    ring: 'ring-2 ring-emerald-200',
    btn: 'bg-emerald-600 hover:bg-emerald-700',
    resetBtn: 'text-emerald-600 hover:text-emerald-800',
  },
  intermediate: {
    gradient: 'from-blue-700 to-sky-500',
    bar: 'from-blue-400 to-sky-400',
    formatBar: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-800',
    ring: 'ring-2 ring-blue-200',
    btn: 'bg-blue-600 hover:bg-blue-700',
    resetBtn: 'text-blue-600 hover:text-blue-800',
  },
  advanced: {
    gradient: 'from-violet-700 to-purple-500',
    bar: 'from-violet-400 to-purple-400',
    formatBar: 'bg-violet-500',
    badge: 'bg-violet-100 text-violet-800',
    ring: 'ring-2 ring-violet-200',
    btn: 'bg-violet-600 hover:bg-violet-700',
    resetBtn: 'text-violet-600 hover:text-violet-800',
  },
}

// ─── Slide animation variants ────────────────────────────────────────────────

const slideVariants = {
  enter: dir => ({ x: dir > 0 ? '60%' : '-60%', opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } },
  exit: dir => ({
    x: dir > 0 ? '-60%' : '60%',
    opacity: 0,
    transition: { duration: 0.18 },
  }),
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function LevelSelector({ progress, onSelect, onResetLevel }) {
  const [activeIdx, setActiveIdx] = useState(0)
  const [direction, setDirection] = useState(0)

  function goTo(idx) {
    if (idx === activeIdx) return
    setDirection(idx > activeIdx ? 1 : -1)
    setActiveIdx(idx)
  }

  function handleDragEnd(_, info) {
    const { offset, velocity } = info
    const swipe = Math.abs(offset.x) > 60 || Math.abs(velocity.x) > 400
    if (!swipe) return
    if (offset.x < 0 && activeIdx < LEVELS.length - 1) goTo(activeIdx + 1)
    else if (offset.x > 0 && activeIdx > 0) goTo(activeIdx - 1)
  }

  const level = LEVELS[activeIdx]
  const styles = STYLES[level.id]
  const lvlProgress = progress[level.id]
  const wordsCompleted = lvlProgress.words_completed.length
  const progressPct = Math.min((wordsCompleted / level.wordTarget) * 100, 100)

  return (
    <div className="space-y-4">
      {/* ── Tab bar ── */}
      <div className="relative flex bg-gray-100 rounded-2xl p-1 gap-1">
        {LEVELS.map((l, i) => (
          <button
            key={l.id}
            onClick={() => goTo(i)}
            className={`relative flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors z-10 ${
              activeIdx === i ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {activeIdx === i && (
              <motion.div
                layoutId="tab-pill"
                className="absolute inset-0 bg-white rounded-xl shadow-sm"
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-1.5">
              <span>{l.icon}</span>
              <span className="hidden sm:inline">{l.label}</span>
              <span className="sm:hidden">{l.label.split(' ')[0]}</span>
            </span>
          </button>
        ))}
      </div>

      {/* ── Swipeable content ── */}
      <div className="overflow-hidden rounded-2xl">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={level.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={handleDragEnd}
            style={{ touchAction: 'pan-y' }}
            className="cursor-grab active:cursor-grabbing"
          >
            <LevelCard
              level={level}
              styles={styles}
              wordsCompleted={wordsCompleted}
              progressPct={progressPct}
              quizScores={lvlProgress.quiz_scores}
              onSelect={() => onSelect(level.id)}
              onReset={() => onResetLevel(level.id)}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Swipe hint ── */}
      <p className="text-center text-xs text-gray-400 select-none">
        ← swipe to switch levels →
      </p>
    </div>
  )
}

// ─── Level card ───────────────────────────────────────────────────────────────

function LevelCard({ level, styles, wordsCompleted, progressPct, quizScores, onSelect, onReset }) {
  const [confirmReset, setConfirmReset] = useState(false)

  function handleReset() {
    if (!confirmReset) { setConfirmReset(true); return }
    onReset()
    setConfirmReset(false)
  }

  return (
    <div className={`bg-white rounded-2xl shadow overflow-hidden ${styles.ring}`}>
      {/* Header gradient */}
      <div className={`bg-gradient-to-br ${styles.gradient} px-6 pt-6 pb-8 text-white`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-4xl mb-2">{level.icon}</div>
            <h2 className="text-2xl font-extrabold tracking-tight">{level.label}</h2>
            <p className="text-sm opacity-80 mt-0.5">{level.target}</p>
          </div>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full bg-white/20 border border-white/30`}>
            {level.formats.length} formats
          </span>
        </div>

        {/* Overall progress */}
        <div className="mt-5">
          <div className="flex justify-between text-xs font-medium opacity-90 mb-2">
            <span>Words completed</span>
            <span>{wordsCompleted.toLocaleString()} / {level.wordTarget.toLocaleString()}</span>
          </div>
          <div className="h-2.5 bg-white/25 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${styles.bar}`}
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <div className="text-right text-xs mt-1 opacity-75 font-semibold">
            {progressPct.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Format scores */}
      <div className="px-6 py-5 space-y-3">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Quiz Formats
        </h3>

        {level.formats.map(fmt => {
          const scores = quizScores[fmt.id] ?? []
          const attempts = scores.length
          const best = attempts > 0 ? Math.max(...scores.map(s => s.score)) : null
          const lastTotal = attempts > 0 ? scores[scores.length - 1].total : 10
          const pct = best !== null ? (best / lastTotal) * 100 : 0

          return (
            <FormatRow
              key={fmt.id}
              label={fmt.label}
              best={best}
              total={lastTotal}
              pct={pct}
              attempts={attempts}
              barClass={styles.formatBar}
              badgeClass={styles.badge}
            />
          )
        })}
      </div>

      {/* Actions */}
      <div className="px-6 pb-6 flex items-center justify-between gap-3">
        <button
          onClick={handleReset}
          className={`text-xs font-medium transition-colors ${
            confirmReset ? 'text-red-500 font-bold' : styles.resetBtn
          }`}
        >
          {confirmReset ? 'Tap again to confirm reset' : 'Reset progress'}
        </button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onSelect}
          className={`${styles.btn} text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-sm`}
        >
          Start Practice →
        </motion.button>
      </div>
    </div>
  )
}

// ─── Format row ───────────────────────────────────────────────────────────────

function FormatRow({ label, best, total, pct, attempts, barClass, badgeClass }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <div className="flex items-center gap-2">
          {attempts > 0 && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeClass}`}>
              {attempts} {attempts === 1 ? 'attempt' : 'attempts'}
            </span>
          )}
          <span className="text-xs font-bold text-gray-500 w-14 text-right">
            {best !== null ? `${best}/${total}` : 'Not started'}
          </span>
        </div>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barClass}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
        />
      </div>
    </div>
  )
}
