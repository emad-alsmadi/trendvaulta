'use client';

import * as Dialog from '@radix-ui/react-dialog';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CircleHelp,
  CreditCard,
  Info,
  Loader2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { ConfirmOptions, ConfirmVariant } from './types';

function defaultCloseOnBackdrop(variant: ConfirmVariant | undefined): boolean {
  return variant !== 'danger' && variant !== 'payment';
}

function defaultLabels(variant: ConfirmVariant | undefined): {
  confirm: string;
  cancel: string;
} {
  switch (variant ?? 'neutral') {
    case 'danger':
      return { confirm: 'Continue', cancel: 'Cancel' };
    case 'warning':
      return { confirm: 'Discard', cancel: 'Keep editing' };
    case 'payment':
      return { confirm: 'Continue to payment', cancel: 'Review cart' };
    case 'info':
    case 'neutral':
    default:
      return { confirm: 'Confirm', cancel: 'Cancel' };
  }
}

function VariantIcon({ variant }: { variant: ConfirmVariant | undefined }) {
  const cls = 'h-6 w-6 shrink-0';
  switch (variant ?? 'neutral') {
    case 'danger':
      return (
        <AlertTriangle
          className={cn(cls, 'text-rose-600')}
          aria-hidden
        />
      );
    case 'warning':
      return (
        <AlertCircle
          className={cn(cls, 'text-amber-600')}
          aria-hidden
        />
      );
    case 'payment':
      return (
        <CreditCard
          className={cn(cls, 'text-emerald-600')}
          aria-hidden
        />
      );
    case 'info':
      return (
        <Info
          className={cn(cls, 'text-sky-600')}
          aria-hidden
        />
      );
    case 'neutral':
    default:
      return (
        <CircleHelp
          className={cn(cls, 'text-indigo-600')}
          aria-hidden
        />
      );
  }
}

function panelTone(variant: ConfirmVariant | undefined): string {
  switch (variant ?? 'neutral') {
    case 'danger':
      return 'border-rose-200/90 bg-gradient-to-br from-rose-50/95 via-white/90 to-white/95 shadow-[0_0_0_1px_rgba(244,63,94,0.12)]';
    case 'warning':
      return 'border-amber-200/90 bg-gradient-to-br from-amber-50/95 via-white/90 to-white/95 shadow-[0_0_0_1px_rgba(245,158,11,0.12)]';
    case 'payment':
      return 'border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-white/90 to-cyan-50/80 shadow-[0_0_0_1px_rgba(16,185,129,0.12)]';
    case 'info':
      return 'border-sky-200/90 bg-gradient-to-br from-sky-50/90 via-white/90 to-white/95 shadow-[0_0_0_1px_rgba(14,165,233,0.12)]';
    case 'neutral':
    default:
      return 'border-indigo-200/80 bg-gradient-to-br from-indigo-50/80 via-white/90 to-white/95 shadow-[0_0_0_1px_rgba(99,102,241,0.10)]';
  }
}

function confirmButtonChoice(variant: ConfirmVariant | undefined) {
  switch (variant ?? 'neutral') {
    case 'danger':
      return 'destructive' as const;
    case 'warning':
      return 'destructive' as const;
    case 'payment':
    case 'info':
    case 'neutral':
    default:
      return 'default' as const;
  }
}

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return ctx.confirm;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const finish = useCallback((result: boolean) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setBusy(false);
    setOpts(null);
    setOpen(false);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setOpts(options);
      setOpen(true);
    });
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next && !busy) {
        const allow =
          opts?.closeOnBackdrop ?? defaultCloseOnBackdrop(opts?.variant);
        if (allow) finish(false);
      }
    },
    [busy, opts, finish],
  );

  const allowDismiss =
    opts?.closeOnBackdrop ?? defaultCloseOnBackdrop(opts?.variant);

  const onConfirmClick = useCallback(async () => {
    if (!opts || busy) return;
    setBusy(true);
    try {
      await opts.onConfirm();
      finish(true);
    } catch {
      setBusy(false);
    }
  }, [opts, busy, finish]);

  const defaults = useMemo(
    () => defaultLabels(opts?.variant),
    [opts?.variant],
  );

  const confirmLabel = opts?.confirmLabel ?? defaults.confirm;
  const cancelLabel = opts?.cancelLabel ?? defaults.cancel;

  const ctxValue = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={ctxValue}>
      {children}
      <Dialog.Root
        open={open}
        onOpenChange={handleOpenChange}
      >
        <Dialog.Portal>
          <Dialog.Overlay className='fixed inset-0 z-[100] bg-indigo-950/40 backdrop-blur-[2px]' />
          <Dialog.Content
            onInteractOutside={(e) => {
              if (busy || !allowDismiss) e.preventDefault();
            }}
            onEscapeKeyDown={(e) => {
              if (busy || !allowDismiss) e.preventDefault();
            }}
            className={cn(
              'fixed left-1/2 top-1/2 z-[101] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border p-6 shadow-2xl outline-none',
              panelTone(opts?.variant),
            )}
          >
            <div className='flex gap-4'>
              <div
                className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border bg-white/70',
                  opts?.variant === 'danger' && 'border-rose-200',
                  opts?.variant === 'warning' && 'border-amber-200',
                  opts?.variant === 'payment' && 'border-emerald-200',
                  opts?.variant === 'info' && 'border-sky-200',
                  (!opts?.variant || opts.variant === 'neutral') &&
                    'border-indigo-200',
                )}
              >
                <VariantIcon variant={opts?.variant} />
              </div>
              <div className='min-w-0 flex-1'>
                <Dialog.Title className='text-lg font-extrabold tracking-tight text-indigo-950'>
                  {opts?.title}
                </Dialog.Title>
                {opts?.description ? (
                  <Dialog.Description className='mt-2 text-sm font-semibold leading-relaxed text-indigo-950/80'>
                    {opts.description}
                  </Dialog.Description>
                ) : (
                  <Dialog.Description className='sr-only'>
                    Confirm this action.
                  </Dialog.Description>
                )}
              </div>
              {allowDismiss ? (
                <button
                  type='button'
                  disabled={busy}
                  onClick={() => !busy && finish(false)}
                  className='-m-1 shrink-0 rounded-xl p-2 text-indigo-950/50 transition hover:bg-white/60 hover:text-indigo-950 disabled:opacity-40'
                  aria-label='Close'
                >
                  <X className='h-5 w-5' />
                </button>
              ) : null}
            </div>

            <div className='mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={busy}
                className='w-full rounded-full sm:w-auto'
                onClick={() => finish(false)}
              >
                {cancelLabel}
              </Button>
              <Button
                type='button'
                variant={confirmButtonChoice(opts?.variant)}
                size='sm'
                disabled={busy}
                className='w-full rounded-full sm:w-auto'
                onClick={() => void onConfirmClick()}
              >
                {busy ? (
                  <span className='inline-flex items-center gap-2'>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    Please wait…
                  </span>
                ) : (
                  confirmLabel
                )}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </ConfirmContext.Provider>
  );
}
