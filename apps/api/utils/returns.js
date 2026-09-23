/**
 * Return (RMA) rules shared by the returns controller and the order payload.
 *
 * Flow: requested → approved → received → refunded, with rejected reachable
 * from any open step (an item that arrives damaged can still be refused).
 */
const RETURN_TRANSITIONS = {
  requested: ['approved', 'rejected'],
  approved: ['received', 'rejected'],
  received: ['refunded', 'rejected'],
  rejected: [],
  refunded: [],
};

/** Days after delivery a customer may request a return (env-tunable). */
function returnWindowDays() {
  const days = parseInt(process.env.RETURN_WINDOW_DAYS, 10);
  return Number.isFinite(days) && days > 0 ? days : 30;
}

/**
 * When the order was delivered. `deliveredAt` is recorded going forward;
 * orders delivered before it existed fall back to the "delivered" tracking
 * event, then to the last update.
 */
function getDeliveredAt(order) {
  if (order.deliveredAt) return new Date(order.deliveredAt);
  const event = (order.trackingEvents || [])
    .filter((e) => e?.status === 'delivered' && e.timestamp)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
  if (event) return new Date(event.timestamp);
  return order.updatedAt ? new Date(order.updatedAt) : null;
}

function hasOpenOrPastReturn(order) {
  return Boolean(order.returnRequest && order.returnRequest.status && order.returnRequest.status !== 'none');
}

/**
 * Whether the customer may open a return now.
 * @returns {{ ok: true, windowEndsAt: Date } | { ok: false, message: string, windowEndsAt?: Date }}
 */
function canCustomerReturn(order, now = new Date()) {
  if (order.status !== 'delivered') {
    return { ok: false, message: 'Only delivered orders can be returned.' };
  }
  if (order.paymentStatus !== 'paid') {
    return { ok: false, message: 'This order has already been refunded.' };
  }
  if (hasOpenOrPastReturn(order)) {
    return { ok: false, message: 'A return has already been requested for this order.' };
  }
  const deliveredAt = getDeliveredAt(order);
  if (!deliveredAt) {
    return { ok: false, message: 'This order can no longer be returned online. Please contact support.' };
  }
  const windowEndsAt = new Date(deliveredAt.getTime() + returnWindowDays() * 86_400_000);
  if (now > windowEndsAt) {
    return {
      ok: false,
      message: `The ${returnWindowDays()}-day return window for this order has closed.`,
      windowEndsAt,
    };
  }
  return { ok: true, windowEndsAt };
}

/**
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
function canTransitionReturn(from, to) {
  const allowed = RETURN_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    return { ok: false, message: `A ${from} return cannot be marked ${to}.` };
  }
  return { ok: true };
}

module.exports = {
  RETURN_TRANSITIONS,
  returnWindowDays,
  getDeliveredAt,
  canCustomerReturn,
  canTransitionReturn,
};
