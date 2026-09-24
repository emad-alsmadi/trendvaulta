'use client';

import { useMyWishlist } from '@/hooks/wishlist/wishlistQuery';
import { WishlistGrid } from '@/components/page/wishlist/WishlistGrid';
import { WishlistEmptyState } from '@/components/page/wishlist/WishlistEmptyState';
import { Heart } from 'lucide-react';
import { getAuthToken } from '@/lib/authCookies';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';

export default function UserWishlistPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const isAuthenticated = !!getAuthToken();
  const { data: wishlist, isLoading, error } = useMyWishlist();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div role="status" aria-label={t('common.loading')} className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
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
