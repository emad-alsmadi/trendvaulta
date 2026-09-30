import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { ordersApi, type GuestOrder, type OrderCheckoutPayload } from '@/lib/api';
import type { Order, ReturnRequestPayload } from '@/types';
import { useHasAuthToken } from '@/hooks/auth/useHasAuthToken';

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
  const isAuthenticated = useHasAuthToken();

  return useQuery<Order[]>({
    queryKey: ORDERS_MY_KEY,
    queryFn: async () => {
      return await ordersApi.getMyOrders();
    },
    staleTime: 30_000,
    enabled: isAuthenticated,
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
  });
}

/** A guest order by its token (guest order page, guest checkout success). */
export function useGuestOrder(orderId?: string | null, token?: string | null) {
  return useQuery<GuestOrder>({
    queryKey: ['orders', 'guest', orderId ?? 'missing'],
    queryFn: async () => {
      if (!orderId || !token) throw new Error('Missing order link');
      return await ordersApi.getGuestOrder(orderId, token);
    },
    enabled: Boolean(orderId && token),
    staleTime: 30_000,
    retry: 1,
  });
}

export function useCancelOrderMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ordersApi.cancelOrder(id),
    onSuccess: async (result, id) => {
      // The response is the updated order — show it at once, then refetch
      // the list so its badge changes too.
      qc.setQueryData(orderByIdKey(id), result);
      await qc.invalidateQueries({ queryKey: ORDERS_MY_KEY });
    },
  });
}

export function useRequestReturnMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReturnRequestPayload }) =>
      ordersApi.requestReturn(id, payload),
    onSuccess: async (_returnRequest, { id }) => {
      // Refetch rather than patch: canReturn flips server-side too.
      await qc.invalidateQueries({ queryKey: orderByIdKey(id) });
      await qc.invalidateQueries({ queryKey: ORDERS_MY_KEY });
    },
  });
}
