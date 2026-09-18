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

const VARIANTS: Record<ToastVariant, { icon: React.ReactNode }> = {
  success: { icon: <CheckCircle2 className="h-[17px] w-[17px] text-good" /> },
  error: { icon: <AlertCircle className="h-[17px] w-[17px] text-bad" /> },
  info: { icon: <Info className="h-[17px] w-[17px] text-accent-ink" /> },
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
      const ttl = duration ?? (variant === 'error' ? 6500 : 3800);
      setToasts((prev) => [...prev.slice(-3), { id, title, description, variant }]);
      timers.current.set(id, setTimeout(() => dismiss(id), ttl));
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
      <div
        className="pointer-events-none fixed inset-x-4 bottom-5 z-[100] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-5 sm:items-end"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-[380px] items-start gap-2.5',
              'rounded-[var(--radius-lg)] border-[0.5px] border-line bg-surface px-3.5 py-3',
              'shadow-[var(--shadow-pop)] animate-scale-in'
            )}
          >
            <span className="mt-px shrink-0">{VARIANTS[t.variant].icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[14.5px] font-medium leading-snug text-ink">{t.title}</p>
              {t.description && (
                <p className="mt-0.5 break-words text-[13.5px] leading-relaxed text-ink-3">
                  {t.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="-mr-1 -mt-0.5 shrink-0 rounded-full p-1 text-ink-4 transition-colors hover:bg-surface-3 hover:text-ink"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
