import { Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import { useAuth } from '@clerk/tanstack-react-start'
import { HexagonRating } from './HexagonRating'
import { checkAdminStatus } from '../db/admin-check.func'
import { deleteBlob } from '../db/admin.func'
import type { GalleryBlob } from '../db/gallery.func'

/**
 * Poster-style card for a single blob in the gallery.
 * Displays the medium image variant, title, Doom Scale rating, and upload date.
 * Links to the blob detail page.
 */
export function BlobCard({ blob, onDelete }: { blob: GalleryBlob; onDelete?: () => void }) {
  const { isSignedIn, isLoaded } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      checkAdminStatus().then(setIsAdmin).catch(() => {})
    }
  }, [isLoaded, isSignedIn])

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Delete "${blob.title}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await deleteBlob({ data: { blobId: blob.id } })
      onDelete?.()
    } catch {
      setDeleting(false)
    }
  }
  const formattedDate = new Date(blob.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <article className="bg-noir-900 border border-noir-700 rounded-xl overflow-hidden hover:border-noir-600 transition-colors group">
      {/* Image — links to detail page */}
      <Link to="/gallery/$blobId" params={{ blobId: blob.id.toString() }} className="block relative">
        <div className="aspect-[4/3] overflow-hidden bg-noir-800">
          <img
            src={blob.imageMediumUrl}
            alt={blob.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        </div>
        {/* Admin delete button */}
        {isAdmin && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="absolute top-2 right-2 p-1.5 bg-noir-950/80 hover:bg-doom-500/80 text-noir-400 hover:text-white rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
            title="Delete blob"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </Link>

      {/* Content */}
      <div className="p-5 space-y-3">
        <Link to="/gallery/$blobId" params={{ blobId: blob.id.toString() }}>
          <h3 className="text-lg font-bold text-noir-100 leading-snug line-clamp-2 hover:text-doom-400 transition-colors">
            {blob.title}
          </h3>
        </Link>

        {/* Doom Scale — read-only average */}
        <HexagonRating rating={blob.averageRating} size={18} />

        {/* Meta row */}
        <div className="flex items-center justify-between text-xs text-noir-400 pt-1 border-t border-noir-800">
          <span>{blob.filamentType}</span>
          <span>{formattedDate}</span>
        </div>

        {/* Description (truncated) */}
        {blob.description && (
          <p className="text-sm text-noir-300 line-clamp-2 leading-relaxed">
            {blob.description}
          </p>
        )}
      </div>
    </article>
  )
}
