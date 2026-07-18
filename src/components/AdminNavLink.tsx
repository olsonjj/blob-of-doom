import { useAuth } from '@clerk/tanstack-react-start';
import { Link } from '@tanstack/react-router';
import { Shield } from 'lucide-react';
import { useEffect, useState } from 'react';

import { checkAdminStatus } from '../db/admin-check.func';

/**
 * Renders an "Admin" nav link only if the current user is an admin.
 * Checks admin status once when the user is signed in.
 */
export function AdminNavLink() {
  const { isSignedIn, isLoaded } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn && !hasChecked) {
      setHasChecked(true);
      void checkAdminStatus()
        .then(setIsAdmin)
        .catch(() => setIsAdmin(false));
    }
  }, [isLoaded, isSignedIn, hasChecked]);

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
