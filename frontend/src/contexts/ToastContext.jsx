import { createContext, useContext, useState } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
    setToasts(prevToasts => {
      // Prevent duplicate toasts with the same message
      const isDuplicate = prevToasts.some(t => t.message === message && t.type === type);
      if (isDuplicate) return prevToasts;
      
      const id = Date.now();
      setTimeout(() => removeToast(id), 3000);
      return [...prevToasts, { id, message, type }];
    });
  };

  const removeToast = (id) => {
    setToasts(prevToasts => prevToasts.filter(t => t.id !== id));
  };

  const clearAll = () => {
    setToasts([]);
  };

  const success = (message) => addToast(message, 'success');
  const error = (message) => addToast(message, 'error');
  const info = (message) => addToast(message, 'info');
  const warning = (message) => addToast(message, 'warning');

  return (
    <ToastContext.Provider value={{ toasts, success, error, info, warning, clearAll }}>
      {children}
      <div 
        style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999 }}
        role="alert"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={{
              padding: '12px 20px',
              marginBottom: '10px',
              borderRadius: '8px',
              backgroundColor: toast.type === 'error' ? 'var(--color-error)' : toast.type === 'success' ? 'var(--color-success)' : 'var(--color-primary)',
              color: 'white',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            }}
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
