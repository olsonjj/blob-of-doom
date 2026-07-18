import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import {
  Shield,
  Users,
  HardDrive,
  Image,
  CheckCircle,
  XCircle,
  Ban,
  Trash2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import {
  getUsers,
  approveUser,
  unapproveUser,
  banUser,
  unbanUser,
  deleteBlob,
  getStorageStats,
  type AdminUser,
  type StorageStats,
} from '../../db/admin.func'
import { fetchGallery, type GalleryBlob } from '../../db/gallery.func'
import { requireAdmin } from '../../db/auth-guards.func'

export const Route = createFileRoute('/admin/')({
  // `requireAdmin` is a createServerFn — TanStack Start RPCs it to the
  // server on client-side navigation, so `auth()` runs where
  // `getGlobalStartContext()` is actually populated (by clerkMiddleware).
  // Calling `auth()` inline here would throw on SPA nav because
  // `getGlobalStartContext()` returns undefined on the client.
  beforeLoad: async () => await requireAdmin(),
  component: AdminDashboard,
})

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const size = bytes / Math.pow(1024, i)
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

// ── Confirmation Modal ──────────────────────────────────────────────────────

function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  confirmVariant,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  confirmVariant: 'danger' | 'warning'
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-noir-950/80 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Dialog */}
      <div className="relative bg-noir-900 border border-noir-700 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-start gap-3 mb-4">
          <div
            className={`p-2 rounded-lg shrink-0 ${
              confirmVariant === 'danger'
                ? 'bg-doom-500/10 text-doom-400'
                : 'bg-yellow-500/10 text-yellow-400'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-noir-100">{title}</h3>
            <p className="mt-1 text-sm text-noir-400">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-noir-300 hover:text-noir-100 bg-noir-800 hover:bg-noir-700 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors cursor-pointer ${
              confirmVariant === 'danger'
                ? 'bg-doom-500 hover:bg-doom-400'
                : 'bg-yellow-600 hover:bg-yellow-500'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Storage Stats Cards ─────────────────────────────────────────────────────

function StorageCards({ stats, loading }: { stats: StorageStats | null; loading: boolean }) {
  const usagePercent = stats
    ? Math.min(100, (stats.totalSizeBytes / stats.capacityBytes) * 100)
    : 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
      {/* Blob count */}
      <div className="bg-noir-900 border border-noir-700 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-doom-500/10 rounded-lg">
            <Image className="w-5 h-5 text-doom-400" />
          </div>
          <span className="text-xs font-medium text-noir-400 uppercase tracking-wider">
            Images Stored
          </span>
        </div>
        {loading ? (
          <div className="h-8 bg-noir-800 rounded animate-pulse w-16" />
        ) : (
          <p className="text-3xl font-bold text-noir-100">
            {stats?.blobCount ?? 0}
          </p>
        )}
        <p className="mt-1 text-xs text-noir-500">
          Across all variants (thumbnail, medium, full)
        </p>
      </div>

      {/* Total size */}
      <div className="bg-noir-900 border border-noir-700 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <HardDrive className="w-5 h-5 text-blue-400" />
          </div>
          <span className="text-xs font-medium text-noir-400 uppercase tracking-wider">
            Storage Used
          </span>
        </div>
        {loading ? (
          <div className="h-8 bg-noir-800 rounded animate-pulse w-24" />
        ) : (
          <p className="text-3xl font-bold text-noir-100">
            {stats ? formatBytes(stats.totalSizeBytes) : '—'}
          </p>
        )}
        <p className="mt-1 text-xs text-noir-500">Cumulative size of all blobs</p>
      </div>

      {/* Capacity */}
      <div className="bg-noir-900 border border-noir-700 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <HardDrive className="w-5 h-5 text-green-400" />
          </div>
          <span className="text-xs font-medium text-noir-400 uppercase tracking-wider">
            Capacity
          </span>
        </div>
        {loading ? (
          <div className="h-8 bg-noir-800 rounded animate-pulse w-24" />
        ) : (
          <p className="text-3xl font-bold text-noir-100">
            {stats ? formatBytes(stats.capacityBytes) : '—'}
          </p>
        )}
        {/* Usage bar */}
        {stats && (
          <div className="mt-2">
            <div className="h-1.5 bg-noir-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  usagePercent > 90
                    ? 'bg-doom-500'
                    : usagePercent > 70
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-noir-500">
              {usagePercent.toFixed(1)}% used
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── User Row ────────────────────────────────────────────────────────────────

function UserRow({
  user,
  onToggleApproved,
  onToggleBanned,
}: {
  user: AdminUser
  onToggleApproved: (clerkUserId: string, current: boolean) => void
  onToggleBanned: (clerkUserId: string, current: boolean) => void
}) {
  const statusBadge = user.banned
    ? { label: 'Banned', className: 'bg-doom-500/10 text-doom-400 border-doom-500/30' }
    : user.isAdmin
      ? { label: 'Admin', className: 'bg-purple-500/10 text-purple-400 border-purple-500/30' }
      : user.approved
        ? { label: 'Approved', className: 'bg-green-500/10 text-green-400 border-green-500/30' }
        : { label: 'Default', className: 'bg-noir-600/50 text-noir-300 border-noir-600' }

  return (
    <tr className="border-b border-noir-800 hover:bg-noir-800/50 transition-colors">
      {/* User identity */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              className="w-8 h-8 rounded-full bg-noir-700 shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-noir-700 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-noir-400" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-noir-100 truncate">{user.name}</p>
            <p className="text-xs text-noir-400 truncate">{user.email}</p>
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="py-3 px-2">
        <span
          className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full border ${statusBadge.className}`}
        >
          {statusBadge.label}
        </span>
      </td>

      {/* Uploads today */}
      <td className="py-3 px-2 text-center">
        <span className="text-sm text-noir-300 tabular-nums">
          {user.uploadCountToday}
        </span>
      </td>

      {/* Actions */}
      <td className="py-3 px-2">
        <div className="flex items-center justify-end gap-1">
          {/* Approve toggle */}
          {!user.banned && !user.isAdmin && (
            <button
              onClick={() => onToggleApproved(user.clerkUserId, user.approved)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                user.approved
                  ? 'text-green-400 hover:bg-green-500/10'
                  : 'text-noir-500 hover:text-green-400 hover:bg-green-500/10'
              }`}
              title={user.approved ? 'Revoke approval' : 'Approve user'}
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}

          {/* Ban toggle */}
          {!user.isAdmin && (
            <button
              onClick={() => onToggleBanned(user.clerkUserId, user.banned)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                user.banned
                  ? 'text-doom-400 hover:bg-doom-500/10'
                  : 'text-noir-500 hover:text-doom-400 hover:bg-doom-500/10'
              }`}
              title={user.banned ? 'Unban user' : 'Ban user'}
            >
              {user.banned ? (
                <XCircle className="w-4 h-4" />
              ) : (
                <Ban className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

// ── Blob Management Row ─────────────────────────────────────────────────────

function BlobRow({
  blob,
  onDelete,
}: {
  blob: GalleryBlob
  onDelete: (blobId: number) => void
}) {
  return (
    <tr className="border-b border-noir-800 hover:bg-noir-800/50 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <img
            src={blob.imageThumbnailUrl}
            alt=""
            className="w-10 h-10 rounded-lg object-cover bg-noir-800 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-noir-100 truncate max-w-xs">
              {blob.title}
            </p>
            <p className="text-xs text-noir-400">
              {new Date(blob.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </td>
      <td className="py-3 px-2 text-sm text-noir-300">{blob.filamentType}</td>
      <td className="py-3 px-2 text-sm text-noir-300 text-center tabular-nums">
        {blob.averageRating.toFixed(1)}
      </td>
      <td className="py-3 px-2 text-right">
        <button
          onClick={() => onDelete(blob.id)}
          className="p-1.5 text-noir-500 hover:text-doom-400 hover:bg-doom-500/10 rounded-lg transition-colors cursor-pointer"
          title="Delete blob"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  )
}

// ── Main Dashboard ──────────────────────────────────────────────────────────

function AdminDashboard() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState<string | null>(null)

  const [storageStats, setStorageStats] = useState<StorageStats | null>(null)
  const [storageLoading, setStorageLoading] = useState(true)

  const [blobs, setBlobs] = useState<GalleryBlob[]>([])
  const [blobsLoading, setBlobsLoading] = useState(true)

  // Confirmation modal state
  const [confirm, setConfirm] = useState<{
    title: string
    message: string
    confirmLabel: string
    variant: 'danger' | 'warning'
    action: () => Promise<void> | void
  } | null>(null)

  const [actionError, setActionError] = useState<string | null>(null)

  // ── Data fetching ─────────────────────────────────────────────────────

  const loadUsers = useCallback(async () => {
    setUsersLoading(true)
    setUsersError(null)
    try {
      const data = await getUsers()
      setUsers(data)
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setUsersLoading(false)
    }
  }, [])

  const loadStorage = useCallback(async () => {
    setStorageLoading(true)
    try {
      const data = await getStorageStats()
      setStorageStats(data)
    } catch {
      // Silently fail — storage stats are non-critical
    } finally {
      setStorageLoading(false)
    }
  }, [])

  const loadBlobs = useCallback(async () => {
    setBlobsLoading(true)
    try {
      const data = await fetchGallery({ data: { sort: 'date', order: 'desc' } })
      setBlobs(data)
    } catch {
      // Silently fail
    } finally {
      setBlobsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
    loadStorage()
    loadBlobs()
  }, [loadUsers, loadStorage, loadBlobs])

  // ── Actions ────────────────────────────────────────────────────────────

  const handleToggleApproved = (clerkUserId: string, current: boolean) => {
    setConfirm({
      title: current ? 'Revoke Approval' : 'Approve User',
      message: current
        ? 'This user will be limited to 1 upload per day.'
        : 'This user will be allowed up to 10 uploads per day.',
      confirmLabel: current ? 'Revoke Approval' : 'Approve',
      variant: 'warning',
      action: async () => {
        if (current) {
          await unapproveUser({ data: { clerkUserId } })
        } else {
          await approveUser({ data: { clerkUserId } })
        }
        await loadUsers()
      },
    })
  }

  const handleToggleBanned = (clerkUserId: string, current: boolean) => {
    setConfirm({
      title: current ? 'Unban User' : 'Ban User',
      message: current
        ? 'This user will be able to upload and rate again.'
        : 'This user will be blocked from uploading and rating. Their existing blobs will remain.',
      confirmLabel: current ? 'Unban' : 'Ban',
      variant: 'danger',
      action: async () => {
        if (current) {
          await unbanUser({ data: { clerkUserId } })
        } else {
          await banUser({ data: { clerkUserId } })
        }
        await loadUsers()
      },
    })
  }

  const handleDeleteBlob = (blobId: number) => {
    const blob = blobs.find((b) => b.id === blobId)
    setConfirm({
      title: 'Delete Blob',
      message: `Are you sure you want to delete "${blob?.title ?? 'this blob'}"? This will remove the blob record and all image variants from storage. This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
      action: async () => {
        await deleteBlob({ data: { blobId } })
        await loadBlobs()
        await loadStorage()
      },
    })
  }

  const executeConfirm = async () => {
    if (!confirm) return
    setActionError(null)
    try {
      await confirm.action()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setConfirm(null)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold text-noir-100 flex items-center gap-3">
            <Shield className="w-7 h-7 text-doom-400" />
            Admin Dashboard
          </h1>
          <p className="mt-2 text-noir-400">
            Manage users, moderate content, and monitor storage.
          </p>
        </div>
        <button
          onClick={() => {
            loadUsers()
            loadStorage()
            loadBlobs()
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-noir-300 hover:text-noir-100 bg-noir-800 hover:bg-noir-700 rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Action error banner */}
      {actionError && (
        <div className="mb-6 flex items-start gap-3 p-4 bg-doom-500/10 border border-doom-500/30 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-doom-400 shrink-0 mt-0.5" />
          <p className="text-sm text-doom-300">{actionError}</p>
        </div>
      )}

      {/* ── Storage Stats ───────────────────────────────────────────────── */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold text-noir-200 mb-4 flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-noir-400" />
          Storage
        </h2>
        <StorageCards stats={storageStats} loading={storageLoading} />
      </section>

      {/* ── User Management ─────────────────────────────────────────────── */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold text-noir-200 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-noir-400" />
          Users
          {!usersLoading && (
            <span className="text-sm font-normal text-noir-500 ml-1">
              ({users.length} total)
            </span>
          )}
        </h2>

        {usersError ? (
          <div className="bg-doom-500/10 border border-doom-500/30 rounded-lg p-4 text-sm text-doom-300">
            {usersError}
          </div>
        ) : usersLoading ? (
          <div className="bg-noir-900 border border-noir-700 rounded-xl overflow-hidden">
            <div className="p-4 animate-pulse space-y-3">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="h-10 bg-noir-800 rounded" />
              ))}
            </div>
          </div>
        ) : users.length === 0 ? (
          <div className="bg-noir-900 border border-noir-700 rounded-xl p-8 text-center">
            <Users className="w-10 h-10 text-noir-600 mx-auto mb-3" />
            <p className="text-noir-400">No users found.</p>
          </div>
        ) : (
          <div className="bg-noir-900 border border-noir-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-noir-700 text-left">
                    <th className="py-3 px-4 text-xs font-medium text-noir-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="py-3 px-2 text-xs font-medium text-noir-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="py-3 px-2 text-xs font-medium text-noir-400 uppercase tracking-wider text-center">
                      Uploads Today
                    </th>
                    <th className="py-3 px-2 text-xs font-medium text-noir-400 uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <UserRow
                      key={user.clerkUserId}
                      user={user}
                      onToggleApproved={handleToggleApproved}
                      onToggleBanned={handleToggleBanned}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ── Blob Management ──────────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-noir-200 mb-4 flex items-center gap-2">
          <Image className="w-5 h-5 text-noir-400" />
          Blobs
          {!blobsLoading && (
            <span className="text-sm font-normal text-noir-500 ml-1">
              ({blobs.length} total)
            </span>
          )}
        </h2>

        {blobsLoading ? (
          <div className="bg-noir-900 border border-noir-700 rounded-xl overflow-hidden">
            <div className="p-4 animate-pulse space-y-3">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="h-12 bg-noir-800 rounded" />
              ))}
            </div>
          </div>
        ) : blobs.length === 0 ? (
          <div className="bg-noir-900 border border-noir-700 rounded-xl p-8 text-center">
            <Image className="w-10 h-10 text-noir-600 mx-auto mb-3" />
            <p className="text-noir-400">No blobs in the gallery.</p>
          </div>
        ) : (
          <div className="bg-noir-900 border border-noir-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-noir-700 text-left">
                    <th className="py-3 px-4 text-xs font-medium text-noir-400 uppercase tracking-wider">
                      Blob
                    </th>
                    <th className="py-3 px-2 text-xs font-medium text-noir-400 uppercase tracking-wider">
                      Filament
                    </th>
                    <th className="py-3 px-2 text-xs font-medium text-noir-400 uppercase tracking-wider text-center">
                      Doom Scale
                    </th>
                    <th className="py-3 px-2 text-xs font-medium text-noir-400 uppercase tracking-wider text-right">
                      Delete
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {blobs.map((blob) => (
                    <BlobRow
                      key={blob.id}
                      blob={blob}
                      onDelete={handleDeleteBlob}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ── Confirmation Modal ──────────────────────────────────────────── */}
      <ConfirmModal
        open={confirm !== null}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        confirmLabel={confirm?.confirmLabel ?? ''}
        confirmVariant={confirm?.variant ?? 'danger'}
        onConfirm={executeConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
