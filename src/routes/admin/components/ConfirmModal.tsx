import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  confirmVariant,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-noir-950/80 backdrop-blur-sm" onClick={onCancel} />
      {/* Dialog */}
      <div className="relative bg-noir-900 border border-noir-700 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-start gap-3 mb-4">
          <div
            className={`p-2 rounded-lg shrink-0 ${
              confirmVariant === 'danger' ? 'bg-doom-500/10 text-doom-400' : 'bg-yellow-500/10 text-yellow-400'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-noir-100">{title}</h3>
            <p className="mt-1 text-sm text-noir-400">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-noir-300 hover:text-noir-100 bg-noir-800 hover:bg-noir-700 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors cursor-pointer ${
              confirmVariant === 'danger' ? 'bg-doom-500 hover:bg-doom-400' : 'bg-yellow-600 hover:bg-yellow-500'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
