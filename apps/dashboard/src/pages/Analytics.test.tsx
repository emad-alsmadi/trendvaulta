import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

jest.mock('../lib/api', () => ({
  adminStatsApi: { getAnalytics: jest.fn(), getStats: jest.fn(), getLowStock: jest.fn() },
  errorMessage: (_e: unknown, fallback: string) => fallback,
}));

jest.mock('../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: () => {} }),
}));

import { adminStatsApi } from '../lib/api';
import Analytics from './Analytics';

const mockedGetAnalytics = jest.mocked(adminStatsApi.getAnalytics);

function Wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const ANALYTICS = {
  days: 30,
  series: [
    { date: '2026-09-21', revenue: 120, orders: 2 },
    { date: '2026-09-22', revenue: 0, orders: 0 },
    { date: '2026-09-23', revenue: 80, orders: 2 },
  ],
  topProducts: [
    { productId: 'p1', title: 'Velvet Matte Lipstick', units: 4, revenue: 160 },
    { productId: 'p2', title: 'Hydrating Serum', units: 1, revenue: 40 },
  ],
  topBrands: [{ brandId: 'b1', name: 'Aurelia', units: 5, revenue: 200 }],
};

beforeEach(() => {
  jest.resetAllMocks();
  mockedGetAnalytics.mockResolvedValue(ANALYTICS);
});

describe('Analytics page', () => {
  it('totals the series into the summary tiles', async () => {
    render(<Analytics />, { wrapper: Wrapper });

    // 120 + 80 across 4 orders -> $200 revenue, $50 average. Scoped to the
    // tile because bare numbers also appear as chart axis ticks.
    const tile = (label: string) =>
      screen.getByText(label).parentElement as HTMLElement;

    await waitFor(() =>
      expect(tile('Revenue total')).toHaveTextContent('$200'),
    );
    expect(tile('Orders total')).toHaveTextContent('4');
    expect(tile('Average order')).toHaveTextContent('$50');
  });

  it('refetches with the chosen range', async () => {
    render(<Analytics />, { wrapper: Wrapper });
    await screen.findByText('$200');

    await userEvent.click(screen.getByRole('button', { name: 'Last 7 days' }));

    await waitFor(() => expect(mockedGetAnalytics).toHaveBeenCalledWith(7));
  });

  it('offers a table view of the same series for readers who cannot use the chart', async () => {
    render(<Analytics />, { wrapper: Wrapper });
    await screen.findByText('$200');

    await userEvent.click(screen.getByRole('button', { name: 'Table' }));

    expect(screen.getByText('Daily totals')).toBeInTheDocument();
    expect(screen.getByText('2026-09-21')).toBeInTheDocument();
    // The zero-filled gap must be a real row, not omitted.
    expect(screen.getByText('2026-09-22')).toBeInTheDocument();
  });

  it('names the leaderboards and their entries', async () => {
    render(<Analytics />, { wrapper: Wrapper });

    expect(
      await screen.findByText('Top products by revenue'),
    ).toBeInTheDocument();
    expect(screen.getByText('Top brands by revenue')).toBeInTheDocument();
  });

  it('shows an empty state per leaderboard when nothing sold', async () => {
    mockedGetAnalytics.mockResolvedValue({
      days: 30,
      series: [],
      topProducts: [],
      topBrands: [],
    });
    render(<Analytics />, { wrapper: Wrapper });

    await waitFor(() =>
      expect(
        screen.getAllByText('No paid orders in this range.'),
      ).toHaveLength(2),
    );
  });

  it('surfaces a failed request instead of drawing an empty chart silently', async () => {
    mockedGetAnalytics.mockRejectedValue(new Error('boom'));
    render(<Analytics />, { wrapper: Wrapper });

    expect(
      await screen.findByText('Failed to load analytics'),
    ).toBeInTheDocument();
  });
});
