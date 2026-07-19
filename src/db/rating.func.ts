import { createServerFn } from '@tanstack/react-start';
import { and, eq, sql } from 'drizzle-orm';

import { checkNotBanned } from './auth-guards.func';
import { db } from './index';
import { blobs, ratings } from './schema';

// ── Types ───────────────────────────────────────────────────────────────────

export interface RatingInput {
  blobId: number;
  score: number;
}

export interface RatingResult {
  blobId: number;
  score: number;
  averageRating: number;
  ratingCount: number;
}

// ── Validation (extracted for testability) ──────────────────────────────────

/**
 * Validate the raw rating input. Returns either a clean RatingInput or an error message.
 */
export function validateRatingInput(input: unknown): {
  data: RatingInput | null;
  error: string | null;
} {
  if (!input || typeof input !== 'object') {
    return { data: null, error: 'Invalid input' };
  }

  const obj = input as Record<string, unknown>;
  const blobId = obj.blobId;
  const score = obj.score;

  if (typeof blobId !== 'number' || !Number.isInteger(blobId) || blobId < 1) {
    return { data: null, error: 'Invalid blob ID' };
  }

  if (typeof score !== 'number' || !Number.isInteger(score) || score < 1 || score > 5) {
    return { data: null, error: 'Score must be an integer between 1 and 5' };
  }

  return { data: { blobId, score }, error: null };
}

// ── Blob visibility check (extracted for testability) ───────────────────────

/**
 * Verify that a blob exists and is visible (not deleted, not flagged).
 * Throws "Blob not found" if the blob is hidden or doesn't exist.
 */
export async function checkBlobVisible(blobId: number): Promise<void> {
  const [blob] = await db
    .select({ id: blobs.id })
    .from(blobs)
    .where(and(eq(blobs.id, blobId), eq(blobs.deleted, 0), eq(blobs.flagged, 0)))
    .limit(1);

  if (!blob) throw new Error('Blob not found');
}

// ── Upsert (extracted for testability) ──────────────────────────────────────

/**
 * Insert or update a rating for the given user and blob.
 * Uses a single atomic ON CONFLICT DO UPDATE query so concurrent requests
 * from the same user can't both see "no rating" and both attempt inserts.
 * Returns the upserted rating record.
 */
export async function upsertRating(
  blobId: number,
  raterProfileId: string,
  score: number,
): Promise<typeof ratings.$inferSelect> {
  const [upserted] = await db
    .insert(ratings)
    .values({ blobId, raterProfileId, score })
    .onConflictDoUpdate({
      target: [ratings.blobId, ratings.raterProfileId],
      set: { score, updatedAt: new Date() },
    })
    .returning();

  return upserted;
}

// ── Average calculation (extracted for testability) ─────────────────────────

/**
 * Calculate the new average rating and count for a blob after a rating change.
 */
export async function calculateAverage(blobId: number): Promise<{
  averageRating: number;
  ratingCount: number;
}> {
  const [row] = await db
    .select({
      averageRating: sql<number>`COALESCE(AVG(${ratings.score}::float), 0)`,
      ratingCount: sql<number>`COUNT(${ratings.id})::int`,
    })
    .from(ratings)
    .where(eq(ratings.blobId, blobId));

  return row ?? { averageRating: 0, ratingCount: 0 };
}

// ── Server function ─────────────────────────────────────────────────────────

export const submitRating = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const { data, error } = validateRatingInput(input);
    if (error) throw new Error(error);
    return data!;
  })
  .handler(async ({ data }): Promise<RatingResult> => {
    // Auth check — dynamic import keeps server-only code out of the client bundle
    const { auth } = await import('@clerk/tanstack-react-start/server');
    const { userId } = await auth();
    if (!userId) throw new Error('Not authenticated');

    // Banned check
    await checkNotBanned(userId);

    // Verify blob is visible (not deleted, not flagged)
    await checkBlobVisible(data.blobId);

    // Upsert the rating
    await upsertRating(data.blobId, userId, data.score);

    // Return the new average
    const avg = await calculateAverage(data.blobId);

    return {
      blobId: data.blobId,
      score: data.score,
      averageRating: avg.averageRating,
      ratingCount: avg.ratingCount,
    };
  });
