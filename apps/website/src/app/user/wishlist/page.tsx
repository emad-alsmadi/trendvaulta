'use client';

import { useMyWishlist } from '@/hooks/wishlist/wishlistQuery';
import { WishlistGrid } from '@/components/page/wishlist/WishlistGrid';
import { WishlistEmptyState } from '@/components/page/wishlist/WishlistEmptyState';
import { Heart } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeaderSkeleton, ProductGridSkeleton } from '@/components/ui/Skeleton';

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
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        {t('userArea.wishlist.loadError')}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-2xl bg-fuchsia-100 p-3">
          <Heart
            className="h-6 w-6 text-fuchsia-600"
            fill="currentColor"
            strokeWidth={2}
          />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-indigo-950">
            {t('userArea.wishlist.title')}
          </h1>
          <p className="text-sm font-semibold text-indigo-950/70">
            {t('userArea.wishlist.savedCount', { count: wishlist?.length || 0 })}
          </p>
        </div>
      </div>

      {wishlist && wishlist.length > 0 ? (
        <WishlistGrid items={wishlist} />
      ) : (
        <WishlistEmptyState />
      )}
    </>
  );
}
