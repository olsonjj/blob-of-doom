import { createFileRoute } from '@tanstack/react-router';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import Flag from 'lucide-react/dist/esm/icons/flag';
import HardDrive from 'lucide-react/dist/esm/icons/hard-drive';
import Image from 'lucide-react/dist/esm/icons/image';
import MessageSquare from 'lucide-react/dist/esm/icons/message-square';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Shield from 'lucide-react/dist/esm/icons/shield';
import Users from 'lucide-react/dist/esm/icons/users';
import { useState } from 'react';
import useSWR from 'swr';

import {
  approveFlaggedBlob,
  approveUser,
  banUser,
  deleteBlob,
  getFlaggedBlobs,
  getStorageStats,
  getUsers,
  rejectFlaggedBlob,
  unapproveUser,
  unbanUser,
} from '../../db/admin.func';
import { requireAdminGuard } from '../../db/auth-guards.func';
import { deleteFeedback, getFeedback, resolveFeedback } from '../../db/feedback.func';
import { fetchGallery } from '../../db/gallery.func';
import { BlobTable } from './components/BlobTable';
import { ConfirmModal } from './components/ConfirmModal';
import { FeedbackList } from './components/FeedbackList';
import { FlaggedQueue } from './components/FlaggedQueue';
import { StorageCards } from './components/StorageCards';
import { UserTable } from './components/UserTable';

export const Route = createFileRoute('/admin/')({
  beforeLoad: async () => await requireAdminGuard(),
  component: AdminDashboard,
});

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
          <StorageCards
            stats={storageStats}
            loading={storageLoading}
            error={storageError}
            onRetry={() => void mutateStorage()}
          />
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
          <UserTable
            users={users}
            loading={usersLoading}
            error={usersError}
            onRetry={() => void mutateUsers()}
            onToggleApproved={handleToggleApproved}
            onToggleBanned={handleToggleBanned}
          />
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
          <BlobTable
            blobs={blobs}
            loading={blobsLoading}
            error={blobsError}
            onRetry={() => void mutateBlobs()}
            onDelete={handleDeleteBlob}
          />
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
          <FlaggedQueue
            flaggedBlobs={flaggedBlobs}
            loading={flaggedLoading}
            error={flaggedError}
            onRetry={() => void mutateFlagged()}
            onApprove={handleApproveFlagged}
            onReject={handleRejectFlagged}
          />
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
          <FeedbackList
            feedbackItems={feedbackItems}
            loading={feedbackLoading}
            error={feedbackError}
            onRetry={() => void mutateFeedback()}
            onResolve={handleResolveFeedback}
            onDelete={handleDeleteFeedback}
          />
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
