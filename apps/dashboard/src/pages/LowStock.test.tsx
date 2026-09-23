import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

jest.mock('../lib/api', () => ({
  adminStatsApi: { getLowStock: jest.fn(), getStats: jest.fn(), getAnalytics: jest.fn() },
  adminProductsApi: { updateProduct: jest.fn() },
  adminBrandsApi: { getBrands: jest.fn() },
  errorMessage: (_e: unknown, fallback: string) => fallback,
}));

jest.mock('../hooks/usePermissions', () => ({
  usePermissions: () => ({ can: () => true }),
}));

import { adminStatsApi, adminProductsApi } from '../lib/api';
import LowStock from './LowStock';
import { ToastProvider } from '../components/ui/Toast';

const mockedGetLowStock = jest.mocked(adminStatsApi.getLowStock);
const mockedUpdateProduct = jest.mocked(adminProductsApi.updateProduct);

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

const PRODUCTS = [
  {
    _id: 'p-gone',
    title: 'Velvet Matte Lipstick',
    price: 24,
    stock: 0,
    sku: 'VML-01',
    category: 'makeup',
    brand: { _id: 'b1', name: 'Aurelia' },
  },
  {
    _id: 'p-low',
    title: 'Hydrating Serum',
    price: 48,
    stock: 3,
    category: 'skincare',
    brand: { _id: 'b2', name: 'Lumen' },
  },
];

beforeEach(() => {
  jest.resetAllMocks();
  mockedGetLowStock.mockResolvedValue({ data: PRODUCTS, threshold: 5 });
});

describe('LowStock page', () => {
  it('lists the products and separates out-of-stock from merely low', async () => {
    render(<LowStock />, { wrapper: Wrapper });

    expect(await screen.findByText('Velvet Matte Lipstick')).toBeInTheDocument();
    expect(screen.getByText('Hydrating Serum')).toBeInTheDocument();
    expect(screen.getByText('3 left')).toBeInTheDocument();
    expect(screen.getByText('Aurelia · VML-01')).toBeInTheDocument();

    // "Out of stock" is both a row badge and a summary tile label.
    const outOfStockRow = screen
      .getByText('Velvet Matte Lipstick')
      .closest('tr') as HTMLElement;
    expect(outOfStockRow).toHaveTextContent('Out of stock');
  });

  it('requests a new threshold when the range is changed', async () => {
    render(<LowStock />, { wrapper: Wrapper });
    await screen.findByText('Hydrating Serum');

    await userEvent.click(screen.getByRole('button', { name: '≤ 25' }));

    await waitFor(() => expect(mockedGetLowStock).toHaveBeenCalledWith(25));
  });

  it('keeps Save disabled until the quantity actually changes', async () => {
    render(<LowStock />, { wrapper: Wrapper });
    await screen.findByText('Hydrating Serum');

    const input = screen.getByLabelText('New stock for Hydrating Serum');
    const row = input.closest('tr') as HTMLElement;
    const save = row.querySelector('button') as HTMLButtonElement;

    expect(save).toBeDisabled();

    await userEvent.clear(input);
    await userEvent.type(input, '40');
    expect(save).toBeEnabled();
  });

  it('saves the restocked quantity as a number, not a string', async () => {
    mockedUpdateProduct.mockResolvedValue({
      _id: 'p-low',
      title: 'Hydrating Serum',
      price: 48,
      stock: 40,
    });
    render(<LowStock />, { wrapper: Wrapper });
    await screen.findByText('Hydrating Serum');

    const input = screen.getByLabelText('New stock for Hydrating Serum');
    await userEvent.clear(input);
    await userEvent.type(input, '40');
    const row = input.closest('tr') as HTMLElement;
    await userEvent.click(row.querySelector('button') as HTMLButtonElement);

    await waitFor(() =>
      expect(mockedUpdateProduct).toHaveBeenCalledWith('p-low', { stock: 40 }),
    );
  });

  it('rejects a negative quantity without calling the API', async () => {
    render(<LowStock />, { wrapper: Wrapper });
    await screen.findByText('Hydrating Serum');

    const input = screen.getByLabelText('New stock for Hydrating Serum');
    await userEvent.clear(input);
    await userEvent.type(input, '-5');
    const row = input.closest('tr') as HTMLElement;
    await userEvent.click(row.querySelector('button') as HTMLButtonElement);

    expect(
      await screen.findByText('Stock must be a whole number of 0 or more.'),
    ).toBeInTheDocument();
    expect(mockedUpdateProduct).not.toHaveBeenCalled();
  });

  it('shows an empty state rather than a blank table', async () => {
    mockedGetLowStock.mockResolvedValue({ data: [], threshold: 5 });
    render(<LowStock />, { wrapper: Wrapper });

    expect(
      await screen.findByText(/Nothing at or below 5 in stock/),
    ).toBeInTheDocument();
  });
});
