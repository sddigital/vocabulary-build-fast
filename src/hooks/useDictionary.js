import { useState, useEffect } from 'react'

const DICT_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en'
const WIKI_BASE = 'https://en.wikipedia.org/api/rest_v1/page/summary'

// In-memory caches — survive the session, reset on reload
const dictCache = Object.create(null)  // word → ParsedEntry | null
const imgCache  = Object.create(null)  // word → url | null

// ─── Parse raw API response into a clean flat structure ────────────────────

function parseEntry(raw) {
  const meanings = raw.meanings ?? []

  const definitions = meanings.flatMap(m =>
    m.definitions.slice(0, 3).map(d => ({
      partOfSpeech: m.partOfSpeech,
      definition: d.definition,
      example: d.example ?? null,
      synonyms: [...(m.synonyms ?? []), ...(d.synonyms ?? [])].slice(0, 6),
      antonyms: [...(m.antonyms ?? []), ...(d.antonyms ?? [])].slice(0, 6),
    }))
  )

  const allSynonyms = [
    ...new Set(
      meanings.flatMap(m => [
        ...(m.synonyms ?? []),
        ...m.definitions.flatMap(d => d.synonyms ?? []),
      ])
    ),
  ].slice(0, 10)

  const allAntonyms = [
    ...new Set(
      meanings.flatMap(m => [
        ...(m.antonyms ?? []),
        ...m.definitions.flatMap(d => d.antonyms ?? []),
      ])
    ),
  ].slice(0, 8)

  const examples = meanings
    .flatMap(m => m.definitions.map(d => d.example))
    .filter(Boolean)
    .slice(0, 4)

  return {
    word:             raw.word,
    phonetic:         raw.phonetic ?? raw.phonetics?.find(p => p.text)?.text ?? null,
    origin:           raw.origin ?? null,
    primaryDef:       definitions[0]?.definition ?? null,
    primaryPos:       meanings[0]?.partOfSpeech ?? null,
    definitions:      definitions.slice(0, 4),
    synonyms:         allSynonyms,
    antonyms:         allAntonyms,
    examples,
  }
}

// ─── Main dictionary hook ──────────────────────────────────────────────────

export function useDictionary(word) {
  const [entry, setEntry]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)

  useEffect(() => {
    if (!word) return
    const key = word.toLowerCase().trim()

    // Cache hit
    if (dictCache[key] !== undefined) {
      setEntry(dictCache[key])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setEntry(null)

    fetch(`${DICT_BASE}/${encodeURIComponent(key)}`)
      .then(r => {
        if (!r.ok) throw new Error('not_found')
        return r.json()
      })
      .then(json => {
        if (!Array.isArray(json) || json.length === 0) throw new Error('not_found')
        const parsed = parseEntry(json[0])
        dictCache[key] = parsed
        if (!cancelled) setEntry(parsed)
      })
      .catch(err => {
        dictCache[key] = null
        if (!cancelled) setError(err.message === 'not_found' ? 'not_found' : 'error')
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [word])

  return { entry, loading, error }
}

// ─── Wikipedia thumbnail hook (used by Beginners view) ────────────────────

export function useWordImage(word) {
  const [image, setImage] = useState(undefined) // undefined = loading, null = no image

  useEffect(() => {
    if (!word) return
    const key = word.toLowerCase().trim()

    if (imgCache[key] !== undefined) { setImage(imgCache[key]); return }

    let cancelled = false

    fetch(`${WIKI_BASE}/${encodeURIComponent(key)}`)
      .then(r => r.json())
      .then(data => {
        const src = data.thumbnail?.source ?? null
        imgCache[key] = src
        if (!cancelled) setImage(src)
      })
      .catch(() => {
        imgCache[key] = null
        if (!cancelled) setImage(null)
      })

    return () => { cancelled = true }
  }, [word])

  return image
}
