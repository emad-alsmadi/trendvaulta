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
import { useTranslation } from '@/contexts/TranslationContext';
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

// Errors need time to be read (WCAG 2.2.1) — often a failed checkout step.
const DEFAULT_DURATION_MS: Record<ToastVariant, number> = {
  success: 4000,
  info: 4000,
  error: 10000,
};

type Timer = { handle?: number; startedAt: number; remainingMs: number };

const ToastContext = createContext<ToastContextValue | null>(null);

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  // `t` is the toast item in the render below, so the translator is renamed.
  const { t: translate, dir } = useTranslation();
  const [items, setItems] = useState<ToastItem[]>([]);
  // Hover/focus on the toasts pauses every countdown (and its bar).
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const timersRef = useRef<Record<string, Timer>>({});

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current[id];
    if (timer?.handle) window.clearTimeout(timer.handle);
    delete timersRef.current[id];
  }, []);

  const start = useCallback(
    (id: string) => {
      const timer = timersRef.current[id];
      if (!timer) return;
      timer.startedAt = Date.now();
      timer.handle = window.setTimeout(() => remove(id), timer.remainingMs);
    },
    [remove],
  );

  const toast = useCallback(
    (message: string, opts?: ToastOptions) => {
      const id = uid();
      const variant: ToastVariant = opts?.variant || 'info';
      const durationMs = opts?.durationMs ?? DEFAULT_DURATION_MS[variant];

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

      timersRef.current[id] = { startedAt: Date.now(), remainingMs: durationMs };
      if (!pausedRef.current) start(id);
    },
    [start],
  );

  const pauseAll = useCallback(() => {
    if (pausedRef.current) return;
    pausedRef.current = true;
    setPaused(true);
    const now = Date.now();
    for (const timer of Object.values(timersRef.current)) {
      if (timer.handle) window.clearTimeout(timer.handle);
      timer.handle = undefined;
      timer.remainingMs = Math.max(0, timer.remainingMs - (now - timer.startedAt));
    }
  }, []);

  const resumeAll = useCallback(() => {
    if (!pausedRef.current) return;
    pausedRef.current = false;
    setPaused(false);
    for (const id of Object.keys(timersRef.current)) start(id);
  }, [start]);

  const value = useMemo(() => ({ toast }), [toast]);

  const renderToast = (t: ToastItem) => (
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
              'bg-gradient-to-br from-fuchsia-600 via-purple-600 to-cyan-500',
          )}
        >
          {t.variant === 'success' ? (
            <CheckCircle2 className='h-5 w-5' aria-hidden />
          ) : t.variant === 'error' ? (
            <AlertTriangle className='h-5 w-5' aria-hidden />
          ) : (
            <Info className='h-5 w-5' aria-hidden />
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
          aria-label={translate('confirmDialog.close')}
        >
          <X className='h-4 w-4' aria-hidden />
        </button>
      </div>

      <div
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
        style={{
          animation: `toast-countdown ${t.durationMs}ms linear forwards`,
          animationPlayState: paused ? 'paused' : 'running',
          // Shrink toward the reading start: the right edge in RTL.
          transformOrigin: dir === 'rtl' ? 'right' : 'left',
        }}
      />
    </motion.div>
  );

  const errors = items.filter((t) => t.variant === 'error');
  const others = items.filter((t) => t.variant !== 'error');

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className='pointer-events-none fixed end-4 top-4 z-80 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3'
        onMouseEnter={pauseAll}
        onMouseLeave={resumeAll}
        onFocus={pauseAll}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            resumeAll();
          }
        }}
      >
        {/* Two always-present live regions: errors are announced
            assertively, everything else politely. */}
        <div role='alert' aria-live='assertive' className='flex flex-col gap-3'>
          <AnimatePresence initial={false}>{errors.map(renderToast)}</AnimatePresence>
        </div>
        <div role='status' aria-live='polite' className='flex flex-col gap-3'>
          <AnimatePresence initial={false}>{others.map(renderToast)}</AnimatePresence>
        </div>
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
