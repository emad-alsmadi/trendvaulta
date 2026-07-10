import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reviewsApi } from '@/lib/api';
import type { Review, ReviewPayload, ReviewUpdatePayload } from '@/types';

export const REVIEWS_TEMPLATE_KEY = (templateId: string) => ['reviews', 'template', templateId] as const;
export const REVIEWS_MY_KEY = ['reviews', 'my'] as const;
export const REVIEWS_MY_TEMPLATE_KEY = (templateId: string) => ['reviews', 'my', templateId] as const;

export function useTemplateReviews(templateId: string) {
  return useQuery<Review[]>({
    queryKey: REVIEWS_TEMPLATE_KEY(templateId),
    queryFn: async () => {
      return await reviewsApi.getTemplateReviews(templateId);
    },
    staleTime: 30_000,
    retry: 1,
  });
}

export function useMyReview(templateId: string) {
  return useQuery<Review | null>({
    queryKey: REVIEWS_MY_TEMPLATE_KEY(templateId),
    queryFn: async () => {
      return await reviewsApi.getMyReview(templateId);
    },
    staleTime: 30_000,
    retry: 1,
  });
}

export function useMyReviews() {
  return useQuery<Review[]>({
    queryKey: REVIEWS_MY_KEY,
    queryFn: async () => {
      return await reviewsApi.getMyReviews();
    },
    staleTime: 30_000,
    retry: 1,
  });
}

export function useCreateReviewMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ReviewPayload) => {
      return await reviewsApi.createReview(payload);
    },
    onSuccess: async (data, variables) => {
      // Invalidate template reviews
      await qc.invalidateQueries({ queryKey: REVIEWS_TEMPLATE_KEY(variables.template) });
      // Invalidate my review for this template
      await qc.invalidateQueries({ queryKey: REVIEWS_MY_TEMPLATE_KEY(variables.template) });
      // Invalidate my reviews
      await qc.invalidateQueries({ queryKey: REVIEWS_MY_KEY });
    },
  });
}

export function useUpdateReviewMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ reviewId, payload }: { reviewId: string; payload: ReviewUpdatePayload }) => {
      return await reviewsApi.updateReview(reviewId, payload);
    },
    onSuccess: async (data) => {
      // Invalidate template reviews
      await qc.invalidateQueries({ queryKey: REVIEWS_TEMPLATE_KEY(data.template) });
      // Invalidate my review for this template
      await qc.invalidateQueries({ queryKey: REVIEWS_MY_TEMPLATE_KEY(data.template) });
      // Invalidate my reviews
      await qc.invalidateQueries({ queryKey: REVIEWS_MY_KEY });
    },
  });
}

export function useDeleteReviewMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ reviewId, templateId }: { reviewId: string; templateId: string }) => {
      return await reviewsApi.deleteReview(reviewId);
    },
    onSuccess: async (_, variables) => {
      // Invalidate template reviews
      await qc.invalidateQueries({ queryKey: REVIEWS_TEMPLATE_KEY(variables.templateId) });
      // Invalidate my review for this template
      await qc.invalidateQueries({ queryKey: REVIEWS_MY_TEMPLATE_KEY(variables.templateId) });
      // Invalidate my reviews
      await qc.invalidateQueries({ queryKey: REVIEWS_MY_KEY });
    },
  });
}
