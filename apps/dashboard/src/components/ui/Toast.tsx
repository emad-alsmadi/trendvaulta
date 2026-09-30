import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react';
import { useT } from '../../i18n/I18nProvider';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

type ToastItem = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type ToastApi = {
  toast: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastApi | undefined>(undefined);

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
} as const;

/**
 * Neutral card per variant; the icon tells them apart, and errors/warnings
 * get a full-strength edge and message weight instead of a colour.
 */
const ACCENT: Record<
  ToastVariant,
  { icon: string; edge: string; bar: string; text: string }
> = {
  success: {
    icon: 'text-foreground',
    edge: 'before:bg-border-strong',
    bar: 'bg-foreground/25',
    text: '',
  },
  error: {
    icon: 'text-foreground',
    edge: 'before:bg-foreground',
    bar: 'bg-foreground/50',
    text: 'font-medium',
  },
  warning: {
    icon: 'text-foreground',
    edge: 'before:bg-foreground',
    bar: 'bg-foreground/50',
    text: 'font-medium',
  },
  info: {
    icon: 'text-muted-foreground',
    edge: 'before:bg-border-strong',
    bar: 'bg-foreground/25',
    text: '',
  },
};

/** Errors stay longer — they usually need reading and acting on. */
const DURATION_MS: Record<ToastVariant, number> = {
  success: 4000,
  info: 4500,
  warning: 6000,
  error: 7000,
};

const MAX_VISIBLE = 4;

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: number) => void;
}) {
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();
  const { t } = useT();
  const Icon = ICONS[item.variant];
  const accent = ACCENT[item.variant];

  return (
    <motion.div
      layout={!reduceMotion}
      initial={
        reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.97 }
      }
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={
        reduceMotion
          ? { opacity: 0 }
          : { opacity: 0, scale: 0.96, transition: { duration: 0.15 } }
      }
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      // Errors interrupt; everything else waits its turn.
      role={item.variant === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-card border border-border bg-popover py-3 pe-3 ps-4 text-sm text-popover-foreground shadow-overlay before:absolute before:inset-y-0 before:start-0 before:w-1 ${accent.edge}`}
    >
      <Icon
        className={`mt-0.5 size-4 shrink-0 ${accent.icon}`}
        aria-hidden
      />
      <p className={`flex-1 leading-5 ${accent.text}`}>{item.message}</p>
      <button
        type='button'
        onClick={() => onDismiss(item.id)}
        aria-label={t('common.dismiss')}
        className='-m-1 rounded-control p-1 text-muted-foreground transition-colors duration-fast hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      >
        <X
          className='size-4'
          aria-hidden
        />
      </button>
      {/* Countdown: its animationend dismisses the toast, so hover/focus
          pause the timer exactly where it is. */}
      <span
        aria-hidden
        className={`absolute bottom-0 start-0 h-0.5 w-full origin-left rtl:origin-right ${accent.bar}`}
        style={{
          animation: `toast-countdown ${DURATION_MS[item.variant]}ms linear forwards`,
          animationPlayState: paused ? 'paused' : 'running',
        }}
        onAnimationEnd={() => onDismiss(item.id)}
      />
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      setItems((prev) => {
        // The same message fired twice (double click, retry) shows once.
        if (prev.some((t) => t.message === message && t.variant === variant))
          return prev;
        const next = [...prev, { id: ++counter.current, message, variant }];
        return next.slice(-MAX_VISIBLE);
      });
    },
    [],
  );

  const api = useMemo<ToastApi>(
    () => ({
      toast,
      success: (m) => toast(m, 'success'),
      error: (m) => toast(m, 'error'),
      warning: (m) => toast(m, 'warning'),
      info: (m) => toast(m, 'info'),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Top inline-end corner: top-right in LTR, top-left in RTL. */}
      <div
        aria-live='polite'
        className='pointer-events-none fixed end-4 top-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2'
      >
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <ToastCard
              key={item.id}
              item={item}
              onDismiss={dismiss}
            />
          ))}
        </AnimatePresence>
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
