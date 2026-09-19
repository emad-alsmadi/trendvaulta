import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminTestimonialsApi, type TestimonialPayload } from '../lib/api';

export const ADMIN_TESTIMONIALS_KEY = ['admin', 'testimonials'] as const;

export function useAdminTestimonials(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: [...ADMIN_TESTIMONIALS_KEY, params ?? {}] as const,
    queryFn: () => adminTestimonialsApi.getTestimonials(params),
    staleTime: 30_000,
  });
}

export function useCreateTestimonialMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: TestimonialPayload) => adminTestimonialsApi.createTestimonial(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_TESTIMONIALS_KEY });
    },
  });
}

export function useUpdateTestimonialMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<TestimonialPayload>;
    }) => adminTestimonialsApi.updateTestimonial(id, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_TESTIMONIALS_KEY });
    },
  });
}

export function useDeleteTestimonialMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminTestimonialsApi.deleteTestimonial(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_TESTIMONIALS_KEY });
    },
  });
}
