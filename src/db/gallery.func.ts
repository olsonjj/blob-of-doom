import { createServerFn } from '@tanstack/react-start';
import { and, asc, desc, eq, sql } from 'drizzle-orm';

import { db } from './index';
import { blobs, ratings } from './schema';

export type SortField = 'date' | 'doom';
export type SortOrder = 'asc' | 'desc';

export interface GalleryBlob {
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
  flagged: number;
  moderationScores: Record<string, number> | null;
}

export interface GalleryQueryParams {
  sort: SortField;
  order: SortOrder;
}

/**
 * Core query logic — extracted for testability.
 * Queries blobs with average Doom Scale rating, sorted by the given field and order.
 */
export async function queryGallery(params: GalleryQueryParams): Promise<GalleryBlob[]> {
  const { sort, order } = params;
  const orderFn = order === 'asc' ? asc : desc;

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
      flagged: blobs.flagged,
      moderationScores: blobs.moderationScores,
    })
    .from(blobs)
    .leftJoin(ratings, eq(blobs.id, ratings.blobId))
    .where(and(eq(blobs.deleted, 0), eq(blobs.flagged, 0)))
    .groupBy(blobs.id)
    .orderBy(sort === 'doom' ? orderFn(sql`COALESCE(AVG(${ratings.score}::float), 0)`) : orderFn(blobs.createdAt));

  return rows;
}

/**
 * Validate and coerce raw query params into well-typed GalleryQueryParams.
 */
export function parseGalleryParams(raw: { sort?: string; order?: string }): GalleryQueryParams {
  const sort: SortField = raw.sort === 'doom' ? 'doom' : 'date';
  const order: SortOrder = raw.order === 'asc' ? 'asc' : 'desc';
  return { sort, order };
}

export const fetchGallery = createServerFn({
  method: 'GET',
})
  .validator((d: { sort?: string; order?: string }) => parseGalleryParams(d))
  .handler(async ({ data }) => {
    return queryGallery(data);
  });
