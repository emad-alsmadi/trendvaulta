'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CategorySidebar } from '@/components/products/CategorySidebar';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Active filter chip count for footer copy */
  activeCount?: number;
};

/**
 * Mobile / tablet PLP filters drawer.
 * Wraps CategorySidebar with sticky header + “Show results” footer.
 */
export function ProductFiltersDrawer({
  open,
  onClose,
  activeCount = 0,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className='fixed inset-0 z-50 lg:hidden'
      role='dialog'
      aria-modal='true'
      aria-labelledby='plp-filters-title'
    >
      <button
        type='button'
        className='absolute inset-0 bg-stone-900/45'
        aria-label='Close filters'
        onClick={onClose}
      />
      <div className='absolute inset-y-0 left-0 flex w-[min(100%,22rem)] flex-col bg-white shadow-2xl'>
        <div className='flex items-center justify-between border-b border-stone-200 px-4 py-3'>
          <div>
            <p
              id='plp-filters-title'
              className='font-extrabold text-stone-900'
            >
              Filters
            </p>
            <p className='text-[11px] font-semibold text-stone-500'>
              {activeCount > 0
                ? `${activeCount} active · some facets are demo-only`
                : 'Refine by category, price, and more'}
            </p>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='rounded-lg p-2 text-stone-600 hover:bg-stone-100'
            aria-label='Close'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        <div className='flex-1 overflow-y-auto p-3'>
          <CategorySidebar
            variant='drawer'
            onAfterNavigate={onClose}
          />
        </div>

        <div className='border-t border-stone-200 bg-white p-3'>
          <Button
            type='button'
            className='w-full'
            onClick={onClose}
          >
            Show results
          </Button>
        </div>
      </div>
    </div>
  );
}
