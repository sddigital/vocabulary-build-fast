import { useState, useRef, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useVocabPage } from '../hooks/useVocabPage'

// ─────────────────────────────────────────────────────────────
// Spaced Repetition — SM-2
// ─────────────────────────────────────────────────────────────
const SR_KEY = 'vocab_sr'
function loadSR() {
  try { return JSON.parse(localStorage.getItem(SR_KEY) ?? '{}') } catch { return {} }
}
function updateSR(key, quality /* 0-5 */) {
  const data = loadSR()
  const e = data[key] ?? { ef: 2.5, interval: 1, reps: 0 }
  if (quality < 3) {
    e.reps = 0; e.interval = 1
  } else {
    if (e.reps === 0) e.interval = 1
    else if (e.reps === 1) e.interval = 6
    else e.interval = Math.round(e.interval * e.ef)
    e.ef = Math.max(1.3, e.ef + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    e.reps++
  }
  const d = new Date(); d.setDate(d.getDate() + e.interval)
  e.nextReview = d.toISOString().split('T')[0]
  data[key] = e
  localStorage.setItem(SR_KEY, JSON.stringify(data))
}
function sortBySR(words, levelKey) {
  const data = loadSR()
  const today = new Date().toISOString().split('T')[0]
  return [...words].sort((a, b) => {
    const na = data[`${levelKey}:${a.word}`]?.nextReview ?? '2000-01-01'
    const nb = data[`${levelKey}:${b.word}`]?.nextReview ?? '2000-01-01'
    const da = na <= today ? 0 : 1
    const db = nb <= today ? 0 : 1
    return da !== db ? da - db : na.localeCompare(nb)
  })
}

// ─────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────
const shuffle = arr => [...arr].sort(() => Math.random() - 0.5)

function wrongOpts(allWords, exclude, field, count = 3) {
  return shuffle(
    allWords
      .filter(w => w.word !== exclude.word)
      .flatMap(w => Array.isArray(w[field]) ? [w[field][0]] : w[field] ? [w[field]] : [])
      .filter(Boolean)
  ).slice(0, count)
}

function tts(text, lang = 'en-IN') {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang; u.rate = 0.85
  window.speechSynthesis.speak(u)
}

export const FORMAT_META = {
  word_hindi:       { label: 'Word ↔ Hindi',      icon: '🔁', level: 'beginners',    color: 'blue',   batch: true },
  audio_word:       { label: 'Listen & Spell',    icon: '🔊', level: 'beginners',    color: 'purple' },
  synonyms_4opt:    { label: 'Synonyms',           icon: '🔤', level: 'intermediate', color: 'green' },
  antonyms:         { label: 'Antonyms',           icon: '↔️', level: 'intermediate', color: 'teal' },
  fill_blanks:      { label: 'Fill the Blank',     icon: '✏️', level: 'intermediate', color: 'emerald' },
  one_word_sub:     { label: 'One Word Sub.',      icon: '💡', level: 'advanced',     color: 'orange' },
  idioms_phrases:   { label: 'Idioms & Phrases',   icon: '🗣️', level: 'advanced',     color: 'red' },
  word_analogy:     { label: 'Word Analogy',       icon: '🔗', level: 'advanced',     color: 'indigo' },
  cloze_test:       { label: 'Cloze Test',         icon: '📄', level: 'advanced',     color: 'amber',  batch: true },
}

export const LEVEL_FORMATS = {
  beginners:    ['word_hindi', 'audio_word'],
  intermediate: ['synonyms_4opt', 'antonyms', 'fill_blanks'],
  advanced:     ['one_word_sub', 'idioms_phrases', 'word_analogy', 'cloze_test'],
}

// ─────────────────────────────────────────────────────────────
// Shared: MCQ
// ─────────────────────────────────────────────────────────────
function MCQ({ question, hint, options, correct, onAnswer }) {
  const [picked, setPicked] = useState(null)

  function choose(opt) {
    if (picked) return
    setPicked(opt)
    setTimeout(() => onAnswer(opt === correct, opt), 500)
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
        <p className="text-base font-medium text-gray-900 leading-relaxed">{question}</p>
        {hint && <p className="text-sm text-gray-400 mt-1">{hint}</p>}
      </div>
      <div className="grid grid-cols-1 gap-2.5">
        {options.map(opt => {
          const isChosen = picked === opt
          const isRight = opt === correct
          let cls = 'bg-white border-gray-200 text-gray-800'
          if (picked) {
            if (isRight) cls = 'bg-green-50 border-green-500 text-green-800'
            else if (isChosen) cls = 'bg-red-50 border-red-400 text-red-700'
          }
          return (
            <motion.button
              key={opt}
              whileTap={!picked ? { scale: 0.98 } : {}}
              onClick={() => choose(opt)}
              disabled={!!picked}
              className={`w-full text-left py-3.5 px-4 rounded-xl border-2 font-medium text-sm transition-colors ${cls} ${!picked ? 'hover:border-blue-400 hover:bg-blue-50' : ''}`}
            >
              {opt}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Format 1: WordHindi — click-to-match (batch of 5)
// ─────────────────────────────────────────────────────────────
function WordHindi({ words, onBatchComplete }) {
  const batch = words.slice(0, 5)
  const hindiCol = useRef(shuffle(batch.map(w => ({ word: w.word, hindi: w.hindi }))))
  const [selEng, setSelEng] = useState(null)
  const [selHi, setSelHi] = useState(null)
  const [matched, setMatched] = useState({}) // word → true/false
  const [wrong, setWrong] = useState(null)

  const allDone = batch.every(w => matched[w.word] !== undefined)
  useEffect(() => {
    if (allDone) {
      const s = Object.values(matched).filter(Boolean).length
      setTimeout(() => onBatchComplete(s, batch.length), 900)
    }
  }, [allDone]) // eslint-disable-line

  function tryPair(eng, hi) {
    if (!eng || !hi) return
    const correct = hi.word === eng
    setMatched(m => ({ ...m, [eng]: correct }))
    if (!correct) {
      setWrong(eng)
      setTimeout(() => setWrong(null), 600)
    }
    setSelEng(null); setSelHi(null)
  }

  function clickEng(word) {
    if (matched[word] !== undefined) return
    const next = selEng === word ? null : word
    setSelEng(next)
    if (next && selHi) tryPair(next, selHi)
  }

  function clickHi(item) {
    if (matched[item.word] !== undefined) return
    const next = selHi?.word === item.word ? null : item
    setSelHi(next)
    if (selEng && next) tryPair(selEng, next)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-500 text-center">
        Tap a word, then tap its Hindi meaning to match
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {batch.map(w => {
            const done = matched[w.word] !== undefined
            const isOk = matched[w.word] === true
            const isSel = selEng === w.word
            const isWrong = wrong === w.word
            return (
              <motion.button
                key={w.word}
                animate={isWrong ? { x: [0, -8, 8, -8, 0] } : {}}
                onClick={() => clickEng(w.word)}
                disabled={done}
                className={`w-full py-3 px-3 rounded-xl border-2 text-sm font-semibold transition-colors ${
                  done
                    ? isOk ? 'bg-green-100 border-green-400 text-green-800' : 'bg-red-100 border-red-300 text-red-700'
                    : isSel ? 'bg-blue-100 border-blue-500 text-blue-900 shadow-sm'
                    : 'bg-white border-gray-200 text-gray-800 hover:border-blue-300'
                }`}
              >
                {w.word}
              </motion.button>
            )
          })}
        </div>
        <div className="space-y-2">
          {hindiCol.current.map(item => {
            const done = matched[item.word] !== undefined
            const isSel = selHi?.word === item.word
            return (
              <motion.button
                key={item.hindi}
                onClick={() => clickHi(item)}
                disabled={done}
                className={`w-full py-3 px-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                  done ? 'bg-gray-100 border-gray-200 text-gray-400'
                    : isSel ? 'bg-blue-100 border-blue-500 text-blue-900 shadow-sm'
                    : 'bg-white border-gray-200 text-gray-800 hover:border-blue-300'
                }`}
              >
                {item.hindi}
              </motion.button>
            )
          })}
        </div>
      </div>
      {allDone && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center font-bold text-green-700"
        >
          Matched {Object.values(matched).filter(Boolean).length}/{batch.length} correctly!
        </motion.p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Format 3: AudioWord — hear TTS → type the word
// ─────────────────────────────────────────────────────────────
function AudioWord({ word, onAnswer }) {
  const [input, setInput] = useState('')
  const [played, setPlayed] = useState(false)
  const ref = useRef()

  function play() {
    tts(word.word, 'en-IN')
    setPlayed(true)
    setTimeout(() => ref.current?.focus(), 150)
  }

  function submit() {
    onAnswer(input.trim().toLowerCase() === word.word.toLowerCase(), input)
  }

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-8 text-center space-y-3">
        <div className="text-5xl">🔊</div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={play}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-8 py-3 rounded-xl transition-colors"
        >
          {played ? 'Play Again' : 'Play Word'}
        </motion.button>
        <p className="text-sm text-gray-500">Listen carefully, then type what you heard</p>
      </div>
      <AnimatePresence>
        {played && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <input
              ref={ref}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && input && submit()}
              placeholder="Type the word you heard…"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            />
            <button
              onClick={submit}
              disabled={!input}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Submit
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Format 4: Synonyms4Opt
// ─────────────────────────────────────────────────────────────
function Synonyms4Opt({ word, allWords, onAnswer }) {
  const correct = word.synonyms?.[0]
  const opts = useMemo(() =>
    shuffle([correct, ...wrongOpts(allWords, word, 'synonyms')]),
  [word])
  return (
    <MCQ
      question={<>What is a synonym of <strong className="text-green-700">{word.word}</strong>?</>}
      hint={word.meaning_en}
      options={opts}
      correct={correct}
      onAnswer={onAnswer}
    />
  )
}

// ─────────────────────────────────────────────────────────────
// Format 5: Antonyms
// ─────────────────────────────────────────────────────────────
function Antonyms({ word, allWords, onAnswer }) {
  const correct = word.antonyms?.[0]
  const opts = useMemo(() =>
    shuffle([correct, ...wrongOpts(allWords, word, 'antonyms')]),
  [word])
  return (
    <MCQ
      question={<>What is the antonym of <strong className="text-teal-700">{word.word}</strong>?</>}
      hint={word.meaning_en}
      options={opts}
      correct={correct}
      onAnswer={onAnswer}
    />
  )
}

// ─────────────────────────────────────────────────────────────
// Format 6: FillBlanks
// ─────────────────────────────────────────────────────────────
function FillBlanks({ word, onAnswer }) {
  const [input, setInput] = useState('')
  const ref = useRef()
  useEffect(() => { ref.current?.focus() }, [])
  const correct = word.correct_word ?? word.word
  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6 space-y-1">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Complete the sentence</p>
        <p className="text-base font-medium text-gray-900 leading-relaxed">{word.fill_blank}</p>
      </div>
      <input
        ref={ref}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && input && onAnswer(input.trim().toLowerCase() === correct.toLowerCase(), input)}
        placeholder="Type the missing word…"
        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      />
      <button
        onClick={() => onAnswer(input.trim().toLowerCase() === correct.toLowerCase(), input)}
        disabled={!input}
        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        Submit
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Format 7: OneWordSub
// ─────────────────────────────────────────────────────────────
function OneWordSub({ word, allWords, onAnswer }) {
  const q = word.one_word_sub?.question ?? `A word that means: ${word.meaning_en}`
  const correct = word.one_word_sub?.answer ?? word.word
  const opts = useMemo(() =>
    shuffle([correct, ...shuffle(allWords.filter(w => w.word !== word.word).map(w => w.word)).slice(0, 3)]),
  [word])
  return (
    <MCQ
      question={q}
      hint={`(${word.hindi})`}
      options={opts}
      correct={correct}
      onAnswer={onAnswer}
    />
  )
}

// ─────────────────────────────────────────────────────────────
// Format 8: IdiomsPhrase — uses one_word_sub.question as phrase
// ─────────────────────────────────────────────────────────────
function IdiomsPhrase({ word, allWords, onAnswer }) {
  const phrase = word.idiom?.phrase ?? word.one_word_sub?.question ?? word.meaning_en
  const correct = word.word
  const opts = useMemo(() =>
    shuffle([correct, ...shuffle(allWords.filter(w => w.word !== word.word).map(w => w.word)).slice(0, 3)]),
  [word])
  return (
    <MCQ
      question={<>What is the one-word / term for:<br/><em className="text-orange-700 not-italic font-medium">"{phrase}"</em></>}
      hint={word.hindi}
      options={opts}
      correct={correct}
      onAnswer={onAnswer}
    />
  )
}

// ─────────────────────────────────────────────────────────────
// Format 9: WordAnalogy
// ─────────────────────────────────────────────────────────────
function WordAnalogy({ word, allWords, onAnswer }) {
  const analogy = word.analogy
  const correct = analogy?.answer ?? word.word
  const opts = useMemo(() =>
    shuffle([correct, ...shuffle(allWords.filter(w => w.word !== word.word).map(w => w.word)).slice(0, 3)]),
  [word])
  const qText = analogy
    ? <><span className="font-mono bg-indigo-50 px-2 py-1 rounded text-sm">{analogy.pair}</span><br/>Complete: <strong>{analogy.question}</strong></>
    : <>Complete the analogy: <strong>{word.word}</strong> : {word.meaning_en} :: ? : ___</>
  return (
    <MCQ
      question={qText}
      hint={word.hindi}
      options={opts}
      correct={correct}
      onAnswer={onAnswer}
    />
  )
}

// ─────────────────────────────────────────────────────────────
// Format 10: ClozeTest — passage + 4-option MCQ per blank (exam style)
// ─────────────────────────────────────────────────────────────
const OPTION_LABELS = ['A', 'B', 'C', 'D']

function ClozeTest({ words, onBatchComplete }) {
  const batch = useMemo(() => words.slice(0, 5), [words])
  // selected[i] = chosen option string | null
  const [selected, setSelected] = useState(() => Array(Math.min(words.length, 5)).fill(null))
  const [submitted, setSubmitted] = useState(false)
  const [results, setResults] = useState([])

  // Build passage segments: plain text alternating with blank markers [B0]..[B4]
  const segments = useMemo(() => {
    const full = batch.map((w, i) => {
      const sentence = w.sentence ?? `${w.word} means ${w.meaning_en}.`
      if (sentence.includes('______')) return sentence.replace('______', `[B${i}]`)
      const target = w.correct_word ?? w.word
      return sentence.replace(
        new RegExp(`\\b${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
        `[B${i}]`
      )
    }).join(' ')
    return full.split(/(\[B\d+\])/)
  }, [batch])

  // Generate shuffled 4 options per blank from hint_words
  const optionSets = useMemo(() => batch.map(w => {
    if (w.hint_words) {
      const opts = w.hint_words.split(',').map(s => s.trim()).filter(Boolean)
      if (opts.length >= 4) return shuffle(opts).slice(0, 4)
    }
    // Fallback: correct + 3 placeholders from other batch words
    const correct = w.correct_word ?? w.word
    const others = shuffle(batch.filter(x => (x.correct_word ?? x.word) !== correct).map(x => x.correct_word ?? x.word)).slice(0, 3)
    return shuffle([correct, ...others])
  }), [batch])

  function submit() {
    const res = batch.map((w, i) =>
      (selected[i] ?? '').trim().toLowerCase() === (w.correct_word ?? w.word).toLowerCase()
    )
    setResults(res)
    setSubmitted(true)
  }

  const score = results.filter(Boolean).length
  const allAnswered = selected.every(s => s !== null)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
          📄 Cloze Test — SSC / UPSC Style
        </span>
        {submitted && (
          <span className={`text-sm font-bold px-3 py-1 rounded-full ${
            score === batch.length ? 'bg-green-100 text-green-700'
            : score >= 3 ? 'bg-amber-100 text-amber-700'
            : 'bg-red-100 text-red-700'
          }`}>
            {score}/{batch.length} correct
          </span>
        )}
      </div>

      {/* Passage */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
        <p className="text-xs text-amber-600 mb-3 font-semibold uppercase tracking-wide">
          Direction: Choose the correct word for each numbered blank.
        </p>
        <p className="text-base text-gray-800 leading-8">
          {segments.map((seg, i) => {
            const m = seg.match(/\[B(\d+)\]/)
            if (!m) return <span key={i}>{seg}</span>
            const idx = parseInt(m[1])
            if (idx >= batch.length) return null
            const correct = batch[idx].correct_word ?? batch[idx].word
            const chosen = selected[idx]
            const isRight = results[idx]
            return (
              <span key={i} className="inline-flex items-center mx-1 align-middle gap-0.5">
                <span className="text-xs font-bold text-amber-700">({idx + 1})</span>
                <span className={`border-b-2 px-2 py-0.5 min-w-[72px] text-center text-sm font-bold transition-all rounded-sm ${
                  !submitted
                    ? chosen
                      ? 'border-amber-500 text-amber-800 bg-amber-100'
                      : 'border-amber-300 text-gray-400 bg-white'
                    : isRight
                      ? 'border-green-500 text-green-700 bg-green-50'
                      : 'border-red-400 text-red-600 bg-red-50'
                }`}>
                  {submitted ? (isRight ? chosen : correct) : (chosen ?? '  ___  ')}
                </span>
              </span>
            )
          })}
        </p>
      </div>

      {/* Per-blank options */}
      <div className="space-y-4">
        {batch.map((w, idx) => {
          const correct = w.correct_word ?? w.word
          const opts = optionSets[idx]
          const chosen = selected[idx]
          return (
            <div key={w.word} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              {/* Blank label */}
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                Blank ({idx + 1})
                {submitted && (
                  <span className={`ml-2 font-bold ${results[idx] ? 'text-green-600' : 'text-red-500'}`}>
                    {results[idx] ? '✓ Correct' : `✗ Answer: ${correct}`}
                  </span>
                )}
              </p>
              {/* 4 options */}
              <div className="grid grid-cols-2 gap-2">
                {opts.map((opt, oi) => {
                  const label = OPTION_LABELS[oi]
                  const isChosen = chosen === opt
                  const isCorrect = opt.toLowerCase() === correct.toLowerCase()
                  let cls = 'flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all cursor-pointer '
                  if (!submitted) {
                    cls += isChosen
                      ? 'border-amber-500 bg-amber-50 text-amber-900'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-amber-300 hover:bg-amber-50'
                  } else {
                    if (isCorrect) cls += 'border-green-500 bg-green-50 text-green-800'
                    else if (isChosen) cls += 'border-red-400 bg-red-50 text-red-700 line-through'
                    else cls += 'border-gray-100 bg-gray-50 text-gray-400'
                  }
                  return (
                    <button
                      key={opt}
                      disabled={submitted}
                      onClick={() => {
                        if (submitted) return
                        const next = [...selected]; next[idx] = opt; setSelected(next)
                      }}
                      className={cls}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                        !submitted
                          ? isChosen ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-500'
                          : isCorrect ? 'bg-green-500 text-white'
                            : isChosen ? 'bg-red-400 text-white' : 'bg-gray-100 text-gray-400'
                      }`}>{label}</span>
                      {opt}
                    </button>
                  )
                })}
              </div>
              {/* Explanation after submit */}
              {submitted && w.meaning_en && (
                <p className="mt-2 text-xs text-gray-500 italic">{w.meaning_en}</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Submit / Next */}
      {!submitted ? (
        <button
          onClick={submit}
          disabled={!allAnswered}
          className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {allAnswered ? 'Submit Answers' : `Select all ${batch.length} options to submit`}
        </button>
      ) : (
        <button
          onClick={() => onBatchComplete(score, batch.length)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          Next →
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Feedback panel (shown between questions for single formats)
// ─────────────────────────────────────────────────────────────
function FeedbackPanel({ feedback, onNext }) {
  const { isCorrect, word } = feedback
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-5 space-y-2 text-sm leading-relaxed ${
        isCorrect
          ? 'bg-green-100 border-2 border-green-400 text-green-900'
          : 'bg-red-100 border-2 border-red-400 text-red-900'
      }`}
    >
      {isCorrect
        ? <p className="font-bold text-base">Correct! 🎉</p>
        : <p className="font-bold text-base">Correct answer: <span className="underline">{word.correct_word ?? word.word}</span></p>
      }
      {word.meaning_en && <p className="text-gray-800 font-medium">{word.meaning_en}</p>}
      {(word.meaning_hi ?? word.hindi) && <p className="text-gray-700">{word.meaning_hi ?? word.hindi}</p>}
      {word.example_sentence && (
        <p className={`italic font-medium text-sm border-l-4 pl-3 ${isCorrect ? 'border-green-500 text-green-800' : 'border-red-500 text-red-800'}`}>
          {word.example_sentence}
        </p>
      )}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => tts(word.correct_word ?? word.word, 'en-IN')}
          className="text-xs bg-white border border-gray-300 px-2 py-1 rounded-lg hover:bg-gray-50"
        >
          🔊 EN
        </button>
        {(word.meaning_hi ?? word.hindi) && (
          <button
            onClick={() => tts(word.meaning_hi ?? word.hindi, 'hi-IN')}
            className="text-xs bg-white border border-gray-300 px-2 py-1 rounded-lg hover:bg-gray-50"
          >
            🔊 हि
          </button>
        )}
      </div>
      <button
        onClick={onNext}
        className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-xl transition-colors"
      >
        Next →
      </button>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────
// QuizEngine — main
// ─────────────────────────────────────────────────────────────
const BATCH_FORMATS = new Set(['word_hindi', 'cloze_test'])
const SESSION_SIZE = 10  // words per session

export default function QuizEngine({ config, onBack, onSessionEnd }) {
  const { level, format, examFilter } = config
  const meta = FORMAT_META[format]

  // Fetch only the words for this level (+ optional exam filter). Max 100 in state.
  const { words: allWords, loading, error } = useVocabPage(level, {
    examFilter: examFilter ?? null,
  })

  const wordPool = allWords.length >= 5 ? allWords : allWords

  const sessionWords = useMemo(
    () => sortBySR(wordPool, level).slice(0, SESSION_SIZE),
    [wordPool, level],   // re-run only when the fetched pool changes
  )

  const isBatch = BATCH_FORMATS.has(format)
  const totalSteps = isBatch ? Math.ceil(sessionWords.length / 5) : sessionWords.length

  const [step, setStep] = useState(0)
  const [score, setScore] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [streak, setStreak] = useState(0)
  const [feedback, setFeedback] = useState(null) // single-word feedback
  const [done, setDone] = useState(false)

  const progress = Math.round((step / totalSteps) * 100)

  function handleAnswer(isCorrect, userInput) {
    const word = sessionWords[step]
    updateSR(`${level}:${word.word}`, isCorrect ? 5 : 1)
    if (isCorrect) {
      setScore(s => s + 10 + (streak >= 2 ? 5 : 0))
      setCorrect(c => c + 1)
      setStreak(s => s + 1)
    } else {
      setStreak(0)
    }
    setFeedback({ isCorrect, word, userInput })
  }

  function handleBatchComplete(batchScore, total) {
    const batch = sessionWords.slice(step * 5, step * 5 + 5)
    batch.forEach(w => updateSR(`${level}:${w.word}`, batchScore >= total / 2 ? 4 : 2))
    setScore(s => s + batchScore * 10)
    setCorrect(c => c + batchScore)
    setStreak(0)
    advance()
  }

  function advance() {
    setFeedback(null)
    const next = step + 1
    if (next >= totalSteps) {
      setDone(true)
      onSessionEnd?.({
        level, format,
        score: score + (feedback?.isCorrect ? 10 : 0),
        total: sessionWords.length,
        wordsAnswered: sessionWords.map(w => w.word),
      })
    } else {
      setStep(next)
    }
  }

  if (loading || sessionWords.length === 0) {
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
        <button onClick={onBack} className="mt-4 block mx-auto bg-blue-600 text-white px-6 py-2 rounded-xl">
          Back
        </button>
      </div>
    )
  }

  if (done) {
    const pct = Math.round((correct / sessionWords.length) * 100)
    const mastery = pct >= 80
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow p-10 text-center space-y-4"
      >
        <div className="text-5xl">{mastery ? '🏆' : '📚'}</div>
        <h2 className="text-2xl font-bold text-gray-900">{mastery ? 'Excellent!' : 'Keep Practising!'}</h2>
        <p className="text-gray-500 text-sm">{meta?.label} · {level}</p>
        <div className="flex justify-center gap-6 text-center">
          <div><p className="text-3xl font-extrabold text-blue-600">{score}</p><p className="text-xs text-gray-400">Score</p></div>
          <div><p className="text-3xl font-extrabold text-green-600">{correct}/{sessionWords.length}</p><p className="text-xs text-gray-400">Correct</p></div>
          <div><p className="text-3xl font-extrabold text-orange-500">{pct}%</p><p className="text-xs text-gray-400">Accuracy</p></div>
        </div>
        <button onClick={onBack} className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors">
          Back to Menu
        </button>
      </motion.div>
    )
  }

  // Current question data
  const word = isBatch ? null : sessionWords[step]
  const batchWords = isBatch ? sessionWords.slice(step * 5, step * 5 + 5) : []

  function renderFormat() {
    if (format === 'word_hindi')       return <WordHindi words={batchWords} onBatchComplete={handleBatchComplete} />
    if (format === 'audio_word')       return <AudioWord word={word} onAnswer={handleAnswer} />
    if (format === 'synonyms_4opt')    return <Synonyms4Opt word={word} allWords={allWords} onAnswer={handleAnswer} />
    if (format === 'antonyms')         return <Antonyms word={word} allWords={allWords} onAnswer={handleAnswer} />
    if (format === 'fill_blanks')      return <FillBlanks word={word} onAnswer={handleAnswer} />
    if (format === 'one_word_sub')     return <OneWordSub word={word} allWords={allWords} onAnswer={handleAnswer} />
    if (format === 'idioms_phrases')   return <IdiomsPhrase word={word} allWords={allWords} onAnswer={handleAnswer} />
    if (format === 'word_analogy')     return <WordAnalogy word={word} allWords={allWords} onAnswer={handleAnswer} />
    if (format === 'cloze_test')       return <ClozeTest words={batchWords} onBatchComplete={handleBatchComplete} />
    return <p className="text-red-500">Unknown format: {format}</p>
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-base font-bold text-gray-800">{meta?.icon} {meta?.label}</span>
          <span className="ml-2 text-xs text-gray-400 capitalize">{level}</span>
        </div>
        <div className="flex gap-2">
          <Pill>Score: {score}</Pill>
          <Pill>🔥 {streak}</Pill>
          <Pill>{step + 1}/{totalSteps}</Pill>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-600 to-sky-400 rounded-full"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* SR badge if word has been seen before */}
      {!isBatch && (() => {
        const sr = loadSR()[`${level}:${word?.word}`]
        if (!sr || sr.reps === 0) return null
        return <p className="text-xs text-indigo-500">↩ Review — seen {sr.reps}x</p>
      })()}

      {/* Question area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${format}-${step}`}
          variants={{ enter: { opacity: 0, x: 40 }, center: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -40 } }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.25 }}
        >
          {!feedback ? renderFormat() : (
            <FeedbackPanel feedback={feedback} onNext={advance} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Back */}
      <button
        onClick={() => { window.speechSynthesis?.cancel(); onBack() }}
        className="text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors"
      >
        ← Back
      </button>
    </div>
  )
}

function Pill({ children }) {
  return (
    <span className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full">
      {children}
    </span>
  )
}
