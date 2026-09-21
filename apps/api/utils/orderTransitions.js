/**
 * Fulfillment status machine.
 * `pending → paid` is driven by Stripe (webhook / verify-payment); the admin
 * controller additionally guards that path on paymentStatus.
 */
const ORDER_STATUSES = [
  'pending',
  'paid',
  'shipped',
  'delivered',
  'canceled',
  'needs_attention',
  'refunded',
];

const ALLOWED_TRANSITIONS = {
  pending: ['paid', 'canceled', 'needs_attention'],
  paid: ['shipped', 'canceled', 'needs_attention', 'refunded'],
  needs_attention: ['paid', 'canceled', 'refunded'],
  // canceled → refunded only when a payment was captured (controller guard)
  canceled: ['refunded'],
  shipped: ['delivered', 'refunded'],
  delivered: ['refunded'],
  refunded: [],
};

function getAllowedNextStatuses(currentStatus) {
  return ALLOWED_TRANSITIONS[currentStatus] || [];
}

/**
 * @returns {{ ok: true, from: string, to: string } | { ok: false, message: string }}
 */
function canTransitionOrderStatus(fromStatus, toStatus) {
  if (!ORDER_STATUSES.includes(toStatus)) {
    return { ok: false, message: `Invalid status: ${toStatus}` };
  }
  if (fromStatus === toStatus) {
    return { ok: false, message: 'Order already has this status' };
  }
  const allowed = getAllowedNextStatuses(fromStatus);
  if (!allowed.includes(toStatus)) {
    return {
      ok: false,
      message: `Cannot transition from '${fromStatus}' to '${toStatus}'`,
    };
  }
  return { ok: true, from: fromStatus, to: toStatus };
}

module.exports = {
  ORDER_STATUSES,
  ALLOWED_TRANSITIONS,
  getAllowedNextStatuses,
  canTransitionOrderStatus,
};
