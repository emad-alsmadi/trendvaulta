'use client';

import { useMyWishlist } from '@/hooks/wishlist/wishlistQuery';
import { WishlistGrid } from '@/components/page/wishlist/WishlistGrid';
import { WishlistEmptyState } from '@/components/page/wishlist/WishlistEmptyState';
import { Loader2, Heart } from 'lucide-react';
import { getAuthToken } from '@/lib/authCookies';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

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
      <div className='min-h-screen bg-gray-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          <div className='animate-pulse'>
            <div className='h-8 bg-gray-200 rounded w-48 mb-8'></div>
            <div className='h-64 bg-gray-200 rounded'></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          <div className='bg-red-50 border border-red-200 rounded-lg p-4 text-red-800'>
            Error loading wishlist
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Breadcrumb */}
        <nav className='flex items-center gap-2 text-sm text-gray-600 mb-8'>
          <Link
            href='/'
            className='hover:text-fuchsia-600'
          >
            Home
          </Link>
          <span>/</span>
          <span className='text-gray-900'>My Wishlist</span>
        </nav>

        <div className='flex gap-8'>
          {/* Sidebar */}
          <aside className='w-64 flex-shrink-0 hidden lg:block'>
            <div className='bg-white rounded-lg border border-gray-200 p-4 sticky top-8'>
              <h3 className='font-bold text-gray-900 mb-4'>Account</h3>
              <nav className='space-y-1'>
                <Link
                  href='/profile'
                  className='block px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-fuchsia-600 transition'
                >
                  Profile
                </Link>
                <Link
                  href='/orders'
                  className='block px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-fuchsia-600 transition'
                >
                  Orders
                </Link>
                <Link
                  href='/downloads'
                  className='block px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-fuchsia-600 transition'
                >
                  Downloads
                </Link>
                <Link
                  href='/wishlist'
                  className='block px-4 py-2 rounded-lg bg-fuchsia-50 text-fuchsia-700 font-semibold'
                >
                  Wishlist
                </Link>
                <Link
                  href='/reviews'
                  className='block px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-fuchsia-600 transition'
                >
                  Reviews
                </Link>
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <div className='flex-1'>
            <div className='flex items-center gap-3 mb-6'>
              <div className='rounded-full bg-fuchsia-100 p-3'>
                <Heart
                  className='h-6 w-6 text-fuchsia-600'
                  fill='currentColor'
                  strokeWidth={2}
                />
              </div>
              <div>
                <h1 className='text-2xl font-bold text-gray-900'>
                  My Wishlist
                </h1>
                <p className='text-sm text-gray-600'>
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
        </div>
      </div>
    </div>
  );
}
