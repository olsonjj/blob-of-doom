import { createServerFn } from '@tanstack/react-start';
import { and, eq, sql } from 'drizzle-orm';

import { ALLOWED_TYPES, MAX_FILE_SIZE } from '../shared/constants';
import { checkNotBanned } from './auth-guards.func';
import { db } from './index';
import { blobs, profiles } from './schema';

// ── Types ───────────────────────────────────────────────────────────────────

export interface UploadInput {
  title: string;
  dateOccurred: string;
  description: string | null;
  filamentType: string;
  machineUsed: string;
  image: File;
}

export interface UploadError {
  field: string;
  message: string;
}

export type UploadResult =
  | {
      success: true;
      blob: Omit<typeof blobs.$inferSelect, 'moderationScores'> & { moderationScores: Record<string, number> | null };
    }
  | { success: false; errors: UploadError[] };

// ── Validation (extracted for testability) ──────────────────────────────────

/**
 * Validate the raw FormData and return either a clean UploadInput or a list
 * of field-level errors.  Does NOT check auth or rate limits — those are
 * server-side concerns handled in the handler.
 */
export function validateUploadInput(formData: FormData): {
  data: UploadInput | null;
  errors: UploadError[];
} {
  const errors: UploadError[] = [];

  const title = (formData.get('title') as string | null)?.trim() ?? '';
  const dateOccurred = (formData.get('dateOccurred') as string | null) ?? '';
  const description = (formData.get('description') as string | null)?.trim() ?? null;
  const filamentType = (formData.get('filamentType') as string | null)?.trim() ?? '';
  const machineUsed = (formData.get('machineUsed') as string | null)?.trim() ?? '';
  const image = formData.get('image') as File | null;

  if (!title) errors.push({ field: 'title', message: 'Title is required' });
  if (!dateOccurred) errors.push({ field: 'dateOccurred', message: 'Date occurred is required' });
  if (!filamentType) errors.push({ field: 'filamentType', message: 'Filament type is required' });
  if (!machineUsed) errors.push({ field: 'machineUsed', message: 'Machine used is required' });
  if (!image) {
    errors.push({ field: 'image', message: 'An image file is required' });
  } else {
    if (!ALLOWED_TYPES.includes(image.type)) {
      errors.push({ field: 'image', message: 'Unsupported format. Use JPEG, PNG, WebP, or AVIF.' });
    }
    if (image.size > MAX_FILE_SIZE) {
      errors.push({ field: 'image', message: 'Image must be under 10 MB' });
    }
  }

  if (errors.length > 0) return { data: null, errors };

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
  };
}

// ── Image processing (extracted for testability) ────────────────────────────

export interface ImageVariants {
  thumbnail: Buffer;
  medium: Buffer;
  full: Buffer;
}

/**
 * Process a raw image buffer into three WebP variants:
 * - thumbnail: 150 px wide
 * - medium:    600 px wide
 * - full:      original dimensions, optimized
 */
export async function processImageVariants(buffer: Buffer): Promise<ImageVariants> {
  const sharp = (await import('sharp')).default;

  const [thumbnail, medium, full] = await Promise.all([
    sharp(buffer).resize(150).webp({ quality: 80 }).toBuffer(),
    sharp(buffer).resize(600).webp({ quality: 85 }).toBuffer(),
    sharp(buffer).webp({ quality: 90 }).toBuffer(),
  ]);

  return { thumbnail, medium, full };
}

// ── Upload limit check (extracted for testability) ──────────────────────────

/**
 * Returns today's date as a YYYY-MM-DD string.
 */
export function todayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Check whether the given user has already uploaded today.
 * Throws if the limit is reached; otherwise returns the current count,
 * last date, and the per-day limit for this user.
 *
 * Limits:
 * - Admins: unlimited (limit = -1 sentinel)
 * - Approved users: 10/day
 * - Unapproved users: 1/day
 */
export async function checkUploadLimit(
  userId: string,
  _today?: string,
): Promise<{ currentCount: number; lastDate: string | null; limit: number }> {
  const today = _today ?? todayDateString();

  const [profile] = await db.select().from(profiles).where(eq(profiles.clerkUserId, userId)).limit(1);

  if (!profile) throw new Error('Profile not found');

  // Admins bypass the daily upload limit
  if (profile.isAdmin === 1) {
    return {
      currentCount: profile.uploadCountToday,
      lastDate: profile.lastUploadDate,
      limit: -1,
    };
  }

  // Approved users get 10/day, unapproved get 1/day
  const limit = profile.approved === 1 ? 10 : 1;

  if (profile.lastUploadDate === today && profile.uploadCountToday >= limit) {
    throw new Error(`Upload limit reached. You can upload ${limit} blob(s) per day.`);
  }

  return {
    currentCount: profile.uploadCountToday,
    lastDate: profile.lastUploadDate,
    limit,
  };
}

// ── Atomic upload-count increment (extracted for testability) ───────────────

/**
 * Atomically increment the daily upload count for a user.
 *
 * Uses a single UPDATE with a WHERE clause that re-checks the limit,
 * so two concurrent requests cannot both succeed when only one slot
 * remains.  Returns the previous state so the caller can roll back
 * if the upload fails after the count is incremented.
 *
 * Throws if the limit was reached (including when another request
 * consumed the last slot between checkUploadLimit and this call).
 */
export async function incrementUploadCount(
  userId: string,
  limit: number,
  today: string,
): Promise<{ newCount: number; previousCount: number; previousDate: string | null }> {
  // Snapshot current state for potential rollback
  const [profile] = await db.select().from(profiles).where(eq(profiles.clerkUserId, userId)).limit(1);
  const previousCount = profile?.uploadCountToday ?? 0;
  const previousDate = profile?.lastUploadDate ?? null;

  // Atomic increment: only updates if the user is still under the limit
  // OR it's a new day (lastUploadDate differs from today).
  const [updated] = await db
    .update(profiles)
    .set({
      uploadCountToday: sql`CASE WHEN ${profiles.lastUploadDate} = ${today}::date THEN ${profiles.uploadCountToday} + 1 ELSE 1 END`,
      lastUploadDate: today,
    })
    .where(
      and(
        eq(profiles.clerkUserId, userId),
        sql`(${profiles.lastUploadDate} IS DISTINCT FROM ${today}::date OR ${profiles.uploadCountToday} < ${limit})`,
      ),
    )
    .returning({ uploadCountToday: profiles.uploadCountToday });

  if (!updated) {
    throw new Error(`Upload limit reached. You can upload ${limit} blob(s) per day.`);
  }

  return { newCount: updated.uploadCountToday, previousCount, previousDate };
}

// ── Server function ─────────────────────────────────────────────────────────

export const uploadBlob = createServerFn({ method: 'POST' })
  .validator((formData: FormData) => formData)
  .handler(async ({ data: formData }): Promise<UploadResult> => {
    // Validate input — return structured errors instead of throwing
    const { data, errors } = validateUploadInput(formData);
    if (errors.length > 0 || !data) {
      return { success: false, errors: errors.length > 0 ? errors : [{ field: 'general', message: 'Invalid input' }] };
    }

    // Auth check — dynamic import keeps server-only code out of the client bundle
    const { auth } = await import('@clerk/tanstack-react-start/server');
    const { userId } = await auth();
    if (!userId) throw new Error('Not authenticated');

    // Banned check
    await checkNotBanned(userId);

    // Rate limit — checkUploadLimit throws if the user is already at their cap
    const today = todayDateString();
    const { limit } = await checkUploadLimit(userId, today);

    // Atomically increment the upload count (non-admins only).
    // If any subsequent step fails, the count is rolled back in the catch.
    let previousCount = 0;
    let previousDate: string | null = null;
    if (limit > 0) {
      const result = await incrementUploadCount(userId, limit, today);
      previousCount = result.previousCount;
      previousDate = result.previousDate;
    }

    // Process image, moderate, upload, insert — with rollback on failure
    let newBlob: typeof blobs.$inferSelect | undefined;
    const uploadedUrls: string[] = [];
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const storeId = process.env.BLOB_STORE_ID;
    try {
      // Process image
      const buffer = Buffer.from(await data.image.arrayBuffer());
      const variants = await processImageVariants(buffer);

      // Content moderation — run after processing, before upload
      const { moderateImage } = await import('./moderation.func');
      const moderation = await moderateImage(buffer);

      // Upload to Vercel Blob (dynamic import — server-only package)
      const { put } = await import('@vercel/blob');
      const prefix = `blobs/${userId}/${Date.now()}`;
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
      ]);

      // Track uploaded URLs for cleanup on failure
      uploadedUrls.push(thumbResult.url, mediumResult.url, fullResult.url);

      // Insert blob record
      const [inserted] = await db
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
          flagged: moderation.flagged ? 1 : 0,
          moderationScores: moderation.scores,
        })
        .returning();

      newBlob = inserted;
    } catch (err) {
      // Best-effort cleanup of orphaned Blob files
      if (uploadedUrls.length > 0) {
        const { del } = await import('@vercel/blob');
        void del(uploadedUrls, { token, storeId }).catch((cleanupErr) => {
          console.error('Failed to clean up orphaned blobs:', cleanupErr);
        });
      }
      // Rollback: decrement the count so the daily slot isn't permanently consumed
      await db
        .update(profiles)
        .set({ uploadCountToday: previousCount, lastUploadDate: previousDate })
        .where(eq(profiles.clerkUserId, userId));
      throw err;
    }

    return {
      success: true,
      blob: newBlob,
    };
  });
