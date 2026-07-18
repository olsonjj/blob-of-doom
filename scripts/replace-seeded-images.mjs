#!/usr/bin/env node
/**
 * Replace seeded blob placeholder images with real AI-generated images.
 *
 * 1. Reads images from temp/ directories
 * 2. Processes through Sharp (thumbnail, medium, full WebP)
 * 3. Uploads to Vercel Blob
 * 4. Updates database records
 *
 * Usage:
 *   node scripts/replace-seeded-images.mjs
 */

import { readFileSync, readdirSync } from 'fs'
import { resolve, basename } from 'path'
import { neon } from '@neondatabase/serverless'

// Load .env.local
const envLocal = readFileSync('.env.local', 'utf-8')
for (const line of envLocal.split('\n')) {
  const match = line.match(/^([^#][^=]+)=(.*)$/)
  if (match) {
    let val = match[2].trim()
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    process.env[match[1].trim()] = val
  }
}

const sql = neon(process.env.DATABASE_URL)

// Map blob IDs to temp image directories (by keyword in dir name)
const BLOB_IMAGE_MAP = [
  { id: 2, dir: 'spaghetti_mess' },       // The Great Spaghetti Incident of 2024
  { id: 3, dir: 'warped_edges' },          // ABS Warpocalypse
  { id: 4, dir: 'blob_of_doom_a_chaotic' }, // Benchy But Make It Abstract
  { id: 5, dir: 'layer_shifting' },        // Layer Shift at Mach 3
  { id: 6, dir: 'stringing_error' },       // TPU Nightmare Fuel
  { id: 7, dir: 'bird_s_nest' },           // The Support Structure That Ate My Print
  { id: 8, dir: 'severe_under' },          // Nozzle Excavation Project
  { id: 9, dir: 'chaotic_spaghetti' },     // First Layer: Abstract Expressionism
]

const tempDir = resolve('temp')
const dirs = readdirSync(tempDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)

function findDir(keyword) {
  const match = dirs.find((d) => d.includes(keyword))
  if (!match) throw new Error(`No temp dir found for keyword: ${keyword}`)
  return resolve(tempDir, match, 'screen.png')
}

async function main() {
  const sharp = (await import('sharp')).default
  const { put } = await import('@vercel/blob')
  const token = process.env.BLOB_READ_WRITE_TOKEN
  const storeId = process.env.BLOB_STORE_ID

  for (const { id, dir } of BLOB_IMAGE_MAP) {
    const imagePath = findDir(dir)
    console.log(`\n📷  Blob #${id} ← ${basename(imagePath)}`)

    const buffer = readFileSync(imagePath)
    console.log(`   Source: ${(buffer.length / 1024).toFixed(1)} KB`)

    // Process variants
    const [thumbnail, medium, full] = await Promise.all([
      sharp(buffer).resize(150).webp({ quality: 80 }).toBuffer(),
      sharp(buffer).resize(600).webp({ quality: 85 }).toBuffer(),
      sharp(buffer).webp({ quality: 90 }).toBuffer(),
    ])

    // Upload to Vercel Blob
    const prefix = `blobs/seeded/${id}/${Date.now()}`
    const [thumbResult, mediumResult, fullResult] = await Promise.all([
      put(`${prefix}-thumb.webp`, thumbnail, {
        access: 'public',
        contentType: 'image/webp',
        token,
        storeId,
      }),
      put(`${prefix}-medium.webp`, medium, {
        access: 'public',
        contentType: 'image/webp',
        token,
        storeId,
      }),
      put(`${prefix}-full.webp`, full, {
        access: 'public',
        contentType: 'image/webp',
        token,
        storeId,
      }),
    ])

    // Update database
    await sql`
      UPDATE blobs 
      SET image_thumbnail_url = ${thumbResult.url},
          image_medium_url = ${mediumResult.url},
          image_full_url = ${fullResult.url}
      WHERE id = ${id}
    `

    console.log(`   ✅  Replaced — ${thumbResult.url}`)
  }

  console.log(`\n🎉  Done! Replaced ${BLOB_IMAGE_MAP.length} images.`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
