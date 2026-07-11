'use client';

import { useMyWishlist } from '@/hooks/wishlist/wishlistQuery';
import { WishlistGrid } from '@/components/page/wishlist/WishlistGrid';
import { WishlistEmptyState } from '@/components/page/wishlist/WishlistEmptyState';
import { Loader2, Heart } from 'lucide-react';
import { getAuthToken } from '@/lib/authCookies';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function WishlistPage() {
  const router = useRouter();
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
      <div className='flex items-center justify-center py-16'>
        <Loader2 className='h-8 w-8 animate-spin text-fuchsia-600' />
      </div>
    );
  }

  if (error) {
    return (
      <div className='rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-900'>
        <div className='text-lg font-extrabold'>Error loading wishlist</div>
        <div className='mt-2 text-sm font-semibold'>
          {(error as any)?.message || 'Please try again later.'}
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-3'>
        <div className='rounded-full bg-gradient-to-br from-fuchsia-500/20 via-indigo-500/20 to-cyan-500/20 p-3'>
          <Heart
            className='h-6 w-6 text-indigo-600'
            fill='none'
            strokeWidth={2}
          />
        </div>
        <div>
          <h1 className='text-3xl font-extrabold tracking-tight text-indigo-950'>
            My Wishlist
          </h1>
          <p className='text-sm font-semibold text-indigo-900/70'>
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
