'use client';

import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/TranslationContext';

type DrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Logical side: `start` = left in LTR, right in RTL. */
  side?: 'start' | 'end';
  /** Required for screen readers; hide it visually with `hideTitle`. */
  title: ReactNode;
  hideTitle?: boolean;
  description?: ReactNode;
  /** Sticky bottom area (actions, account links…). */
  footer?: ReactNode;
  /** Width override. Default: half the screen, clamped to 280–380px. */
  className?: string;
  children: ReactNode;
};

const EASE = [0.22, 1, 0.36, 1] as const; // --ease-brand

/**
 * Side sheet: backdrop click / Esc / close button dismiss it, focus is
 * trapped inside and returned to the trigger, page scroll is locked —
 * all from Radix Dialog. Framer Motion animates both enter and exit.
 */
export function Drawer({
  open,
  onOpenChange,
  side = 'start',
  title,
  hideTitle = false,
  description,
  footer,
  className,
  children,
}: DrawerProps) {
  const { dir, t } = useTranslation();
  const reduceMotion = useReducedMotion();
  // Which physical edge the panel hugs, and the off-screen x it slides from.
  const onLeft = (side === 'start') === (dir === 'ltr');
  const offscreen = reduceMotion ? 0 : onLeft ? '-100%' : '100%';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className='fixed inset-0 z-50 bg-stone-950/40 backdrop-blur-[2px]'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: EASE }}
              />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              forceMount
              dir={dir}
              // No description → opt out of Radix's aria-describedby warning.
              {...(description ? {} : { 'aria-describedby': undefined })}
            >
              <motion.div
                className={cn(
                  'fixed inset-y-0 z-50 flex w-[clamp(280px,50vw,380px)] max-w-[calc(100vw-3rem)] flex-col bg-surface text-ink shadow-overlay focus:outline-none',
                  onLeft ? 'left-0' : 'right-0',
                  className,
                )}
                initial={{ x: offscreen, opacity: reduceMotion ? 0 : 1 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{
                  x: offscreen,
                  opacity: reduceMotion ? 0 : 1,
                  transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
                }}
                transition={{ duration: 0.32, ease: EASE }}
              >
                <div className='flex items-start justify-between gap-3 border-b border-line px-5 py-4'>
                  <div className={cn('min-w-0', hideTitle && 'sr-only')}>
                    <Dialog.Title className='text-heading text-ink'>{title}</Dialog.Title>
                    {description && (
                      <Dialog.Description className='mt-0.5 text-sm text-ink-muted'>
                        {description}
                      </Dialog.Description>
                    )}
                  </div>
                  <Dialog.Close
                    className='-me-2 ms-auto inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-ink-muted transition-colors duration-(--dur-fast) hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'
                    aria-label={t('confirmDialog.close')}
                  >
                    <X className='h-5 w-5' aria-hidden />
                  </Dialog.Close>
                </div>

                <div className='flex-1 overflow-y-auto overscroll-contain px-3 py-3'>{children}</div>

                {footer && <div className='border-t border-line px-5 py-4'>{footer}</div>}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

export const DrawerClose = Dialog.Close;
