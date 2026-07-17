import { createServerFn } from '@tanstack/react-start'
import { db } from './index'
import { blobs, profiles } from './schema'
import { eq } from 'drizzle-orm'

// ── Constants ───────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

// ── Types ───────────────────────────────────────────────────────────────────

export interface UploadInput {
  title: string
  dateOccurred: string
  description: string | null
  filamentType: string
  machineUsed: string
  image: File
}

export interface UploadError {
  field: string
  message: string
}

// ── Validation (extracted for testability) ──────────────────────────────────

/**
 * Validate the raw FormData and return either a clean UploadInput or a list
 * of field-level errors.  Does NOT check auth or rate limits — those are
 * server-side concerns handled in the handler.
 */
export function validateUploadInput(formData: FormData): {
  data: UploadInput | null
  errors: UploadError[]
} {
  const errors: UploadError[] = []

  const title = (formData.get('title') as string | null)?.trim() ?? ''
  const dateOccurred = (formData.get('dateOccurred') as string | null) ?? ''
  const description = (formData.get('description') as string | null)?.trim() ?? null
  const filamentType = (formData.get('filamentType') as string | null)?.trim() ?? ''
  const machineUsed = (formData.get('machineUsed') as string | null)?.trim() ?? ''
  const image = formData.get('image') as File | null

  if (!title) errors.push({ field: 'title', message: 'Title is required' })
  if (!dateOccurred) errors.push({ field: 'dateOccurred', message: 'Date occurred is required' })
  if (!filamentType) errors.push({ field: 'filamentType', message: 'Filament type is required' })
  if (!machineUsed) errors.push({ field: 'machineUsed', message: 'Machine used is required' })
  if (!image) {
    errors.push({ field: 'image', message: 'An image file is required' })
  } else {
    if (!ALLOWED_TYPES.includes(image.type)) {
      errors.push({ field: 'image', message: 'Unsupported format. Use JPEG, PNG, WebP, or AVIF.' })
    }
    if (image.size > MAX_FILE_SIZE) {
      errors.push({ field: 'image', message: 'Image must be under 10 MB' })
    }
  }

  if (errors.length > 0) return { data: null, errors }

  return {
    data: {
      title,
      dateOccurred,
      description: description || null,
      filamentType,
      machineUsed,
      image: image!,
    },
    errors: [],
  }
}

// ── Image processing (extracted for testability) ────────────────────────────

export interface ImageVariants {
  thumbnail: Buffer
  medium: Buffer
  full: Buffer
}

/**
 * Process a raw image buffer into three WebP variants:
 * - thumbnail: 150 px wide
 * - medium:    600 px wide
 * - full:      original dimensions, optimized
 */
export async function processImageVariants(buffer: Buffer): Promise<ImageVariants> {
  const sharp = (await import('sharp')).default

  const [thumbnail, medium, full] = await Promise.all([
    sharp(buffer).resize(150).webp({ quality: 80 }).toBuffer(),
    sharp(buffer).resize(600).webp({ quality: 85 }).toBuffer(),
    sharp(buffer).webp({ quality: 90 }).toBuffer(),
  ])

  return { thumbnail, medium, full }
}

// ── Upload limit check (extracted for testability) ──────────────────────────

/**
 * Returns today's date as a YYYY-MM-DD string.
 */
export function todayDateString(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Check whether the given user has already uploaded today.
 * Throws if the limit is reached; otherwise returns the current count
 * so the caller can increment it after a successful upload.
 */
export async function checkUploadLimit(
  userId: string,
  _today?: string,
): Promise<{ currentCount: number; lastDate: string | null }> {
  const today = _today ?? todayDateString()

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.clerkUserId, userId))
    .limit(1)

  if (!profile) throw new Error('Profile not found')

  // Admins bypass the daily upload limit
  if (profile.isAdmin === 1) {
    return {
      currentCount: profile.uploadCountToday,
      lastDate: profile.lastUploadDate,
    }
  }

  if (profile.lastUploadDate === today && profile.uploadCountToday >= 1) {
    throw new Error('Upload limit reached. You can upload 1 blob per day.')
  }

  return {
    currentCount: profile.uploadCountToday,
    lastDate: profile.lastUploadDate,
  }
}

// ── Server function ─────────────────────────────────────────────────────────

export const uploadBlob = createServerFn({ method: 'POST' })
  .validator((formData: FormData) => {
    const { data, errors } = validateUploadInput(formData)
    if (errors.length > 0) {
      throw new Error(JSON.stringify(errors))
    }
    return data!
  })
  .handler(async ({ data }) => {
    // Auth check — dynamic import keeps server-only code out of the client bundle
    const { auth } = await import('@clerk/tanstack-react-start/server')
    const { userId } = await auth()
    if (!userId) throw new Error('Not authenticated')

    // Rate limit
    const today = todayDateString()
    await checkUploadLimit(userId, today)

    // Process image
    const buffer = Buffer.from(await data.image.arrayBuffer())
    const variants = await processImageVariants(buffer)

    // Upload to Vercel Blob (dynamic import — server-only package)
    const { put } = await import('@vercel/blob')
    const token = process.env.BLOB_READ_WRITE_TOKEN
    const storeId = process.env.BLOB_STORE_ID
    const prefix = `blobs/${userId}/${Date.now()}`
    const [thumbResult, mediumResult, fullResult] = await Promise.all([
      put(`${prefix}-thumb.webp`, variants.thumbnail, {
        access: 'public',
        contentType: 'image/webp',
        token,
        storeId,
      }),
      put(`${prefix}-medium.webp`, variants.medium, {
        access: 'public',
        contentType: 'image/webp',
        token,
        storeId,
      }),
      put(`${prefix}-full.webp`, variants.full, {
        access: 'public',
        contentType: 'image/webp',
        token,
        storeId,
      }),
    ])

    // Insert blob record
    const [newBlob] = await db
      .insert(blobs)
      .values({
        title: data.title,
        description: data.description,
        dateOccurred: data.dateOccurred,
        filamentType: data.filamentType,
        machineUsed: data.machineUsed,
        imageThumbnailUrl: thumbResult.url,
        imageMediumUrl: mediumResult.url,
        imageFullUrl: fullResult.url,
        uploaderProfileId: userId,
      })
      .returning()

    // Update profile upload count
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.clerkUserId, userId))
      .limit(1)

    const newCount =
      profile && profile.lastUploadDate === today
        ? profile.uploadCountToday + 1
        : 1

    await db
      .update(profiles)
      .set({ uploadCountToday: newCount, lastUploadDate: today })
      .where(eq(profiles.clerkUserId, userId))

    return newBlob
  })
