import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useT } from '../../i18n/I18nProvider';

type Props = {
  /** Usually rendered only while open (`{editing && <FormDialog …>}`). */
  open?: boolean;
  onClose: () => void;
  title: ReactNode;
  /** While a save is in flight: Escape, outside click and ✕ don't close. */
  busy?: boolean;
  /** Tailwind max-width class for the panel. */
  maxWidthClass?: string;
  children: ReactNode;
};

/**
 * Accessible edit/create dialog for the admin CRUD pages (Radix Dialog, like
 * ConfirmDialog): focus moves in and is trapped, Escape / outside click
 * close it, focus returns to the trigger, and the title labels the dialog.
 * Replaces the hand-rolled `role="dialog"` overlays that had none of that.
 */
export function FormDialog({
  open = true,
  onClose,
  title,
  busy = false,
  maxWidthClass = 'max-w-lg',
  children,
}: Props) {
  const { t } = useT();
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className='fixed inset-0 z-50 bg-black/40' />
        <Dialog.Content
          // Forms have no separate description; the title labels the dialog.
          aria-describedby={undefined}
          className={`fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] ${maxWidthClass} -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-white p-6 shadow-xl focus:outline-none dark:bg-gray-800`}
        >
          <div className='mb-4 flex items-center justify-between'>
            <Dialog.Title className='text-xl font-bold text-gray-900 dark:text-white'>
              {title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type='button'
                disabled={busy}
                aria-label={t('common.close')}
                className='rounded p-1 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-700'
              >
                <X className='h-5 w-5' aria-hidden='true' />
              </button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
