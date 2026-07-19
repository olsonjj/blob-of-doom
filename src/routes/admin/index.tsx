import { createFileRoute } from '@tanstack/react-router';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import Ban from 'lucide-react/dist/esm/icons/ban';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import Eye from 'lucide-react/dist/esm/icons/eye';
import Flag from 'lucide-react/dist/esm/icons/flag';
import HardDrive from 'lucide-react/dist/esm/icons/hard-drive';
import Image from 'lucide-react/dist/esm/icons/image';
import MessageSquare from 'lucide-react/dist/esm/icons/message-square';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Shield from 'lucide-react/dist/esm/icons/shield';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Users from 'lucide-react/dist/esm/icons/users';
import XCircle from 'lucide-react/dist/esm/icons/x-circle';
import { memo, useState } from 'react';
import useSWR from 'swr';

import {
  type AdminUser,
  approveFlaggedBlob,
  approveUser,
  banUser,
  deleteBlob,
  type FlaggedBlob,
  getFlaggedBlobs,
  getStorageStats,
  getUsers,
  rejectFlaggedBlob,
  type StorageStats,
  unapproveUser,
  unbanUser,
} from '../../db/admin.func';
import { requireAdmin } from '../../db/auth-guards.func';
import {
  deleteFeedback,
  type FeedbackRow,
  getFeedback,
  resolveFeedback,
} from '../../db/feedback.func';
import { fetchGallery, type GalleryBlob } from '../../db/gallery.func';

export const Route = createFileRoute('/admin/')({
  beforeLoad: async () => await requireAdmin(),
  component: AdminDashboard,
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
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
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-noir-950/80 backdrop-blur-sm" onClick={onCancel} />
      {/* Dialog */}
      <div className="relative bg-noir-900 border border-noir-700 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-start gap-3 mb-4">
          <div
            className={`p-2 rounded-lg shrink-0 ${
              confirmVariant === 'danger' ? 'bg-doom-500/10 text-doom-400' : 'bg-yellow-500/10 text-yellow-400'
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
              confirmVariant === 'danger' ? 'bg-doom-500 hover:bg-doom-400' : 'bg-yellow-600 hover:bg-yellow-500'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Storage Stats Cards ─────────────────────────────────────────────────────

function StorageCards({ stats, loading }: { stats: StorageStats | null; loading: boolean }) {
  const usagePercent = stats ? Math.min(100, (stats.totalSizeBytes / stats.capacityBytes) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
      {/* Blob count */}
      <div className="bg-noir-900 border border-noir-700 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-doom-500/10 rounded-lg">
            <Image className="w-5 h-5 text-doom-400" />
          </div>
          <span className="text-xs font-medium text-noir-400 uppercase tracking-wider">Images Stored</span>
        </div>
        {loading ? (
          <div className="h-8 bg-noir-800 rounded animate-pulse w-16" />
        ) : (
          <p className="text-3xl font-bold text-noir-100">{stats?.blobCount ?? 0}</p>
        )}
        <p className="mt-1 text-xs text-noir-500">Across all variants (thumbnail, medium, full)</p>
      </div>

      {/* Total size */}
      <div className="bg-noir-900 border border-noir-700 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <HardDrive className="w-5 h-5 text-blue-400" />
          </div>
          <span className="text-xs font-medium text-noir-400 uppercase tracking-wider">Storage Used</span>
        </div>
        {loading ? (
          <div className="h-8 bg-noir-800 rounded animate-pulse w-24" />
        ) : (
          <p className="text-3xl font-bold text-noir-100">{stats ? formatBytes(stats.totalSizeBytes) : '—'}</p>
        )}
        <p className="mt-1 text-xs text-noir-500">Cumulative size of all blobs</p>
      </div>

      {/* Capacity */}
      <div className="bg-noir-900 border border-noir-700 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <HardDrive className="w-5 h-5 text-green-400" />
          </div>
          <span className="text-xs font-medium text-noir-400 uppercase tracking-wider">Capacity</span>
        </div>
        {loading ? (
          <div className="h-8 bg-noir-800 rounded animate-pulse w-24" />
        ) : (
          <p className="text-3xl font-bold text-noir-100">{stats ? formatBytes(stats.capacityBytes) : '—'}</p>
        )}
        {/* Usage bar */}
        {stats && (
          <div className="mt-2">
            <div className="h-1.5 bg-noir-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  usagePercent > 90 ? 'bg-doom-500' : usagePercent > 70 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-noir-500">{usagePercent.toFixed(1)}% used</p>
          </div>
        )}
      </div>
    </div>
  );
}

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

// ── Blob Management Row ─────────────────────────────────────────────────────

const MODERATION_CATEGORIES: { key: string; label: string }[] = [
  { key: 'nudity', label: 'Nudity' },
  { key: 'weapons', label: 'Weapons' },
  { key: 'alcohol', label: 'Alcohol' },
  { key: 'drugs', label: 'Drugs' },
];

function ModerationBadges({ scores }: { scores: Record<string, number> | null }) {
  if (!scores) return null;
  const entries = MODERATION_CATEGORIES.filter(({ key }) => typeof scores[key] === 'number');
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {entries.map(({ key, label }) => {
        const score = scores[key];
        const isHigh = score >= 0.7;
        const isMedium = score >= 0.4 && score < 0.7;
        return (
          <span
            key={key}
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
              isHigh
                ? 'bg-doom-500/10 text-doom-400'
                : isMedium
                  ? 'bg-yellow-500/10 text-yellow-400'
                  : 'bg-noir-800 text-noir-500'
            }`}
          >
            {label} {(score * 100).toFixed(0)}%
          </span>
        );
      })}
    </div>
  );
}

function BlobRow({ blob, onDelete }: { blob: GalleryBlob; onDelete: (blobId: number) => void }) {
  return (
    <tr className="border-b border-noir-800 hover:bg-noir-800/50 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <img src={blob.imageThumbnailUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-noir-800 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-noir-100 truncate max-w-xs">{blob.title}</p>
            <p className="text-xs text-noir-400">{new Date(blob.createdAt).toLocaleDateString()}</p>
            <ModerationBadges scores={blob.moderationScores} />
          </div>
        </div>
      </td>
      <td className="py-3 px-2 text-sm text-noir-300">{blob.filamentType}</td>
      <td className="py-3 px-2 text-sm text-noir-300 text-center tabular-nums">{blob.averageRating.toFixed(1)}</td>
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
  );
}

// ── Flagged Blob Card ───────────────────────────────────────────────────────

function FlaggedBlobCard({
  blob,
  onApprove,
  onReject,
}: {
  blob: FlaggedBlob;
  onApprove: (blobId: number) => void;
  onReject: (blobId: number) => void;
}) {
  const scores = blob.moderationScores ?? {};

  return (
    <div className="bg-noir-900 border border-noir-700 rounded-xl overflow-hidden hover:border-noir-600 transition-colors">
      <div className="flex flex-col sm:flex-row">
        {/* Thumbnail */}
        <div className="sm:w-48 shrink-0">
          <img
            src={blob.imageThumbnailUrl}
            alt={blob.title}
            className="w-full sm:w-48 h-36 sm:h-full object-cover bg-noir-800"
          />
        </div>

        {/* Content */}
        <div className="flex-1 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-noir-100">{blob.title}</h3>
                {blob.description && <p className="text-xs text-noir-400 mt-0.5 line-clamp-2">{blob.description}</p>}
              </div>
              {/* Uploader info */}
              <div className="flex items-center gap-2 shrink-0">
                {blob.uploaderAvatarUrl ? (
                  <img src={blob.uploaderAvatarUrl} alt="" className="w-6 h-6 rounded-full bg-noir-700" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-noir-700 flex items-center justify-center">
                    <Users className="w-3 h-3 text-noir-400" />
                  </div>
                )}
                <span className="text-xs text-noir-400">{blob.uploaderName}</span>
              </div>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-4 mt-2 text-xs text-noir-500">
              <span>{new Date(blob.createdAt).toLocaleDateString()}</span>
              <span>{blob.filamentType}</span>
              <span>{blob.machineUsed}</span>
            </div>

            {/* Moderation unavailable warning */}
            {(scores as Record<string, number>).moderationUnavailable === 1 && (
              <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
                <p className="text-xs text-yellow-300">
                  Moderation service was unavailable — flagged for manual review.
                </p>
              </div>
            )}

            {/* Moderation scores */}
            <div className="mt-3">
              <p className="text-xs font-medium text-noir-400 mb-1.5">Moderation Scores</p>
              <div className="flex flex-wrap gap-2">
                {MODERATION_CATEGORIES.map(({ key, label }) => {
                  const score = scores[key];
                  const hasScore = typeof score === 'number';
                  const isHigh = hasScore && score >= 0.7;
                  const isMedium = hasScore && score >= 0.4 && score < 0.7;

                  return (
                    <div
                      key={key}
                      className={`px-2 py-1 rounded-md text-xs font-medium border ${
                        isHigh
                          ? 'bg-doom-500/10 text-doom-400 border-doom-500/30'
                          : isMedium
                            ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                            : 'bg-noir-800 text-noir-400 border-noir-700'
                      }`}
                    >
                      {label} <span className="tabular-nums ml-0.5">{hasScore ? formatPercent(score) : '—'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-noir-800">
            <button
              onClick={() => onApprove(blob.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-500 rounded-lg transition-colors cursor-pointer"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Approve
            </button>
            <button
              onClick={() => onReject(blob.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-doom-500 hover:bg-doom-400 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Reject
            </button>
            <a
              href={`/blobs/${blob.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-noir-400 hover:text-noir-200 bg-noir-800 hover:bg-noir-700 rounded-lg transition-colors cursor-pointer ml-auto"
            >
              <Eye className="w-3.5 h-3.5" />
              View
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Feedback Row ───────────────────────────────────────────────────────────

function FeedbackRow({
  item,
  onResolve,
  onDelete,
}: {
  item: FeedbackRow;
  onResolve: (feedbackId: number) => void;
  onDelete: (feedbackId: number) => void;
}) {
  const isResolved = item.resolved === 1;
  const categoryBadge =
    item.category === 'bug'
      ? { label: 'Bug', className: 'bg-doom-500/10 text-doom-400 border-doom-500/30' }
      : { label: 'Feature', className: 'bg-blue-500/10 text-blue-400 border-blue-500/30' };

  return (
    <div
      className={`bg-noir-900 border rounded-xl p-4 transition-colors ${
        isResolved
          ? 'border-noir-800 opacity-60'
          : 'border-noir-700 bg-noir-900/80 ring-1 ring-inset ring-yellow-500/5'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full border ${categoryBadge.className}`}
            >
              {categoryBadge.label}
            </span>
            {isResolved && (
              <span className="inline-flex text-xs font-medium px-2 py-0.5 rounded-full border bg-green-500/10 text-green-400 border-green-500/30">
                Resolved
              </span>
            )}
            <span className="text-xs text-noir-500">
              {new Date(item.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
          <p className={`text-sm ${isResolved ? 'text-noir-400' : 'text-noir-200'}`}>{item.message}</p>
          <p className="text-xs text-noir-500 mt-1">
            {item.submitterProfileId
              ? item.email
                ? item.submitterProvider
                  ? `${item.email} (via ${item.submitterProvider.charAt(0).toUpperCase() + item.submitterProvider.slice(1)})`
                  : item.email
                : 'Signed-in user'
              : item.email
                ? item.email
                : 'Anonymous'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onResolve(item.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              isResolved
                ? 'text-green-400 bg-green-500/10 hover:bg-green-500/20'
                : 'text-noir-400 hover:text-green-400 hover:bg-green-500/10'
            }`}
            title={isResolved ? 'Mark unresolved' : 'Mark resolved'}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            {isResolved ? 'Unresolve' : 'Resolve'}
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-noir-400 hover:text-doom-400 hover:bg-doom-500/10 rounded-lg transition-colors cursor-pointer"
            title="Delete feedback"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────────────

type Tab = 'users' | 'blobs' | 'flagged' | 'feedback';

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('users');
  // Track which tabs have been visited for lazy loading
  const [visitedTabs, setVisitedTabs] = useState<Set<Tab>>(new Set(['users']));

  // Users and storage — always fetched (default tab)
  const {
    data: users = [],
    error: usersError,
    isLoading: usersLoading,
    mutate: mutateUsers,
  } = useSWR('admin-users', () => getUsers());

  const {
    data: storageStats = null,
    error: storageError,
    isLoading: storageLoading,
    mutate: mutateStorage,
  } = useSWR('admin-storage', () => getStorageStats());

  // Blobs — fetched when blobs tab is first visited
  const blobsEnabled = visitedTabs.has('blobs');
  const {
    data: blobs = [],
    error: blobsError,
    isLoading: blobsLoading,
    mutate: mutateBlobs,
  } = useSWR(blobsEnabled ? 'admin-blobs' : null, () => fetchGallery({ data: { sort: 'date', order: 'desc' } }));

  // Flagged — fetched when flagged tab is first visited
  const flaggedEnabled = visitedTabs.has('flagged');
  const {
    data: flaggedBlobs = [],
    error: flaggedError,
    isLoading: flaggedLoading,
    mutate: mutateFlagged,
  } = useSWR(flaggedEnabled ? 'admin-flagged' : null, () => getFlaggedBlobs());

  // Feedback — always fetched so the tab badge shows immediately
  const {
    data: feedbackItems = [],
    error: feedbackError,
    isLoading: feedbackLoading,
    mutate: mutateFeedback,
  } = useSWR('admin-feedback', () => getFeedback());

  // Confirmation modal state
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: 'danger' | 'warning';
    action: () => Promise<void> | void;
  } | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);

  // Mark tab as visited when switching
  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setVisitedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  };

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
          await unapproveUser({ data: { clerkUserId } });
        } else {
          await approveUser({ data: { clerkUserId } });
        }
        await mutateUsers();
      },
    });
  };

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
          await unbanUser({ data: { clerkUserId } });
        } else {
          await banUser({ data: { clerkUserId } });
        }
        await mutateUsers();
      },
    });
  };

  const handleDeleteBlob = (blobId: number) => {
    const blob = blobs.find((b) => b.id === blobId);
    setConfirm({
      title: 'Delete Blob',
      message: `Are you sure you want to delete "${blob?.title ?? 'this blob'}"? This will remove the blob record and all image variants from storage. This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
      action: async () => {
        await deleteBlob({ data: { blobId } });
        await mutateBlobs();
        await mutateStorage();
      },
    });
  };

  const handleApproveFlagged = (blobId: number) => {
    const blob = flaggedBlobs.find((b) => b.id === blobId);
    setConfirm({
      title: 'Approve Blob',
      message: `Approve "${blob?.title ?? 'this blob'}"? It will become publicly visible in the gallery.`,
      confirmLabel: 'Approve',
      variant: 'warning',
      action: async () => {
        await approveFlaggedBlob({ data: { blobId } });
        await mutateFlagged();
      },
    });
  };

  const handleRejectFlagged = (blobId: number) => {
    const blob = flaggedBlobs.find((b) => b.id === blobId);
    setConfirm({
      title: 'Reject Blob',
      message: `Reject and permanently delete "${blob?.title ?? 'this blob'}"? This will remove the blob record and all image variants from storage. This action cannot be undone.`,
      confirmLabel: 'Reject & Delete',
      variant: 'danger',
      action: async () => {
        await rejectFlaggedBlob({ data: { blobId } });
        await mutateFlagged();
        await mutateStorage();
      },
    });
  };

  const handleResolveFeedback = (feedbackId: number) => {
    setConfirm({
      title: 'Toggle Resolved',
      message: 'Toggle the resolved status of this feedback submission.',
      confirmLabel: 'Toggle',
      variant: 'warning',
      action: async () => {
        await resolveFeedback({ data: { feedbackId } });
        await mutateFeedback();
      },
    });
  };

  const handleDeleteFeedback = (feedbackId: number) => {
    const item = feedbackItems.find((f) => f.id === feedbackId);
    setConfirm({
      title: 'Delete Feedback',
      message: `Permanently delete this ${item?.category === 'bug' ? 'bug report' : 'feature request'}? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
      action: async () => {
        await deleteFeedback({ data: { feedbackId } });
        await mutateFeedback();
      },
    });
  };

  const executeConfirm = async () => {
    if (!confirm) return;
    setActionError(null);
    try {
      await confirm.action();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setConfirm(null);
    }
  };

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
          <p className="mt-2 text-noir-400">Manage users, moderate content, and monitor storage.</p>
        </div>
        <button
          onClick={() => {
            void mutateUsers();
            void mutateStorage();
            void mutateBlobs();
            if (activeTab === 'flagged') void mutateFlagged();
            if (activeTab === 'feedback') void mutateFeedback();
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

      {/* ── Tab Navigation ─────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-8 bg-noir-900 border border-noir-700 rounded-lg p-1 w-fit">
        {(
          [
            ['users', 'Users', Users],
            ['blobs', 'Blobs', Image],
            ['flagged', 'Flagged', Flag],
            ['feedback', 'Feedback', MessageSquare],
          ] as const
        ).map(([tab, label, Icon]) => (
          <button
            key={tab}
            onClick={() => switchTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === tab ? 'bg-doom-500/20 text-doom-300' : 'text-noir-400 hover:text-noir-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {tab === 'flagged' && flaggedBlobs.length > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-doom-500 text-white rounded-full">
                {flaggedBlobs.length}
              </span>
            )}
            {tab === 'feedback' && feedbackItems.filter((f) => f.resolved === 0).length > 0 && (
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 text-xs font-bold bg-doom-500 text-white rounded-full">
                {feedbackItems.filter((f) => f.resolved === 0).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Storage Stats (Users tab only) ──────────────────────────────── */}
      {activeTab === 'users' && (
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-noir-200 mb-4 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-noir-400" />
            Storage
          </h2>
          {storageError ? (
            <div className="bg-doom-500/10 border border-doom-500/30 rounded-lg p-4">
              <p className="text-sm text-doom-300 mb-3">{storageError}</p>
              <button
                onClick={() => void mutateStorage()}
                className="px-4 py-2 text-sm font-medium text-noir-300 hover:text-noir-100 bg-noir-800 hover:bg-noir-700 rounded-lg transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : (
            <StorageCards stats={storageStats} loading={storageLoading} />
          )}
        </section>
      )}

      {/* ── User Management ─────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-noir-200 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-noir-400" />
            Users
            {!usersLoading && <span className="text-sm font-normal text-noir-500 ml-1">({users.length} total)</span>}
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
      )}

      {/* ── Blob Management ──────────────────────────────────────────────── */}
      {activeTab === 'blobs' && (
        <section>
          <h2 className="text-lg font-semibold text-noir-200 mb-4 flex items-center gap-2">
            <Image className="w-5 h-5 text-noir-400" />
            Blobs
            {!blobsLoading && <span className="text-sm font-normal text-noir-500 ml-1">({blobs.length} total)</span>}
          </h2>

          {blobsError ? (
            <div className="bg-doom-500/10 border border-doom-500/30 rounded-lg p-4">
              <p className="text-sm text-doom-300 mb-3">{blobsError}</p>
              <button
                onClick={() => void mutateBlobs()}
                className="px-4 py-2 text-sm font-medium text-noir-300 hover:text-noir-100 bg-noir-800 hover:bg-noir-700 rounded-lg transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : blobsLoading ? (
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
                      <th className="py-3 px-4 text-xs font-medium text-noir-400 uppercase tracking-wider">Blob</th>
                      <th className="py-3 px-2 text-xs font-medium text-noir-400 uppercase tracking-wider">Filament</th>
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
                      <BlobRow key={blob.id} blob={blob} onDelete={handleDeleteBlob} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Flagged Review Queue ──────────────────────────────────────────── */}
      {activeTab === 'flagged' && (
        <section>
          <h2 className="text-lg font-semibold text-noir-200 mb-4 flex items-center gap-2">
            <Flag className="w-5 h-5 text-doom-400" />
            Flagged for Review
            {!flaggedLoading && (
              <span className="text-sm font-normal text-noir-500 ml-1">({flaggedBlobs.length} pending)</span>
            )}
          </h2>

          {flaggedError ? (
            <div className="bg-doom-500/10 border border-doom-500/30 rounded-lg p-4">
              <p className="text-sm text-doom-300 mb-3">{flaggedError}</p>
              <button
                onClick={() => void mutateFlagged()}
                className="px-4 py-2 text-sm font-medium text-noir-300 hover:text-noir-100 bg-noir-800 hover:bg-noir-700 rounded-lg transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : flaggedLoading ? (
            <div className="bg-noir-900 border border-noir-700 rounded-xl overflow-hidden">
              <div className="p-4 animate-pulse space-y-3">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="h-20 bg-noir-800 rounded" />
                ))}
              </div>
            </div>
          ) : flaggedBlobs.length === 0 ? (
            <div className="bg-noir-900 border border-noir-700 rounded-xl p-8 text-center">
              <CheckCircle className="w-10 h-10 text-green-500/50 mx-auto mb-3" />
              <p className="text-noir-400">No flagged blobs awaiting review.</p>
              <p className="text-sm text-noir-500 mt-1">All clear!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {flaggedBlobs.map((blob) => (
                <FlaggedBlobCard
                  key={blob.id}
                  blob={blob}
                  onApprove={handleApproveFlagged}
                  onReject={handleRejectFlagged}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Feedback ──────────────────────────────────────────────────── */}
      {activeTab === 'feedback' && (
        <section>
          <h2 className="text-lg font-semibold text-noir-200 mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-noir-400" />
            Feedback
            {!feedbackLoading && (
              <span className="text-sm font-normal text-noir-500 ml-1">
                ({feedbackItems.length} total, {feedbackItems.filter((f) => f.resolved === 0).length} open)
              </span>
            )}
          </h2>

          {feedbackError ? (
            <div className="bg-doom-500/10 border border-doom-500/30 rounded-lg p-4">
              <p className="text-sm text-doom-300 mb-3">{feedbackError}</p>
              <button
                onClick={() => void mutateFeedback()}
                className="px-4 py-2 text-sm font-medium text-noir-300 hover:text-noir-100 bg-noir-800 hover:bg-noir-700 rounded-lg transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : feedbackLoading ? (
            <div className="bg-noir-900 border border-noir-700 rounded-xl overflow-hidden">
              <div className="p-4 animate-pulse space-y-3">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="h-16 bg-noir-800 rounded" />
                ))}
              </div>
            </div>
          ) : feedbackItems.length === 0 ? (
            <div className="bg-noir-900 border border-noir-700 rounded-xl p-8 text-center">
              <MessageSquare className="w-10 h-10 text-noir-600 mx-auto mb-3" />
              <p className="text-noir-400">No feedback submissions yet.</p>
              <p className="text-sm text-noir-500 mt-1">Feedback from the home page will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Unresolved first */}
              {feedbackItems
                .filter((f) => f.resolved === 0)
                .map((item) => (
                  <FeedbackRow
                    key={item.id}
                    item={item}
                    onResolve={handleResolveFeedback}
                    onDelete={handleDeleteFeedback}
                  />
                ))}
              {/* Resolved below */}
              {feedbackItems
                .filter((f) => f.resolved === 1)
                .map((item) => (
                  <FeedbackRow
                    key={item.id}
                    item={item}
                    onResolve={handleResolveFeedback}
                    onDelete={handleDeleteFeedback}
                  />
                ))}
            </div>
          )}
        </section>
      )}

      {/* ── Confirmation Modal ──────────────────────────────────────────── */}
      <ConfirmModal
        open={confirm !== null}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        confirmLabel={confirm?.confirmLabel ?? ''}
        confirmVariant={confirm?.variant ?? 'danger'}
        onConfirm={() => void executeConfirm()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
