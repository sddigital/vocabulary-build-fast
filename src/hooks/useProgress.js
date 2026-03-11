import { useState, useCallback } from 'react'

const STORAGE_KEY = 'vocab_progress'
const LEVEL_IDS = ['beginners', 'intermediate', 'advanced']

function defaultState() {
  return Object.fromEntries(
    LEVEL_IDS.map(id => [id, { words_completed: [], quiz_scores: {} }])
  )
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw)
    // Validate and fill missing keys
    return Object.fromEntries(
      LEVEL_IDS.map(id => [
        id,
        {
          words_completed: Array.isArray(parsed[id]?.words_completed)
            ? parsed[id].words_completed
            : [],
          quiz_scores:
            parsed[id]?.quiz_scores && typeof parsed[id].quiz_scores === 'object'
              ? parsed[id].quiz_scores
              : {},
        },
      ])
    )
  } catch {
    return defaultState()
  }
}

function persist(next) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function useProgress() {
  const [progress, setProgress] = useState(loadFromStorage)

  /**
   * Mark a word as completed for a given level.
   * Idempotent — calling twice for the same word is safe.
   */
  const markWordCompleted = useCallback((level, word) => {
    setProgress(prev => {
      if (prev[level].words_completed.includes(word)) return prev
      return persist({
        ...prev,
        [level]: {
          ...prev[level],
          words_completed: [...prev[level].words_completed, word],
        },
      })
    })
  }, [])

  /**
   * Record a quiz score for a given level + format.
   * Appends to the history array; keeps all attempts for trend tracking.
   *
   * @param {string} level       - 'beginners' | 'intermediate' | 'advanced'
   * @param {string} format      - e.g. 'word_hindi' | 'synonyms_4opt'
   * @param {number} score       - number correct
   * @param {number} total       - total questions in the session
   */
  const recordQuizScore = useCallback((level, format, score, total) => {
    setProgress(prev => {
      const existing = prev[level].quiz_scores[format] ?? []
      const entry = {
        score,
        total,
        date: new Date().toISOString().slice(0, 10),
      }
      return persist({
        ...prev,
        [level]: {
          ...prev[level],
          quiz_scores: {
            ...prev[level].quiz_scores,
            [format]: [...existing, entry],
          },
        },
      })
    })
  }, [])

  /**
   * Reset all progress for a level (words + scores).
   */
  const resetLevel = useCallback((level) => {
    setProgress(prev =>
      persist({
        ...prev,
        [level]: { words_completed: [], quiz_scores: {} },
      })
    )
  }, [])

  /**
   * Derived helpers
   */
  function getBestScore(level, format) {
    const scores = progress[level]?.quiz_scores?.[format]
    if (!scores || scores.length === 0) return null
    return Math.max(...scores.map(s => s.score))
  }

  function getLastScore(level, format) {
    const scores = progress[level]?.quiz_scores?.[format]
    if (!scores || scores.length === 0) return null
    return scores[scores.length - 1]
  }

  function getAttemptCount(level, format) {
    return progress[level]?.quiz_scores?.[format]?.length ?? 0
  }

  return {
    progress,
    markWordCompleted,
    recordQuizScore,
    resetLevel,
    getBestScore,
    getLastScore,
    getAttemptCount,
  }
}
