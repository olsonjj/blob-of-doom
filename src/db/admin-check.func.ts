import { createServerFn } from '@tanstack/react-start'

/**
 * Lightweight server function: returns whether the current user is an admin.
 *
 * Kept in its own file with zero top-level dependencies so client components
 * (AdminNavLink, BlobCard) and route beforeLoad hooks can import it without
 * pulling in the database, schema, or Clerk backend bundles.
 */
export const checkAdminStatus = createServerFn({ method: 'GET' }).handler(async () => {
  const { auth } = await import('@clerk/tanstack-react-start/server')
  const { userId } = await auth()
  if (!userId) return false

  const { db } = await import('./index')
  const { profiles } = await import('./schema')
  const { eq } = await import('drizzle-orm')

  const [profile] = await db
    .select({ isAdmin: profiles.isAdmin })
    .from(profiles)
    .where(eq(profiles.clerkUserId, userId))
    .limit(1)

  return profile?.isAdmin === 1
})
