import { createFileRoute } from '@tanstack/react-router';
import ArrowUpDown from 'lucide-react/dist/esm/icons/arrow-up-down';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import Hexagon from 'lucide-react/dist/esm/icons/hexagon';
import { memo, useState,useTransition } from 'react';
import useSWR from 'swr';

import { BlobCard } from '../../components/BlobCard';
import { fetchGallery, type SortField, type SortOrder } from '../../db/gallery.func';

export const Route = createFileRoute('/gallery/')({ component: Gallery });

function Gallery() {
  const [sort, setSort] = useState<SortField>('date');
  const [order, setOrder] = useState<SortOrder>('desc');
  const [isPending, startTransition] = useTransition();

  const { data: blobs = [], isLoading: loading } = useSWR(
    ['gallery', sort, order],
    () => fetchGallery({ data: { sort, order } }),
  );

  const toggleSort = (field: SortField) => {
    startTransition(() => {
      if (sort === field) {
        setOrder((o) => (o === 'desc' ? 'asc' : 'desc'));
      } else {
        setSort(field);
        setOrder('desc');
      }
    });
  };

  const sortLabel = (field: SortField) => {
    if (sort !== field) return '';
    return order === 'desc' ? ' ↓' : ' ↑';
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-noir-100">Gallery of Doom</h1>
          <p className="mt-2 text-noir-400">A hall of shame for the most spectacular 3D printing failures.</p>
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-noir-400 mr-1">Sort by</span>
          <SortButton
            active={sort === 'date'}
            onClick={() => toggleSort('date')}
            label={`Date${sortLabel('date')}`}
            icon={<Calendar className="w-3.5 h-3.5" />}
          />
          <SortButton
            active={sort === 'doom'}
            onClick={() => toggleSort('doom')}
            label={`Doom Scale${sortLabel('doom')}`}
            icon={<Hexagon className="w-3.5 h-3.5" />}
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <GallerySkeleton />
      ) : blobs.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {blobs.map((blob) => (
            <BlobCard key={blob.id} blob={blob} />
          ))}
        </div>
      )}
      {isPending && !loading && (
        <div className="mt-4 flex justify-center">
          <div className="h-1 w-32 bg-noir-800 rounded-full overflow-hidden">
            <div className="h-full bg-doom-500 animate-pulse rounded-full" />
          </div>
        </div>
      )}
    </div>
  );
}

const SortButton = memo(function SortButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
        active ? 'bg-doom-500 text-white' : 'bg-noir-800 text-noir-300 hover:text-noir-100 hover:bg-noir-700'
      }`}
    >
      {icon}
      {label}
      {active && <ArrowUpDown className="w-3 h-3 opacity-70" />}
    </button>
  );
});

function EmptyState() {
  return (
    <div className="text-center py-24 border-2 border-dashed border-noir-700 rounded-xl">
      <Hexagon className="w-12 h-12 text-noir-600 mx-auto mb-4" />
      <h2 className="text-xl font-semibold text-noir-300">No blobs yet</h2>
      <p className="mt-2 text-noir-400 max-w-md mx-auto">
        The hall of shame is empty. Be the first to share your 3D printing failure and claim your place in the
        Engineering Noir Archive.
      </p>
    </div>
  );
}

function GallerySkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="bg-noir-900 border border-noir-700 rounded-xl overflow-hidden animate-pulse">
          <div className="aspect-[4/3] bg-noir-800" />
          <div className="p-5 space-y-3">
            <div className="h-5 bg-noir-800 rounded w-3/4" />
            <div className="h-4 bg-noir-800 rounded w-1/2" />
            <div className="h-3 bg-noir-800 rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
