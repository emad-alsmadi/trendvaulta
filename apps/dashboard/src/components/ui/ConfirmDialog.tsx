import { createContext, useCallback, useContext, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button for destructive actions */
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
          <Dialog.Overlay className='fixed inset-0 z-[90] bg-black/40' />
          <Dialog.Content
            className='fixed left-1/2 top-1/2 z-[95] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl focus:outline-none dark:bg-gray-800'
            onOpenAutoFocus={(e) => {
              // Focus the cancel button so Enter never confirms by accident.
              e.preventDefault();
              (
                e.currentTarget as HTMLElement
              )?.querySelector<HTMLButtonElement>('[data-cancel]')?.focus();
            }}
          >
            <Dialog.Title className='text-lg font-bold text-gray-900 dark:text-white'>
              {o?.title ?? 'Are you sure?'}
            </Dialog.Title>
            <Dialog.Description className='mt-2 text-sm text-gray-600 dark:text-gray-300'>
              {o?.message}
            </Dialog.Description>
            <div className='mt-6 flex justify-end gap-2'>
              <button
                type='button'
                data-cancel
                onClick={() => settle(false)}
                className='rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700'
              >
                {o?.cancelLabel ?? 'Cancel'}
              </button>
              <button
                type='button'
                onClick={() => settle(true)}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
                  o?.danger
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {o?.confirmLabel ?? 'Confirm'}
              </button>
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
