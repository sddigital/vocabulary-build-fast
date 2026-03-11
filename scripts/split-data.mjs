/**
 * scripts/split-data.mjs
 *
 * Splits src/data/{level}.json into:
 *   public/data/{level}/index.json          — manifest (chunk list + topic list)
 *   public/data/{level}/chunk_{n}.json      — 100-word sequential chunks
 *   public/data/{level}/topic_{key}.json    — per-category / per-exam-filter chunks
 *
 * Run once (and again whenever you add words):
 *   npm run split-data
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const root = join(__dir, '..')

const CHUNK_SIZE = 100

function read(rel) {
  return JSON.parse(readFileSync(join(root, rel), 'utf8'))
}

function write(rel, data) {
  const abs = join(root, rel)
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, JSON.stringify(data, null, 2))
  console.log('  wrote', rel)
}

/**
 * @param {string} levelName   e.g. 'beginners'
 * @param {object[]} words     array of word objects
 * @param {string|null} groupField  field to use for topic splits (null = no topics)
 */
function splitLevel(levelName, words, groupField) {
  console.log(`\n${levelName}: ${words.length} words`)

  // ── Sequential chunks ────────────────────────────────────────
  const chunkNames = []
  for (let i = 0; i < words.length; i += CHUNK_SIZE) {
    const name = `chunk_${Math.floor(i / CHUNK_SIZE)}.json`
    write(`public/data/${levelName}/${name}`, { words: words.slice(i, i + CHUNK_SIZE) })
    chunkNames.push(name)
  }

  // ── Topic files ───────────────────────────────────────────────
  const topicMeta = []
  if (groupField) {
    const groups = {}
    words.forEach(w => {
      const raw = (w[groupField] ?? 'general').toString()
      const key = raw.toLowerCase().replace(/\s+/g, '_')
      ;(groups[key] = groups[key] ?? []).push(w)
    })
    for (const [key, ws] of Object.entries(groups)) {
      const name = `topic_${key}.json`
      write(`public/data/${levelName}/${name}`, { words: ws })
      topicMeta.push({ id: key, file: name, count: ws.length })
    }
  }

  // ── Manifest ─────────────────────────────────────────────────
  write(`public/data/${levelName}/index.json`, {
    level: levelName,
    totalWords: words.length,
    chunkSize: CHUNK_SIZE,
    chunks: chunkNames,
    topics: topicMeta,
  })

  console.log(`  → ${chunkNames.length} chunks, ${topicMeta.length} topics`)
  if (topicMeta.length) {
    console.log('  topics:', topicMeta.map(t => `${t.id}(${t.count})`).join(', '))
  }
}

// ── Run ───────────────────────────────────────────────────────
const beginners   = read('src/data/beginners.json')
const intermediate = read('src/data/intermediate.json')
const advanced    = read('src/data/advanced.json')

splitLevel('beginners',   beginners.words,   'category')
splitLevel('intermediate', intermediate.words, null)
splitLevel('advanced',    advanced.words,    'exam_category')

console.log('\nDone! Split files are in public/data/')
