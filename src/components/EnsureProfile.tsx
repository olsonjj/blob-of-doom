import { useAuth } from '@clerk/tanstack-react-start';
import { useEffect, useRef } from 'react';

import { ensureProfile } from '../db/profile.func';

/**
 * Calls ensureProfile once when the user is signed in,
 * creating the profiles table row if it doesn't exist.
 */
export function EnsureProfile() {
  const { isSignedIn, isLoaded } = useAuth();
  const called = useRef(false);

  useEffect(() => {
    if (isLoaded && isSignedIn && !called.current) {
      called.current = true;
      ensureProfile().catch((err) => {
        console.error('ensureProfile failed:', err);
      });
    }
  }, [isLoaded, isSignedIn]);

  return null;
}
