import { useMutation, useQuery } from '@tanstack/react-query';
import { couponsApi } from '@/lib/api';

export function couponByCodeKey(code: string) {
  return ['coupons', 'byCode', code] as const;
}

/**
 * Coupon validation is a rate-limited POST — use useMutation so it only runs
 * when the shopper explicitly presses "Apply". This avoids accidental
 * background refetches that would consume rate-limit budget.
 */
export function useValidateCoupon() {
  return useMutation({
    mutationFn: async ({ code, orderAmount }: { code: string; orderAmount: number }) => {
      return await couponsApi.validateCoupon(code, orderAmount);
    },
    retry: 1,
  });
}

export function useCouponByCode(code: string) {
  return useQuery({
    queryKey: couponByCodeKey(code),
    queryFn: async () => {
      return await couponsApi.getCouponByCode(code);
    },
    enabled: Boolean(code),
    staleTime: 60_000,
    retry: 1,
  });
}
