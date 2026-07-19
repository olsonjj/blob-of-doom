import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';

/**
 * Shared error banner for the admin dashboard.
 * Shows a readable error message with a retry button.
 */
export function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-doom-500/10 border border-doom-500/30 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-doom-400 shrink-0 mt-0.5" />
        <p className="text-sm text-doom-300">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="mt-3 flex items-center gap-2 px-4 py-2 text-sm font-medium text-noir-300 hover:text-noir-100 bg-noir-800 hover:bg-noir-700 rounded-lg transition-colors cursor-pointer"
      >
        <RefreshCw className="w-4 h-4" />
        Retry
      </button>
    </div>
  );
}
