import { createContext, useContext } from 'react';
import toast, { Toaster } from 'react-hot-toast';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const showToast = {
    success: (message) => toast.success(message, { duration: 3000, position: 'top-right' }),
    error: (message) => toast.error(message, { duration: 4000, position: 'top-right' }),
    info: (message) => toast(message, { duration: 3000, position: 'top-right', icon: 'ℹ️' }),
    warning: (message) => toast(message, { duration: 3000, position: 'top-right', icon: '⚠️', style: { background: '#FFFBEB', color: '#92400E' } }),
  };

  return (
    <ToastContext.Provider value={showToast}>
      <Toaster />
      {children}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
