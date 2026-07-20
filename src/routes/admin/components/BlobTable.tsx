import Image from 'lucide-react/dist/esm/icons/image';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';

import { ErrorBanner } from '../../../components/ErrorBanner';
import type { GalleryBlob } from '../../../db/gallery.func';
import { MODERATION_CATEGORIES } from './helpers';

// ── Moderation Badges ───────────────────────────────────────────────────────

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

// ── Blob Row ────────────────────────────────────────────────────────────────

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

// ── Blob Table ──────────────────────────────────────────────────────────────

export function BlobTable({
  blobs,
  loading,
  error,
  onRetry,
  onDelete,
}: {
  blobs: GalleryBlob[];
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  onDelete: (blobId: number) => void;
}) {
  if (error) {
    return <ErrorBanner message={error instanceof Error ? error.message : 'Failed to load blobs'} onRetry={onRetry} />;
  }

  if (loading) {
    return (
      <div className="bg-noir-900 border border-noir-700 rounded-xl overflow-hidden">
        <div className="p-4 animate-pulse space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-12 bg-noir-800 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (blobs.length === 0) {
    return (
      <div className="bg-noir-900 border border-noir-700 rounded-xl p-8 text-center">
        <Image className="w-10 h-10 text-noir-600 mx-auto mb-3" />
        <p className="text-noir-400">No blobs in the gallery.</p>
      </div>
    );
  }

  return (
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
              <BlobRow key={blob.id} blob={blob} onDelete={onDelete} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
