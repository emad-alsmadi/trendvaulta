import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { adminSubscribersApi, type SubscriberStatus } from '../lib/api';

export const ADMIN_SUBSCRIBERS_KEY = ['admin', 'subscribers'] as const;

export function useAdminSubscribers(params: {
  page?: number;
  limit?: number;
  status?: SubscriberStatus;
}) {
  return useQuery({
    queryKey: [...ADMIN_SUBSCRIBERS_KEY, params] as const,
    queryFn: () => adminSubscribersApi.getSubscribers(params),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}
