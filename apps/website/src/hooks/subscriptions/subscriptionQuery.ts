import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { subscriptionsApi } from '@/lib/api';
import type { SubscriptionRecord } from '@/types';

export const SUBSCRIPTION_ME_KEY = ['subscription', 'me'] as const;
export const SUBSCRIPTION_SETUP_KEY = ['subscription', 'setup-status'] as const;

export function useSubscriptionSetupStatus() {
  return useQuery({
    queryKey: SUBSCRIPTION_SETUP_KEY,
    queryFn: () => subscriptionsApi.getSetupStatus(),
    staleTime: 60_000,
  });
}

export function useSubscription(enabled = true) {
  return useQuery<SubscriptionRecord | null>({
    queryKey: SUBSCRIPTION_ME_KEY,
    queryFn: () => subscriptionsApi.getMine(),
    staleTime: 30_000,
    retry: 1,
    enabled,
  });
}

export function useSubscribeCheckoutMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => subscriptionsApi.createCheckoutSession(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: SUBSCRIPTION_ME_KEY });
    },
  });
}

export function useBillingPortalMutation() {
  return useMutation({
    mutationFn: async () => subscriptionsApi.createPortalSession(),
  });
}
