import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info';

type ToastItem = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type ToastApi = {
  toast: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastApi | undefined>(undefined);

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
} as const;

const STYLES: Record<ToastVariant, string> = {
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100',
  error:
    'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/60 dark:text-red-100',
  info: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-100',
};

const DURATION_MS = 4500;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = ++counter.current;
      setItems((prev) => [...prev, { id, message, variant }]);
      window.setTimeout(() => dismiss(id), DURATION_MS);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      toast,
      success: (m) => toast(m, 'success'),
      error: (m) => toast(m, 'error'),
      info: (m) => toast(m, 'info'),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role='status'
        aria-live='polite'
        className='pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2'
      >
        {items.map((t) => {
          const Icon = ICONS[t.variant];
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${STYLES[t.variant]}`}
            >
              <Icon className='mt-0.5 h-4 w-4 shrink-0' aria-hidden />
              <p className='flex-1'>{t.message}</p>
              <button
                type='button'
                onClick={() => dismiss(t.id)}
                aria-label='Dismiss'
                className='rounded p-0.5 opacity-70 hover:opacity-100'
              >
                <X className='h-4 w-4' />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook is intentionally co-located with its provider
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
