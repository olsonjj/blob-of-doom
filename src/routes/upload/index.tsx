import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { AlertTriangle, CheckCircle, ImageUp, Upload, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { requireAuth } from '../../db/auth-guards.func';
import { uploadBlob, type UploadError } from '../../db/upload.func';
import { ALLOWED_TYPES, MAX_FILE_SIZE } from '../../shared/constants';

export const Route = createFileRoute('/upload/')({
  // `requireAuth` is a createServerFn — RPC'd to the server on SPA nav
  // so `auth()` runs where `getGlobalStartContext()` is populated.
  // Inlining `auth()` here would throw on client-side navigation.
  beforeLoad: async () => await requireAuth(),
  component: UploadPage,
});

// ── Page component ──────────────────────────────────────────────────────────

function UploadPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [dateOccurred, setDateOccurred] = useState('');
  const [description, setDescription] = useState('');
  const [filamentType, setFilamentType] = useState('');
  const [machineUsed, setMachineUsed] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<UploadError[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [moderationUnavailable, setModerationUnavailable] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearFieldError = (field: string) => {
    setErrors((prev) => prev.filter((e) => e.field !== field));
  };

  // ── File handling ──────────────────────────────────────────────────────

  const handleFile = useCallback(
    (file: File | null) => {
      // Revoke old preview URL
      if (imagePreview) URL.revokeObjectURL(imagePreview);

      if (!file) {
        setImageFile(null);
        setImagePreview(null);
        clearFieldError('image');
        return;
      }

      // Validate
      const newErrors: UploadError[] = [];
      if (!ALLOWED_TYPES.includes(file.type)) {
        newErrors.push({ field: 'image', message: 'Unsupported format. Use JPEG, PNG, WebP, or AVIF.' });
      }
      if (file.size > MAX_FILE_SIZE) {
        newErrors.push({ field: 'image', message: 'Image must be under 10 MB' });
      }

      if (newErrors.length > 0) {
        setErrors((prev) => [...prev.filter((e) => e.field !== 'image'), ...newErrors]);
        setImageFile(null);
        setImagePreview(null);
        return;
      }

      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      clearFieldError('image');
    },
    [imagePreview],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0] ?? null;
      handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Client-side validation ─────────────────────────────────────────────

  const validate = (): boolean => {
    const newErrors: UploadError[] = [];

    if (!title.trim()) newErrors.push({ field: 'title', message: 'Title is required' });
    if (!dateOccurred) newErrors.push({ field: 'dateOccurred', message: 'Date occurred is required' });
    if (!filamentType.trim()) newErrors.push({ field: 'filamentType', message: 'Filament type is required' });
    if (!machineUsed.trim()) newErrors.push({ field: 'machineUsed', message: 'Machine used is required' });
    if (!imageFile) newErrors.push({ field: 'image', message: 'An image file is required' });

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set('title', title.trim());
      formData.set('dateOccurred', dateOccurred);
      if (description.trim()) formData.set('description', description.trim());
      formData.set('filamentType', filamentType.trim());
      formData.set('machineUsed', machineUsed.trim());
      formData.set('image', imageFile as File);

      const result = await uploadBlob({ data: formData });

      if (!result.success) {
        setErrors(result.errors);
        return;
      }

      setSuccess(true);
      if (result.blob.flagged === 1) {
        setFlagged(true);
        if (
          result.blob.moderationScores &&
          (result.blob.moderationScores as Record<string, number>).moderationUnavailable === 1
        ) {
          setModerationUnavailable(true);
        }
      } else {
        // Redirect to gallery after a brief pause so the user sees the success state
        setTimeout(() => {
          void router.navigate({ to: '/gallery' });
        }, 1500);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setServerError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success state ──────────────────────────────────────────────────────

  if (success) {
    if (flagged) {
      return (
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
          <CheckCircle className="w-16 h-16 text-[#c5f000] mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-noir-100">Pending Review</h1>
          <p className="mt-3 text-noir-400 max-w-md mx-auto">
            {moderationUnavailable
              ? 'Your upload has been queued for review. Our content moderation service is temporarily unavailable — an admin will review it shortly.'
              : 'Your blob has been received and is awaiting moderation. It will appear in the gallery once approved by an admin.'}
          </p>
          <Link
            to="/gallery"
            className="inline-flex items-center gap-2 mt-6 text-[#c5f000] hover:text-[#d4ff1a] transition-colors"
          >
            Back to Gallery
          </Link>
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-noir-100">Blob Uploaded!</h1>
        <p className="mt-3 text-noir-400">Your failure has been immortalized. Redirecting to the gallery&hellip;</p>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────

  const fieldError = (field: string) => errors.find((e) => e.field === field)?.message;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-noir-100">Upload Your Blob</h1>
        <p className="mt-2 text-noir-400">Share your 3D printing failure with the world. One upload per day.</p>
      </div>

      {/* Server error banner */}
      {serverError && (
        <div className="mb-8 flex items-start gap-3 p-4 bg-doom-500/10 border border-doom-500/30 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-doom-400 shrink-0 mt-0.5" />
          <p className="text-sm text-doom-300">{serverError}</p>
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-8" noValidate>
        {/* ── Image upload zone ─────────────────────────────────────────── */}
        <div>
          <label className="block text-sm font-medium text-noir-200 mb-2">
            Image <span className="text-doom-400">*</span>
          </label>

          {imagePreview ? (
            <div className="relative rounded-xl overflow-hidden border border-noir-700 bg-noir-900">
              <img src={imagePreview} alt="Preview" className="w-full max-h-80 object-contain" />
              <button
                type="button"
                onClick={clearImage}
                className="absolute top-3 right-3 p-1.5 bg-noir-950/80 rounded-full text-noir-300 hover:text-noir-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                fieldError('image')
                  ? 'border-doom-500/50 bg-doom-500/5'
                  : 'border-noir-700 bg-noir-900 hover:border-noir-500 hover:bg-noir-800'
              }`}
            >
              <ImageUp className="w-10 h-10 text-noir-500 mx-auto mb-3" />
              <p className="text-noir-300 font-medium">Drop your image here or click to browse</p>
              <p className="mt-1 text-xs text-noir-400">JPEG, PNG, WebP, or AVIF &middot; Max 10 MB</p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />

          {fieldError('image') && <p className="mt-1.5 text-sm text-doom-400">{fieldError('image')}</p>}
        </div>

        {/* ── Title ─────────────────────────────────────────────────────── */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-noir-200 mb-2">
            Title <span className="text-doom-400">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              clearFieldError('title');
            }}
            placeholder='e.g. "The Great Spaghetti Incident"'
            maxLength={200}
            className={`w-full px-4 py-3 bg-noir-900 border rounded-lg text-noir-100 placeholder:text-noir-500 focus:outline-none focus:ring-2 focus:ring-doom-500/50 transition-colors ${
              fieldError('title') ? 'border-doom-500' : 'border-noir-700'
            }`}
          />
          {fieldError('title') && <p className="mt-1.5 text-sm text-doom-400">{fieldError('title')}</p>}
        </div>

        {/* ── Date occurred ──────────────────────────────────────────────── */}
        <div>
          <label htmlFor="dateOccurred" className="block text-sm font-medium text-noir-200 mb-2">
            Date Occurred <span className="text-doom-400">*</span>
          </label>
          <input
            id="dateOccurred"
            type="date"
            value={dateOccurred}
            onChange={(e) => {
              setDateOccurred(e.target.value);
              clearFieldError('dateOccurred');
            }}
            max={new Date().toISOString().split('T')[0]}
            className={`w-full px-4 py-3 bg-noir-900 border rounded-lg text-noir-100 focus:outline-none focus:ring-2 focus:ring-doom-500/50 transition-colors ${
              fieldError('dateOccurred') ? 'border-doom-500' : 'border-noir-700'
            }`}
          />
          {fieldError('dateOccurred') && <p className="mt-1.5 text-sm text-doom-400">{fieldError('dateOccurred')}</p>}
        </div>

        {/* ── Filament type ──────────────────────────────────────────────── */}
        <div>
          <label htmlFor="filamentType" className="block text-sm font-medium text-noir-200 mb-2">
            Filament Type <span className="text-doom-400">*</span>
          </label>
          <input
            id="filamentType"
            type="text"
            value={filamentType}
            onChange={(e) => {
              setFilamentType(e.target.value);
              clearFieldError('filamentType');
            }}
            placeholder="e.g. PLA, PETG, ABS, TPU"
            list="filament-suggestions"
            maxLength={100}
            className={`w-full px-4 py-3 bg-noir-900 border rounded-lg text-noir-100 placeholder:text-noir-500 focus:outline-none focus:ring-2 focus:ring-doom-500/50 transition-colors ${
              fieldError('filamentType') ? 'border-doom-500' : 'border-noir-700'
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
          {fieldError('filamentType') && <p className="mt-1.5 text-sm text-doom-400">{fieldError('filamentType')}</p>}
        </div>

        {/* ── Machine used ───────────────────────────────────────────────── */}
        <div>
          <label htmlFor="machineUsed" className="block text-sm font-medium text-noir-200 mb-2">
            Machine Used <span className="text-doom-400">*</span>
          </label>
          <input
            id="machineUsed"
            type="text"
            value={machineUsed}
            onChange={(e) => {
              setMachineUsed(e.target.value);
              clearFieldError('machineUsed');
            }}
            placeholder="e.g. Ender 3 V2, Bambu Lab P1P"
            maxLength={100}
            className={`w-full px-4 py-3 bg-noir-900 border rounded-lg text-noir-100 placeholder:text-noir-500 focus:outline-none focus:ring-2 focus:ring-doom-500/50 transition-colors ${
              fieldError('machineUsed') ? 'border-doom-500' : 'border-noir-700'
            }`}
          />
          {fieldError('machineUsed') && <p className="mt-1.5 text-sm text-doom-400">{fieldError('machineUsed')}</p>}
        </div>

        {/* ── Description ───────────────────────────────────────────────── */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-noir-200 mb-2">
            Description <span className="text-noir-400">(optional)</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what went wrong&hellip;"
            rows={4}
            maxLength={500}
            className="w-full px-4 py-3 bg-noir-900 border border-noir-700 rounded-lg text-noir-100 placeholder:text-noir-500 focus:outline-none focus:ring-2 focus:ring-doom-500/50 transition-colors resize-y"
          />
          <p className="mt-1 text-xs text-noir-500 text-right">{description.length}/500</p>
        </div>

        {/* ── Submit ─────────────────────────────────────────────────────── */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 bg-[#ff5a0a] text-[#14100e] font-bold rounded-lg hover:bg-[#ff7a1a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Uploading&hellip;
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Upload Blob
            </>
          )}
        </button>
      </form>
    </div>
  );
}
