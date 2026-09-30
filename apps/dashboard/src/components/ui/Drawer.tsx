import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { IconButton } from './IconButton';
import { text } from './styles';

/**
 * Drawer/slide-over panel for filters, mobile navigation, or contextual editing.
 * Built on Radix Dialog with side positioning.
 */
export function Drawer({
  open,
  onOpenChange,
  side = 'right',
  title,
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: 'left' | 'right' | 'top' | 'bottom';
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  const sideClasses = {
    left: 'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left-full data-[state=open]:slide-in-from-left-full',
    right:
      'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full',
    top: 'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top-full data-[state=open]:slide-in-from-top-full',
    bottom:
      'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom-full data-[state=open]:slide-in-from-bottom-full',
  };

  const sizeClasses = {
    left: 'h-full w-80 max-w-[90vw]',
    right: 'h-full w-80 max-w-[90vw]',
    top: 'w-full h-auto max-h-[50vh]',
    bottom: 'w-full h-auto max-h-[50vh]',
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={onOpenChange}
    >
      <Dialog.Portal>
        <Dialog.Overlay className='fixed inset-0 z-[90] bg-backdrop data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0' />
        <Dialog.Content
          className={cn(
            'fixed z-[95] rounded-card border border-border bg-card shadow-overlay',
            sizeClasses[side],
            sideClasses[side],
            'transition-all duration-300 ease-out',
            className,
          )}
        >
          {title && (
            <div className='flex items-center justify-between border-b border-border p-4'>
              <Dialog.Title className={text.section}>{title}</Dialog.Title>
              <Dialog.Close asChild>
                <IconButton
                  icon={<X aria-hidden />}
                  aria-label='Close'
                  variant='ghost'
                  size='sm'
                />
              </Dialog.Close>
            </div>
          )}
          <div className='flex-1 overflow-y-auto p-4'>{children}</div>
          {footer && (
            <div className='flex items-center justify-end gap-2 border-t border-border p-4'>
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Drawer trigger button.
 */
export function DrawerTrigger({
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof Dialog.Trigger>) {
  return (
    <Dialog.Trigger
      asChild={asChild}
      {...props}
    >
      {children}
    </Dialog.Trigger>
  );
}

/**
 * Drawer close button.
 */
export function DrawerClose({
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof Dialog.Close>) {
  return (
    <Dialog.Close
      asChild={asChild}
      {...props}
    >
      {children}
    </Dialog.Close>
  );
}
