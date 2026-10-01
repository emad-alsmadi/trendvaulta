import type { ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useT } from '../../i18n/I18nProvider';
import { cn } from '../../lib/cn';
import { buttonVariants, text } from './styles';

export type DialogSize = 'confirm' | 'form' | 'editor';

export interface DialogProps {
  open?: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** 'confirm' 480px · 'form' 640px (default) · 'editor' 880px. */
  size?: DialogSize;
  /** While a save is in flight: Escape, outside click and ✕ don't close. */
  busy?: boolean;
  /** Actions pinned under the scrolling body (cancel first, primary last). */
  footer?: ReactNode;
}

const WIDTH: Record<DialogSize, string> = {
  confirm: 'max-w-dialog-confirm',
  form: 'max-w-dialog-form',
  editor: 'max-w-dialog-editor',
};

/**
 * The dialog shell, on Radix Dialog: focus moves in and is trapped, Escape /
 * outside click close it, focus returns to the trigger, and the title labels
 * the dialog. The header stays put, the body scrolls, the footer sticks.
 */
export function Dialog({
  open = true,
  onClose,
  title,
  description,
  children,
  size = 'form',
  busy = false,
  footer,
}: DialogProps) {
  const { t } = useT();

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className='fixed inset-0 z-50 bg-backdrop backdrop-blur-[2px] data-[state=open]:animate-overlay-in' />
        <DialogPrimitive.Content
          // Without a description the title alone labels the dialog.
          {...(description ? {} : { 'aria-describedby': undefined })}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden',
            'rounded-card border border-border bg-card text-card-foreground shadow-overlay focus:outline-none',
            'data-[state=open]:animate-pop-in',
            WIDTH[size],
          )}
        >
          <div className='flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-4'>
            <div className='min-w-0 space-y-1'>
              <DialogPrimitive.Title className={text.section}>
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className={text.secondary}>
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close asChild>
              <button
                type='button'
                disabled={busy}
                aria-label={t('common.close')}
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
                  '-me-2 -mt-1 text-muted-foreground hover:text-foreground',
                )}
              >
                <X aria-hidden='true' />
              </button>
            </DialogPrimitive.Close>
          </div>
          <div className='min-h-0 flex-1 overflow-y-auto px-6 py-5'>
            {children}
          </div>
          {footer && (
            <div className='flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border bg-muted/40 px-6 py-4'>
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
