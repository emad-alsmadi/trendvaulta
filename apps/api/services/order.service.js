/**
 * Order domain service: fulfillment status transitions, customer and staff
 * cancellation (Stripe refunds, restock, notification emails), tracking
 * updates and the admin order search — everything that is not an HTTP
 * concern. Controllers stay thin (validate input, call in, shape the
 * response); nothing here touches req/res.
 *
 * Failure contract: domain functions report refusals as a verdict
 * { ok: false, status, body } that the controller relays verbatim, so the
 * HTTP responses stay byte-identical with the pre-service controller era
 * (unifying response envelopes is deliberate future work, not done here).
 * Successes return { ok: true, ... } carrying what the response needs.
 *
 * Concurrency model (see also models/Order.js flags): every state change is
 * claimed with a conditional update on the status that was read, so a
 * double click, a concurrent customer cancel and a Stripe webhook cannot
 * both win — the loser gets a 409 verdict instead of acting on a stale
 * read.
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { Order } = require('../models/Order');
const { Product } = require('../models/Product');
const { User } = require('../models/User');
const {
  decrementStockForPaidOrder,
  restoreStockOnce,
} = require('./commerce.service');
const { getStripeOrThrow, refundPaymentIntent } = require('./stripe.service');
const {
  isValidGuestToken,
  orderEmailTarget,
} = require('./guestOrders.service');
const {
  ORDER_STATUSES,
  canCustomerCancel,
  canTransitionOrderStatus,
  hasOrderShipped,
} = require('../utils/orderTransitions');
const { canCustomerReturn, RETURN_TRANSITIONS } = require('../utils/returns');
const { normalizeSearchTerm } = require('../utils/search');
const {
  supportsTransactions,
  runInTransaction,
} = require('../utils/transactions');
const {
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
  sendOrderCanceledEmail,
  sendOrderRefundedEmail,
} = require('../utils/mail');

/** A refusal the controller relays verbatim (see header). */
function refusal(status, body) {
  return { ok: false, status, body };
}

/**
 * The order behind a customer action: the caller's own order, or a guest
 * order whose token matches (services/guestOrders.service.js). null otherwise.
 */
async function findCustomerOrder(userId, orderId, guestToken) {
  if (!mongoose.isValidObjectId(orderId)) return null;
  if (userId) {
    const own = await Order.findOne({ _id: orderId, user: userId });
    if (own) return own;
  }
  if (!guestToken) return null;
  const order = await Order.findById(orderId);
  return isValidGuestToken(order, guestToken) ? order : null;
}

/** `canReturn` plus, once delivered, the date the return window closes. */
function returnEligibility(order) {
  const result = canCustomerReturn(order);
  return {
    canReturn: result.ok,
    returnWindowEndsAt: result.windowEndsAt
      ? result.windowEndsAt.toISOString()
      : undefined,
  };
}

/**
 * Admin order list filter. An order id matches exactly; anything else is
 * treated as a customer email or username. A term that matches nothing must
 * return nothing — dropping the filter instead would answer a failed
 * search with the whole list.
 */
async function buildAdminOrdersQuery({
  status,
  paymentStatus,
  q,
  returnStatus,
  user,
}) {
  const query = {};
  if (status && ORDER_STATUSES.includes(String(status))) {
    query.status = String(status);
  }
  if (
    paymentStatus &&
    ['unpaid', 'pending', 'paid', 'failed', 'refunded'].includes(
      String(paymentStatus),
    )
  ) {
    query.paymentStatus = String(paymentStatus);
  }
  const term = normalizeSearchTerm(q);
  if (term) {
    if (/^[a-f\d]{24}$/i.test(term)) {
      query._id = term;
    } else {
      const customers = await User.find({
        $or: [
          { email: { $regex: term, $options: 'i' } },
          { username: { $regex: term, $options: 'i' } },
        ],
      })
        .select('_id')
        .limit(200)
        .lean();
      // Account orders of matching customers, and guest orders by email
      query.$or = [
        { user: { $in: customers.map((u) => u._id) } },
        { guestEmail: { $regex: term, $options: 'i' } },
      ];
    }
  }

  // Returns queue: orders whose return is at a given step.
  const step = typeof returnStatus === 'string' ? returnStatus : '';
  if (Object.prototype.hasOwnProperty.call(RETURN_TRANSITIONS, step)) {
    query['returnRequest.status'] = step;
  }

  // One customer's history (the Users screen links here). Combined with an
  // email search it must narrow, not replace: both filters have to hold.
  const customerId = typeof user === 'string' ? user : '';
  if (/^[a-f\d]{24}$/i.test(customerId)) {
    const matched = query.user?.$in;
    query.user =
      !matched || matched.some((id) => String(id) === customerId)
        ? customerId
        : { $in: [] };
  }

  return { query };
}

/**
 * Persist tracking fields and events. The status transition emails
 * "shipped" only when a tracking number already exists; if the first
 * number is added afterwards, it is sent here (once).
 */
async function updateOrderTrackingInfo(orderId, value) {
  const order = await Order.findById(orderId);
  if (!order) {
    return refusal(404, { code: 'NOT_FOUND', message: 'Order not found' });
  }

  const hadTrackingNumber = Boolean(order.trackingNumber);

  // Update basic tracking fields
  if (value.trackingNumber !== undefined)
    order.trackingNumber = value.trackingNumber;
  if (value.trackingCarrier !== undefined)
    order.trackingCarrier = value.trackingCarrier;
  if (value.trackingUrl !== undefined) order.trackingUrl = value.trackingUrl;

  // Add tracking event if provided
  if (value.trackingEvent) {
    order.trackingEvents.push({
      status: value.trackingEvent.status,
      description: value.trackingEvent.description || '',
      location: value.trackingEvent.location || '',
      timestamp: new Date(),
    });
  }

  await order.save();

  // The status change only emails "shipped" when a tracking number already
  // exists; if it is added afterwards, send it now (once: first number only).
  if (
    order.status === 'shipped' &&
    !hadTrackingNumber &&
    order.trackingNumber
  ) {
    const { to, orderUrl } = await orderEmailTarget(order, User);
    if (to) {
      await sendOrderShippedEmail({
        to,
        orderUrl,
        orderId: order._id,
        trackingNumber: order.trackingNumber,
        trackingCarrier: order.trackingCarrier,
      }).catch(() => {});
    }
  }

  return { ok: true, order };
}

/**
 * Transition fulfillment status within the allowed state machine.
 * Does not mark orders paid (Stripe webhook / verify-payment only); the
 * only admin path to 'paid' is resolving a needs_attention order whose
 * payment was already captured.
 *
 * Canceling/refunding a paid order creates a full Stripe refund
 * (AUTO_REFUND_ON_CANCEL, default true) and releases inventory once.
 */
async function transitionOrderStatus(orderId, status) {
  // Reassigned to the claimed (post-transition) document below.
  let order = await Order.findById(orderId);
  if (!order) {
    return refusal(404, { code: 'NOT_FOUND', message: 'Order not found' });
  }

  const transition = canTransitionOrderStatus(order.status, status);
  if (!transition.ok) {
    return refusal(400, {
      code: transition.code,
      ...(transition.params && { params: transition.params }),
      message: transition.message,
    });
  }

  const paymentCaptured =
    order.paymentStatus === 'paid' || order.paymentStatus === 'refunded';

  if (status === 'paid' && order.paymentStatus !== 'paid') {
    return refusal(400, {
      code: 'ORDER_NOT_PAID',
      message:
        'This order has not been paid. Payment status is set by Stripe only.',
    });
  }

  if (status === 'refunded' && !paymentCaptured) {
    return refusal(400, {
      code: 'NO_PAYMENT_TO_REFUND',
      message: 'This order has no captured payment to refund',
    });
  }

  // Guard: pending+paid is an inconsistent state — do not cancel via this path
  if (status === 'canceled' && order.status === 'pending') {
    if (order.paymentStatus === 'paid') {
      return refusal(400, {
        code: 'CANCEL_PAID_PENDING',
        message: 'Cannot cancel a paid order from pending state',
      });
    }
  }

  // Claim the transition with a conditional update on the state validated
  // above (same pattern as cancelCustomerOrder): a concurrent customer
  // cancel or Stripe webhook makes this a 409 instead of both sides acting
  // on a stale read (e.g. refunding + restocking an order that was just
  // shipped).
  const claimSet = { status };
  // Leaving needs_attention clears the reason unless a new one is set below
  if (order.status === 'needs_attention') claimSet.attentionReason = '';
  if (status === 'shipped' && !order.shippedAt) claimSet.shippedAt = new Date();
  if (status === 'delivered' && !order.deliveredAt) {
    claimSet.deliveredAt = new Date();
  }
  const previous = order;
  // The claim never touches the stock flags, so this reads the same on
  // `previous` as it would on the claimed document.
  const holdsStock = previous.stockDecremented && !previous.stockRestored;
  const mustDecrementStock = status === 'paid' && !holdsStock;

  let claimed = null;
  if (supportsTransactions()) {
    // Claim + stock decrement commit or abort together: an oversold
    // needs_attention → paid resolution no longer needs the manual
    // claim-undo below — the abort restores the order to needs_attention.
    try {
      claimed = await runInTransaction(async (session) => {
        const c = await Order.findOneAndUpdate(
          {
            _id: previous._id,
            status: previous.status,
            paymentStatus: previous.paymentStatus,
          },
          { $set: claimSet },
          { new: true, session },
        );
        if (!c) return null;
        if (mustDecrementStock) {
          await decrementStockForPaidOrder(Product, c, session);
          await Order.updateOne(
            { _id: c._id },
            { $set: { stockDecremented: true, stockRestored: false } },
            { session },
          );
          c.stockDecremented = true;
          // Held again, so a later cancel/refund must be able to restock it
          c.stockRestored = false;
        }
        return c;
      });
    } catch (err) {
      if (err?.code !== 'INSUFFICIENT_STOCK') throw err;
      return refusal(409, {
        code: 'OUT_OF_STOCK_AFTER_PAYMENT',
        message: `${err.message}. Restock the product or refund the order.`,
      });
    }
  } else {
    claimed = await Order.findOneAndUpdate(
      {
        _id: previous._id,
        status: previous.status,
        paymentStatus: previous.paymentStatus,
      },
      { $set: claimSet },
      { new: true },
    );
    if (claimed && mustDecrementStock) {
      try {
        await decrementStockForPaidOrder(Product, claimed);
        claimed.stockDecremented = true;
        // Held again, so a later cancel/refund must be able to restock it
        claimed.stockRestored = false;
      } catch (stockErr) {
        // Undo the claim so the order stays flagged for staff
        await Order.updateOne(
          { _id: claimed._id, status: 'paid' },
          {
            $set: {
              status: previous.status,
              attentionReason: previous.attentionReason,
            },
          },
        );
        if (stockErr?.code !== 'INSUFFICIENT_STOCK') throw stockErr;
        return refusal(409, {
          code: 'OUT_OF_STOCK_AFTER_PAYMENT',
          message: `${stockErr.message}. Restock the product or refund the order.`,
        });
      }
    }
  }

  if (!claimed) {
    return refusal(409, {
      code: 'STALE_UPDATE',
      message: 'This order was just updated. Refresh and try again.',
    });
  }

  const releasesOrder = status === 'canceled' || status === 'refunded';
  const autoRefund = process.env.AUTO_REFUND_ON_CANCEL !== 'false';
  let refundedNow = false;
  order = claimed;

  // Admin cancel of an unpaid order: close the open Checkout session so the
  // customer can't pay for it afterwards (as the customer cancel does).
  if (
    status === 'canceled' &&
    order.paymentStatus !== 'paid' &&
    order.stripeSessionId
  ) {
    try {
      await getStripeOrThrow().checkout.sessions.expire(order.stripeSessionId);
    } catch {
      // already expired/completed, or Stripe not configured
    }
  }

  if (releasesOrder && order.paymentStatus === 'paid') {
    if (!order.paymentIntentId || !autoRefund) {
      order.attentionReason = 'manual_refund_required';
    } else {
      try {
        const stripe = getStripeOrThrow();
        const refund = await refundPaymentIntent(stripe, order.paymentIntentId);
        order.paymentStatus = 'refunded';
        order.refundId = refund?.id || '';
        order.refundedAt = new Date();
        order.refundAmount = Number(refund?.amount || 0) / 100;
        refundedNow = true;
        // Persist the refund trail before any further step can fail
        await order.save();
      } catch (refundErr) {
        logger.error(
          { err: refundErr },
          `Stripe refund failed for order ${order._id}`,
        );
        order.status = 'needs_attention';
        order.attentionReason = 'refund_failed';
        await order.save();
        return refusal(502, {
          message:
            'The Stripe refund could not be created. The order was flagged for manual review; please retry or refund it from the Stripe dashboard.',
          attentionReason: 'refund_failed',
        });
      }
    }
  }

  // Restock only goods that never left the warehouse; a shipped/delivered
  // order is restocked line by line when its return is received.
  let stockRestoredNow = false;
  if (releasesOrder && !hasOrderShipped(previous)) {
    stockRestoredNow = await restoreStockOnce(Order, Product, order);
    if (stockRestoredNow) order.stockRestored = true;
  }

  await order.save();

  // Send email notifications based on status change: the account email,
  // or the guest's with their order link.
  const { to: userEmail, orderUrl } = await orderEmailTarget(order, User);
  if (userEmail) {
    if (status === 'shipped' && order.trackingNumber) {
      await sendOrderShippedEmail({
        to: userEmail,
        orderUrl,
        orderId: order._id,
        trackingNumber: order.trackingNumber,
        trackingCarrier: order.trackingCarrier,
      }).catch(() => {});
    } else if (status === 'delivered') {
      await sendOrderDeliveredEmail({
        to: userEmail,
        orderUrl,
        orderId: order._id,
      }).catch(() => {});
    } else if (status === 'canceled') {
      await sendOrderCanceledEmail({
        to: userEmail,
        orderUrl,
        orderId: order._id,
      }).catch(() => {});
    } else if (status === 'refunded' && order.refundAmount > 0) {
      await sendOrderRefundedEmail({
        to: userEmail,
        orderUrl,
        orderId: order._id,
        refundAmount: order.refundAmount,
      }).catch(() => {});
    }
  }

  let message = `Order status updated to ${status}`;
  if (refundedNow && stockRestoredNow) {
    message = 'Order refunded via Stripe and inventory restored';
  } else if (refundedNow) {
    message = 'Order refunded via Stripe';
  } else if (stockRestoredNow) {
    message = 'Order canceled and inventory restored';
  } else if (order.attentionReason === 'manual_refund_required') {
    message = `Order ${status}; the payment must be refunded manually in Stripe`;
  }

  return { ok: true, order, refundedNow, stockRestoredNow, message };
}

/**
 * Customer cancel their own order before it ships.
 *
 * Order of operations matters here:
 * 1. The cancel is *claimed* with a conditional update on the status we
 *    read, so a double click, a second tab, or staff shipping the order at
 *    the same moment cannot both win — the loser gets 409 instead of a
 *    refund on a shipped parcel.
 * 2. Only then is money moved. The refund goes through refundPaymentIntent,
 *    whose idempotency key makes a retried refund a no-op at Stripe.
 * 3. A refund that cannot be issued automatically never un-cancels the
 *    order: it is flagged for staff, and the customer is told a person will
 *    finish it.
 */
async function cancelCustomerOrder(orderId, { userId, guestToken }) {
  // Owner- or token-scoped: someone else's order is "not found", not
  // "forbidden", so the endpoint does not confirm which ids exist.
  const order = await findCustomerOrder(userId, orderId, guestToken);
  if (!order) {
    return refusal(404, { code: 'NOT_FOUND', message: 'Order not found' });
  }

  const allowed = canCustomerCancel(order);
  if (!allowed.ok) {
    return refusal(400, {
      code: allowed.code,
      ...(allowed.params && { params: allowed.params }),
      message: allowed.message,
    });
  }

  const claimed = await Order.findOneAndUpdate(
    {
      _id: order._id,
      status: order.status,
      paymentStatus: order.paymentStatus,
    },
    { $set: { status: 'canceled' } },
    { new: true },
  );
  if (!claimed) {
    return refusal(409, {
      code: 'STALE_UPDATE',
      message: 'This order was just updated. Please refresh and try again.',
    });
  }

  // Unpaid: close the open Checkout session so the customer cannot pay for
  // an order they just canceled. Best effort — if it already completed, the
  // webhook flags the order as paid_after_cancel for staff.
  if (claimed.paymentStatus !== 'paid' && claimed.stripeSessionId) {
    try {
      await getStripeOrThrow().checkout.sessions.expire(
        claimed.stripeSessionId,
      );
    } catch {
      // already expired/completed, or Stripe not configured
    }
  }

  let refundedNow = false;
  let refundPending = false;
  if (claimed.paymentStatus === 'paid') {
    const autoRefund = process.env.AUTO_REFUND_ON_CANCEL !== 'false';
    if (!claimed.paymentIntentId || !autoRefund) {
      // Same outcome as a staff cancel without auto-refund
      // (transitionOrderStatus).
      claimed.attentionReason = 'manual_refund_required';
      refundPending = true;
    } else {
      try {
        const refund = await refundPaymentIntent(
          getStripeOrThrow(),
          claimed.paymentIntentId,
        );
        claimed.paymentStatus = 'refunded';
        claimed.refundId = refund?.id || '';
        claimed.refundedAt = new Date();
        claimed.refundAmount = Number(refund?.amount || 0) / 100;
        refundedNow = true;
      } catch (refundErr) {
        logger.error(
          { err: refundErr },
          `Stripe refund failed for order ${claimed._id}`,
        );
        claimed.status = 'needs_attention';
        claimed.attentionReason = 'refund_failed';
        refundPending = true;
      }
    }
    // Persist the refund trail (or the flag) before anything else can fail.
    await claimed.save();
  }

  const stockRestoredNow = await restoreStockOnce(Order, Product, claimed);
  if (stockRestoredNow) claimed.stockRestored = true;

  const { to, orderUrl } = await orderEmailTarget(claimed, User);
  if (to) {
    await sendOrderCanceledEmail({ to, orderUrl, orderId: claimed._id }).catch(
      () => {},
    );
  }

  let message = 'Order canceled.';
  if (refundedNow) {
    message =
      'Order canceled. Your refund has been issued and should appear in 5–10 business days.';
  } else if (refundPending) {
    message =
      'Order canceled. Our team will issue your refund shortly — no action is needed from you.';
  }

  return { ok: true, order: claimed, refundedNow, refundPending, message };
}

module.exports = {
  findCustomerOrder,
  returnEligibility,
  buildAdminOrdersQuery,
  updateOrderTrackingInfo,
  transitionOrderStatus,
  cancelCustomerOrder,
};
