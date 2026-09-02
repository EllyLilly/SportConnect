import { createContext, useContext, useState, type ReactNode, useCallback } from 'react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const getBackgroundColor = (type: Toast['type']) => {
    switch (type) {
      case 'error': return '#d32f2f';
      case 'success': return '#388e3c';
      case 'warning': return '#f57c00';
      case 'info': return '#1976d2';
      default: return '#1976d2';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              padding: '12px 20px',
              borderRadius: 8,
              color: '#fff',
              backgroundColor: getBackgroundColor(toast.type),
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              cursor: 'pointer',
              maxWidth: 350,
            }}
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast должен использоваться внутри ToastProvider');
  return context;
}