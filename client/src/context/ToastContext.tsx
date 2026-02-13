import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

interface Toast {
    id: string;
    type: 'success' | 'warning' | 'error' | 'info';
    message: string;
}

interface ToastContextType {
    addToast: (type: Toast['type'], message: string) => void;
}

const ToastContext = createContext<ToastContextType>({ addToast: () => { } });

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((type: Toast['type'], message: string) => {
        const id = Date.now().toString();
        setToasts((prev) => [...prev, { id, type, message }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    }, []);

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    const getIcon = (type: Toast['type']) => {
        switch (type) {
            case 'success': return <CheckCircle size={18} color="var(--success)" />;
            case 'warning': return <AlertTriangle size={18} color="var(--warning)" />;
            case 'error': return <XCircle size={18} color="var(--critical)" />;
            case 'info': return <Info size={18} color="var(--primary)" />;
        }
    };

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="toast-container">
                {toasts.map((toast) => (
                    <div key={toast.id} className="toast">
                        {getIcon(toast.type)}
                        <span style={{ flex: 1, fontSize: '0.875rem' }}>{toast.message}</span>
                        <button onClick={() => removeToast(toast.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                            <X size={14} color="var(--text-muted)" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    return useContext(ToastContext);
}
