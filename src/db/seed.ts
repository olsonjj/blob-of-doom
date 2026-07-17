/**
 * Seed script: inserts 8 demo blobs into the database for gallery development.
 *
 * Run with: npx tsx src/db/seed.ts
 *
 * Requires DATABASE_URL in environment.
 * Uses picsum.photos for placeholder images (Vercel Blob integration comes in Phase 04).
 */
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { blobs, profiles } from './schema'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// Load .env file for DATABASE_URL
const __dirname = dirname(fileURLToPath(import.meta.url))
process.loadEnvFile?.(resolve(__dirname, '../../.env'))

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql)

const DEMO_BLOBS = [
  {
    title: 'The Great Spaghetti Incident of 2024',
    description:
      'Left the print running overnight. Woke up to what can only be described as an angel-hair pasta crime scene. The hotend was completely entombed.',
    dateOccurred: '2024-11-15',
    filamentType: 'PLA',
    machineUsed: 'Ender 3 V2',
    imageSlug: 'spaghetti-incident',
  },
  {
    title: 'ABS Warpocalypse',
    description:
      'First attempt at ABS. The print warped so hard it peeled the magnetic build plate off the bed. The part now resembles a Pringle.',
    dateOccurred: '2024-10-03',
    filamentType: 'ABS',
    machineUsed: 'Bambu Lab P1P',
    imageSlug: 'abs-warpocalypse',
  },
  {
    title: 'Benchy But Make It Abstract',
    description:
      'Somewhere around layer 47, the Benchy decided it wanted to be modern art instead. It looks like a melted candle shaped like a boat.',
    dateOccurred: '2024-12-01',
    filamentType: 'PETG',
    machineUsed: 'Prusa MK4',
    imageSlug: 'abstract-benchy',
  },
  {
    title: 'Layer Shift at Mach 3',
    description:
      'Cranked the speed up to 200mm/s. The first 20 layers are perfect. Everything above that is offset by about 2 inches to the left.',
    dateOccurred: '2024-09-22',
    filamentType: 'PLA+',
    machineUsed: 'Voron 2.4',
    imageSlug: 'layer-shift',
  },
  {
    title: 'TPU Nightmare Fuel',
    description:
      'Flexible filament wrapped around the extruder gears like a boa constrictor. Had to disassemble the entire print head to free it.',
    dateOccurred: '2024-08-14',
    filamentType: 'TPU',
    machineUsed: 'Ender 3 S1',
    imageSlug: 'tpu-nightmare',
  },
  {
    title: 'The Support Structure That Ate My Print',
    description:
      'Tree supports set to "everywhere." The supports are now stronger than the actual part. I cannot remove them without destroying everything.',
    dateOccurred: '2024-11-30',
    filamentType: 'PLA Silk',
    machineUsed: 'Anycubic Kobra 2',
    imageSlug: 'support-monster',
  },
  {
    title: 'Nozzle Excavation Project',
    description:
      'PETG blob grew so large it completely encased the heater block and thermistor. Required a heat gun, pliers, and a lot of patience.',
    dateOccurred: '2024-07-04',
    filamentType: 'PETG',
    machineUsed: 'Creality K1',
    imageSlug: 'nozzle-excavation',
  },
  {
    title: 'First Layer: Abstract Expressionism',
    description:
      'Z-offset was... optimistic. The nozzle carved grooves into the PEI sheet while depositing filament in a pattern best described as "chaotic."',
    dateOccurred: '2024-12-10',
    filamentType: 'PLA Matte',
    machineUsed: 'Neptune 4 Pro',
    imageSlug: 'first-layer-art',
  },
]

// Use a known test profile ID — this should match a Clerk user that exists
// or be created manually. For seed data, we use a placeholder.
const SEED_PROFILE_ID = 'seed-demo-user'

function imageUrls(slug: string) {
  return {
    imageThumbnailUrl: `https://picsum.photos/seed/${slug}/150/150`,
    imageMediumUrl: `https://picsum.photos/seed/${slug}/600/450`,
    imageFullUrl: `https://picsum.photos/seed/${slug}/1200/900`,
  }
}

async function seed() {
  console.log('🌱 Seeding gallery with demo blobs...')

  // Create a seed profile if it doesn't exist (needed for FK constraint)
  await db
    .insert(profiles)
    .values({
      clerkUserId: SEED_PROFILE_ID,
      uploadCountToday: 0,
      approved: 0,
      banned: 0,
    })
    .onConflictDoNothing()
  console.log(`  ✓ Seed profile (${SEED_PROFILE_ID})`)

  for (const blob of DEMO_BLOBS) {
    const urls = imageUrls(blob.imageSlug)
    await db.insert(blobs).values({
      title: blob.title,
      description: blob.description,
      dateOccurred: blob.dateOccurred,
      filamentType: blob.filamentType,
      machineUsed: blob.machineUsed,
      uploaderProfileId: SEED_PROFILE_ID,
      ...urls,
    })
    console.log(`  ✓ ${blob.title}`)
  }

  console.log(`\n✅ Seeded ${DEMO_BLOBS.length} demo blobs.`)
  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
