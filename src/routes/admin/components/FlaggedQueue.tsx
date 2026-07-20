import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import Eye from 'lucide-react/dist/esm/icons/eye';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Users from 'lucide-react/dist/esm/icons/users';

import { ErrorBanner } from '../../../components/ErrorBanner';
import type { FlaggedBlob } from '../../../db/admin.func';
import { formatPercent, MODERATION_CATEGORIES } from './helpers';

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

// ── Flagged Queue ───────────────────────────────────────────────────────────

export function FlaggedQueue({
  flaggedBlobs,
  loading,
  error,
  onRetry,
  onApprove,
  onReject,
}: {
  flaggedBlobs: FlaggedBlob[];
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  onApprove: (blobId: number) => void;
  onReject: (blobId: number) => void;
}) {
  if (error) {
    return (
      <ErrorBanner
        message={error instanceof Error ? error.message : 'Failed to load flagged blobs'}
        onRetry={onRetry}
      />
    );
  }

  if (loading) {
    return (
      <div className="bg-noir-900 border border-noir-700 rounded-xl overflow-hidden">
        <div className="p-4 animate-pulse space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-20 bg-noir-800 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (flaggedBlobs.length === 0) {
    return (
      <div className="bg-noir-900 border border-noir-700 rounded-xl p-8 text-center">
        <CheckCircle className="w-10 h-10 text-green-500/50 mx-auto mb-3" />
        <p className="text-noir-400">No flagged blobs awaiting review.</p>
        <p className="text-sm text-noir-500 mt-1">All clear!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {flaggedBlobs.map((blob) => (
        <FlaggedBlobCard key={blob.id} blob={blob} onApprove={onApprove} onReject={onReject} />
      ))}
    </div>
  );
}
