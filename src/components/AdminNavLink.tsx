import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { Shield } from 'lucide-react'
import { useAuth } from '@clerk/tanstack-react-start'
import { checkAdminStatus } from '../db/admin-check.func'

/**
 * Renders an "Admin" nav link only if the current user is an admin.
 * Checks admin status once when the user is signed in.
 */
export function AdminNavLink() {
  const { isSignedIn, isLoaded } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (isLoaded && isSignedIn && !checked) {
      setChecked(true)
      checkAdminStatus()
        .then(setIsAdmin)
        .catch(() => setIsAdmin(false))
    }
  }, [isLoaded, isSignedIn, checked])

  if (!isAdmin) return null

  return (
    <Link
      to="/admin"
      className="flex items-center gap-1 text-doom-400 hover:text-doom-300 transition-colors text-sm font-medium"
    >
      <Shield className="w-4 h-4" />
      Admin
    </Link>
  )
}
