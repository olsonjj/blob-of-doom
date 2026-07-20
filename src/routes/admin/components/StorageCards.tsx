import HardDrive from 'lucide-react/dist/esm/icons/hard-drive';
import Image from 'lucide-react/dist/esm/icons/image';

import { ErrorBanner } from '../../../components/ErrorBanner';
import type { StorageStats } from '../../../db/admin.func';
import { formatBytes } from './helpers';

export function StorageCards({
  stats,
  loading,
  error,
  onRetry,
}: {
  stats: StorageStats | null;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <ErrorBanner
        message={error instanceof Error ? error.message : 'Failed to load storage stats'}
        onRetry={onRetry}
      />
    );
  }

  const usagePercent = stats ? Math.min(100, (stats.totalSizeBytes / stats.capacityBytes) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
      {/* Blob count */}
      <div className="bg-noir-900 border border-noir-700 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-doom-500/10 rounded-lg">
            <Image className="w-5 h-5 text-doom-400" />
          </div>
          <span className="text-xs font-medium text-noir-400 uppercase tracking-wider">Images Stored</span>
        </div>
        {loading ? (
          <div className="h-8 bg-noir-800 rounded animate-pulse w-16" />
        ) : (
          <p className="text-3xl font-bold text-noir-100">{stats?.blobCount ?? 0}</p>
        )}
        <p className="mt-1 text-xs text-noir-500">Across all variants (thumbnail, medium, full)</p>
      </div>

      {/* Total size */}
      <div className="bg-noir-900 border border-noir-700 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <HardDrive className="w-5 h-5 text-blue-400" />
          </div>
          <span className="text-xs font-medium text-noir-400 uppercase tracking-wider">Storage Used</span>
        </div>
        {loading ? (
          <div className="h-8 bg-noir-800 rounded animate-pulse w-24" />
        ) : (
          <p className="text-3xl font-bold text-noir-100">{stats ? formatBytes(stats.totalSizeBytes) : '—'}</p>
        )}
        <p className="mt-1 text-xs text-noir-500">Cumulative size of all blobs</p>
      </div>

      {/* Capacity */}
      <div className="bg-noir-900 border border-noir-700 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <HardDrive className="w-5 h-5 text-green-400" />
          </div>
          <span className="text-xs font-medium text-noir-400 uppercase tracking-wider">Capacity</span>
        </div>
        {loading ? (
          <div className="h-8 bg-noir-800 rounded animate-pulse w-24" />
        ) : (
          <p className="text-3xl font-bold text-noir-100">{stats ? formatBytes(stats.capacityBytes) : '—'}</p>
        )}
        {/* Usage bar */}
        {stats && (
          <div className="mt-2">
            <div className="h-1.5 bg-noir-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  usagePercent > 90 ? 'bg-doom-500' : usagePercent > 70 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-noir-500">{usagePercent.toFixed(1)}% used</p>
          </div>
        )}
      </div>
    </div>
  );
}
