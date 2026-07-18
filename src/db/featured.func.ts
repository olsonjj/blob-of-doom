import { createServerFn } from '@tanstack/react-start';
import { and, eq, sql } from 'drizzle-orm';

import { db } from './index';
import { blobs, ratings } from './schema';

// ── Types ───────────────────────────────────────────────────────────────────

export interface FeaturedBlob {
  id: number;
  title: string;
  description: string | null;
  dateOccurred: string;
  filamentType: string;
  machineUsed: string;
  imageThumbnailUrl: string;
  imageMediumUrl: string;
  imageFullUrl: string;
  uploaderProfileId: string;
  createdAt: Date;
  averageRating: number;
  ratingCount: number;
}

// ── Query (extracted for testability) ───────────────────────────────────────

/**
 * Fetch 3–6 random blobs with their average Doom Scale rating.
 * Uses ORDER BY RANDOM() for simplicity — fine for MVP with small datasets.
 */
export async function queryFeatured(): Promise<FeaturedBlob[]> {
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
      createdAt: blobs.createdAt,
      averageRating: sql<number>`COALESCE(AVG(${ratings.score}::float), 0)`,
      ratingCount: sql<number>`COUNT(${ratings.id})::int`,
    })
    .from(blobs)
    .leftJoin(ratings, eq(blobs.id, ratings.blobId))
    .where(and(eq(blobs.deleted, 0), eq(blobs.flagged, 0)))
    .groupBy(blobs.id)
    .orderBy(sql`RANDOM()`)
    .limit(6);

  return rows as unknown as FeaturedBlob[];
}

// ── Server function ─────────────────────────────────────────────────────────

export const fetchFeatured = createServerFn({ method: 'GET' }).handler(async () => {
  return queryFeatured();
});
