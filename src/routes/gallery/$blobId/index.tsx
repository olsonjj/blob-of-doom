import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Eye } from 'lucide-react'
import { useAuth } from '@clerk/tanstack-react-start'
import { fetchBlobDetail, type BlobDetail } from '../../../db/blob-detail.func'
import { submitRating } from '../../../db/rating.func'
import { HexagonRating } from '../../../components/HexagonRating'

export const Route = createFileRoute('/gallery/$blobId/')({
  component: BlobDetailPage,
})

function BlobDetailPage() {
  const { blobId } = Route.useParams()
  const { isSignedIn } = useAuth()

  const [blob, setBlob] = useState<BlobDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const id = parseInt(blobId, 10)
    if (isNaN(id)) {
      setError('Invalid blob ID')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    fetchBlobDetail({ data: id })
      .then(setBlob)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load blob'))
      .finally(() => setLoading(false))
  }, [blobId])

  const handleRate = useCallback(
    async (score: number) => {
      if (!blob) return
      const id = blob.id

      // Optimistic update
      setBlob((prev) => {
        if (!prev) return prev
        const oldUserRating = prev.userRating
        const oldAverage = prev.averageRating
        const oldCount = prev.ratingCount

        let newCount: number
        let newAverage: number
        if (oldUserRating === null) {
          newCount = oldCount + 1
          newAverage = (oldAverage * oldCount + score) / newCount
        } else {
          newCount = oldCount
          newAverage = (oldAverage * oldCount - oldUserRating + score) / newCount
        }

        return { ...prev, userRating: score, averageRating: newAverage, ratingCount: newCount }
      })

      try {
        const result = await submitRating({ data: { blobId: id, score } })
        setBlob((prev) =>
          prev
            ? {
                ...prev,
                userRating: result.score,
                averageRating: result.averageRating,
                ratingCount: result.ratingCount,
              }
            : prev,
        )
      } catch {
        // Revert on error — refetch
        const fresh = await fetchBlobDetail({ data: id })
        setBlob(fresh)
      }
    },
    [blob],
  )

  // Loading state
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <DetailSkeleton />
      </div>
    )
  }

  // Error state
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
    )
  }

  const formattedDate = new Date(blob.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const occurredDate = new Date(blob.dateOccurred).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

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
          <img
            src={blob.imageFullUrl}
            alt={blob.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Right: Details */}
        <div className="flex flex-col gap-6">
          {/* Title */}
          <h1 className="text-3xl font-bold text-noir-100 leading-tight">
            {blob.title}
          </h1>

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
              onRate={isSignedIn ? handleRate : undefined}
              isAuthenticated={isSignedIn ?? false}
            />
          </div>

          {/* Description */}
          {blob.description && (
            <div>
              <h2 className="text-sm font-medium text-noir-400 uppercase tracking-wider mb-2">
                Description
              </h2>
              <p className="text-noir-200 leading-relaxed">{blob.description}</p>
            </div>
          )}

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-noir-900 border border-noir-700 rounded-lg p-4">
              <span className="text-xs text-noir-500 uppercase tracking-wider">
                Filament Type
              </span>
              <p className="mt-1 text-noir-200 font-medium">{blob.filamentType}</p>
            </div>
            <div className="bg-noir-900 border border-noir-700 rounded-lg p-4">
              <span className="text-xs text-noir-500 uppercase tracking-wider">
                Machine Used
              </span>
              <p className="mt-1 text-noir-200 font-medium">{blob.machineUsed}</p>
            </div>
            <div className="bg-noir-900 border border-noir-700 rounded-lg p-4">
              <span className="text-xs text-noir-500 uppercase tracking-wider">
                Date Occurred
              </span>
              <p className="mt-1 text-noir-200 font-medium">{occurredDate}</p>
            </div>
            <div className="bg-noir-900 border border-noir-700 rounded-lg p-4">
              <span className="text-xs text-noir-500 uppercase tracking-wider">
                Uploaded
              </span>
              <p className="mt-1 text-noir-200 font-medium">{formattedDate}</p>
            </div>
          </div>

          {/* View count */}
          <div className="flex items-center gap-2 text-xs text-noir-500">
            <Eye className="w-3.5 h-3.5" />
            <span>
              {blob.viewCount} {blob.viewCount === 1 ? 'view' : 'views'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
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
  )
}
