import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  adminOrdersApi,
  type AdminOrdersQuery,
  type OrderTrackingPayload,
  type ReturnUpdatePayload,
} from '../lib/api';

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
    // Paging and sorting should redraw the table in place; without this the
    // rows blank out on every page change and the layout jumps.
    placeholderData: keepPreviousData,
  });
}

export function useUpdateOrderStatusMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminOrdersApi.updateOrderStatus(id, status),
    onSuccess: async () => {
      // The detail page reads its own key; without this it keeps showing the
      // old status (and old allowed transitions) after a change.
      await qc.invalidateQueries({ queryKey: ADMIN_ORDER_DETAIL_KEY });
      await qc.invalidateQueries({ queryKey: ADMIN_ORDERS_KEY });
    },
  });
}

export function useUpdateOrderTrackingMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      tracking,
    }: {
      id: string;
      tracking: OrderTrackingPayload;
    }) =>
      adminOrdersApi.updateOrderTracking(id, tracking),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_ORDER_DETAIL_KEY });
      await qc.invalidateQueries({ queryKey: ADMIN_ORDERS_KEY });
    },
  });
}

export function useUpdateReturnMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReturnUpdatePayload }) =>
      adminOrdersApi.updateReturn(id, payload),
    onSuccess: async () => {
      // A refund also changes the order's payment totals and status.
      await qc.invalidateQueries({ queryKey: ADMIN_ORDER_DETAIL_KEY });
      await qc.invalidateQueries({ queryKey: ADMIN_ORDERS_KEY });
    },
  });
}
