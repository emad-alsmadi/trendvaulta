/**
 * DEMO order tracking timeline derived from order status.
 * Not carrier-live tracking — swap when API exposes shipment events.
 * TODO(api): GET /api/orders/:id/tracking → real events + carrier URL
 */

import type { Order, OrderStatus, PaymentStatus } from '@/types';

export type TrackingStepState = 'complete' | 'current' | 'upcoming' | 'canceled';

export type OrderTrackingStep = {
  id: string;
  title: string;
  description: string;
  state: TrackingStepState;
  /** ISO date when known; demo may omit */
  at?: string;
};

function paymentDone(payment?: PaymentStatus): boolean {
  return payment === 'paid';
}

/**
 * Build a display timeline from order.status (+ paymentStatus).
 * Pure UI helper — does not invent backend mutations.
 */
export function buildDemoOrderTracking(order: Pick<
  Order,
  'status' | 'paymentStatus' | 'createdAt' | 'paidAt' | 'updatedAt' | 'shippingAddress'
>): {
  steps: OrderTrackingStep[];
  demoCarrierNote: string | null;
  isDemo: true;
} {
  const status = order.status;
  const paid = paymentDone(order.paymentStatus) || status === 'paid' || status === 'shipped' || status === 'delivered';

  if (status === 'canceled') {
    return {
      isDemo: true,
      demoCarrierNote: null,
      steps: [
        {
          id: 'placed',
          title: 'Order placed',
          description: 'We received your order.',
          state: 'complete',
          at: order.createdAt,
        },
        {
          id: 'canceled',
          title: 'Canceled',
          description: 'This order was canceled. Contact support if you need help.',
          state: 'canceled',
          at: order.updatedAt,
        },
      ],
    };
  }

  const steps: OrderTrackingStep[] = [
    {
      id: 'placed',
      title: 'Order placed',
      description: 'We received your order details.',
      state: 'complete',
      at: order.createdAt,
    },
    {
      id: 'payment',
      title: paid ? 'Payment confirmed' : 'Awaiting payment',
      description: paid
        ? 'Payment cleared securely.'
        : 'Complete checkout to continue fulfillment.',
      state: paid ? 'complete' : 'current',
      at: paid ? order.paidAt || order.updatedAt : undefined,
    },
    {
      id: 'preparing',
      title: 'Preparing your order',
      description: 'Packing beauty, fashion, or lifestyle items with care.',
      state: 'upcoming',
    },
    {
      id: 'shipped',
      title: 'Shipped',
      description: order.shippingAddress?.city
        ? `On the way toward ${order.shippingAddress.city}.`
        : 'Handed to the carrier when delivery is selected.',
      state: 'upcoming',
    },
    {
      id: 'delivered',
      title: 'Delivered',
      description: 'Marked delivered when the shipment completes.',
      state: 'upcoming',
    },
  ];

  const mark = (id: string, state: TrackingStepState, at?: string) => {
    const step = steps.find((s) => s.id === id);
    if (!step) return;
    step.state = state;
    if (at) step.at = at;
  };

  if (!paid) {
    // only placed + payment current
  } else if (status === 'pending' || status === 'paid') {
    mark('preparing', 'current', order.updatedAt);
  } else if (status === 'shipped') {
    mark('preparing', 'complete', order.updatedAt);
    mark('shipped', 'current', order.updatedAt);
  } else if (status === 'delivered') {
    mark('preparing', 'complete');
    mark('shipped', 'complete', order.updatedAt);
    mark('delivered', 'complete', order.updatedAt);
  }

  const demoCarrierNote =
    status === 'shipped' || status === 'delivered'
      ? `Demo tracking ref TV-${order.createdAt.slice(0, 10).replace(/-/g, '')} — not a live carrier feed`
      : null;

  return { steps, demoCarrierNote, isDemo: true };
}

export function orderStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    pending: 'Pending',
    paid: 'Paid',
    shipped: 'Shipped',
    delivered: 'Delivered',
    canceled: 'Canceled',
  };
  return labels[status] || status;
}
