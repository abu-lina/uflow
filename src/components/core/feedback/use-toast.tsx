import { useState, useCallback } from 'react';

type ToastVariant = 'default' | 'destructive' | 'success';

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastContextValue {
  toast: (props: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

// Simplified mock implementation
export function useToast(): ToastContextValue {
  const [, setToasts] = useState<Toast[]>([]);
  
  const toast = useCallback((props: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { id, ...props };
    
    setToasts((prev) => [...prev, newToast]);
    
    // In a real implementation, we would render this toast in a Portal
    console.log('Toast:', newToast);
    
    // Auto dismiss after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
    
    return id;
  }, []);
  
  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  
  return { toast, dismiss };
} 