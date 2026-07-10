import { useState } from 'react';
import {
  useCheckWishlist,
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
} from '@/hooks/wishlist/wishlistQuery';
import { getAuthToken } from '@/lib/authCookies';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';

interface WishlistButtonProps {
  templateId: string;
  className?: string;
  variant?: 'icon' | 'button';
}

export function WishlistButton({
  templateId,
  className = '',
  variant = 'icon',
}: WishlistButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const isAuthenticated = !!getAuthToken();
  const { data: checkData, isLoading: checkLoading } = useCheckWishlist(
    isAuthenticated ? templateId : undefined,
  );
  const addToWishlist = useAddToWishlistMutation();
  const removeFromWishlist = useRemoveFromWishlistMutation();
  const [isPending, setIsPending] = useState(false);

  const isWishlisted = checkData?.isWishlisted || false;

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast('Please sign in to save templates to your wishlist', {
        variant: 'error',
      });
      router.push('/auth/login');
      return;
    }

    if (isPending || checkLoading) return;

    setIsPending(true);

    try {
      if (isWishlisted) {
        await removeFromWishlist.mutateAsync(templateId);
        toast('Removed from wishlist', { variant: 'success' });
      } else {
        await addToWishlist.mutateAsync(templateId);
        toast('Added to wishlist', { variant: 'success' });
      }
    } catch (error) {
      toast(
        isWishlisted
          ? 'Failed to remove from wishlist'
          : 'Failed to add to wishlist',
        { variant: 'error' },
      );
    } finally {
      setIsPending(false);
    }
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        disabled={isPending || checkLoading}
        className={`p-2 rounded-full transition-all duration-200 hover:bg-white/20 ${className}`}
        aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='24'
          height='24'
          viewBox='0 0 24 24'
          fill={isWishlisted ? 'currentColor' : 'none'}
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
          className={isWishlisted ? 'text-red-500' : 'text-white'}
        >
          <path d='M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z' />
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending || checkLoading}
      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
        isWishlisted
          ? 'bg-red-500 text-white hover:bg-red-600'
          : 'bg-white/20 text-white hover:bg-white/30'
      } ${className}`}
    >
      <svg
        xmlns='http://www.w3.org/2000/svg'
        width='20'
        height='20'
        viewBox='0 0 24 24'
        fill={isWishlisted ? 'currentColor' : 'none'}
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <path d='M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z' />
      </svg>
      {isWishlisted ? 'Saved' : 'Save'}
    </button>
  );
}
