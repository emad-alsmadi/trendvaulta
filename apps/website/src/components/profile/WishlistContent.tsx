'use client';

import { useMyWishlist } from '@/hooks/wishlist/wishlistQuery';
import { WishlistGrid } from '@/components/page/wishlist/WishlistGrid';
import { WishlistEmptyState } from '@/components/page/wishlist/WishlistEmptyState';
import { Heart } from 'lucide-react';

export default function WishlistContent() {
  const { data: wishlist, isLoading, error } = useMyWishlist();

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        Error loading wishlist
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-full bg-fuchsia-100 p-3">
          <Heart
            className="h-6 w-6 text-fuchsia-600"
            fill="currentColor"
            strokeWidth={2}
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Wishlist</h1>
          <p className="text-sm text-gray-600">
            {wishlist?.length || 0}{' '}
            {wishlist?.length === 1 ? 'template' : 'templates'} saved
          </p>
        </div>
      </div>

      {wishlist && wishlist.length > 0 ? (
        <WishlistGrid items={wishlist} />
      ) : (
        <WishlistEmptyState />
      )}
    </div>
  );
}
