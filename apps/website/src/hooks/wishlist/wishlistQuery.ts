import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { wishlistApi } from '@/lib/api';
import type { WishlistItem } from '@/types';
import { useHasAuthToken } from '@/hooks/auth/useHasAuthToken';

export const WISHLIST_MY_KEY = ['wishlist', 'my'] as const;

export function wishlistCheckKey(productId: string) {
  return ['wishlist', 'check', productId] as const;
}

export function useMyWishlist() {
  const isAuthenticated = useHasAuthToken();

  return useQuery<WishlistItem[]>({
    queryKey: WISHLIST_MY_KEY,
    queryFn: async () => {
      return await wishlistApi.getMyWishlist();
    },
    staleTime: 30_000,
    enabled: isAuthenticated,
  });
}

export function useCheckWishlist(productId?: string) {
  return useQuery<{ isWishlisted: boolean }>({
    queryKey: productId
      ? wishlistCheckKey(productId)
      : ['wishlist', 'check', 'missing'],
    queryFn: async () => {
      if (!productId) throw new Error('Missing product id');
      return await wishlistApi.checkWishlist(productId);
    },
    enabled: Boolean(productId),
    staleTime: 30_000,
  });
}

export function useAddToWishlistMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      return await wishlistApi.addToWishlist(productId);
    },
    onMutate: async (productId) => {
      await qc.cancelQueries({ queryKey: WISHLIST_MY_KEY });
      const previousWishlist = qc.getQueryData<WishlistItem[]>(WISHLIST_MY_KEY);

      // Optimistic placeholder: enough for the button's `isWishlisted`
      // lookup (keyed on product._id) to flip immediately. The real item
      // (with createdAt/updatedAt) arrives on the invalidation refetch.
      if (!previousWishlist?.some((w) => w.product?._id === productId)) {
        qc.setQueryData<WishlistItem[]>(WISHLIST_MY_KEY, (prev) => [
          ...(prev ?? []),
          {
            _id: `optimistic-${productId}`,
            user: '',
            product: { _id: productId } as WishlistItem['product'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);
      }

      return { previousWishlist };
    },
    onError: (_err, _productId, context) => {
      if (context?.previousWishlist) {
        qc.setQueryData(WISHLIST_MY_KEY, context.previousWishlist);
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: WISHLIST_MY_KEY });
    },
  });
}

export function useRemoveFromWishlistMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      return await wishlistApi.removeFromWishlist(productId);
    },
    onMutate: async (productId) => {
      await qc.cancelQueries({ queryKey: WISHLIST_MY_KEY });
      const previousWishlist = qc.getQueryData<WishlistItem[]>(WISHLIST_MY_KEY);

      qc.setQueryData<WishlistItem[]>(
        WISHLIST_MY_KEY,
        (prev) => prev?.filter((w) => w.product?._id !== productId) ?? [],
      );

      return { previousWishlist };
    },
    onError: (_err, _productId, context) => {
      if (context?.previousWishlist) {
        qc.setQueryData(WISHLIST_MY_KEY, context.previousWishlist);
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: WISHLIST_MY_KEY });
    },
  });
}
