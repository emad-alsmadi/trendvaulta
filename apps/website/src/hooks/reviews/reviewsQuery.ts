import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reviewsApi } from '@/lib/api';
import type { Review, ReviewPayload, ReviewUpdatePayload } from '@/types';
import { useHasAuthToken } from '@/hooks/auth/useHasAuthToken';
import { productByIdKey } from '@/hooks/products/productsQuery';

export const REVIEWS_PRODUCT_KEY = (productId: string) =>
  ['reviews', 'product', productId] as const;
export const REVIEWS_MY_KEY = ['reviews', 'my'] as const;
export const REVIEWS_MY_PRODUCT_KEY = (productId: string) =>
  ['reviews', 'my', productId] as const;

export function useProductReviews(productId: string) {
  return useQuery<Review[]>({
    queryKey: REVIEWS_PRODUCT_KEY(productId),
    queryFn: async () => {
      return await reviewsApi.getProductReviews(productId);
    },
    staleTime: 30_000,
  });
}

export function useMyReviews() {
  const isAuthenticated = useHasAuthToken();

  return useQuery<Review[]>({
    queryKey: REVIEWS_MY_KEY,
    queryFn: async () => {
      return await reviewsApi.getMyReviews();
    },
    staleTime: 30_000,
    enabled: isAuthenticated,
  });
}

export function useCreateReviewMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ReviewPayload) => {
      return await reviewsApi.createReview(payload);
    },
    onSuccess: async (data, variables) => {
      // Invalidate product reviews
      await qc.invalidateQueries({
        queryKey: REVIEWS_PRODUCT_KEY(variables.product),
      });
      // Invalidate my review for this product
      await qc.invalidateQueries({
        queryKey: REVIEWS_MY_PRODUCT_KEY(variables.product),
      });
      // Invalidate my reviews
      await qc.invalidateQueries({ queryKey: REVIEWS_MY_KEY });
      // The product's averageRating/reviewCount are stale otherwise — a new
      // review never showed up in the rating until some unrelated refetch.
      await qc.invalidateQueries({
        queryKey: productByIdKey(variables.product),
      });
    },
  });
}

export function useUpdateReviewMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reviewId,
      payload,
    }: {
      reviewId: string;
      payload: ReviewUpdatePayload;
    }) => {
      return await reviewsApi.updateReview(reviewId, payload);
    },
    onSuccess: async (data) => {
      // Invalidate product reviews
      await qc.invalidateQueries({
        queryKey: REVIEWS_PRODUCT_KEY(data.product),
      });
      // Invalidate my review for this product
      await qc.invalidateQueries({
        queryKey: REVIEWS_MY_PRODUCT_KEY(data.product),
      });
      // Invalidate my reviews
      await qc.invalidateQueries({ queryKey: REVIEWS_MY_KEY });
      // A changed rating moves the product's averageRating.
      await qc.invalidateQueries({ queryKey: productByIdKey(data.product) });
    },
  });
}

export function useDeleteReviewMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reviewId,
    }: {
      reviewId: string;
      /** Used by onSuccess to invalidate the product's review queries */
      productId: string;
    }) => {
      return await reviewsApi.deleteReview(reviewId);
    },
    onSuccess: async (_, variables) => {
      // Invalidate product reviews
      await qc.invalidateQueries({
        queryKey: REVIEWS_PRODUCT_KEY(variables.productId),
      });
      // Invalidate my review for this product
      await qc.invalidateQueries({
        queryKey: REVIEWS_MY_PRODUCT_KEY(variables.productId),
      });
      // Invalidate my reviews
      await qc.invalidateQueries({ queryKey: REVIEWS_MY_KEY });
      // A removed review also moves the product's averageRating.
      await qc.invalidateQueries({
        queryKey: productByIdKey(variables.productId),
      });
    },
  });
}
