import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useAdminOrders, useUpdateOrderStatusMutation } from './useAdminOrders';

jest.mock('../lib/api', () => ({
  adminOrdersApi: {
    getOrders: jest.fn(),
    updateOrderStatus: jest.fn(),
  },
}));

import { adminOrdersApi } from '../lib/api';

const mockedGetOrders = jest.mocked(adminOrdersApi.getOrders);
const mockedUpdateOrderStatus = jest.mocked(adminOrdersApi.updateOrderStatus);

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('useAdminOrders', () => {
  it('fetches orders through adminOrdersApi.getOrders with the given params', async () => {
    const response = { data: [{ _id: 'o1', status: 'pending' }], meta: { total: 1, page: 1, pages: 1, limit: 50 } };
    mockedGetOrders.mockResolvedValue(response);

    const { result } = renderHook(() => useAdminOrders({ status: 'pending' }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(adminOrdersApi.getOrders).toHaveBeenCalledWith({ status: 'pending' });
    expect(result.current.data).toEqual(response);
  });

  it('surfaces a failed fetch as an error state, not a silent empty result', async () => {
    mockedGetOrders.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useAdminOrders(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});

describe('useUpdateOrderStatusMutation', () => {
  it('calls adminOrdersApi.updateOrderStatus with the id and new status', async () => {
    mockedUpdateOrderStatus.mockResolvedValue({ _id: 'o1', status: 'shipped' });

    const { result } = renderHook(() => useUpdateOrderStatusMutation(), { wrapper });

    result.current.mutate({ id: 'o1', status: 'shipped' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedUpdateOrderStatus).toHaveBeenCalledWith('o1', 'shipped');
  });
});
