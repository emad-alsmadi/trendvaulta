import { createContext, useCallback, useContext, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, HelpCircle, Trash2 } from 'lucide-react';
import { useT } from '../../i18n/I18nProvider';
import { Button } from './Button';
import { text } from './styles';

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive: warning mark, trash icon on confirm — wording, not colour, carries it */
  danger?: boolean;
};

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | undefined>(undefined);

type Pending = { options: ConfirmOptions; resolve: (ok: boolean) => void };

/**
 * Promise-based replacement for window.confirm built on Radix Dialog
 * (role=dialog, focus trap, Escape/backdrop to cancel).
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const { t } = useT();
  const [pending, setPending] = useState<Pending | null>(null);
  const pendingRef = useRef<Pending | null>(null);

  const confirm = useCallback<ConfirmFn>((input) => {
    const options = typeof input === 'string' ? { message: input } : input;
    return new Promise<boolean>((resolve) => {
      // A new request while one is open cancels the previous one.
      pendingRef.current?.resolve(false);
      const next = { options, resolve };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);

  const settle = (ok: boolean) => {
    pendingRef.current?.resolve(ok);
    pendingRef.current = null;
    setPending(null);
  };

  const o = pending?.options;
  const Mark = o?.danger ? AlertTriangle : HelpCircle;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog.Root
        open={pending != null}
        onOpenChange={(open) => {
          if (!open) settle(false);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className='fixed inset-0 z-[90] bg-backdrop backdrop-blur-[2px] data-[state=open]:animate-overlay-in' />
          <Dialog.Content
            className='fixed left-1/2 top-1/2 z-[95] w-[calc(100vw-2rem)] max-w-dialog-confirm -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-card border border-border bg-card text-card-foreground shadow-overlay focus:outline-none data-[state=open]:animate-pop-in'
            onOpenAutoFocus={(e) => {
              // Focus the cancel button so Enter never confirms by accident.
              e.preventDefault();
              (
                e.currentTarget as HTMLElement
              )?.querySelector<HTMLButtonElement>('[data-cancel]')?.focus();
            }}
          >
            <div className='flex items-start gap-4 p-6'>
              <span className='flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-foreground'>
                <Mark
                  className='size-5'
                  aria-hidden
                />
              </span>
              <div className='min-w-0 space-y-1.5 pt-0.5'>
                <Dialog.Title className={text.section}>
                  {o?.title ?? 'Are you sure?'}
                </Dialog.Title>
                <Dialog.Description className='text-sm leading-relaxed text-muted-foreground'>
                  {o?.message}
                </Dialog.Description>
              </div>
            </div>
            <div className='flex flex-col-reverse gap-2 border-t border-border bg-muted/40 px-6 py-4 sm:flex-row sm:justify-end'>
              <Button
                data-cancel
                onClick={() => settle(false)}
              >
                {o?.cancelLabel ?? t('common.cancel')}
              </Button>
              <Button
                variant='primary'
                onClick={() => settle(true)}
                icon={o?.danger ? <Trash2 aria-hidden /> : undefined}
              >
                {o?.confirmLabel ?? t('common.confirm')}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </ConfirmContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook is intentionally co-located with its provider
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
