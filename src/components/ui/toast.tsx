'use client';

import * as React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

const VARIANT_STYLES: Record<ToastVariant, { icon: React.ReactNode; ring: string }> = {
  success: {
    icon: <CheckCircle2 className="w-[18px] h-[18px] text-[#30d158]" />,
    ring: 'border-[#30d158]/25',
  },
  error: {
    icon: <AlertCircle className="w-[18px] h-[18px] text-[#ff453a]" />,
    ring: 'border-[#ff453a]/25',
  },
  info: {
    icon: <Info className="w-[18px] h-[18px] text-[#2997ff]" />,
    ring: 'border-[#2997ff]/25',
  },
};

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const timers = React.useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = React.useCallback(
    ({ title, description, variant = 'info', duration }: ToastOptions) => {
      const id = nextId++;
      const ttl = duration ?? (variant === 'error' ? 6000 : 4000);
      setToasts((prev) => [...prev.slice(-4), { id, title, description, variant }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), ttl)
      );
    },
    [dismiss]
  );

  const value = React.useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (title, description) => toast({ title, description, variant: 'success' }),
      error: (title, description) => toast({ title, description, variant: 'error' }),
    }),
    [toast]
  );

  React.useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast viewport — bottom right, stacked */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2.5 pointer-events-none max-w-[380px]">
        {toasts.map((t) => {
          const style = VARIANT_STYLES[t.variant];
          return (
            <div
              key={t.id}
              role="status"
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-[14px] border bg-[#232328]/95 backdrop-blur-xl px-4 py-3.5 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.6)] animate-toast-in',
                style.ring
              )}
            >
              <div className="shrink-0 mt-0.5">{style.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-medium text-white leading-snug">{t.title}</p>
                {t.description && (
                  <p className="text-[12.5px] text-white/50 mt-0.5 leading-relaxed break-words">{t.description}</p>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 text-white/30 hover:text-white/70 transition-colors mt-0.5"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
