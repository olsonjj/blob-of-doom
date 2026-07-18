import { createServerFn } from '@tanstack/react-start'
import { redirect } from '@tanstack/react-router'

/**
 * Route guards executed as server functions.
 *
 * Why server functions and not inline `beforeLoad` code?
 * `beforeLoad` runs on the CLIENT during SPA navigation. The Clerk
 * `auth()` helper from `@clerk/tanstack-react-start/server` calls
 * `getGlobalStartContext()`, which returns `undefined` on the client
 * (see `@tanstack/start-client-core` — `createIsomorphicFn().client(() => void 0)`).
 * Calling `auth()` directly in `beforeLoad` therefore throws
 * `can't access property "auth", (intermediate value)() is undefined`
 * on client-side navigation, and only works on a full page reload
 * (server execution).
 *
 * Wrapping the check in `createServerFn` makes TanStack Start RPC the
 * call to the server, where `getGlobalStartContext()` is populated by
 * `clerkMiddleware()`. Redirects thrown inside the handler propagate
 * back to the router correctly. This is the documented Clerk pattern.
 */

export const requireAuth = createServerFn({ method: 'GET' }).handler(async () => {
  const { auth } = await import('@clerk/tanstack-react-start/server')
  const { userId } = await auth()
  if (!userId) {
    throw redirect({ to: '/sign-in/$' })
  }
  return { userId }
})

export const requireAdmin = createServerFn({ method: 'GET' }).handler(async () => {
  const { auth } = await import('@clerk/tanstack-react-start/server')
  const { userId } = await auth()
  if (!userId) {
    throw redirect({ to: '/sign-in/$' })
  }

  const { db } = await import('./index')
  const { profiles } = await import('./schema')
  const { eq } = await import('drizzle-orm')
  const [profile] = await db
    .select({ isAdmin: profiles.isAdmin })
    .from(profiles)
    .where(eq(profiles.clerkUserId, userId))
    .limit(1)

  if (profile?.isAdmin !== 1) {
    throw redirect({ to: '/' })
  }
  return { userId }
})