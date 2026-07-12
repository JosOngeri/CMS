import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Reusable Password Confirmation Modal
 * Used for sensitive operations like delete, role changes, etc.
 */
const PasswordConfirmationModal = ({
  show,
  onClose,
  onConfirm,
  password,
  setPassword,
  isLoading,
  message,
  title = 'Confirm Action'
}) => {
  const modalRef = useRef(null)
  const passwordInputRef = useRef(null)

  useEffect(() => {
    if (show && passwordInputRef.current) {
      passwordInputRef.current.focus()
    }
  }, [show])

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && show) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [show, onClose])

  if (!show) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="password-modal-title"
    >
      <div 
        ref={modalRef}
        className="bg-[var(--color-surface)] rounded-lg shadow-xl max-w-md w-full p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 
            id="password-modal-title"
            className="text-lg font-semibold text-[var(--color-text)]"
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)]"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-sm text-[var(--color-textSecondary)] mb-4">
          {message || 'Please enter your password to confirm this action. This action cannot be undone.'}
        </p>
        
        <input
          ref={passwordInputRef}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent mb-4"
          aria-label="Password"
          disabled={isLoading}
        />
        
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
            onClick={onConfirm}
            disabled={isLoading || !password}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Confirm action"
            aria-busy={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PasswordConfirmationModal;
