import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { contentApi, type Content, type ContentType } from '@/lib/api';
import type { Locale } from '@/lib/locale';

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
  });
}

/**
 * Title/body in the reader's language. Each field falls back to English on
 * its own (same pattern as getHeroSlidesFromHome, hooks/storefront/homeQuery.ts)
 * so a half-translated content row still reads as a whole page rather than
 * mixing an empty Arabic field into English copy.
 */
export function localizeContent(content: Content, locale: Locale) {
  const ar = locale === 'ar' ? content.translations?.ar : undefined;
  return {
    title: ar?.title?.trim() || content.title,
    body: ar?.body?.trim() || content.body,
  };
}
