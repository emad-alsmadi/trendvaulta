import { useMutation } from '@tanstack/react-query';
import { couponsApi } from '@/lib/api';

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
  });
}
