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
      // Cancel outgoing refetches
      await qc.cancelQueries({ queryKey: WISHLIST_MY_KEY });
      await qc.cancelQueries({ queryKey: wishlistCheckKey(productId) });

      // Snapshot previous values
      const previousWishlist = qc.getQueryData(WISHLIST_MY_KEY);
      const previousCheck = qc.getQueryData(wishlistCheckKey(productId));

      // Optimistically update check query
      qc.setQueryData(wishlistCheckKey(productId), { isWishlisted: true });

      return { previousWishlist, previousCheck };
    },
    onError: (err, productId, context) => {
      // Rollback on error
      if (context?.previousCheck) {
        qc.setQueryData(wishlistCheckKey(productId), context.previousCheck);
      }
    },
    onSuccess: async () => {
      // Invalidate wishlist queries to refetch
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
      // Cancel outgoing refetches
      await qc.cancelQueries({ queryKey: WISHLIST_MY_KEY });
      await qc.cancelQueries({ queryKey: wishlistCheckKey(productId) });

      // Snapshot previous values
      const previousWishlist = qc.getQueryData(WISHLIST_MY_KEY);
      const previousCheck = qc.getQueryData(wishlistCheckKey(productId));

      // Optimistically update check query
      qc.setQueryData(wishlistCheckKey(productId), { isWishlisted: false });

      return { previousWishlist, previousCheck };
    },
    onError: (err, productId, context) => {
      // Rollback on error
      if (context?.previousCheck) {
        qc.setQueryData(wishlistCheckKey(productId), context.previousCheck);
      }
    },
    onSuccess: async () => {
      // Invalidate wishlist queries to refetch
      await qc.invalidateQueries({ queryKey: WISHLIST_MY_KEY });
    },
  });
}
