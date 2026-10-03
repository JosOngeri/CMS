import { useEffect, useRef } from 'react';
import { X, AlertTriangle } from 'lucide-react';

/**
 * Reusable confirm dialog — replaces native confirm() for destructive actions.
 * Renders as a bottom sheet on mobile, centered modal on sm+ screens.
 */
const ConfirmDialog = ({
  show,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure? This action cannot be undone.',
  confirmLabel = 'Confirm',
  isLoading = false,
  destructive = true,
}) => {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (show && confirmRef.current) confirmRef.current.focus();
  }, [show]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && show) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-[var(--color-overlay)] flex items-end sm:items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="bg-[var(--color-surface)] rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {destructive && (
              <AlertTriangle className="w-5 h-5 text-[var(--color-warning)]" aria-hidden="true" />
            )}
            <h3 id="confirm-dialog-title" className="text-lg font-semibold text-[var(--color-text)]">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)]"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-[var(--color-textSecondary)] mb-6">{message}</p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 border border-[var(--color-border)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-background)] transition-colors disabled:opacity-50"
            aria-label="Cancel"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-[var(--color-on-solid)] rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              destructive ? 'bg-[var(--color-error)]' : 'bg-[var(--color-primary)]'
            }`}
            aria-label={confirmLabel}
            aria-busy={isLoading}
          >
            {isLoading ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
