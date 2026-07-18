import { createServerFn } from '@tanstack/react-start'

// ── Types ───────────────────────────────────────────────────────────────────

export interface AdminUser {
  clerkUserId: string
  name: string
  email: string
  avatarUrl: string
  approved: boolean
  banned: boolean
  isAdmin: boolean
  uploadCountToday: number
  createdAt: Date
}

export interface StorageStats {
  blobCount: number
  totalSizeBytes: number
  capacityBytes: number
}

export interface FlaggedBlob {
  id: number
  title: string
  description: string | null
  dateOccurred: string
  filamentType: string
  machineUsed: string
  imageThumbnailUrl: string
  uploaderProfileId: string
  uploaderName: string
  uploaderAvatarUrl: string
  moderationScores: Record<string, number> | null
  createdAt: Date
}

// ── Internal helpers (all heavy imports are dynamic) ────────────────────────

async function getDb() {
  const { db } = await import('./index')
  return db
}

async function getSchema() {
  return await import('./schema')
}

async function getDrizzleEq() {
  const { eq } = await import('drizzle-orm')
  return eq
}

// ── Auth helpers (extracted for testability) ────────────────────────────────

export async function checkIsAdmin(userId: string): Promise<boolean> {
  const [db, { profiles }, eq] = await Promise.all([getDb(), getSchema(), getDrizzleEq()])
  const [profile] = await db
    .select({ isAdmin: profiles.isAdmin })
    .from(profiles)
    .where(eq(profiles.clerkUserId, userId))
    .limit(1)
  return profile?.isAdmin === 1
}

export async function checkNotBanned(userId: string): Promise<{ banned: number; approved: number; isAdmin: number; uploadCountToday: number; lastUploadDate: string | null; clerkUserId: string; createdAt: Date }> {
  const [db, { profiles }, eq] = await Promise.all([getDb(), getSchema(), getDrizzleEq()])
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.clerkUserId, userId))
    .limit(1)
  if (!profile) throw new Error('Profile not found')
  if (profile.banned === 1) throw new Error('Your account has been banned.')
  return profile
}

// ── User list (extracted for testability) ───────────────────────────────────

export async function queryAllUsers(): Promise<AdminUser[]> {
  const [db, { profiles }] = await Promise.all([getDb(), getSchema()])
  const allProfiles = await db.select().from(profiles).orderBy(profiles.createdAt)
  if (allProfiles.length === 0) return []

  const { clerkClient } = await import('@clerk/tanstack-react-start/server')
  const client = clerkClient()
  const clerkUsers = await client.users.getUserList({
    userId: allProfiles.map((p) => p.clerkUserId),
    limit: allProfiles.length,
  })

  const clerkMap = new Map(clerkUsers.data.map((u) => [u.id, u]))

  return allProfiles.map((p) => {
    const cu = clerkMap.get(p.clerkUserId)
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
    }
  })
}

// ── Toggle helpers (extracted for testability) ──────────────────────────────

export async function setUserApproved(clerkUserId: string, approved: boolean): Promise<boolean> {
  const [db, { profiles }, eq] = await Promise.all([getDb(), getSchema(), getDrizzleEq()])

  // Prevent modification of admin users
  const [target] = await db
    .select({ isAdmin: profiles.isAdmin })
    .from(profiles)
    .where(eq(profiles.clerkUserId, clerkUserId))
    .limit(1)
  if (!target) throw new Error('User not found')
  if (target.isAdmin === 1) throw new Error('Cannot modify admin users')

  const [updated] = await db
    .update(profiles)
    .set({ approved: approved ? 1 : 0 })
    .where(eq(profiles.clerkUserId, clerkUserId))
    .returning({ approved: profiles.approved })
  if (!updated) throw new Error('User not found')
  return updated.approved === 1
}

export async function setUserBanned(clerkUserId: string, banned: boolean): Promise<boolean> {
  const [db, { profiles }, eq] = await Promise.all([getDb(), getSchema(), getDrizzleEq()])

  // Prevent modification of admin users
  const [target] = await db
    .select({ isAdmin: profiles.isAdmin })
    .from(profiles)
    .where(eq(profiles.clerkUserId, clerkUserId))
    .limit(1)
  if (!target) throw new Error('User not found')
  if (target.isAdmin === 1) throw new Error('Cannot modify admin users')

  const [updated] = await db
    .update(profiles)
    .set({ banned: banned ? 1 : 0 })
    .where(eq(profiles.clerkUserId, clerkUserId))
    .returning({ banned: profiles.banned })
  if (!updated) throw new Error('User not found')
  return updated.banned === 1
}

// ── Delete blob (extracted for testability) ─────────────────────────────────

export async function removeBlob(blobId: number): Promise<void> {
  const [db, { blobs }, eq] = await Promise.all([getDb(), getSchema(), getDrizzleEq()])
  const [blob] = await db
    .select({
      imageThumbnailUrl: blobs.imageThumbnailUrl,
      imageMediumUrl: blobs.imageMediumUrl,
      imageFullUrl: blobs.imageFullUrl,
    })
    .from(blobs)
    .where(eq(blobs.id, blobId))
    .limit(1)
  if (!blob) throw new Error('Blob not found')

  const { del } = await import('@vercel/blob')
  const token = process.env.BLOB_READ_WRITE_TOKEN
  const storeId = process.env.BLOB_STORE_ID
  await del([blob.imageThumbnailUrl, blob.imageMediumUrl, blob.imageFullUrl], { token, storeId })
  await db.delete(blobs).where(eq(blobs.id, blobId))
}

// ── Storage stats (extracted for testability) ───────────────────────────────

const DEFAULT_CAPACITY_BYTES = 5 * 1024 * 1024 * 1024

export async function queryStorageStats(): Promise<StorageStats> {
  const { list } = await import('@vercel/blob')
  const token = process.env.BLOB_READ_WRITE_TOKEN
  const storeId = process.env.BLOB_STORE_ID

  let totalSize = 0
  let blobCount = 0
  let cursor: string | undefined
  do {
    const result = await list({ cursor, limit: 1000, token, storeId })
    for (const b of result.blobs) { totalSize += b.size; blobCount++ }
    cursor = result.cursor
  } while (cursor)

  const capacityBytes = process.env.BLOB_CAPACITY_BYTES
    ? parseInt(process.env.BLOB_CAPACITY_BYTES, 10)
    : DEFAULT_CAPACITY_BYTES

  return { blobCount, totalSizeBytes: totalSize, capacityBytes }
}

// ── Server functions ────────────────────────────────────────────────────────

async function requireAdmin(): Promise<string> {
  const { auth } = await import('@clerk/tanstack-react-start/server')
  const { userId } = await auth()
  if (!userId) throw new Error('Not authenticated')
  const isAdmin = await checkIsAdmin(userId)
  if (!isAdmin) throw new Error('Admin access required')
  return userId
}

export const getUsers = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  return queryAllUsers()
})

export const approveUser = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    if (typeof d !== 'object' || d === null || typeof (d as Record<string, unknown>).clerkUserId !== 'string') {
      throw new Error('clerkUserId is required')
    }
    return d as { clerkUserId: string }
  })
  .handler(async ({ data }) => {
    await requireAdmin()
    return setUserApproved(data.clerkUserId, true)
  })

export const unapproveUser = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    if (typeof d !== 'object' || d === null || typeof (d as Record<string, unknown>).clerkUserId !== 'string') {
      throw new Error('clerkUserId is required')
    }
    return d as { clerkUserId: string }
  })
  .handler(async ({ data }) => {
    await requireAdmin()
    return setUserApproved(data.clerkUserId, false)
  })

export const banUser = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    if (typeof d !== 'object' || d === null || typeof (d as Record<string, unknown>).clerkUserId !== 'string') {
      throw new Error('clerkUserId is required')
    }
    return d as { clerkUserId: string }
  })
  .handler(async ({ data }) => {
    await requireAdmin()
    return setUserBanned(data.clerkUserId, true)
  })

export const unbanUser = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    if (typeof d !== 'object' || d === null || typeof (d as Record<string, unknown>).clerkUserId !== 'string') {
      throw new Error('clerkUserId is required')
    }
    return d as { clerkUserId: string }
  })
  .handler(async ({ data }) => {
    await requireAdmin()
    return setUserBanned(data.clerkUserId, false)
  })

export const deleteBlob = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    if (typeof d !== 'object' || d === null || typeof (d as Record<string, unknown>).blobId !== 'number') {
      throw new Error('blobId is required')
    }
    return d as { blobId: number }
  })
  .handler(async ({ data }) => {
    await requireAdmin()
    await removeBlob(data.blobId)
    return { success: true }
  })

export const getStorageStats = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  return queryStorageStats()
})

// ── Flagged blob helpers (extracted for testability) ────────────────────────

export async function queryFlaggedBlobs(): Promise<FlaggedBlob[]> {
  const [db, { blobs, profiles }, eq] = await Promise.all([
    getDb(),
    getSchema(),
    getDrizzleEq(),
  ])
  const { and, desc } = await import('drizzle-orm')

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
    .orderBy(desc(blobs.createdAt))

  if (rows.length === 0) return []

  // Enrich with Clerk user data
  const { clerkClient } = await import('@clerk/tanstack-react-start/server')
  const client = clerkClient()
  const clerkUsers = await client.users.getUserList({
    userId: rows.map((r) => r.clerkUserId),
    limit: rows.length,
  })
  const clerkMap = new Map(clerkUsers.data.map((u) => [u.id, u]))

  return rows.map((r) => {
    const cu = clerkMap.get(r.clerkUserId)
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      dateOccurred: r.dateOccurred,
      filamentType: r.filamentType,
      machineUsed: r.machineUsed,
      imageThumbnailUrl: r.imageThumbnailUrl,
      uploaderProfileId: r.uploaderProfileId,
      uploaderName: cu
        ? `${cu.firstName ?? ''} ${cu.lastName ?? ''}`.trim() || cu.username || 'Unknown'
        : 'Unknown',
      uploaderAvatarUrl: cu?.imageUrl ?? '',
      moderationScores: r.moderationScores as Record<string, number> | null,
      createdAt: r.createdAt,
    }
  })
}

export async function approveFlaggedBlobById(blobId: number): Promise<void> {
  const [db, { blobs }, eq] = await Promise.all([getDb(), getSchema(), getDrizzleEq()])
  const [updated] = await db
    .update(blobs)
    .set({ flagged: 0, moderationScores: null })
    .where(eq(blobs.id, blobId))
    .returning({ id: blobs.id })
  if (!updated) throw new Error('Blob not found')
}

// ── Flagged blob server functions ───────────────────────────────────────────

export const getFlaggedBlobs = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  return queryFlaggedBlobs()
})

export const approveFlaggedBlob = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    if (typeof d !== 'object' || d === null || typeof (d as Record<string, unknown>).blobId !== 'number') {
      throw new Error('blobId is required')
    }
    return d as { blobId: number }
  })
  .handler(async ({ data }) => {
    await requireAdmin()
    await approveFlaggedBlobById(data.blobId)
    return { success: true }
  })

export const rejectFlaggedBlob = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    if (typeof d !== 'object' || d === null || typeof (d as Record<string, unknown>).blobId !== 'number') {
      throw new Error('blobId is required')
    }
    return d as { blobId: number }
  })
  .handler(async ({ data }) => {
    await requireAdmin()
    await removeBlob(data.blobId)
    return { success: true }
  })
