import { useQuery } from '@tanstack/react-query';
import { testimonialsApi, type StorefrontTestimonial } from '@/lib/api';

export function testimonialsKey() {
  return ['storefront', 'testimonials'] as const;
}

export function useTestimonials() {
  return useQuery<StorefrontTestimonial[]>({
    queryKey: testimonialsKey(),
    queryFn: async () => {
      const res = await testimonialsApi.getTestimonials();
      return Array.isArray(res.results) ? res.results : [];
    },
    staleTime: 60_000,
  });
}
