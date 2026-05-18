import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { ordersApi, type OrderCheckoutPayload } from '@/lib/api';
import type { Order } from '@/types';

export const ORDERS_MY_KEY = ['orders', 'my'] as const;

export function orderByIdKey(id: string) {
  return ['orders', 'byId', id] as const;
}

export function useCreateOrderMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: OrderCheckoutPayload) => {
      return await ordersApi.createOrder(payload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ORDERS_MY_KEY });
    },
  });
}

export function useMyOrders() {
  return useQuery<Order[]>({
    queryKey: ORDERS_MY_KEY,
    queryFn: async () => {
      return await ordersApi.getMyOrders();
    },
    staleTime: 30_000,
    retry: 1,
    placeholderData: keepPreviousData,
  });
}

export function useOrderById(id?: string) {
  return useQuery<Order>({
    queryKey: id ? orderByIdKey(id) : ['orders', 'byId', 'missing'],
    queryFn: async () => {
      if (!id) throw new Error('Missing order id');
      return await ordersApi.getOrderById(id);
    },
    enabled: Boolean(id),
    staleTime: 30_000,
    retry: 1,
  });
}
