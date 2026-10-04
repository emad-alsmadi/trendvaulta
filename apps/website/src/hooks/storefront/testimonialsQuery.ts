import { useQuery } from '@tanstack/react-query';
import { testimonialsApi, type StorefrontTestimonial } from '@/lib/api';
import type { Locale } from '@/lib/locale';

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

/**
 * Role/quote in the reader's language. Each field falls back to English on
 * its own (same pattern as localizeContent, hooks/storefront/contentQuery.ts)
 * so a half-translated testimonial still reads as a whole quote rather than
 * mixing an empty Arabic field into English copy. Name is not localized.
 */
export function localizeTestimonial(
  testimonial: StorefrontTestimonial,
  locale: Locale,
) {
  const ar = locale === 'ar' ? testimonial.translations?.ar : undefined;
  return {
    role: ar?.role?.trim() || testimonial.role,
    quote: ar?.quote?.trim() || testimonial.quote,
  };
}
