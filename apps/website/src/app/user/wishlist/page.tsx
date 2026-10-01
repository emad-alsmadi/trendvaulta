'use client';

import { useMyWishlist } from '@/hooks/wishlist/wishlistQuery';
import { WishlistGrid } from '@/components/page/wishlist/WishlistGrid';
import { WishlistEmptyState } from '@/components/page/wishlist/WishlistEmptyState';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeaderSkeleton, ProductGridSkeleton } from '@/components/ui/Skeleton';
import { PANEL, PILL, UserPageHeader } from '../UserPage';

export default function UserWishlistPage() {
  const { t } = useTranslation();
  const { data: wishlist, isLoading, error } = useMyWishlist();

  if (isLoading) {
    return (
      <div>
        <PageHeaderSkeleton className='mb-8' />
        <ProductGridSkeleton
          count={4}
          className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${PANEL} text-sm font-medium text-rose-700`}>
        {t('userArea.wishlist.loadError')}
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <UserPageHeader
        title={t('userArea.wishlist.title')}
        action={
          <span className={PILL}>
            {t('userArea.wishlist.savedCount', { count: wishlist?.length || 0 })}
          </span>
        }
      />

      {wishlist && wishlist.length > 0 ? (
        <WishlistGrid items={wishlist} />
      ) : (
        <WishlistEmptyState />
      )}
    </div>
  );
}
