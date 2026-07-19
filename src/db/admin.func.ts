import { createServerFn } from '@tanstack/react-start';
import { and, desc, eq } from 'drizzle-orm';

import { checkIsAdmin, checkNotBanned, requireAdmin } from './auth-guards.func';
import { db } from './index';
import { blobs, profiles } from './schema';
import { assertNumber, assertObject, assertString } from './validation';

// ── Types ───────────────────────────────────────────────────────────────────

export interface AdminUser {
  clerkUserId: string;
  name: string;
  email: string;
  avatarUrl: string;
  approved: boolean;
  banned: boolean;
  isAdmin: boolean;
  uploadCountToday: number;
  createdAt: Date;
}

export interface StorageStats {
  blobCount: number;
  totalSizeBytes: number;
  capacityBytes: number;
}

export interface FlaggedBlob {
  id: number;
  title: string;
  description: string | null;
  dateOccurred: string;
  filamentType: string;
  machineUsed: string;
  imageThumbnailUrl: string;
  uploaderProfileId: string;
  uploaderName: string;
  uploaderAvatarUrl: string;
  moderationScores: Record<string, number> | null;
  createdAt: Date;
}

// ── Re-export for backward compatibility ────────────────────────────────────

export { checkIsAdmin, checkNotBanned };

// ── User list (extracted for testability) ───────────────────────────────────

export async function queryAllUsers(): Promise<AdminUser[]> {
  const allProfiles = await db.select().from(profiles).orderBy(profiles.createdAt);
  if (allProfiles.length === 0) return [];

  const { clerkClient } = await import('@clerk/tanstack-react-start/server');
  const client = clerkClient();
  const clerkUsers = await client.users.getUserList({
    userId: allProfiles.map((p) => p.clerkUserId),
    limit: allProfiles.length,
  });

  const clerkMap = new Map(clerkUsers.data.map((u) => [u.id, u]));

  return allProfiles.map((p) => {
    const cu = clerkMap.get(p.clerkUserId);
    return {
      clerkUserId: p.clerkUserId,
      name: cu ? `${cu.firstName ?? ''} ${cu.lastName ?? ''}`.trim() || cu.username || 'Unknown' : 'Unknown',
      email: cu?.emailAddresses?.[0]?.emailAddress ?? '—',
      avatarUrl: cu?.imageUrl ?? '',
      approved: p.approved === 1,
      banned: p.banned === 1,
      isAdmin: p.isAdmin === 1,
      uploadCountToday: p.uploadCountToday,
      createdAt: p.createdAt,
    };
  });
}

// ── Toggle helpers (extracted for testability) ──────────────────────────────

export async function setUserApproved(clerkUserId: string, approved: boolean): Promise<boolean> {
  // Prevent modification of admin users
  const [target] = await db
    .select({ isAdmin: profiles.isAdmin })
    .from(profiles)
    .where(eq(profiles.clerkUserId, clerkUserId))
    .limit(1);
  if (!target) throw new Error('User not found');
  if (target.isAdmin === 1) throw new Error('Cannot modify admin users');

  const [updated] = await db
    .update(profiles)
    .set({ approved: approved ? 1 : 0 })
    .where(eq(profiles.clerkUserId, clerkUserId))
    .returning({ approved: profiles.approved });
  if (!updated) throw new Error('User not found');
  return updated.approved === 1;
}

export async function setUserBanned(clerkUserId: string, banned: boolean): Promise<boolean> {
  // Prevent modification of admin users
  const [target] = await db
    .select({ isAdmin: profiles.isAdmin })
    .from(profiles)
    .where(eq(profiles.clerkUserId, clerkUserId))
    .limit(1);
  if (!target) throw new Error('User not found');
  if (target.isAdmin === 1) throw new Error('Cannot modify admin users');

  const [updated] = await db
    .update(profiles)
    .set({ banned: banned ? 1 : 0 })
    .where(eq(profiles.clerkUserId, clerkUserId))
    .returning({ banned: profiles.banned });
  if (!updated) throw new Error('User not found');
  return updated.banned === 1;
}

// ── Delete blob (extracted for testability) ─────────────────────────────────

export async function removeBlob(blobId: number): Promise<void> {
  const [blob] = await db
    .select({
      imageThumbnailUrl: blobs.imageThumbnailUrl,
      imageMediumUrl: blobs.imageMediumUrl,
      imageFullUrl: blobs.imageFullUrl,
    })
    .from(blobs)
    .where(eq(blobs.id, blobId))
    .limit(1);
  if (!blob) throw new Error('Blob not found');

  // Mark the DB row as deleted
  await db.update(blobs).set({ deleted: 1 }).where(eq(blobs.id, blobId));

  // Then delete from Vercel Blob — best-effort, log failures but don't throw
  const { del } = await import('@vercel/blob');
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const storeId = process.env.BLOB_STORE_ID;
  await del([blob.imageThumbnailUrl, blob.imageMediumUrl, blob.imageFullUrl], { token, storeId }).catch((err) => {
    console.error('Failed to delete Blob files for blobId:', blobId, err);
  });
}

// ── Storage stats (extracted for testability) ───────────────────────────────

const DEFAULT_CAPACITY_BYTES = 5 * 1024 * 1024 * 1024;

export async function queryStorageStats(): Promise<StorageStats> {
  const { list } = await import('@vercel/blob');
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const storeId = process.env.BLOB_STORE_ID;

  let totalSize = 0;
  let blobCount = 0;
  let cursor: string | undefined;
  do {
    const result = await list({ cursor, limit: 1000, token, storeId });
    for (const b of result.blobs) {
      totalSize += b.size;
      blobCount++;
    }
    cursor = result.cursor;
  } while (cursor);

  const capacityBytes = process.env.BLOB_CAPACITY_BYTES
    ? parseInt(process.env.BLOB_CAPACITY_BYTES, 10)
    : DEFAULT_CAPACITY_BYTES;

  return { blobCount, totalSizeBytes: totalSize, capacityBytes };
}

// ── Server functions ────────────────────────────────────────────────────────

export const getUsers = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin();
  return queryAllUsers();
});

export const approveUser = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    const obj = assertObject(d);
    return { clerkUserId: assertString(obj, 'clerkUserId') };
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    return setUserApproved(data.clerkUserId, true);
  });

export const unapproveUser = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    const obj = assertObject(d);
    return { clerkUserId: assertString(obj, 'clerkUserId') };
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    return setUserApproved(data.clerkUserId, false);
  });

export const banUser = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    const obj = assertObject(d);
    return { clerkUserId: assertString(obj, 'clerkUserId') };
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    return setUserBanned(data.clerkUserId, true);
  });

export const unbanUser = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    const obj = assertObject(d);
    return { clerkUserId: assertString(obj, 'clerkUserId') };
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    return setUserBanned(data.clerkUserId, false);
  });

export const deleteBlob = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    const obj = assertObject(d);
    return { blobId: assertNumber(obj, 'blobId') };
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    await removeBlob(data.blobId);
    return { success: true };
  });

export const getStorageStats = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin();
  return queryStorageStats();
});

// ── Flagged blob helpers (extracted for testability) ────────────────────────

export async function queryFlaggedBlobs(): Promise<FlaggedBlob[]> {
  const rows = await db
    .select({
      id: blobs.id,
      title: blobs.title,
      description: blobs.description,
      dateOccurred: blobs.dateOccurred,
      filamentType: blobs.filamentType,
      machineUsed: blobs.machineUsed,
      imageThumbnailUrl: blobs.imageThumbnailUrl,
      uploaderProfileId: blobs.uploaderProfileId,
      moderationScores: blobs.moderationScores,
      createdAt: blobs.createdAt,
      clerkUserId: profiles.clerkUserId,
    })
    .from(blobs)
    .innerJoin(profiles, eq(blobs.uploaderProfileId, profiles.clerkUserId))
    .where(and(eq(blobs.flagged, 1), eq(blobs.deleted, 0)))
    .orderBy(desc(blobs.createdAt));

  if (rows.length === 0) return [];

  // Enrich with Clerk user data
  const { clerkClient } = await import('@clerk/tanstack-react-start/server');
  const client = clerkClient();
  const clerkUsers = await client.users.getUserList({
    userId: rows.map((r) => r.clerkUserId),
    limit: rows.length,
  });
  const clerkMap = new Map(clerkUsers.data.map((u) => [u.id, u]));

  return rows.map((r) => {
    const cu = clerkMap.get(r.clerkUserId);
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      dateOccurred: r.dateOccurred,
      filamentType: r.filamentType,
      machineUsed: r.machineUsed,
      imageThumbnailUrl: r.imageThumbnailUrl,
      uploaderProfileId: r.uploaderProfileId,
      uploaderName: cu ? `${cu.firstName ?? ''} ${cu.lastName ?? ''}`.trim() || cu.username || 'Unknown' : 'Unknown',
      uploaderAvatarUrl: cu?.imageUrl ?? '',
      moderationScores: r.moderationScores as Record<string, number> | null,
      createdAt: r.createdAt,
    };
  });
}

export async function approveFlaggedBlobById(blobId: number): Promise<void> {
  const [updated] = await db
    .update(blobs)
    .set({ flagged: 0, moderationScores: null })
    .where(eq(blobs.id, blobId))
    .returning({ id: blobs.id });
  if (!updated) throw new Error('Blob not found');
}

// ── Flagged blob server functions ───────────────────────────────────────────

export const getFlaggedBlobs = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin();
  return queryFlaggedBlobs();
});

export const approveFlaggedBlob = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    const obj = assertObject(d);
    return { blobId: assertNumber(obj, 'blobId') };
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    await approveFlaggedBlobById(data.blobId);
    return { success: true };
  });

export const rejectFlaggedBlob = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    const obj = assertObject(d);
    return { blobId: assertNumber(obj, 'blobId') };
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    await removeBlob(data.blobId);
    return { success: true };
  });
