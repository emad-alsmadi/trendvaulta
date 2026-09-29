import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { contentApi, type Content, type ContentType } from '@/lib/api';

export function contentKey(type: ContentType) {
  return ['content', type] as const;
}

/** Fetch content by type (SHIPPING, RETURNS, PRIVACY, TERMS, STOREFRONT_TRUST) */
export function useContent(type: ContentType) {
  return useQuery<Content | null>({
    queryKey: contentKey(type),
    queryFn: async () => {
      try {
        const res = await contentApi.getContent(type);
        return res.data;
      } catch (err) {
        // 404 = nothing published for this type yet — an empty page, not an error.
        if (axios.isAxiosError(err) && err.response?.status === 404) return null;
        throw err;
      }
    },
    staleTime: 300_000, // 5 minutes - content changes rarely
    retry: 1,
  });
}
