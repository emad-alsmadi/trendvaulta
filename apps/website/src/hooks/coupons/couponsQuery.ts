import { useQuery } from '@tanstack/react-query';
import { couponsApi } from '@/lib/api';

export function couponValidationKey(code: string, orderAmount: number) {
  return ['coupons', 'validate', code, orderAmount] as const;
}

export function couponByCodeKey(code: string) {
  return ['coupons', 'byCode', code] as const;
}

/**
 * Manual-only: validation is a rate-limited POST, so it must run when the
 * shopper presses "Apply" (`refetch()`), never on every keystroke.
 */
export function useValidateCoupon(code: string, orderAmount: number) {
  return useQuery({
    queryKey: couponValidationKey(code, orderAmount),
    queryFn: async () => {
      return await couponsApi.validateCoupon(code, orderAmount);
    },
    enabled: false,
    staleTime: 30_000,
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
