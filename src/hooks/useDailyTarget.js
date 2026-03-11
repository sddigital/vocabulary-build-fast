import { useState, useCallback } from 'react'

const DAILY_KEY = () => `vocab_daily_${new Date().toISOString().split('T')[0]}`

const TARGETS = { advanced: 50, intermediate: 30, beginners: 20 }

export function useDailyTarget(level = 'advanced') {
  const target = TARGETS[level] ?? 50

  const [words, setWords] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(DAILY_KEY()) ?? '[]')) }
    catch { return new Set() }
  })

  const markStudied = useCallback((wordList = []) => {
    setWords(prev => {
      const next = new Set([...prev, ...wordList])
      localStorage.setItem(DAILY_KEY(), JSON.stringify([...next]))
      return next
    })
  }, [])

  const count = words.size
  return {
    count,
    target,
    pct: Math.min(100, Math.round((count / target) * 100)),
    remaining: Math.max(0, target - count),
    isComplete: count >= target,
    markStudied,
  }
}
