#!/usr/bin/env node
/**
 * Test SightEngine moderation directly against local images.
 *
 * Usage:
 *   node scripts/test-moderation.mjs firearm.jpg
 *   node scripts/test-moderation.mjs nudity.png
 *   node scripts/test-moderation.mjs firearm.jpg nudity.png
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local
const envLocal = readFileSync('.env.local', 'utf-8')
for (const line of envLocal.split('\n')) {
  const match = line.match(/^([^#][^=]+)=(.*)$/)
  if (match) process.env[match[1].trim()] = match[2].trim()
}

// Dynamic import of the moderation helper (it's TypeScript, need tsx)
const { moderateImage } = await import('../src/db/moderation.func.ts')

const THRESHOLDS = {
  nudity: 0.6,
  weapons: 0.7,
  alcohol: 0.7,
  drugs: 0.7,
}

const files = process.argv.slice(2)
if (files.length === 0) {
  console.log('Usage: node scripts/test-moderation.mjs <image-path> [...]')
  process.exit(1)
}

for (const file of files) {
  const path = resolve(file)
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`📷  ${file}`)

  const buffer = readFileSync(path)
  console.log(`   Size: ${(buffer.length / 1024).toFixed(1)} KB`)

  const start = Date.now()
  const result = await moderateImage(buffer)
  const elapsed = Date.now() - start

  console.log(`   Time: ${elapsed}ms`)
  console.log(`   Flagged: ${result.flagged ? '⚠️  YES' : '✅  NO'}`)
  console.log(`   Scores:`)

  for (const [category, threshold] of Object.entries(THRESHOLDS)) {
    const score = result.scores[category]
    const hasScore = typeof score === 'number'
    const pct = hasScore ? `${(score * 100).toFixed(1)}%` : '—'
    const over = hasScore && score >= threshold ? ' ⚠️  OVER THRESHOLD' : ''
    const bar = hasScore ? '█'.repeat(Math.round(score * 20)) + '░'.repeat(20 - Math.round(score * 20)) : ''
    console.log(`     ${category.padEnd(10)} ${pct.padEnd(8)} ${bar}${over}`)
  }

  console.log(`\n   Raw response keys: ${Object.keys(result.raw).join(', ')}`)
  if (result.raw.status) {
    console.log(`   API Status: ${result.raw.status}`)
  }
  // Show the actual category data
  for (const key of ['nudity', 'weapon', 'weapon_firearm', 'weapon_knife', 'alcohol', 'drugs', 'medical_drugs', 'recreational_drugs']) {
    if (result.raw[key]) {
      console.log(`   ${key}: ${JSON.stringify(result.raw[key])}`)
    }
  }
}

process.exit(0)
