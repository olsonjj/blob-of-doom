import { HexagonRating } from './HexagonRating'
import type { GalleryBlob } from '../db/gallery.func'

/**
 * Poster-style card for a single blob in the gallery.
 * Displays the medium image variant, title, Doom Scale rating, and upload date.
 */
export function BlobCard({ blob }: { blob: GalleryBlob }) {
  const formattedDate = new Date(blob.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <article className="bg-noir-900 border border-noir-700 rounded-xl overflow-hidden hover:border-noir-600 transition-colors group">
      {/* Image */}
      <div className="aspect-[4/3] overflow-hidden bg-noir-800">
        <img
          src={blob.imageMediumUrl}
          alt={blob.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      </div>

      {/* Content */}
      <div className="p-5 space-y-3">
        <h3 className="text-lg font-bold text-noir-100 leading-snug line-clamp-2">
          {blob.title}
        </h3>

        {/* Doom Scale */}
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
