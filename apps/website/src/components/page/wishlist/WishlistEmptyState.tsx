import Link from 'next/link';
import { Button } from '../../ui/Button';
import { Heart } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

export function WishlistEmptyState() {
  const { t } = useTranslation();

  return (
    <div className='flex flex-col items-center justify-center py-16 px-4'>
      <div className='mb-6 rounded-full bg-gradient-to-br from-fuchsia-500/20 via-indigo-500/20 to-cyan-500/20 p-8'>
        <Heart
          className='h-16 w-16 text-indigo-400'
          fill='none'
          strokeWidth={1.5}
        />
      </div>
      <h2 className='mb-2 text-2xl font-extrabold text-indigo-950'>
        {t('wishlist.emptyTitle')}
      </h2>
      <p className='mb-8 text-center text-sm font-semibold text-indigo-900/70 max-w-md'>
        {t('wishlist.emptyDescription')}
      </p>
      <div className='flex flex-col items-center gap-3 sm:flex-row'>
        <Link href='/products'>
          <Button>{t('wishlist.browseCatalog')}</Button>
        </Link>
        <Link href='/offers'>
          <Button variant='outline'>{t('wishlist.seeTodaysOffers')}</Button>
        </Link>
      </div>
    </div>
  );
}
