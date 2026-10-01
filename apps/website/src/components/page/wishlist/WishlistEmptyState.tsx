import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

export function WishlistEmptyState() {
  const { t } = useTranslation();

  return (
    <div className='flex flex-col items-center justify-center px-5 py-14 text-center sm:py-16'>
      <div className='flex h-14 w-14 items-center justify-center rounded-full bg-stone-200/60 text-ink'>
        <Heart className='h-6 w-6' fill='none' strokeWidth={1.5} aria-hidden />
      </div>
      <h2 className='mt-5 text-heading text-ink'>{t('wishlist.emptyTitle')}</h2>
      <p className='mt-2 max-w-md text-sm text-ink-muted'>
        {t('wishlist.emptyDescription')}
      </p>
      <div className='mt-7 flex flex-col items-center gap-3 sm:flex-row'>
        <Link
          href='/products'
          className='inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-sm font-bold text-white shadow-soft transition-colors hover:bg-stone-800'
        >
          {t('wishlist.browseCatalog')}
        </Link>
        <Link
          href='/offers'
          className='inline-flex h-12 items-center justify-center rounded-full bg-stone-200/60 px-7 text-sm font-bold text-ink transition-colors hover:bg-stone-200'
        >
          {t('wishlist.seeTodaysOffers')}
        </Link>
      </div>
    </div>
  );
}
