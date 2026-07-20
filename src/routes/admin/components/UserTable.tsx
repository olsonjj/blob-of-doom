import Ban from 'lucide-react/dist/esm/icons/ban';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import Users from 'lucide-react/dist/esm/icons/users';
import XCircle from 'lucide-react/dist/esm/icons/x-circle';
import { memo } from 'react';

import { ErrorBanner } from '../../../components/ErrorBanner';
import type { AdminUser } from '../../../db/admin.func';

// ── User Row ────────────────────────────────────────────────────────────────

const UserRow = memo(function UserRow({
  user,
  onToggleApproved,
  onToggleBanned,
}: {
  user: AdminUser;
  onToggleApproved: (clerkUserId: string, current: boolean) => void;
  onToggleBanned: (clerkUserId: string, current: boolean) => void;
}) {
  const statusBadge = user.banned
    ? { label: 'Banned', className: 'bg-doom-500/10 text-doom-400 border-doom-500/30' }
    : user.isAdmin
      ? { label: 'Admin', className: 'bg-purple-500/10 text-purple-400 border-purple-500/30' }
      : user.approved
        ? { label: 'Approved', className: 'bg-green-500/10 text-green-400 border-green-500/30' }
        : { label: 'Default', className: 'bg-noir-600/50 text-noir-300 border-noir-600' };

  return (
    <tr className="border-b border-noir-800 hover:bg-noir-800/50 transition-colors">
      {/* User identity */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full bg-noir-700 shrink-0" />
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
        <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full border ${statusBadge.className}`}>
          {statusBadge.label}
        </span>
      </td>

      {/* Uploads today */}
      <td className="py-3 px-2 text-center">
        <span className="text-sm text-noir-300 tabular-nums">{user.uploadCountToday}</span>
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
              {user.banned ? <XCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
});

// ── User Table ──────────────────────────────────────────────────────────────

export function UserTable({
  users,
  loading,
  error,
  onRetry,
  onToggleApproved,
  onToggleBanned,
}: {
  users: AdminUser[];
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  onToggleApproved: (clerkUserId: string, current: boolean) => void;
  onToggleBanned: (clerkUserId: string, current: boolean) => void;
}) {
  if (error) {
    return <ErrorBanner message={error instanceof Error ? error.message : 'Failed to load users'} onRetry={onRetry} />;
  }

  if (loading) {
    return (
      <div className="bg-noir-900 border border-noir-700 rounded-xl overflow-hidden">
        <div className="p-4 animate-pulse space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-10 bg-noir-800 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="bg-noir-900 border border-noir-700 rounded-xl p-8 text-center">
        <Users className="w-10 h-10 text-noir-600 mx-auto mb-3" />
        <p className="text-noir-400">No users found.</p>
      </div>
    );
  }

  return (
    <div className="bg-noir-900 border border-noir-700 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-noir-700 text-left">
              <th className="py-3 px-4 text-xs font-medium text-noir-400 uppercase tracking-wider">User</th>
              <th className="py-3 px-2 text-xs font-medium text-noir-400 uppercase tracking-wider">Status</th>
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
                onToggleApproved={onToggleApproved}
                onToggleBanned={onToggleBanned}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
