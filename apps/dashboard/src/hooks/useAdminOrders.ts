import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminOrdersApi, type AdminOrdersQuery } from '../lib/api';

export const ADMIN_ORDERS_KEY = ['admin', 'orders'] as const;
export const ADMIN_ORDER_DETAIL_KEY = ['admin', 'order'] as const;

export function useAdminOrderById(id?: string) {
  return useQuery({
    queryKey: [...ADMIN_ORDER_DETAIL_KEY, id] as const,
    queryFn: () => adminOrdersApi.getOrderById(id as string),
    enabled: Boolean(id),
    staleTime: 15_000,
  });
}

export function useAdminOrders(params?: AdminOrdersQuery) {
  return useQuery({
    queryKey: [...ADMIN_ORDERS_KEY, params ?? {}] as const,
    queryFn: () => adminOrdersApi.getOrders(params),
    staleTime: 15_000,
  });
}

export function useUpdateOrderStatusMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminOrdersApi.updateOrderStatus(id, status),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_ORDERS_KEY });
    },
  });
}

export function useUpdateOrderTrackingMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, tracking }: { id: string; tracking: any }) =>
      adminOrdersApi.updateOrderTracking(id, tracking),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_ORDER_DETAIL_KEY });
      await qc.invalidateQueries({ queryKey: ADMIN_ORDERS_KEY });
    },
  });
}
