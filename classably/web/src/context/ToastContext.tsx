import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextType {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ type, title, description }: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, description }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-md w-full px-4 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-2xl border backdrop-blur-lg animate-fade-in transition-all ${
              toast.type === 'success'
                ? 'bg-slate-900/90 border-emerald-500/50 text-emerald-300'
                : toast.type === 'error'
                ? 'bg-slate-900/90 border-rose-500/50 text-rose-300'
                : toast.type === 'warning'
                ? 'bg-slate-900/90 border-amber-500/50 text-amber-300'
                : 'bg-slate-900/90 border-sky-500/50 text-sky-300'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />}
            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />}
            {toast.type === 'info' && <Info className="w-5 h-5 shrink-0 text-sky-400 mt-0.5" />}

            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-slate-100">{toast.title}</h4>
              {toast.description && <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{toast.description}</p>}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white transition-colors p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
