import { createServerFn } from '@tanstack/react-start';

import { checkIsAdmin } from './auth-guards.func';

/**
 * Lightweight server function: returns whether the current user is an admin.
 *
 * Kept in its own file with zero top-level dependencies so client components
 * (AdminNavLink, BlobCard) and route beforeLoad hooks can import it without
 * pulling in the database, schema, or Clerk backend bundles.
 */
export const checkAdminStatus = createServerFn({ method: 'GET' }).handler(async () => {
  const { auth } = await import('@clerk/tanstack-react-start/server');
  const { userId } = await auth();
  if (!userId) return false;

  return checkIsAdmin(userId);
});
