'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CategorySidebar } from '@/components/products/CategorySidebar';
import { useTranslation } from '@/contexts/TranslationContext';
import type { ProductFacets } from '@/types';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Active filter chip count for footer copy */
  activeCount?: number;
  /** Facet counts from the products query (passed through to the sidebar) */
  facets?: ProductFacets;
};

/**
 * Mobile / tablet PLP filters drawer.
 * Wraps CategorySidebar with sticky header + “Show results” footer.
 * Radix Dialog (like ConfirmProvider) moves focus in, traps it, closes on
 * Escape / outside click, locks page scroll and returns focus to the
 * "Filters" button — the hand-rolled version only did Escape and scroll.
 */
export function ProductFiltersDrawer({
  open,
  onClose,
  activeCount = 0,
  facets,
}: Props) {
  const { t } = useTranslation();

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className='fixed inset-0 z-50 bg-stone-900/45 lg:hidden' />
        <Dialog.Content className='fixed inset-y-0 start-0 z-50 flex w-[min(100%,22rem)] flex-col bg-white shadow-2xl focus:outline-none lg:hidden'>
          <div className='flex items-center justify-between border-b border-stone-200 px-4 py-3'>
            <div>
              <Dialog.Title className='font-extrabold text-stone-900'>
                {t('catalog.filters')}
              </Dialog.Title>
              <Dialog.Description className='text-[11px] font-semibold text-stone-500'>
                {activeCount > 0
                  ? t('catalog.drawer.activeCount', { count: activeCount })
                  : t('catalog.drawer.hint')}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type='button'
                className='rounded-lg p-2 text-stone-600 hover:bg-stone-100'
                aria-label={t('catalog.drawer.close')}
              >
                <X className='h-5 w-5' aria-hidden />
              </button>
            </Dialog.Close>
          </div>

          <div className='flex-1 overflow-y-auto p-3'>
            <CategorySidebar
              variant='drawer'
              onAfterNavigate={onClose}
              facets={facets}
            />
          </div>

          <div className='border-t border-stone-200 bg-white p-3'>
            <Button
              type='button'
              className='w-full'
              onClick={onClose}
            >
              {t('catalog.drawer.showResults')}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
