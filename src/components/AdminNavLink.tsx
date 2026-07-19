import { useAuth } from '@clerk/tanstack-react-start';
import { Link } from '@tanstack/react-router';
import Shield from 'lucide-react/dist/esm/icons/shield';
import useSWR from 'swr';

import { checkAdminStatus } from '../db/admin-check.func';

/**
 * Renders an "Admin" nav link only if the current user is an admin.
 * Uses SWR to cache the admin status check.
 */
export function AdminNavLink() {
  const { isSignedIn, isLoaded } = useAuth();
  const { data: isAdmin = false } = useSWR(isLoaded && isSignedIn ? 'admin-status' : null, () => checkAdminStatus(), {
    revalidateOnFocus: false,
  });

  if (!isAdmin) return null;

  return (
    <Link
      to="/admin"
      className="flex items-center gap-1 text-doom-400 hover:text-doom-300 transition-colors text-sm font-medium"
    >
      <Shield className="w-4 h-4" />
      Admin
    </Link>
  );
}
