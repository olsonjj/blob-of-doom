import { createServerFn } from '@tanstack/react-start'
import { auth } from '@clerk/tanstack-react-start/server'
import { db } from '../db'
import { profiles } from '../db/schema'
import { eq } from 'drizzle-orm'

export const ensureProfile = createServerFn({
  method: 'POST',
}).handler(async () => {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('Not authenticated')
  }

  // Upsert: create profile if it doesn't exist, otherwise no-op
  const existing = await db
    .select()
    .from(profiles)
    .where(eq(profiles.clerkUserId, userId))
    .limit(1)

  if (existing.length === 0) {
    await db.insert(profiles).values({
      clerkUserId: userId,
      uploadCountToday: 0,
      approved: 0,
      banned: 0,
    })
  }

  return { success: true }
})
