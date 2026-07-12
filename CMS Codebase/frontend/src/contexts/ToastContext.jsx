import { createContext, useContext, useState } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', options = {}) => {
    const { duration = 3000, position = 'top-right' } = options;
    setToasts(prevToasts => {
      // Prevent duplicate toasts with the same message
      const isDuplicate = prevToasts.some(t => t.message === message && t.type === type);
      if (isDuplicate) return prevToasts;

      // Stacking limit: remove oldest if more than 5
      if (prevToasts.length >= 5) {
        const oldestId = prevToasts[0].id;
        removeToast(oldestId);
      }

      const id = Date.now();
      setTimeout(() => removeToast(id), duration);
      return [...prevToasts, { id, message, type, duration, position }];
    });
  };

  const removeToast = (id) => {
    setToasts(prevToasts => prevToasts.filter(t => t.id !== id));
  };

  const clearAll = () => {
    setToasts([]);
  };

  const success = (message, options) => addToast(message, 'success', options);
  const error = (message, options) => addToast(message, 'error', options);
  const info = (message, options) => addToast(message, 'info', options);
  const warning = (message, options) => addToast(message, 'warning', options);

  const getPositionClasses = (position) => {
    switch (position) {
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2';
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2';
      case 'top-right':
      default:
        return 'top-4 right-4';
    }
  };

  const getTypeClasses = (type) => {
    switch (type) {
      case 'error':
        return 'bg-[var(--color-error)]';
      case 'success':
        return 'bg-[var(--color-success)]';
      case 'warning':
        return 'bg-[var(--color-warning)]';
      case 'info':
      default:
        return 'bg-[var(--color-primary)]';
    }
  };

  return (
    <ToastContext.Provider value={{ toasts, success, error, info, warning, clearAll }}>
      {children}
      <div
        className={`fixed z-50 ${getPositionClasses('top-right')}`}
        role="alert"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`
              px-5 py-3 mb-2.5 rounded-lg text-white shadow-md
              transition-all duration-300 ease-in-out
              opacity-100 translate-y-0
              ${getTypeClasses(toast.type)}
            `}
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
