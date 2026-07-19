import { createServerFn } from '@tanstack/react-start';
import { eq } from 'drizzle-orm';

import { db } from './index';
import { blobs } from './schema';
import { assertNumber, assertObject } from './validation';

// ── Types ───────────────────────────────────────────────────────────────────

export interface UpdateBlobInput {
  blobId: number;
  title: string;
  description: string | null;
  dateOccurred: string;
  filamentType: string;
  machineUsed: string;
}

export interface UpdateBlobError {
  field: string;
  message: string;
}

export type UpdateBlobResult = { success: true } | { success: false; errors: UpdateBlobError[] };

// ── Helpers ─────────────────────────────────────────────────────────────────

async function getUserId(): Promise<string> {
  const { auth } = await import('@clerk/tanstack-react-start/server');
  const { userId } = await auth();
  if (!userId) throw new Error('Not authenticated');
  return userId;
}

async function verifyOwnership(blobId: number, userId: string): Promise<void> {
  const [blob] = await db
    .select({ uploaderProfileId: blobs.uploaderProfileId, deleted: blobs.deleted })
    .from(blobs)
    .where(eq(blobs.id, blobId))
    .limit(1);

  if (!blob) throw new Error('Blob not found');
  if (blob.deleted === 1) throw new Error('Blob not found');
  if (blob.uploaderProfileId !== userId) throw new Error('You can only edit your own blobs');
}

// ── Update blob (extracted for testability) ─────────────────────────────────

export async function updateBlobRecord(input: UpdateBlobInput, userId: string): Promise<{ success: true }> {
  await verifyOwnership(input.blobId, userId);

  await db
    .update(blobs)
    .set({
      title: input.title,
      description: input.description,
      dateOccurred: input.dateOccurred,
      filamentType: input.filamentType,
      machineUsed: input.machineUsed,
    })
    .where(eq(blobs.id, input.blobId));

  return { success: true };
}

// ── Soft-delete blob (extracted for testability) ────────────────────────────

/**
 * Soft-delete a blob: mark deleted=1 in the DB and remove image files from
 * Vercel Blob storage. File deletion is best-effort — failures are logged
 * but do not prevent the DB update.
 */
export async function softDeleteBlobRecord(blobId: number, userId: string): Promise<{ success: true }> {
  await verifyOwnership(blobId, userId);

  // Fetch image URLs before marking deleted
  const [blob] = await db
    .select({
      imageThumbnailUrl: blobs.imageThumbnailUrl,
      imageMediumUrl: blobs.imageMediumUrl,
      imageFullUrl: blobs.imageFullUrl,
    })
    .from(blobs)
    .where(eq(blobs.id, blobId))
    .limit(1);

  // Mark as deleted in the DB
  await db.update(blobs).set({ deleted: 1 }).where(eq(blobs.id, blobId));

  // Delete files from Vercel Blob — best-effort, log failures but don't throw
  if (blob) {
    const { del } = await import('@vercel/blob');
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const storeId = process.env.BLOB_STORE_ID;
    await del([blob.imageThumbnailUrl, blob.imageMediumUrl, blob.imageFullUrl], { token, storeId }).catch((err) => {
      console.error('Failed to delete Blob files for blobId:', blobId, err);
    });
  }

  return { success: true };
}

// ── Server functions ────────────────────────────────────────────────────────

export const updateBlob = createServerFn({ method: 'POST' })
  .validator((d: unknown) => d as Record<string, unknown>)
  .handler(async ({ data: input }): Promise<UpdateBlobResult> => {
    const errors: UpdateBlobError[] = [];

    if (typeof input.blobId !== 'number') errors.push({ field: 'blobId', message: 'Blob ID is required' });
    if (typeof input.title !== 'string' || !input.title.trim())
      errors.push({ field: 'title', message: 'Title is required' });
    if (typeof input.dateOccurred !== 'string' || !input.dateOccurred)
      errors.push({ field: 'dateOccurred', message: 'Date occurred is required' });
    if (typeof input.filamentType !== 'string' || !input.filamentType.trim())
      errors.push({ field: 'filamentType', message: 'Filament type is required' });
    if (typeof input.machineUsed !== 'string' || !input.machineUsed.trim())
      errors.push({ field: 'machineUsed', message: 'Machine used is required' });

    if (errors.length > 0) return { success: false, errors };

    const validated: UpdateBlobInput = {
      blobId: input.blobId as number,
      title: (input.title as string).trim(),
      description: typeof input.description === 'string' && input.description.trim() ? input.description.trim() : null,
      dateOccurred: input.dateOccurred as string,
      filamentType: (input.filamentType as string).trim(),
      machineUsed: (input.machineUsed as string).trim(),
    };

    const userId = await getUserId();
    return updateBlobRecord(validated, userId);
  });

export const softDeleteBlob = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    const obj = assertObject(d);
    return { blobId: assertNumber(obj, 'blobId') };
  })
  .handler(async ({ data }) => {
    const userId = await getUserId();
    return softDeleteBlobRecord(data.blobId, userId);
  });
