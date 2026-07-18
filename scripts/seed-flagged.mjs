#!/usr/bin/env node
/**
 * Seed or clear flagged blobs for testing the admin review queue.
 *
 * Usage:
 *   node scripts/seed-flagged.mjs seed     # Flag 2 blobs with moderation scores
 *   node scripts/seed-flagged.mjs clear    # Unflag all blobs
 *   node scripts/seed-flagged.mjs status   # Show currently flagged blobs
 */

import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'

// Load .env.local
const envLocal = readFileSync('.env.local', 'utf-8')
for (const line of envLocal.split('\n')) {
  const match = line.match(/^([^#][^=]+)=(.*)$/)
  if (match) process.env[match[1].trim()] = match[2].trim()
}

const sql = neon(process.env.DATABASE_URL)

const SEED_BLOBS = [
  {
    id: 7,
    scores: { nudity: 0.82, weapons: 0.15, alcohol: 0.05, drugs: 0.02 },
  },
  {
    id: 2,
    scores: { nudity: 0.12, weapons: 0.88, alcohol: 0.03, drugs: 0.45 },
  },
]

async function seed() {
  for (const { id, scores } of SEED_BLOBS) {
    await sql`
      UPDATE blobs 
      SET flagged = 1, moderation_scores = ${JSON.stringify(scores)}::jsonb
      WHERE id = ${id}
    `
    console.log(`  ✓ Flagged blob #${id}`)
  }
  console.log(`\nSeeded ${SEED_BLOBS.length} flagged blobs. Visit /admin → Flagged tab.`)
}

async function clear() {
  for (const { id } of SEED_BLOBS) {
    await sql`
      UPDATE blobs 
      SET flagged = 0, moderation_scores = NULL 
      WHERE id = ${id}
    `
    console.log(`  Cleared blob #${id}`)
  }
  console.log(`
Cleared ${SEED_BLOBS.length} seeded blobs.`)
}

async function status() {
  const rows = await sql`
    SELECT id, title, flagged, moderation_scores 
    FROM blobs 
    WHERE flagged = 1 AND deleted = 0
    ORDER BY created_at DESC
  `
  if (rows.length === 0) {
    console.log('No flagged blobs.')
  } else {
    console.log(`${rows.length} flagged blob(s):\n`)
    for (const r of rows) {
      console.log(`  #${r.id} — "${r.title}"`)
      if (r.moderation_scores) {
        for (const [k, v] of Object.entries(r.moderation_scores)) {
          const pct = (v * 100).toFixed(1) + '%'
          const flag = v >= 0.7 ? ' ⚠' : ''
          console.log(`    ${k}: ${pct}${flag}`)
        }
      }
      console.log()
    }
  }
}

const cmd = process.argv[2]
if (cmd === 'seed') await seed()
else if (cmd === 'clear') await clear()
else if (cmd === 'status') await status()
else {
  console.log('Usage: node scripts/seed-flagged.mjs [seed|clear|status]')
  process.exit(1)
}

process.exit(0)
