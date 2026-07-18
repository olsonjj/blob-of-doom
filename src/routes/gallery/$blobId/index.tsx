import { useAuth } from '@clerk/tanstack-react-start';
import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { AlertTriangle, ArrowLeft, Eye, Pencil, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { HexagonRating } from '../../../components/HexagonRating';
import { type BlobDetail, fetchBlobDetail } from '../../../db/blob-detail.func';
import { softDeleteBlob, updateBlob } from '../../../db/blob-edit.func';
import { submitRating } from '../../../db/rating.func';

export const Route = createFileRoute('/gallery/$blobId/')({
  component: BlobDetailPage,
});

function BlobDetailPage() {
  const { blobId } = Route.useParams();
  const { isSignedIn, userId } = useAuth();
  const router = useRouter();

  const [blob, setBlob] = useState<BlobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDateOccurred, setEditDateOccurred] = useState('');
  const [editFilamentType, setEditFilamentType] = useState('');
  const [editMachineUsed, setEditMachineUsed] = useState('');
  const [editErrors, setEditErrors] = useState<{ field: string; message: string }[]>([]);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwner = !!(userId && blob && blob.uploaderProfileId === userId);

  useEffect(() => {
    const id = parseInt(blobId, 10);
    if (isNaN(id)) {
      setError('Invalid blob ID');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetchBlobDetail({ data: id })
      .then(setBlob)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load blob'))
      .finally(() => setLoading(false));
  }, [blobId]);

  const handleRate = useCallback(
    async (score: number) => {
      if (!blob) return;
      const id = blob.id;

      setBlob((prev) => {
        if (!prev) return prev;
        const oldUserRating = prev.userRating;
        const oldAverage = prev.averageRating;
        const oldCount = prev.ratingCount;

        let newCount: number;
        let newAverage: number;
        if (oldUserRating === null) {
          newCount = oldCount + 1;
          newAverage = (oldAverage * oldCount + score) / newCount;
        } else {
          newCount = oldCount;
          newAverage = (oldAverage * oldCount - oldUserRating + score) / newCount;
        }

        return { ...prev, userRating: score, averageRating: newAverage, ratingCount: newCount };
      });

      try {
        const result = await submitRating({ data: { blobId: id, score } });
        setBlob((prev) =>
          prev
            ? {
                ...prev,
                userRating: result.score,
                averageRating: result.averageRating,
                ratingCount: result.ratingCount,
              }
            : prev,
        );
      } catch {
        const fresh = await fetchBlobDetail({ data: id });
        setBlob(fresh);
      }
    },
    [blob],
  );

  // ── Edit handlers ──────────────────────────────────────────────────────

  const startEditing = () => {
    if (!blob) return;
    setEditTitle(blob.title);
    setEditDescription(blob.description ?? '');
    setEditDateOccurred(blob.dateOccurred);
    setEditFilamentType(blob.filamentType);
    setEditMachineUsed(blob.machineUsed);
    setEditErrors([]);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditErrors([]);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditErrors([]);
    setEditSubmitting(true);

    try {
      const result = await updateBlob({
        data: {
          blobId: blob!.id,
          title: editTitle,
          description: editDescription || null,
          dateOccurred: editDateOccurred,
          filamentType: editFilamentType,
          machineUsed: editMachineUsed,
        },
      });

      if (!result.success) {
        setEditErrors(result.errors);
        return;
      }

      // Refresh the blob data
      const fresh = await fetchBlobDetail({ data: blob!.id });
      setBlob(fresh);
      setEditing(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Update failed';
      setEditErrors([{ field: 'general', message }]);
    } finally {
      setEditSubmitting(false);
    }
  };

  // ── Delete handler ─────────────────────────────────────────────────────

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await softDeleteBlob({ data: { blobId: blob?.id ?? 0 } });
      void router.navigate({ to: '/gallery' });
    } catch {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <DetailSkeleton />
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────

  if (error || !blob) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center">
        <p className="text-noir-400 text-lg">{error ?? 'Blob not found'}</p>
        <Link
          to="/gallery"
          className="inline-flex items-center gap-2 mt-6 text-doom-400 hover:text-doom-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Gallery
        </Link>
      </div>
    );
  }

  const formattedDate = new Date(blob.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const occurredDate = new Date(blob.dateOccurred).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const editFieldError = (field: string) => editErrors.find((e) => e.field === field)?.message;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Back button */}
      <Link
        to="/gallery"
        className="inline-flex items-center gap-2 text-noir-400 hover:text-noir-200 transition-colors mb-8 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Gallery
      </Link>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Left: Image */}
        <div className="bg-noir-900 border border-noir-700 rounded-xl overflow-hidden aspect-[4/3]">
          <img src={blob.imageFullUrl} alt={blob.title} className="w-full h-full object-cover" />
        </div>

        {/* Right: Details or Edit Form */}
        {editing ? (
          /* ── Edit Form ──────────────────────────────────────────────── */
          <form onSubmit={(e) => void handleEditSubmit(e)} className="flex flex-col gap-5" noValidate>
            <h2 className="text-xl font-bold text-noir-100">Edit Blob</h2>

            {editFieldError('general') && (
              <div className="flex items-start gap-3 p-4 bg-doom-500/10 border border-doom-500/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-doom-400 shrink-0 mt-0.5" />
                <p className="text-sm text-doom-300">{editFieldError('general')}</p>
              </div>
            )}

            {/* Title */}
            <div>
              <label htmlFor="edit-title" className="block text-sm font-medium text-noir-200 mb-2">
                Title <span className="text-doom-400">*</span>
              </label>
              <input
                id="edit-title"
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={200}
                className={`w-full px-4 py-3 bg-noir-900 border rounded-lg text-noir-100 placeholder:text-noir-500 focus:outline-none focus:ring-2 focus:ring-doom-500/50 transition-colors ${
                  editFieldError('title') ? 'border-doom-500' : 'border-noir-700'
                }`}
              />
              {editFieldError('title') && <p className="mt-1.5 text-sm text-doom-400">{editFieldError('title')}</p>}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="edit-description" className="block text-sm font-medium text-noir-200 mb-2">
                Description <span className="text-noir-400">(optional)</span>
              </label>
              <textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={4}
                maxLength={500}
                className="w-full px-4 py-3 bg-noir-900 border border-noir-700 rounded-lg text-noir-100 placeholder:text-noir-500 focus:outline-none focus:ring-2 focus:ring-doom-500/50 transition-colors resize-y"
              />
              <p className="mt-1 text-xs text-noir-500 text-right">{editDescription.length}/500</p>
            </div>

            {/* Date occurred */}
            <div>
              <label htmlFor="edit-date" className="block text-sm font-medium text-noir-200 mb-2">
                Date Occurred <span className="text-doom-400">*</span>
              </label>
              <input
                id="edit-date"
                type="date"
                value={editDateOccurred}
                onChange={(e) => setEditDateOccurred(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className={`w-full px-4 py-3 bg-noir-900 border rounded-lg text-noir-100 focus:outline-none focus:ring-2 focus:ring-doom-500/50 transition-colors ${
                  editFieldError('dateOccurred') ? 'border-doom-500' : 'border-noir-700'
                }`}
              />
              {editFieldError('dateOccurred') && (
                <p className="mt-1.5 text-sm text-doom-400">{editFieldError('dateOccurred')}</p>
              )}
            </div>

            {/* Filament type */}
            <div>
              <label htmlFor="edit-filament" className="block text-sm font-medium text-noir-200 mb-2">
                Filament Type <span className="text-doom-400">*</span>
              </label>
              <input
                id="edit-filament"
                type="text"
                value={editFilamentType}
                onChange={(e) => setEditFilamentType(e.target.value)}
                list="filament-suggestions"
                maxLength={100}
                className={`w-full px-4 py-3 bg-noir-900 border rounded-lg text-noir-100 placeholder:text-noir-500 focus:outline-none focus:ring-2 focus:ring-doom-500/50 transition-colors ${
                  editFieldError('filamentType') ? 'border-doom-500' : 'border-noir-700'
                }`}
              />
              <datalist id="filament-suggestions">
                <option value="PLA" />
                <option value="PETG" />
                <option value="ABS" />
                <option value="ASA" />
                <option value="TPU" />
                <option value="PCCF" />
              </datalist>
              {editFieldError('filamentType') && (
                <p className="mt-1.5 text-sm text-doom-400">{editFieldError('filamentType')}</p>
              )}
            </div>

            {/* Machine used */}
            <div>
              <label htmlFor="edit-machine" className="block text-sm font-medium text-noir-200 mb-2">
                Machine Used <span className="text-doom-400">*</span>
              </label>
              <input
                id="edit-machine"
                type="text"
                value={editMachineUsed}
                onChange={(e) => setEditMachineUsed(e.target.value)}
                maxLength={100}
                className={`w-full px-4 py-3 bg-noir-900 border rounded-lg text-noir-100 placeholder:text-noir-500 focus:outline-none focus:ring-2 focus:ring-doom-500/50 transition-colors ${
                  editFieldError('machineUsed') ? 'border-doom-500' : 'border-noir-700'
                }`}
              />
              {editFieldError('machineUsed') && (
                <p className="mt-1.5 text-sm text-doom-400">{editFieldError('machineUsed')}</p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={editSubmitting}
                className="px-5 py-2.5 bg-[#ff5a0a] text-[#14100e] text-sm font-black uppercase tracking-[-0.01em] hover:bg-[#ff7a1a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {editSubmitting ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                className="px-5 py-2.5 border border-noir-600 text-noir-300 text-sm font-black uppercase tracking-[-0.01em] hover:border-noir-400 hover:text-noir-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="ml-auto inline-flex items-center gap-1.5 px-5 py-2.5 border border-doom-500/40 text-doom-400 text-sm font-black uppercase tracking-[-0.01em] hover:bg-doom-500/10 hover:border-doom-400 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </form>
        ) : (
          /* ── View Mode ───────────────────────────────────────────────── */
          <div className="flex flex-col gap-6">
            {/* Title + owner actions */}
            <div>
              <h1 className="text-3xl font-bold text-noir-100 leading-tight">{blob.title}</h1>
              {isOwner && (
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={startEditing}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#ff5a0a] text-[#14100e] text-xs font-black uppercase tracking-[-0.01em] hover:bg-[#ff7a1a] transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                </div>
              )}
            </div>

            {/* Description */}
            {blob.description && (
              <div>
                <h2 className="text-sm font-medium text-noir-400 uppercase tracking-wider mb-2">Description</h2>
                <p className="text-noir-200 leading-relaxed">{blob.description}</p>
              </div>
            )}

            {/* Doom Scale — interactive for signed-in users */}
            <div className="bg-noir-900 border border-noir-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-noir-300">Doom Scale</span>
                <span className="text-xs text-noir-500">
                  {blob.ratingCount} {blob.ratingCount === 1 ? 'rating' : 'ratings'}
                </span>
              </div>
              <HexagonRating
                rating={blob.averageRating}
                size={24}
                interactive={isSignedIn ?? false}
                userRating={blob.userRating}
                onRate={isSignedIn ? (...args: [number]) => void handleRate(...args) : undefined}
                isAuthenticated={isSignedIn ?? false}
              />
            </div>

            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-noir-900 border border-noir-700 rounded-lg p-4">
                <span className="text-xs text-noir-500 uppercase tracking-wider">Filament Type</span>
                <p className="mt-1 text-noir-200 font-medium">{blob.filamentType}</p>
              </div>
              <div className="bg-noir-900 border border-noir-700 rounded-lg p-4">
                <span className="text-xs text-noir-500 uppercase tracking-wider">Machine Used</span>
                <p className="mt-1 text-noir-200 font-medium">{blob.machineUsed}</p>
              </div>
              <div className="bg-noir-900 border border-noir-700 rounded-lg p-4">
                <span className="text-xs text-noir-500 uppercase tracking-wider">Date Occurred</span>
                <p className="mt-1 text-noir-200 font-medium">{occurredDate}</p>
              </div>
              <div className="bg-noir-900 border border-noir-700 rounded-lg p-4">
                <span className="text-xs text-noir-500 uppercase tracking-wider">Uploaded</span>
                <p className="mt-1 text-noir-200 font-medium">{formattedDate}</p>
              </div>
            </div>

            {/* View count */}
            <div className="flex items-center gap-2 text-xs text-noir-500 justify-end">
              <Eye className="w-3.5 h-3.5" />
              <span>
                {blob.viewCount} {blob.viewCount === 1 ? 'view' : 'views'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Delete Confirmation Dialog ──────────────────────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70" onClick={() => !deleting && setShowDeleteConfirm(false)} />
          {/* Dialog */}
          <div className="relative bg-noir-900 border border-noir-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-doom-500/10 rounded-full shrink-0">
                <AlertTriangle className="w-6 h-6 text-doom-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-noir-100">Delete this blob?</h3>
                <p className="mt-2 text-sm text-noir-400 leading-relaxed">
                  This will permanently remove &ldquo;{blob.title}&rdquo; from the gallery. This action cannot be
                  undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-noir-300 hover:text-noir-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="px-4 py-2 bg-doom-500 text-white text-sm font-bold rounded-lg hover:bg-doom-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <svg
                      className="animate-spin w-4 h-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Deleting…
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-noir-800 rounded w-32 mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="aspect-[4/3] bg-noir-800 rounded-xl" />
        <div className="flex flex-col gap-6">
          <div className="h-8 bg-noir-800 rounded w-3/4" />
          <div className="h-24 bg-noir-800 rounded-xl" />
          <div className="h-20 bg-noir-800 rounded w-full" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 bg-noir-800 rounded-lg" />
            <div className="h-16 bg-noir-800 rounded-lg" />
            <div className="h-16 bg-noir-800 rounded-lg" />
            <div className="h-16 bg-noir-800 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
