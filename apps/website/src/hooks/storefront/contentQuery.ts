import { useQuery } from '@tanstack/react-query';
import { contentApi, type ContentType } from '@/lib/api';

export function contentKey(type: ContentType) {
  return ['content', type] as const;
}

/** Fetch content by type (SHIPPING, RETURNS, PRIVACY, TERMS, STOREFRONT_TRUST) */
export function useContent(type: ContentType) {
  return useQuery({
    queryKey: contentKey(type),
    queryFn: async () => {
      const res = await contentApi.getContent(type);
      return res.data;
    },
    staleTime: 300_000, // 5 minutes - content changes rarely
    retry: 1,
  });
}
