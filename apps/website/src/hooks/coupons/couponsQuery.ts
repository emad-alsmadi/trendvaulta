import { useQuery } from '@tanstack/react-query';
import { couponsApi } from '@/lib/api';

export function couponValidationKey(code: string, orderAmount: number) {
  return ['coupons', 'validate', code, orderAmount] as const;
}

export function couponByCodeKey(code: string) {
  return ['coupons', 'byCode', code] as const;
}

export function useValidateCoupon(code: string, orderAmount: number) {
  return useQuery({
    queryKey: couponValidationKey(code, orderAmount),
    queryFn: async () => {
      return await couponsApi.validateCoupon(code, orderAmount);
    },
    enabled: Boolean(code) && orderAmount > 0,
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
