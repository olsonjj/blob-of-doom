import { redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { eq } from 'drizzle-orm';

import { db } from './index';
import { profiles } from './schema';

/**
 * Route guards and auth helpers.
 *
 * Why server functions for route guards?
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

// ── Route guards (createServerFn — usable in beforeLoad) ────────────────────

export const requireAuth = createServerFn({ method: 'GET' }).handler(async () => {
  const { auth } = await import('@clerk/tanstack-react-start/server');
  const { userId } = await auth();
  if (!userId) {
    throw redirect({ to: '/sign-in/$' });
  }
  return { userId };
});

export const requireAdminGuard = createServerFn({ method: 'GET' }).handler(async () => {
  const { auth } = await import('@clerk/tanstack-react-start/server');
  const { userId } = await auth();
  if (!userId) {
    throw redirect({ to: '/sign-in/$' });
  }

  const isAdmin = await checkIsAdmin(userId);
  if (!isAdmin) {
    throw redirect({ to: '/' });
  }
  return { userId };
});

// ── Plain async helpers (for use within server function handlers) ───────────

/**
 * Returns true if the given userId belongs to an admin.
 */
export async function checkIsAdmin(userId: string): Promise<boolean> {
  const [profile] = await db
    .select({ isAdmin: profiles.isAdmin })
    .from(profiles)
    .where(eq(profiles.clerkUserId, userId))
    .limit(1);
  return profile?.isAdmin === 1;
}

/**
 * Returns the full profile if the user exists and is not banned.
 * Throws if the profile is missing or the user is banned.
 */
export async function checkNotBanned(userId: string) {
  const [profile] = await db.select().from(profiles).where(eq(profiles.clerkUserId, userId)).limit(1);
  if (!profile) throw new Error('Profile not found');
  if (profile.banned === 1) throw new Error('Your account has been banned.');
  return profile;
}

/**
 * Assert that the current request is from an authenticated admin.
 * Throws if not authenticated or not an admin.
 * Returns the userId.
 */
export async function requireAdmin(): Promise<string> {
  const { auth } = await import('@clerk/tanstack-react-start/server');
  const { userId } = await auth();
  if (!userId) throw new Error('Not authenticated');
  const isAdmin = await checkIsAdmin(userId);
  if (!isAdmin) throw new Error('Admin access required');
  return userId;
}
