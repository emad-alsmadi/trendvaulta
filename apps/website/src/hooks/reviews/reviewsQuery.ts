import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reviewsApi } from '@/lib/api';
import type { Review, ReviewPayload, ReviewUpdatePayload } from '@/types';
import { getAuthToken } from '@/lib/authCookies';

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
    retry: 1,
  });
}

export function useMyReview(productId: string) {
  return useQuery<Review | null>({
    queryKey: REVIEWS_MY_PRODUCT_KEY(productId),
    queryFn: async () => {
      return await reviewsApi.getMyReview(productId);
    },
    staleTime: 30_000,
    retry: 1,
  });
}

export function useMyReviews() {
  const isAuthenticated = typeof window !== 'undefined' && !!getAuthToken();

  return useQuery<Review[]>({
    queryKey: REVIEWS_MY_KEY,
    queryFn: async () => {
      return await reviewsApi.getMyReviews();
    },
    staleTime: 30_000,
    retry: 1,
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
    },
  });
}
