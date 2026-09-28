import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminShippingZonesApi, type ShippingZonePayload } from '../lib/api';

export const ADMIN_SHIPPING_ZONES_KEY = ['admin', 'shipping-zones'] as const;

export function useAdminShippingZones(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: [...ADMIN_SHIPPING_ZONES_KEY, params ?? {}] as const,
    queryFn: () => adminShippingZonesApi.getZones(params),
    staleTime: 30_000,
  });
}

export function useCreateShippingZoneMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ShippingZonePayload) =>
      adminShippingZonesApi.createZone(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_SHIPPING_ZONES_KEY });
    },
  });
}

export function useUpdateShippingZoneMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ShippingZonePayload }) =>
      adminShippingZonesApi.updateZone(id, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_SHIPPING_ZONES_KEY });
    },
  });
}

export function useDeleteShippingZoneMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminShippingZonesApi.deleteZone(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ADMIN_SHIPPING_ZONES_KEY });
    },
  });
}
