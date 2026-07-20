/**
 * Shared test helpers for neon HTTP-level mocking.
 *
 * Instead of mocking Drizzle's fluent chain (db.select().from().where()...),
 * we mock at the neon HTTP level so the real Drizzle query builder runs.
 * This catches regressions when Drizzle APIs or query patterns change.
 *
 * IMPORTANT: Drizzle's neon-http driver uses arrayMode: true for ALL
 * query-builder queries (when fields are defined). This means rows must
 * be returned as arrays in schema column order, not as objects.
 *
 * Usage in a test file:
 *
 *   // 1. Create hoisted mock state at module top level
 *   const { mockQueryFn } = vi.hoisted(() => {
 *     const q = vi.fn();
 *     return { mockQueryFn: Object.assign(q, { query: vi.fn(), unsafe: vi.fn(), transaction: vi.fn() }) };
 *   });
 *   vi.mock('@neondatabase/serverless', () => ({ neon: () => mockQueryFn }));
 *
 *   // 2. Use helpers to build responses
 *   import { profileRow, blobOwnershipRow, adminCheckRow, emptyResult, ... } from './test-helpers';
 *   mockQueryFn.query.mockResolvedValueOnce(profileRow(['user_1', 0, null, 0, 0, 1, '2024-01-01T00:00:00.000Z']));
 */

// ── Types ───────────────────────────────────────────────────────────────────

/** Shape of a full query result returned by neon's HTTP API (fullResults: true). */
export interface NeonFullResult {
  rows: Record<string, unknown>[] | unknown[][];
  fields: Array<{ name: string; dataTypeID: number }>;
  command: string;
  rowCount: number;
  rowAsArray: boolean;
}

// ── Column orders (must match schema.ts column definition order) ────────────

/** Column order for the profiles table. */
export const PROFILES_COLUMNS = [
  'clerk_user_id',
  'upload_count_today',
  'last_upload_date',
  'approved',
  'banned',
  'is_admin',
  'created_at',
] as const;

/** Column order for the blobs table. */
export const BLOBS_COLUMNS = [
  'id',
  'title',
  'description',
  'date_occurred',
  'filament_type',
  'machine_used',
  'image_thumbnail_url',
  'image_medium_url',
  'image_full_url',
  'uploader_profile_id',
  'view_count',
  'deleted',
  'flagged',
  'moderation_scores',
  'created_at',
] as const;

/** Column order for the ratings table. */
export const RATINGS_COLUMNS = [
  'id',
  'blob_id',
  'rater_profile_id',
  'score',
  'created_at',
  'updated_at',
] as const;

// ── Result builders (arrayMode: true — what Drizzle uses) ───────────────────

function fieldDefs(columns: readonly string[]): Array<{ name: string; dataTypeID: number }> {
  return columns.map((name) => ({ name, dataTypeID: 25 })); // 25 = TEXT OID
}

/**
 * Build a NeonFullResult for a SELECT returning array rows (arrayMode: true).
 * This is what Drizzle uses for all query-builder queries.
 */
export function selectArrayResult(
  rows: unknown[][],
  columns: readonly string[],
): NeonFullResult {
  return {
    rows,
    fields: fieldDefs(columns),
    command: 'SELECT',
    rowCount: rows.length,
    rowAsArray: true,
  };
}

/**
 * Build a NeonFullResult for an INSERT/UPDATE/DELETE returning rows.
 * Drizzle uses arrayMode: true for RETURNING clauses too.
 */
export function mutationArrayResult(
  rows: unknown[][],
  columns: readonly string[],
  command = 'INSERT',
): NeonFullResult {
  return {
    rows,
    fields: fieldDefs(columns),
    command,
    rowCount: rows.length,
    rowAsArray: true,
  };
}

/** Empty result (no rows returned from SELECT). */
export function emptySelectResult(columns: readonly string[]): NeonFullResult {
  return selectArrayResult([], columns);
}

/** Empty mutation result (no rows returned, e.g. UPDATE with no match). */
export function emptyMutationResult(command = 'UPDATE'): NeonFullResult {
  return {
    rows: [],
    fields: [],
    command,
    rowCount: 0,
    rowAsArray: false,
  };
}

// ── Row builders (return arrays in schema column order) ─────────────────────

/**
 * Build a profiles row array in schema column order.
 *
 * Order: clerk_user_id, upload_count_today, last_upload_date, approved,
 *        banned, is_admin, created_at
 */
export function profileRow(values: {
  clerkUserId?: string;
  uploadCountToday?: number;
  lastUploadDate?: string | null;
  approved?: number;
  banned?: number;
  isAdmin?: number;
  createdAt?: string;
} = {}): unknown[] {
  return [
    values.clerkUserId ?? 'user_1',
    values.uploadCountToday ?? 0,
    values.lastUploadDate ?? null,
    values.approved ?? 0,
    values.banned ?? 0,
    values.isAdmin ?? 0,
    values.createdAt ?? '2024-01-01T00:00:00.000Z',
  ];
}

/**
 * Build a blobs row array in schema column order.
 */
export function blobRow(values: {
  id?: number;
  title?: string;
  description?: string | null;
  dateOccurred?: string;
  filamentType?: string;
  machineUsed?: string;
  imageThumbnailUrl?: string;
  imageMediumUrl?: string;
  imageFullUrl?: string;
  uploaderProfileId?: string;
  viewCount?: number;
  deleted?: number;
  flagged?: number;
  moderationScores?: Record<string, number> | null;
  createdAt?: string;
} = {}): unknown[] {
  return [
    values.id ?? 1,
    values.title ?? 'Test Blob',
    values.description ?? null,
    values.dateOccurred ?? '2024-12-01',
    values.filamentType ?? 'PLA',
    values.machineUsed ?? 'Ender 3',
    values.imageThumbnailUrl ?? 'https://example.com/thumb.webp',
    values.imageMediumUrl ?? 'https://example.com/medium.webp',
    values.imageFullUrl ?? 'https://example.com/full.webp',
    values.uploaderProfileId ?? 'user_1',
    values.viewCount ?? 0,
    values.deleted ?? 0,
    values.flagged ?? 0,
    values.moderationScores ?? null,
    values.createdAt ?? '2024-12-01T00:00:00.000Z',
  ];
}

/**
 * Build a ratings row array in schema column order.
 */
export function ratingRow(values: {
  id?: number;
  blobId?: number;
  raterProfileId?: string;
  score?: number;
  createdAt?: string;
  updatedAt?: string;
} = {}): unknown[] {
  return [
    values.id ?? 1,
    values.blobId ?? 1,
    values.raterProfileId ?? 'user_1',
    values.score ?? 4,
    values.createdAt ?? '2024-12-01T00:00:00.000Z',
    values.updatedAt ?? '2024-12-01T00:00:00.000Z',
  ];
}

// ── Specialized sub-select row builders ─────────────────────────────────────

/** Row for `SELECT uploader_profile_id, deleted FROM blobs` */
export function blobOwnershipRow(uploaderProfileId: string, deleted: number): unknown[] {
  return [uploaderProfileId, deleted];
}
export const BLOB_OWNERSHIP_COLUMNS = ['uploader_profile_id', 'deleted'] as const;

/** Row for `SELECT is_admin FROM profiles` */
export function adminCheckRow(isAdmin: number): unknown[] {
  return [isAdmin];
}
export const ADMIN_CHECK_COLUMNS = ['is_admin'] as const;

/** Row for `SELECT id FROM blobs WHERE deleted=0 AND flagged=0` */
export function blobVisibleRow(id: number): unknown[] {
  return [id];
}
export const BLOB_VISIBLE_COLUMNS = ['id'] as const;

/** Row for `SELECT image_thumbnail_url, image_medium_url, image_full_url FROM blobs` */
export function blobImageUrlRow(thumb: string, medium: string, full: string): unknown[] {
  return [thumb, medium, full];
}
export const BLOB_IMAGE_URL_COLUMNS = ['image_thumbnail_url', 'image_medium_url', 'image_full_url'] as const;

/** Row for AVG/COUNT aggregate query */
export function averageRatingRow(averageRating: number, ratingCount: number): unknown[] {
  return [averageRating, ratingCount];
}
export const AVERAGE_RATING_COLUMNS = ['average_rating', 'rating_count'] as const;

/** Row for `SELECT upload_count_today FROM profiles` (UPDATE ... RETURNING) */
export function uploadCountRow(count: number): unknown[] {
  return [count];
}
export const UPLOAD_COUNT_COLUMNS = ['upload_count_today'] as const;

// ── Convenience: single-row results ─────────────────────────────────────────

export function oneProfileRow(values: Parameters<typeof profileRow>[0] = {}): NeonFullResult {
  return selectArrayResult([profileRow(values)], PROFILES_COLUMNS);
}

export function oneBlobRow(values: Parameters<typeof blobRow>[0] = {}): NeonFullResult {
  return selectArrayResult([blobRow(values)], BLOBS_COLUMNS);
}

export function oneRatingRow(values: Parameters<typeof ratingRow>[0] = {}): NeonFullResult {
  return mutationArrayResult([ratingRow(values)], RATINGS_COLUMNS, 'INSERT');
}

export function oneUploadCountRow(count: number): NeonFullResult {
  return mutationArrayResult([uploadCountRow(count)], UPLOAD_COUNT_COLUMNS, 'UPDATE');
}
