import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { adminReviewsApi, type AdminReviewsQuery } from '../lib/api';

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
