import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import Modal from './Modal';

const ConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  showIcon = true
}) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const confirmButtonRef = useRef(null);

  useEffect(() => {
    if (isOpen && confirmButtonRef.current) {
      confirmButtonRef.current.focus();
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Confirmation error:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  const typeStyles = {
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-yellow-500',
      iconBg: 'bg-yellow-100',
      confirmColor: 'bg-yellow-600 hover:bg-yellow-700'
    },
    danger: {
      icon: AlertTriangle,
      iconColor: 'text-red-500',
      iconBg: 'bg-red-100',
      confirmColor: 'bg-red-600 hover:bg-red-700'
    },
    info: {
      icon: AlertTriangle,
      iconColor: 'text-[var(--color-primary)]-500',
      iconBg: 'bg-[var(--color-primary)]-100',
      confirmColor: 'bg-[var(--color-primary)]-600 hover:bg-[var(--color-primary)]-700'
    }
  };

  const currentStyle = typeStyles[type] || typeStyles.warning;
  const Icon = currentStyle.icon;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          {showIcon && (
            <div className={`flex-shrink-0 w-12 h-12 rounded-full ${currentStyle.iconBg} flex items-center justify-center`}>
              <Icon className={`h-6 w-6 ${currentStyle.iconColor}`} aria-hidden="true" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">
              {title}
            </h3>
            <p className="text-sm text-[var(--color-textSecondary)]">
              {message}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--color-textSecondary)] hover:text-[var(--color-textSecondary)]"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isConfirming}
            className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-[var(--color-text)] hover:bg-[var(--color-background)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
            aria-label="Cancel"
          >
            {cancelText}
          </button>
          <button
            ref={confirmButtonRef}
            onClick={handleConfirm}
            disabled={isConfirming}
            className={`px-4 py-2 ${currentStyle.confirmColor} text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]`}
            aria-label={confirmText}
            aria-busy={isConfirming}
          >
            {isConfirming ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationDialog;
