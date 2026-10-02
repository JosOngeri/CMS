/**
 * WHAT THIS FILE DOES
 * -------------------
 * Shows small popup messages (toasts) at the top-right of the screen when
 * something happens — for example "Payment recorded" or "Something went wrong".
 *
 * Use `const toast = useToast()` in any component, then:
 *   toast.success('Saved');
 *   toast.error('Could not save');
 *   toast.info('Reminder sent');
 *
 * FILES IT TALKS TO
 * -----------------
 * - Any component that calls useToast()
 */

import { createContext, useContext, useState, useMemo, useCallback } from 'react';

const ToastContext = createContext(null);
const MAX_TOASTS = 5;
const DEFAULT_DURATION = 3000;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  const addToast = useCallback((message, type = 'info', options = {}) => {
    const { duration = DEFAULT_DURATION, position = 'top-right' } = options;

    setToasts(prev => {
      const isDuplicate = prev.some(t => t.message === message && t.type === type);
      if (isDuplicate) return prev;

      const trimmed = prev.length >= MAX_TOASTS ? prev.slice(prev.length - MAX_TOASTS + 1) : prev;
      const id = Date.now();
      setTimeout(() => removeToast(id), duration);
      return [...trimmed, { id, message, type, duration, position }];
    });
  }, [removeToast]);

  const success = useCallback((message, options) => addToast(message, 'success', options), [addToast]);
  const error = useCallback((message, options) => addToast(message, 'error', options), [addToast]);
  const info = useCallback((message, options) => addToast(message, 'info', options), [addToast]);
  const warning = useCallback((message, options) => addToast(message, 'warning', options), [addToast]);

  const positionClasses = {
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'top-right': 'top-4 right-4',
  };

  const typeClasses = {
    error: 'bg-[var(--color-error)]',
    success: 'bg-[var(--color-success)]',
    warning: 'bg-[var(--color-warning)]',
    info: 'bg-[var(--color-primary)]',
  };

  const value = useMemo(() => ({ toasts, success, error, info, warning, clearAll }), [toasts, success, error, info, warning, clearAll]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className={`fixed z-50 ${positionClasses['top-right']}`}
        role="alert"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-5 py-3 mb-2.5 rounded-lg text-[var(--color-on-solid)] shadow-md transition-all duration-300 ease-in-out ${typeClasses[toast.type]}`}
            role={toast.type === 'error' ? 'alert' : 'status'}
            aria-label={toast.type === 'error' ? 'Error' : toast.type === 'success' ? 'Success' : 'Information'}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
