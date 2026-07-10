import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { wishlistApi } from '@/lib/api';
import type { WishlistItem } from '@/types';

export const WISHLIST_MY_KEY = ['wishlist', 'my'] as const;

export function wishlistCheckKey(templateId: string) {
  return ['wishlist', 'check', templateId] as const;
}

export function useMyWishlist() {
  return useQuery<WishlistItem[]>({
    queryKey: WISHLIST_MY_KEY,
    queryFn: async () => {
      return await wishlistApi.getMyWishlist();
    },
    staleTime: 30_000,
    retry: 1,
  });
}

export function useCheckWishlist(templateId?: string) {
  return useQuery<{ isWishlisted: boolean }>({
    queryKey: templateId ? wishlistCheckKey(templateId) : ['wishlist', 'check', 'missing'],
    queryFn: async () => {
      if (!templateId) throw new Error('Missing template id');
      return await wishlistApi.checkWishlist(templateId);
    },
    enabled: Boolean(templateId),
    staleTime: 30_000,
    retry: 1,
  });
}

export function useAddToWishlistMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      return await wishlistApi.addToWishlist(templateId);
    },
    onMutate: async (templateId) => {
      // Cancel outgoing refetches
      await qc.cancelQueries({ queryKey: WISHLIST_MY_KEY });
      await qc.cancelQueries({ queryKey: wishlistCheckKey(templateId) });

      // Snapshot previous values
      const previousWishlist = qc.getQueryData(WISHLIST_MY_KEY);
      const previousCheck = qc.getQueryData(wishlistCheckKey(templateId));

      // Optimistically update check query
      qc.setQueryData(wishlistCheckKey(templateId), { isWishlisted: true });

      return { previousWishlist, previousCheck };
    },
    onError: (err, templateId, context) => {
      // Rollback on error
      if (context?.previousCheck) {
        qc.setQueryData(wishlistCheckKey(templateId), context.previousCheck);
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
    mutationFn: async (templateId: string) => {
      return await wishlistApi.removeFromWishlist(templateId);
    },
    onMutate: async (templateId) => {
      // Cancel outgoing refetches
      await qc.cancelQueries({ queryKey: WISHLIST_MY_KEY });
      await qc.cancelQueries({ queryKey: wishlistCheckKey(templateId) });

      // Snapshot previous values
      const previousWishlist = qc.getQueryData(WISHLIST_MY_KEY);
      const previousCheck = qc.getQueryData(wishlistCheckKey(templateId));

      // Optimistically update check query
      qc.setQueryData(wishlistCheckKey(templateId), { isWishlisted: false });

      return { previousWishlist, previousCheck };
    },
    onError: (err, templateId, context) => {
      // Rollback on error
      if (context?.previousCheck) {
        qc.setQueryData(wishlistCheckKey(templateId), context.previousCheck);
      }
    },
    onSuccess: async () => {
      // Invalidate wishlist queries to refetch
      await qc.invalidateQueries({ queryKey: WISHLIST_MY_KEY });
    },
  });
}
