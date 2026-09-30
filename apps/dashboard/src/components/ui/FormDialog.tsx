import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useT } from '../../i18n/I18nProvider';
import { cn } from '../../lib/cn';
import { buttonVariants, text } from './styles';

type Props = {
  /** Usually rendered only while open (`{editing && <FormDialog …>}`). */
  open?: boolean;
  onClose: () => void;
  title: ReactNode;
  /** While a save is in flight: Escape, outside click and ✕ don't close. */
  busy?: boolean;
  /** 'form' 640px (default) · 'editor' 880px for complex editors. */
  size?: 'form' | 'editor';
  /** Legacy width class; mapped onto the two standard widths. */
  maxWidthClass?: string;
  children: ReactNode;
};

const WIDTH = { form: 'max-w-dialog-form', editor: 'max-w-dialog-editor' } as const;
const LEGACY: Record<string, keyof typeof WIDTH> = {
  'max-w-lg': 'form',
  'max-w-xl': 'form',
  'max-w-2xl': 'form',
  'max-w-3xl': 'editor',
  'max-w-4xl': 'editor',
};

/**
 * Accessible edit/create dialog for the admin CRUD pages (Radix Dialog, like
 * ConfirmDialog): focus moves in and is trapped, Escape / outside click
 * close it, focus returns to the trigger, and the title labels the dialog.
 * Header stays put, the body scrolls, and <FormDialogFooter> sticks to the bottom.
 */
export function FormDialog({
  open = true,
  onClose,
  title,
  busy = false,
  size,
  maxWidthClass,
  children,
}: Props) {
  const { t } = useT();
  const width = WIDTH[size ?? (maxWidthClass ? LEGACY[maxWidthClass] : undefined) ?? 'form'];
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className='fixed inset-0 z-50 bg-backdrop' />
        <Dialog.Content
          // Forms have no separate description; the title labels the dialog.
          aria-describedby={undefined}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col',
            'rounded-card border border-border bg-card text-card-foreground shadow-overlay focus:outline-none',
            width,
          )}
        >
          <div className='flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-4'>
            <Dialog.Title className={text.section}>{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type='button'
                disabled={busy}
                aria-label={t('common.close')}
                className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), '-me-2')}
              >
                <X aria-hidden='true' />
              </button>
            </Dialog.Close>
          </div>
          <div className='min-h-0 flex-1 overflow-y-auto px-6 py-5'>{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Actions row for the end of a FormDialog form: pinned to the bottom of the
 * scrolling body, actions end-aligned (cancel, then the primary action).
 */
export function FormDialogFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'sticky bottom-0 -mx-6 -mb-5 mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-card px-6 py-4',
        className,
      )}
    >
      {children}
    </div>
  );
}
