/**
 * useVocabPage — on-demand vocabulary loader with pagination
 *
 * Rules:
 *  - Fetches /data/{level}/index.json once per level (cached in module scope)
 *  - For topic/examFilter: fetches the topic file (≤100 words, cached)
 *  - For sequential browsing: fetches one 100-word chunk per "window"
 *  - Never puts more than MAX_CACHED (100) words into React state
 *  - Exposes pageWords (20 words) for display + words (≤100) for distractor pools
 *
 * Usage:
 *   const { words, pageWords, page, totalPages, setPage, loading, error } =
 *     useVocabPage('beginners', { topic: 'food' })
 *
 *   const { words, page, totalPages, setPage, loading, error } =
 *     useVocabPage('advanced', { examFilter: 'ssc' })
 */

import { useState, useEffect, useCallback, useRef } from 'react'

const PAGE_SIZE  = 20
const MAX_CACHED = 100   // must equal chunkSize written by split-data.mjs

// Module-level caches — survive re-renders, cleared only on page refresh
const manifestCache = {}  // { [level]: manifest }
const chunkCache    = {}  // { [`${level}/${file}`]: Word[] }

async function fetchJSON(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} fetching ${url}`)
  return res.json()
}

async function getManifest(level) {
  if (manifestCache[level]) return manifestCache[level]
  const data = await fetchJSON(`/data/${level}/index.json`)
  manifestCache[level] = data
  return data
}

async function getCachedChunk(level, filename) {
  const key = `${level}/${filename}`
  if (chunkCache[key]) return chunkCache[key]
  const data = await fetchJSON(`/data/${level}/${filename}`)
  chunkCache[key] = data.words
  return data.words
}

/**
 * @param {string} level       'beginners' | 'intermediate' | 'advanced'
 * @param {object} [opts]
 * @param {string|null} [opts.topic]       category id  (beginners)
 * @param {string|null} [opts.examFilter]  exam_category (advanced), e.g. 'ssc'
 * @param {number}      [opts.initialPage] starting page index (0-based)
 */
export function useVocabPage(level, {
  topic       = null,
  examFilter  = null,
  initialPage = 0,
} = {}) {
  // words = the window of ≤100 words currently in state
  const [words,      setWords]      = useState([])
  // windowStart = global word index where `words` array begins (for chunk mode)
  const [windowStart, setWindowStart] = useState(0)
  const [totalWords, setTotalWords] = useState(0)
  const [page,       setPageState]  = useState(initialPage)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)

  // Track the active fetch so stale results from previous level/topic are discarded
  const fetchId = useRef(0)

  const filter = topic ?? examFilter   // one of these, or null

  useEffect(() => {
    if (!level) return

    const id = ++fetchId.current
    setLoading(true)
    setError(null)

    ;(async () => {
      try {
        const manifest = await getManifest(level)

        // ── Topic / exam filter mode ───────────────────────────
        // Load the single topic file; paginate within it in memory
        if (filter) {
          const key = filter.toLowerCase().replace(/\s+/g, '_')
          const topicInfo = manifest.topics?.find(t => t.id === key)
          if (!topicInfo) {
            if (id !== fetchId.current) return
            setWords([])
            setTotalWords(0)
            return
          }
          const pool = await getCachedChunk(level, topicInfo.file)
          if (id !== fetchId.current) return
          setWords(pool.slice(0, MAX_CACHED))
          setWindowStart(0)
          setTotalWords(pool.length)
          return
        }

        // ── Sequential chunk mode ─────────────────────────────
        // Determine which chunk covers `page`
        const globalStart  = page * PAGE_SIZE
        const chunkIndex   = Math.floor(globalStart / manifest.chunkSize)
        const chunkFile    = manifest.chunks[chunkIndex]
        if (!chunkFile) {
          if (id !== fetchId.current) return
          setWords([])
          setTotalWords(manifest.totalWords)
          return
        }
        const chunkWords = await getCachedChunk(level, chunkFile)
        if (id !== fetchId.current) return
        setWords(chunkWords.slice(0, MAX_CACHED))
        setWindowStart(chunkIndex * manifest.chunkSize)
        setTotalWords(manifest.totalWords)
      } catch (e) {
        if (id !== fetchId.current) return
        setError(e.message)
      } finally {
        if (id === fetchId.current) setLoading(false)
      }
    })()
  }, [level, filter, page])   // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived values ────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(totalWords / PAGE_SIZE))

  // pageWords: the 20-word slice for the current page
  let pageWords
  if (filter) {
    // In topic mode, `words` IS the full topic pool; page within it
    const start = page * PAGE_SIZE
    pageWords = words.slice(start, start + PAGE_SIZE)
  } else {
    // In chunk mode, the window starts at windowStart
    const localOffset = page * PAGE_SIZE - windowStart
    pageWords = words.slice(localOffset, localOffset + PAGE_SIZE)
  }

  const setPage = useCallback((p) => {
    setPageState(prev => {
      const clamped = Math.max(0, p)
      return clamped === prev ? prev : clamped
    })
  }, [])

  return {
    /** Full window (≤100 words) — use for distractor pools in MCQ formats */
    words,
    /** Exactly PAGE_SIZE (20) words for the current page */
    pageWords,
    page,
    totalPages,
    setPage,
    loading,
    error,
  }
}
