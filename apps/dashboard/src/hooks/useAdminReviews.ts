import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  adminReviewsApi,
  type AdminReviewsQuery,
  type ReviewStatus,
} from '../lib/api';

export const ADMIN_REVIEWS_KEY = ['admin', 'reviews'] as const;

export function useAdminReviews(params?: AdminReviewsQuery) {
  return useQuery({
    queryKey: [...ADMIN_REVIEWS_KEY, params ?? {}] as const,
    queryFn: () => adminReviewsApi.getReviews(params),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useDeleteAdminReviewMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminReviewsApi.deleteReview(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_REVIEWS_KEY });
    },
  });
}

export function useReplyToReviewMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      adminReviewsApi.replyToReview(id, text),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_REVIEWS_KEY });
    },
  });
}

export function useDeleteReviewReplyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminReviewsApi.deleteReply(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_REVIEWS_KEY });
    },
  });
}

export function useModerateReviewMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReviewStatus }) =>
      adminReviewsApi.moderateReview(id, status),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_REVIEWS_KEY });
    },
  });
}
