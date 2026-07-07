'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error' | 'info';

type ToastItem = {
  id: string;
  title?: string;
  message: string;
  variant: ToastVariant;
  durationMs: number;
};

type ToastOptions = {
  title?: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastContextValue = {
  toast: (message: string, opts?: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timersRef = useRef<Record<string, number>>({});

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
    const t = timersRef.current[id];
    if (t) {
      window.clearTimeout(t);
      delete timersRef.current[id];
    }
  }, []);

  const toast = useCallback(
    (message: string, opts?: ToastOptions) => {
      const id = uid();
      const variant: ToastVariant = opts?.variant || 'info';
      const durationMs = opts?.durationMs ?? 3200;

      setItems((prev) => [
        ...prev,
        {
          id,
          message,
          title: opts?.title,
          variant,
          durationMs,
        },
      ]);

      timersRef.current[id] = window.setTimeout(() => remove(id), durationMs);
    },
    [remove],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className='pointer-events-none fixed right-4 top-4 z-80 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3'>
        <AnimatePresence initial={false}>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className={cn(
                'pointer-events-auto overflow-hidden rounded-2xl border bg-white/85 shadow-xl backdrop-blur-xl',
                t.variant === 'success' && 'border-emerald-200',
                t.variant === 'error' && 'border-rose-200',
                t.variant === 'info' && 'border-indigo-200',
              )}
            >
              <div className='flex items-start gap-3 p-4'>
                <div
                  className={cn(
                    'mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white',
                    t.variant === 'success' &&
                      'bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-500',
                    t.variant === 'error' &&
                      'bg-gradient-to-br from-rose-600 via-fuchsia-600 to-amber-500',
                    t.variant === 'info' &&
                      'bg-gradient-to-br from-indigo-600 via-fuchsia-600 to-cyan-500',
                  )}
                >
                  {t.variant === 'success' ? (
                    <CheckCircle2 className='h-5 w-5' />
                  ) : t.variant === 'error' ? (
                    <AlertTriangle className='h-5 w-5' />
                  ) : (
                    <Info className='h-5 w-5' />
                  )}
                </div>

                <div className='min-w-0 flex-1'>
                  {t.title && (
                    <div className='text-sm font-extrabold text-indigo-950'>
                      {t.title}
                    </div>
                  )}
                  <div className='text-sm font-semibold text-indigo-950/85'>
                    {t.message}
                  </div>
                </div>

                <button
                  type='button'
                  onClick={() => remove(t.id)}
                  className='inline-flex h-8 w-8 items-center justify-center rounded-xl text-indigo-950/70 transition hover:bg-indigo-900/10 hover:text-indigo-950'
                  aria-label='Dismiss'
                >
                  <X className='h-4 w-4' />
                </button>
              </div>

              <motion.div
                aria-hidden
                className={cn(
                  'h-1 w-full',
                  t.variant === 'success' &&
                    'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500',
                  t.variant === 'error' &&
                    'bg-gradient-to-r from-rose-500 via-fuchsia-500 to-amber-500',
                  t.variant === 'info' &&
                    'bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-500',
                )}
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: t.durationMs / 1000, ease: 'linear' }}
                style={{ transformOrigin: 'left' }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
