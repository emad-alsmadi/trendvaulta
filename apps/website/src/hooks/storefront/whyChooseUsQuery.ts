import { useQuery } from '@tanstack/react-query';
import { whyChooseUsApi, type WhyChooseUsItem } from '@/lib/api';

export function whyChooseUsKey() {
  return ['storefront', 'why-choose-us'] as const;
}

export function useWhyChooseUs() {
  return useQuery<WhyChooseUsItem[]>({
    queryKey: whyChooseUsKey(),
    queryFn: async () => {
      const res = await whyChooseUsApi.getWhyChooseUs();
      return Array.isArray(res.items) ? res.items : [];
    },
    staleTime: 60_000,
  });
}
