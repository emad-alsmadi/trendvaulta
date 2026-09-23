import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { adminStatsApi } from '../lib/api';

export const ADMIN_STATS_KEY = ['admin', 'stats'] as const;

export const ADMIN_ANALYTICS_KEY = ['admin', 'analytics'] as const;
export const ADMIN_LOW_STOCK_KEY = ['admin', 'low-stock'] as const;

export function useAdminStats() {
  return useQuery({
    queryKey: ADMIN_STATS_KEY,
    queryFn: () => adminStatsApi.getStats(),
    staleTime: 15_000,
  });
}

export function useAdminAnalytics(days: number) {
  return useQuery({
    queryKey: [...ADMIN_ANALYTICS_KEY, days] as const,
    queryFn: () => adminStatsApi.getAnalytics(days),
    staleTime: 60_000,
    // Switching the range should redraw the chart, not blank it out.
    placeholderData: keepPreviousData,
  });
}

export function useAdminLowStock(threshold?: number) {
  return useQuery({
    queryKey: [...ADMIN_LOW_STOCK_KEY, threshold ?? 'default'] as const,
    queryFn: () => adminStatsApi.getLowStock(threshold),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}
