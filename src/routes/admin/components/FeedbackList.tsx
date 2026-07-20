import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import MessageSquare from 'lucide-react/dist/esm/icons/message-square';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';

import { ErrorBanner } from '../../../components/ErrorBanner';
import type { FeedbackRow } from '../../../db/feedback.func';

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
        isResolved ? 'border-noir-800 opacity-60' : 'border-noir-700 bg-noir-900/80 ring-1 ring-inset ring-yellow-500/5'
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

// ── Feedback List ──────────────────────────────────────────────────────────

export function FeedbackList({
  feedbackItems,
  loading,
  error,
  onRetry,
  onResolve,
  onDelete,
}: {
  feedbackItems: FeedbackRow[];
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  onResolve: (feedbackId: number) => void;
  onDelete: (feedbackId: number) => void;
}) {
  if (error) {
    return (
      <ErrorBanner
        message={error instanceof Error ? error.message : 'Failed to load feedback'}
        onRetry={onRetry}
      />
    );
  }

  if (loading) {
    return (
      <div className="bg-noir-900 border border-noir-700 rounded-xl overflow-hidden">
        <div className="p-4 animate-pulse space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-16 bg-noir-800 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (feedbackItems.length === 0) {
    return (
      <div className="bg-noir-900 border border-noir-700 rounded-xl p-8 text-center">
        <MessageSquare className="w-10 h-10 text-noir-600 mx-auto mb-3" />
        <p className="text-noir-400">No feedback submissions yet.</p>
        <p className="text-sm text-noir-500 mt-1">Feedback from the home page will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Unresolved first */}
      {feedbackItems
        .filter((f) => f.resolved === 0)
        .map((item) => (
          <FeedbackRow
            key={item.id}
            item={item}
            onResolve={onResolve}
            onDelete={onDelete}
          />
        ))}
      {/* Resolved below */}
      {feedbackItems
        .filter((f) => f.resolved === 1)
        .map((item) => (
          <FeedbackRow
            key={item.id}
            item={item}
            onResolve={onResolve}
            onDelete={onDelete}
          />
        ))}
    </div>
  );
}
