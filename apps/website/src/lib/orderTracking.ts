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

/** Optional translator: when omitted, helpers keep their English output. */
type Translate = (key: string, vars?: Record<string, string | number>) => string;

function paymentDone(payment?: PaymentStatus): boolean {
  return payment === 'paid';
}

/**
 * Build a display timeline from order.status (+ paymentStatus).
 * Pure UI helper — does not invent backend mutations.
 */
export function buildDemoOrderTracking(
  order: Pick<
    Order,
    'status' | 'paymentStatus' | 'createdAt' | 'paidAt' | 'updatedAt' | 'shippingAddress'
  >,
  t?: Translate,
): {
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
          title: t ? t('orders.tracking.placedTitle') : 'Order placed',
          description: t
            ? t('orders.tracking.placedCanceledDescription')
            : 'We received your order.',
          state: 'complete',
          at: order.createdAt,
        },
        {
          id: 'canceled',
          title: t ? t('orders.tracking.canceledTitle') : 'Canceled',
          description: t
            ? t('orders.tracking.canceledDescription')
            : 'This order was canceled. Contact support if you need help.',
          state: 'canceled',
          at: order.updatedAt,
        },
      ],
    };
  }

  const steps: OrderTrackingStep[] = [
    {
      id: 'placed',
      title: t ? t('orders.tracking.placedTitle') : 'Order placed',
      description: t
        ? t('orders.tracking.placedDescription')
        : 'We received your order details.',
      state: 'complete',
      at: order.createdAt,
    },
    {
      id: 'payment',
      title: paid
        ? t ? t('orders.tracking.paymentConfirmedTitle') : 'Payment confirmed'
        : t ? t('orders.tracking.awaitingPaymentTitle') : 'Awaiting payment',
      description: paid
        ? t ? t('orders.tracking.paymentConfirmedDescription') : 'Payment cleared securely.'
        : t
          ? t('orders.tracking.awaitingPaymentDescription')
          : 'Complete checkout to continue fulfillment.',
      state: paid ? 'complete' : 'current',
      at: paid ? order.paidAt || order.updatedAt : undefined,
    },
    {
      id: 'preparing',
      title: t ? t('orders.tracking.preparingTitle') : 'Preparing your order',
      description: t
        ? t('orders.tracking.preparingDescription')
        : 'Packing beauty, fashion, or lifestyle items with care.',
      state: 'upcoming',
    },
    {
      id: 'shipped',
      title: t ? t('orders.tracking.shippedTitle') : 'Shipped',
      description: order.shippingAddress?.city
        ? t
          ? t('orders.tracking.shippedToCityDescription', { city: order.shippingAddress.city })
          : `On the way toward ${order.shippingAddress.city}.`
        : t
          ? t('orders.tracking.shippedDescription')
          : 'Handed to the carrier when delivery is selected.',
      state: 'upcoming',
    },
    {
      id: 'delivered',
      title: t ? t('orders.tracking.deliveredTitle') : 'Delivered',
      description: t
        ? t('orders.tracking.deliveredDescription')
        : 'Marked delivered when the shipment completes.',
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

  let demoCarrierNote: string | null = null;
  if (status === 'shipped' || status === 'delivered') {
    const demoRef = `TV-${order.createdAt.slice(0, 10).replace(/-/g, '')}`;
    demoCarrierNote = t
      ? t('orders.tracking.demoCarrierNote', { ref: demoRef })
      : `Demo tracking ref ${demoRef} — not a live carrier feed`;
  }

  return { steps, demoCarrierNote, isDemo: true };
}

export function orderStatusLabel(status: OrderStatus, t?: Translate): string {
  const labels: Record<OrderStatus, string> = {
    pending: 'Pending',
    paid: 'Paid',
    shipped: 'Shipped',
    delivered: 'Delivered',
    canceled: 'Canceled',
  };
  if (!labels[status]) return status;
  return t ? t(`orders.status.${status}`) : labels[status];
}
