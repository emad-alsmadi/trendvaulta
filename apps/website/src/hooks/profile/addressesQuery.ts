import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addressesApi } from '@/lib/api';
import { getAuthToken } from '@/lib/authCookies';
import type { Address, AddressPayload } from '@/types';

export const ADDRESSES_QUERY_KEY = ['profile', 'addresses'] as const;

/** Server-enforced cap (apps/api/utils/address.js MAX_ADDRESSES). */
export const MAX_ADDRESSES = 10;

/**
 * The signed-in user's saved addresses. Disabled when there is no token so
 * signed-out visitors (e.g. guest checkout) never fire a 401.
 */
export function useAddresses() {
  const token = getAuthToken();

  return useQuery<Address[]>({
    queryKey: ADDRESSES_QUERY_KEY,
    queryFn: () => addressesApi.list(),
    enabled: Boolean(token),
    staleTime: 30_000,
  });
}

/**
 * Every mutation below invalidates the single addresses key rather than
 * patching the cache by hand: the server owns the default flag, so one
 * write can change several rows (promote/demote) at once.
 */
function useInvalidateAddresses() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY });
}

export function useCreateAddress() {
  const invalidate = useInvalidateAddresses();

  return useMutation({
    mutationFn: (payload: AddressPayload) => addressesApi.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateAddress() {
  const invalidate = useInvalidateAddresses();

  return useMutation({
    mutationFn: ({
      addressId,
      payload,
    }: {
      addressId: string;
      payload: Partial<AddressPayload>;
    }) => addressesApi.update(addressId, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteAddress() {
  const invalidate = useInvalidateAddresses();

  return useMutation({
    mutationFn: (addressId: string) => addressesApi.remove(addressId),
    onSuccess: invalidate,
  });
}

export function useSetDefaultAddress() {
  const invalidate = useInvalidateAddresses();

  return useMutation({
    mutationFn: (addressId: string) => addressesApi.setDefault(addressId),
    onSuccess: invalidate,
  });
}
