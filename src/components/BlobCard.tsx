import { Link } from '@tanstack/react-router'
import { HexagonRating } from './HexagonRating'
import type { GalleryBlob } from '../db/gallery.func'

/**
 * Poster-style card for a single blob in the gallery.
 * Displays the medium image variant, title, Doom Scale rating, and upload date.
 * Links to the blob detail page.
 */
export function BlobCard({ blob }: { blob: GalleryBlob }) {
  const formattedDate = new Date(blob.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <article className="bg-noir-900 border border-noir-700 rounded-xl overflow-hidden hover:border-noir-600 transition-colors group">
      {/* Image — links to detail page */}
      <Link to="/gallery/$blobId" params={{ blobId: blob.id.toString() }} className="block">
        <div className="aspect-[4/3] overflow-hidden bg-noir-800">
          <img
            src={blob.imageMediumUrl}
            alt={blob.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        </div>
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
