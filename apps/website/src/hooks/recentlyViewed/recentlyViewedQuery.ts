'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { recentlyViewedApi } from '@/lib/api';
import { getAuthToken } from '@/lib/authCookies';
import {
  getRecentlyViewed,
  productToRecentlyViewedItem,
  type RecentlyViewedItem,
} from '@/lib/recentlyViewed';

export const RECENTLY_VIEWED_KEY = ['recentlyViewed', 'me'] as const;

/**
 * Auth users: GET /api/me/recently-viewed.
 * Anonymous: localStorage demo/local fallback.
 */
export function useRecentlyViewed() {
  const isAuthenticated =
    typeof window !== 'undefined' && !!getAuthToken();

  const query = useQuery({
    queryKey: RECENTLY_VIEWED_KEY,
    queryFn: () => recentlyViewedApi.getRecentlyViewed(),
    enabled: isAuthenticated,
    staleTime: 30_000,
    retry: 1,
  });

  // getRecentlyViewed() reads localStorage (SSR-safe, returns [] on the
  // server) — read it once via a lazy initializer instead of committing an
  // empty array then correcting it in an effect. isAuthenticated doesn't
  // change without a full page navigation (login/logout redirect), so a
  // one-time read on mount is sufficient.
  const [localItems] = useState<RecentlyViewedItem[]>(() =>
    isAuthenticated ? [] : getRecentlyViewed(),
  );

  if (isAuthenticated) {
    // Synthesize a decreasing viewedAt for display ordering only (the API
    // doesn't return per-item timestamps). query.dataUpdatedAt is a stable
    // value from the query cache rather than calling the impure Date.now()
    // directly during render.
    const items = (query.data ?? []).map((product, index) =>
      productToRecentlyViewedItem(product, query.dataUpdatedAt - index),
    );
    return {
      items,
      isLoading: query.isLoading,
      source: 'api' as const,
    };
  }

  return {
    items: localItems,
    isLoading: false,
    source: 'local' as const,
  };
}
