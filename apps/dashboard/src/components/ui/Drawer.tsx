import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useT } from '../../i18n/I18nProvider';
import { cn } from '../../lib/cn';
import { buttonVariants, text } from './styles';

/**
 * Slide-over panel for filters or contextual editing, on Radix Dialog (focus
 * trap, Escape, focus return). `end` is the inline-end edge: right in LTR,
 * left in RTL.
 */
export function Drawer({
  open,
  onOpenChange,
  side = 'end',
  title,
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: 'start' | 'end';
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  const { t } = useT();
  return (
    <Dialog.Root
      open={open}
      onOpenChange={onOpenChange}
    >
      <Dialog.Portal>
        <Dialog.Overlay className='fixed inset-0 z-50 bg-backdrop data-[state=open]:animate-overlay-in' />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            'fixed inset-y-0 z-50 flex w-[22rem] max-w-[90vw] flex-col border-border bg-card text-card-foreground shadow-overlay focus:outline-none',
            'data-[state=open]:animate-overlay-in',
            side === 'end' ? 'end-0 border-s' : 'start-0 border-e',
            className,
          )}
        >
          <div className='flex shrink-0 items-center justify-between gap-4 border-b border-border px-5 py-4'>
            <Dialog.Title className={text.section}>{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type='button'
                aria-label={t('common.close')}
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
                  '-me-2 text-muted-foreground hover:text-foreground',
                )}
              >
                <X aria-hidden />
              </button>
            </Dialog.Close>
          </div>
          <div className='min-h-0 flex-1 overflow-y-auto p-5'>{children}</div>
          {footer && (
            <div className='flex shrink-0 items-center justify-end gap-2 border-t border-border bg-muted/40 px-5 py-4'>
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
