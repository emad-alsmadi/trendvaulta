'use client';

import { useQuery } from '@tanstack/react-query';
import {
  recommendationsApi,
  type RecommendationsQuery,
  type RecommendationsResponse,
} from '@/lib/api';

export function recommendationsKey(params: RecommendationsQuery) {
  return ['recommendations', params] as const;
}

/**
 * GET /api/recommendations
 */
export function useRecommendations(params: RecommendationsQuery = {}) {
  return useQuery<RecommendationsResponse>({
    queryKey: recommendationsKey(params),
    queryFn: () => recommendationsApi.getRecommendations(params),
    staleTime: 60_000,
    retry: 1,
  });
}

/**
 * Home rail: context=home, default limit 8.
 * Pass a `category` (e.g. from recently viewed) to get the API's
 * `similar_category` strategy instead of `recent_active`.
 */
export function useHomeRecommendations(limit = 8, category?: string) {
  return useRecommendations({
    context: 'home',
    limit,
    ...(category ? { category } : {}),
  });
}
