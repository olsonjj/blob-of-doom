import { createServerFn } from '@tanstack/react-start'
import { db } from './index'
import { blobs } from './schema'
import { eq } from 'drizzle-orm'

// ── Types ───────────────────────────────────────────────────────────────────

export interface UpdateBlobInput {
  blobId: number
  title: string
  description: string | null
  dateOccurred: string
  filamentType: string
  machineUsed: string
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function getUserId(): Promise<string> {
  const { auth } = await import('@clerk/tanstack-react-start/server')
  const { userId } = await auth()
  if (!userId) throw new Error('Not authenticated')
  return userId
}

async function verifyOwnership(blobId: number, userId: string): Promise<void> {
  const [blob] = await db
    .select({ uploaderProfileId: blobs.uploaderProfileId, deleted: blobs.deleted })
    .from(blobs)
    .where(eq(blobs.id, blobId))
    .limit(1)

  if (!blob) throw new Error('Blob not found')
  if (blob.deleted === 1) throw new Error('Blob not found')
  if (blob.uploaderProfileId !== userId) throw new Error('You can only edit your own blobs')
}

// ── Update blob (extracted for testability) ─────────────────────────────────

export async function updateBlobRecord(
  input: UpdateBlobInput,
  userId: string,
): Promise<{ success: boolean }> {
  await verifyOwnership(input.blobId, userId)

  await db
    .update(blobs)
    .set({
      title: input.title,
      description: input.description,
      dateOccurred: input.dateOccurred,
      filamentType: input.filamentType,
      machineUsed: input.machineUsed,
    })
    .where(eq(blobs.id, input.blobId))

  return { success: true }
}

// ── Soft-delete blob (extracted for testability) ────────────────────────────

export async function softDeleteBlobRecord(
  blobId: number,
  userId: string,
): Promise<{ success: boolean }> {
  await verifyOwnership(blobId, userId)

  await db
    .update(blobs)
    .set({ deleted: 1 })
    .where(eq(blobs.id, blobId))

  return { success: true }
}

// ── Server functions ────────────────────────────────────────────────────────

export const updateBlob = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    if (typeof d !== 'object' || d === null) throw new Error('Invalid input')

    const input = d as Record<string, unknown>
    const errors: { field: string; message: string }[] = []

    if (typeof input.blobId !== 'number') errors.push({ field: 'blobId', message: 'Blob ID is required' })
    if (typeof input.title !== 'string' || !input.title.trim()) errors.push({ field: 'title', message: 'Title is required' })
    if (typeof input.dateOccurred !== 'string' || !input.dateOccurred) errors.push({ field: 'dateOccurred', message: 'Date occurred is required' })
    if (typeof input.filamentType !== 'string' || !input.filamentType.trim()) errors.push({ field: 'filamentType', message: 'Filament type is required' })
    if (typeof input.machineUsed !== 'string' || !input.machineUsed.trim()) errors.push({ field: 'machineUsed', message: 'Machine used is required' })

    if (errors.length > 0) throw new Error(JSON.stringify(errors))

    return {
      blobId: input.blobId as number,
      title: (input.title as string).trim(),
      description: typeof input.description === 'string' && input.description.trim()
        ? input.description.trim()
        : null,
      dateOccurred: input.dateOccurred as string,
      filamentType: (input.filamentType as string).trim(),
      machineUsed: (input.machineUsed as string).trim(),
    } satisfies UpdateBlobInput
  })
  .handler(async ({ data }) => {
    const userId = await getUserId()
    return updateBlobRecord(data, userId)
  })

export const softDeleteBlob = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    if (typeof d !== 'object' || d === null || typeof (d as Record<string, unknown>).blobId !== 'number') {
      throw new Error('blobId is required')
    }
    return d as { blobId: number }
  })
  .handler(async ({ data }) => {
    const userId = await getUserId()
    return softDeleteBlobRecord(data.blobId, userId)
  })
