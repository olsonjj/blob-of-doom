import { createServerFn } from '@tanstack/react-start'
import { db } from './index'
import { blobs, ratings } from './schema'
import { eq, sql } from 'drizzle-orm'

// ── Types ───────────────────────────────────────────────────────────────────

export interface BlobDetail {
  id: number
  title: string
  description: string | null
  dateOccurred: string
  filamentType: string
  machineUsed: string
  imageThumbnailUrl: string
  imageMediumUrl: string
  imageFullUrl: string
  uploaderProfileId: string
  viewCount: number
  createdAt: Date
  averageRating: number
  ratingCount: number
  userRating: number | null
}

// ── Query (extracted for testability) ───────────────────────────────────────

/**
 * Fetch a single blob with its average rating and optionally the current user's rating.
 */
export async function queryBlobDetail(
  blobId: number,
  userId?: string,
): Promise<BlobDetail | null> {
  const rows = await db
    .select({
      id: blobs.id,
      title: blobs.title,
      description: blobs.description,
      dateOccurred: blobs.dateOccurred,
      filamentType: blobs.filamentType,
      machineUsed: blobs.machineUsed,
      imageThumbnailUrl: blobs.imageThumbnailUrl,
      imageMediumUrl: blobs.imageMediumUrl,
      imageFullUrl: blobs.imageFullUrl,
      uploaderProfileId: blobs.uploaderProfileId,
      viewCount: blobs.viewCount,
      createdAt: blobs.createdAt,
      averageRating: sql<number>`COALESCE(AVG(${ratings.score}::float), 0)`,
      ratingCount: sql<number>`COUNT(${ratings.id})::int`,
      userRating: userId
        ? sql<number | null>`MAX(CASE WHEN ${ratings.raterProfileId} = ${userId} THEN ${ratings.score} END)::int`
        : sql<number | null>`NULL`,
    })
    .from(blobs)
    .leftJoin(ratings, eq(blobs.id, ratings.blobId))
    .where(eq(blobs.id, blobId))
    .groupBy(blobs.id)
    .limit(1)

  return (rows[0] as BlobDetail | undefined) ?? null
}

// ── View increment (extracted for testability) ──────────────────────────────

/**
 * Increment the view count for a blob. Returns the new count.
 */
export async function incrementViewCount(blobId: number): Promise<number> {
  const [updated] = await db
    .update(blobs)
    .set({ viewCount: sql`${blobs.viewCount} + 1` })
    .where(eq(blobs.id, blobId))
    .returning({ viewCount: blobs.viewCount })

  return updated?.viewCount ?? 0
}

// ── Server function ─────────────────────────────────────────────────────────

export const fetchBlobDetail = createServerFn({ method: 'GET' })
  .validator((d: unknown) => {
    const blobId =
      typeof d === 'object' && d !== null ? (d as Record<string, unknown>).blobId : undefined
    if (typeof blobId !== 'number' || !Number.isInteger(blobId) || blobId < 1) {
      throw new Error('Invalid blob ID')
    }
    return blobId
  })
  .handler(async ({ data: blobId }) => {
    // Try to get the current user for personalized rating
    let userId: string | undefined
    try {
      const { auth } = await import('@clerk/tanstack-react-start/server')
      const { userId: uid } = await auth()
      userId = uid ?? undefined
    } catch {
      // Auth not available — proceed without user-specific data
    }

    // Increment view count (fire-and-forget, don't block the response)
    incrementViewCount(blobId).catch(() => {
      // Silently ignore view count failures
    })

    const detail = await queryBlobDetail(blobId, userId)
    if (!detail) throw new Error('Blob not found')

    return detail
  })
