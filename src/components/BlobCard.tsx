import { Link } from '@tanstack/react-router';
import { memo } from 'react';

import type { GalleryBlob } from '../db/gallery.func';
import { HexagonRating } from './HexagonRating';

/**
 * Poster-style card for a single blob in the gallery.
 * Displays the medium image variant, title, Doom Scale rating, and upload date.
 * Links to the blob detail page.
 */
export const BlobCard = memo(function BlobCard({ blob }: { blob: GalleryBlob }) {
  const formattedDate = new Date(blob.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <article className="blob-card bg-noir-900 border border-noir-700 rounded-xl overflow-hidden hover:border-noir-600 transition-colors group flex flex-col">
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
      </Link>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 space-y-2.5 text-left">
        <Link to="/gallery/$blobId" params={{ blobId: blob.id.toString() }}>
          <h3 className="text-lg font-bold text-noir-100 leading-snug line-clamp-2 hover:text-doom-400 transition-colors">
            {blob.title}
          </h3>
        </Link>

        {/* Description (truncated) */}
        {blob.description && <p className="text-sm text-noir-300 line-clamp-2 leading-relaxed">{blob.description}</p>}

        {/* Bottom row: rating + date — pushed to bottom */}
        <div className="flex items-center justify-between pt-2 border-t border-noir-800 mt-auto">
          <HexagonRating rating={blob.averageRating} size={16} />
          <div className="flex items-center gap-3 text-xs text-noir-400">
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>
    </article>
  );
})
