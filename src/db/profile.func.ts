import { createServerFn } from '@tanstack/react-start';
import { eq } from 'drizzle-orm';

import { db } from '../db';
import { profiles } from '../db/schema';

export const ensureProfile = createServerFn({
  method: 'POST',
}).handler(async () => {
  const { auth } = await import('@clerk/tanstack-react-start/server');
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Not authenticated');
  }

  // Upsert: create profile if it doesn't exist, otherwise no-op
  const existing = await db.select().from(profiles).where(eq(profiles.clerkUserId, userId)).limit(1);

  if (existing.length === 0) {
    await db.insert(profiles).values({
      clerkUserId: userId,
      uploadCountToday: 0,
      approved: 0,
      banned: 0,
    });
  }

  return { success: true };
});
