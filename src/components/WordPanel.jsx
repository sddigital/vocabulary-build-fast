import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDictionary, useWordImage } from '../hooks/useDictionary'

// ─── Slide-up container ───────────────────────────────────────────────────────

export default function WordPanel({ word, level }) {
  const { entry, loading, error } = useDictionary(word)

  if (error === 'not_found' || (!loading && !entry)) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28, delay: 0.08 }}
      className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden"
    >
      {/* Header bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
        <span className="text-base">📖</span>
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Dictionary</span>
        {entry?.phonetic && (
          <span className="ml-auto text-xs text-gray-400 font-mono">{entry.phonetic}</span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {loading && <Skeleton />}

        {entry && !loading && (
          <>
            {level === 'beginners'    && <BeginnerView  entry={entry} word={word} />}
            {level === 'intermediate' && <IntermediateView entry={entry} />}
            {level === 'advanced'     && <AdvancedView entry={entry} />}
          </>
        )}
      </div>
    </motion.div>
  )
}

// ─── BEGINNER VIEW ────────────────────────────────────────────────────────────
// Simple definition + Wikipedia image

function BeginnerView({ entry, word }) {
  const image = useWordImage(word)

  return (
    <div className="flex gap-4 items-start">
      {/* Image */}
      <AnimatePresence>
        {image && (
          <motion.img
            key="wiki-img"
            src={image}
            alt={word}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="w-20 h-20 object-cover rounded-xl shrink-0 border border-gray-100"
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
        )}
        {image === null && (
          <motion.div
            key="img-fallback"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-20 h-20 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 shrink-0 flex items-center justify-center border border-emerald-100"
          >
            <span className="text-3xl">📚</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Text */}
      <div className="flex-1 space-y-2 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base font-bold text-gray-900">{entry.word}</span>
          {entry.primaryPos && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              {entry.primaryPos}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">{entry.primaryDef}</p>
        {entry.examples[0] && (
          <p className="text-xs italic text-gray-400 leading-relaxed">
            &ldquo;{entry.examples[0]}&rdquo;
          </p>
        )}
      </div>
    </div>
  )
}

// ─── INTERMEDIATE VIEW ────────────────────────────────────────────────────────
// Definition + synonyms/antonyms in a tooltip-style expandable

function IntermediateView({ entry }) {
  const [open, setOpen] = useState(false)
  const hasSyn = entry.synonyms.length > 0
  const hasAnt = entry.antonyms.length > 0

  return (
    <div className="space-y-3">
      {/* Primary definition */}
      <div className="flex items-start gap-2">
        {entry.primaryPos && (
          <span className="shrink-0 mt-0.5 text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
            {entry.primaryPos}
          </span>
        )}
        <p className="text-sm text-gray-700 leading-relaxed">{entry.primaryDef}</p>
      </div>

      {/* Tooltip-style syn/ant toggle */}
      {(hasSyn || hasAnt) && (
        <div>
          <button
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
          >
            <motion.span
              animate={{ rotate: open ? 90 : 0 }}
              transition={{ duration: 0.2 }}
              className="inline-block"
            >
              ▶
            </motion.span>
            Synonyms &amp; Antonyms
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="pt-3 space-y-2.5">
                  {hasSyn && (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                        Synonyms
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {entry.synonyms.map(s => (
                          <Pill key={s} color="blue">{s}</Pill>
                        ))}
                      </div>
                    </div>
                  )}
                  {hasAnt && (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                        Antonyms
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {entry.antonyms.map(a => (
                          <Pill key={a} color="rose">{a}</Pill>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

// ─── ADVANCED VIEW ────────────────────────────────────────────────────────────
// Etymology + multiple definitions + usage sentences

function AdvancedView({ entry }) {
  return (
    <div className="space-y-4">
      {/* Etymology */}
      {entry.origin && (
        <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-3">
          <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-1">
            Etymology
          </p>
          <p className="text-xs text-violet-900 leading-relaxed">{entry.origin}</p>
        </div>
      )}

      {/* Definitions with examples */}
      <div className="space-y-3">
        {entry.definitions.slice(0, 3).map((d, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
            className="flex gap-3"
          >
            <span className="shrink-0 w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                  {d.partOfSpeech}
                </span>
              </div>
              <p className="text-sm text-gray-800 leading-relaxed">{d.definition}</p>
              {d.example && (
                <p className="text-xs italic text-gray-400 leading-relaxed">
                  &ldquo;{d.example}&rdquo;
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Usage sentences (additional) */}
      {entry.examples.length > 1 && (
        <div className="border-t border-gray-100 pt-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
            Usage
          </p>
          <ul className="space-y-1.5">
            {entry.examples.slice(1, 4).map((ex, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-500 italic leading-relaxed">
                <span className="text-gray-300 shrink-0 mt-0.5">—</span>
                {ex}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="flex gap-3">
        <div className="w-20 h-20 bg-gray-100 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3 bg-gray-100 rounded w-1/3" />
          <div className="h-3 bg-gray-100 rounded w-full" />
          <div className="h-3 bg-gray-100 rounded w-4/5" />
        </div>
      </div>
    </div>
  )
}

// ─── Shared Pill component ────────────────────────────────────────────────────

const PILL_COLORS = {
  blue: 'bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100',
  rose: 'bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100',
}

function Pill({ children, color = 'blue' }) {
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${PILL_COLORS[color]}`}>
      {children}
    </span>
  )
}
