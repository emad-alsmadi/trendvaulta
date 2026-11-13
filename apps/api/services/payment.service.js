/**
 * Payment domain service: everything Stripe-payment related that is not an
 * HTTP concern — marking orders paid (race-safe, exactly once), the paid
 * side-effects (stock, coupon, salesCount, invoice number, confirmation
 * email), webhook event handlers, refunds syncing and the stale-checkout
 * reconciler. Controllers stay thin (validate input, call in, shape the
 * response); nothing here touches req/res.
 *
 * Concurrency model (see also models/Order.js flags): every side-effect is
 * guarded by a one-shot flag lease on the order document, and every state
 * change is claimed with a conditional update, so the Stripe webhook, the
 * verify-payment poll and the reconciler can all run concurrently — on
 * several API instances — without double-applying stock, coupon counts or
 * emails.
 */

const logger = require('../utils/logger');
const { Order } = require('../models/Order');
const { Product } = require('../models/Product');
const { getStripeOrThrow } = require('./stripe.service');
const {
  decrementStockForPaidOrder,
  restoreStockOnce,
  incrementCouponUsedCount,
  incrementSalesCountForPaidOrder,
  getStoreSettings,
} = require('./commerce.service');
const { ensureInvoiceNumber } = require('../utils/invoice');
const {
  supportsTransactions,
  runInTransaction,
} = require('../utils/transactions');
const { orderEmailTarget } = require('./guestOrders.service');
const {
  canTransitionOrderStatus,
  hasOrderShipped,
} = require('../utils/orderTransitions');
const { sendOrderConfirmationEmail } = require('../utils/mail');
const { User } = require('../models/User');

const CHECKOUT_SESSION_TTL_SECONDS = 30 * 60;

function extractOrderId(obj) {
  return obj?.metadata?.orderId || obj?.client_reference_id || null;
}

/**
 * Funds actually captured. Delayed methods (ACH, SEPA…) complete the session
 * with payment_status 'unpaid' and settle later via async_payment_* events.
 */
function isSessionPaid(session) {
  return (
    session?.payment_status === 'paid' ||
    session?.payment_status === 'no_payment_required'
  );
}

function extractPaymentIntentId(obj) {
  const pi = obj?.payment_intent;
  return typeof pi === 'string' ? pi : pi?.id || '';
}

/** Best-effort removal of the per-checkout Stripe coupon (never throws). */
async function deleteTemporaryCoupon(stripe, couponId) {
  if (!stripe || !couponId) return;
  try {
    await stripe.coupons.del(couponId);
  } catch (couponErr) {
    logger.warn(
      { err: couponErr },
      `Could not delete temporary Stripe coupon ${couponId}`,
    );
  }
}

/**
 * Lease a one-shot side-effect flag on the order. Returns true when this
 * caller won the lease (flag was false); the flag is flipped BEFORE the
 * side-effect runs so concurrent callers cannot double-apply it. Callers
 * must release the lease (flip back) if the side-effect fails.
 */
async function leaseOrderFlag(orderId, flag, session) {
  const res = await Order.updateOne(
    { _id: orderId, [flag]: false },
    { $set: { [flag]: true } },
    ...(session ? [{ session }] : []),
  );
  return (res.modifiedCount ?? res.nModified ?? 0) === 1;
}

async function releaseOrderFlag(orderId, flag, session) {
  await Order.updateOne(
    { _id: orderId },
    { $set: { [flag]: false } },
    ...(session ? [{ session }] : []),
  ).catch(() => {});
}

async function sendConfirmationEmailOnce(order) {
  // Lease the flag BEFORE sending (like the other side-effects) so a
  // concurrent webhook + verify-payment can't both email the customer.
  if (!(await leaseOrderFlag(order._id, 'confirmationEmailSent'))) return;
  try {
    const { to, orderUrl } = await orderEmailTarget(order, User);
    const sent = await sendOrderConfirmationEmail({
      to,
      orderUrl,
      orderId: String(order._id),
      totalPrice: order.totalPrice,
      items: order.items,
    });
    if (!sent) await releaseOrderFlag(order._id, 'confirmationEmailSent');
  } catch (mailErr) {
    await releaseOrderFlag(order._id, 'confirmationEmailSent');
    logger.error(
      { err: mailErr },
      'Order confirmation email error (payment still paid)',
    );
  }
}

/**
 * Coupon + salesCount effects shared by the legacy path and the
 * insufficient-stock fallback of the transactional path. Each is guarded
 * by its own flag lease, so a partial failure stays retryable exactly as
 * before.
 */
async function applyCouponAndSalesEffects(order) {
  if (
    order.couponId &&
    (await leaseOrderFlag(order._id, 'couponIncremented'))
  ) {
    try {
      await incrementCouponUsedCount(order.couponId);
    } catch (e) {
      await releaseOrderFlag(order._id, 'couponIncremented');
      throw e;
    }
  }

  if (await leaseOrderFlag(order._id, 'salesCountIncremented')) {
    try {
      await incrementSalesCountForPaidOrder(Product, order);
    } catch (e) {
      await releaseOrderFlag(order._id, 'salesCountIncremented');
      throw e;
    }
  }
}

/**
 * Sequential flag-lease path — also the fallback when the deployment's
 * MongoDB is not a replica set (transactions require one).
 */
async function applyPaidSideEffectsLegacy(order) {
  let status = 'paid';
  let attentionReason = '';

  if (await leaseOrderFlag(order._id, 'stockDecremented')) {
    try {
      await decrementStockForPaidOrder(Product, order);
    } catch (stockErr) {
      await releaseOrderFlag(order._id, 'stockDecremented');
      if (stockErr?.code !== 'INSUFFICIENT_STOCK') throw stockErr;
      status = 'needs_attention';
      attentionReason = 'insufficient_stock';
      logger.error(
        { err: stockErr },
        `Order ${order._id} paid but stock is insufficient`,
      );
    }
  }

  await applyCouponAndSalesEffects(order);

  // Number the invoice in payment order. Best effort: the invoice endpoint
  // assigns it on first view if this fails, so it must never fail the webhook.
  try {
    const settings = await getStoreSettings();
    await ensureInvoiceNumber(Order, order._id, {
      prefix: settings?.invoice?.prefix,
    });
  } catch (invoiceErr) {
    logger.error(
      { err: invoiceErr },
      `Order ${order._id}: invoice number not assigned`,
    );
  }

  return { status, attentionReason };
}

/**
 * Replica-set path: the flag claims and every DB side-effect commit or
 * abort together, so a crash can no longer leave stock/coupon/salesCount
 * half-applied — the flag leases inside the transaction make
 * withTransaction's automatic retries safe. Email and the invoice number
 * stay outside: they are already leased/best-effort and cannot roll back.
 */
async function applyPaidSideEffectsTxn(order) {
  await runInTransaction(async (session) => {
    if (await leaseOrderFlag(order._id, 'stockDecremented', session)) {
      await decrementStockForPaidOrder(Product, order, session);
    }
    if (
      order.couponId &&
      (await leaseOrderFlag(order._id, 'couponIncremented', session))
    ) {
      await incrementCouponUsedCount(order.couponId, session);
    }
    if (await leaseOrderFlag(order._id, 'salesCountIncremented', session)) {
      await incrementSalesCountForPaidOrder(Product, order, session);
    }
  });

  // Number the invoice in payment order. Best effort: the invoice endpoint
  // assigns it on first view if this fails, so it must never fail the webhook.
  try {
    const settings = await getStoreSettings();
    await ensureInvoiceNumber(Order, order._id, {
      prefix: settings?.invoice?.prefix,
    });
  } catch (invoiceErr) {
    logger.error(
      { err: invoiceErr },
      `Order ${order._id}: invoice number not assigned`,
    );
  }

  return { status: 'paid', attentionReason: '' };
}

/**
 * Run the post-payment side-effects (stock, coupon, salesCount) for an
 * order that is already `paymentStatus: 'paid'`. On a replica set they
 * commit atomically; elsewhere the legacy flag-lease path applies,
 * preserving the exact same outcomes.
 * @returns {Promise<{ status: string, attentionReason: string }>}
 */
async function applyPaidSideEffects(order) {
  if (!supportsTransactions()) return applyPaidSideEffectsLegacy(order);

  try {
    return await applyPaidSideEffectsTxn(order);
  } catch (err) {
    if (err?.code !== 'INSUFFICIENT_STOCK') throw err;
    // Paid but out of stock: the transaction rolled back every DB effect,
    // so apply the non-stock effects the legacy path would still run,
    // then flag the order for staff (status update happens in the caller).
    logger.error({ err }, `Order ${order._id} paid but stock is insufficient`);
    await applyCouponAndSalesEffects(order);

    // Number the invoice in payment order. Best effort: the invoice endpoint
    // assigns it on first view if this fails, so it must never fail the webhook.
    try {
      const settings = await getStoreSettings();
      await ensureInvoiceNumber(Order, order._id, {
        prefix: settings?.invoice?.prefix,
      });
    } catch (invoiceErr) {
      logger.error(
        { err: invoiceErr },
        `Order ${order._id}: invoice number not assigned`,
      );
    }

    return { status: 'needs_attention', attentionReason: 'insufficient_stock' };
  }
}

/**
 * Mark an order paid exactly once, then apply side-effects.
 *
 * Race-safe: the payment is claimed with a single conditional update, so a
 * concurrent verify-payment poll and Stripe webhook can never both apply
 * stock/coupon/salesCount. Each side-effect flag is also flipped with a
 * conditional `$set`, so a crash mid-way stays idempotent on retry.
 *
 * Fulfillment status follows the state machine: pending → paid; a canceled
 * order receiving a late payment becomes needs_attention (paid_after_cancel)
 * without touching stock. Insufficient stock after a successful charge is
 * flagged (needs_attention / insufficient_stock) instead of throwing, so the
 * webhook always acknowledges the event.
 *
 * @returns {Promise<{ claimed: boolean, status?: string, orderId: string|null }>}
 */
async function markOrderPaidFromSession(session) {
  const orderId = extractOrderId(session);
  if (!orderId) return { claimed: false, orderId: null };

  const paymentIntentId = extractPaymentIntentId(session);
  const $set = { paymentStatus: 'paid', paidAt: new Date() };
  if (paymentIntentId) $set.paymentIntentId = paymentIntentId;
  if (session.id) $set.stripeSessionId = session.id;
  // What Stripe actually captured (integer cents) — the source of truth for
  // refunds and reconciliation, independent of our own totalPrice.
  if (Number.isInteger(session.amount_total)) {
    $set.amountPaid = session.amount_total / 100;
  }

  let order = await Order.findOneAndUpdate(
    { _id: orderId, paymentStatus: { $nin: ['paid', 'refunded'] } },
    { $set },
    { new: true },
  );
  let claimed = true;

  if (
    order &&
    $set.amountPaid !== undefined &&
    Math.round(order.totalPrice * 100) !== session.amount_total
  ) {
    logger.warn(
      `Order ${order._id}: Stripe charged ${$set.amountPaid} but totalPrice is ${order.totalPrice}`,
    );
  }

  if (!order) {
    // Already claimed (concurrent caller) or a Stripe retry after a transient
    // failure. Re-enter only to finish outstanding side-effects; the flag
    // leases below make that idempotent.
    claimed = false;
    order = await Order.findById(orderId);
    if (!order || order.paymentStatus !== 'paid') {
      return { claimed: false, orderId: String(orderId) };
    }
    const pendingWork =
      !order.stockDecremented ||
      (order.couponId && !order.couponIncremented) ||
      !order.salesCountIncremented ||
      !order.confirmationEmailSent;
    if (!pendingWork || !['pending', 'paid'].includes(order.status)) {
      return {
        claimed: false,
        status: order.status,
        orderId: String(order._id),
      };
    }
  }

  const previousStatus = order.status;
  const transition = canTransitionOrderStatus(previousStatus, 'paid');

  if (claimed && !transition.ok) {
    // e.g. admin canceled before the (late) webhook: keep the money trail,
    // do not touch inventory, and surface it for a manual refund/decision.
    if (previousStatus === 'canceled') {
      await Order.updateOne(
        { _id: order._id, status: previousStatus },
        {
          $set: {
            status: 'needs_attention',
            attentionReason: 'paid_after_cancel',
          },
        },
      );
      logger.warn(
        `Order ${order._id} was paid after cancellation; flagged needs_attention`,
      );
      return {
        claimed: true,
        status: 'needs_attention',
        orderId: String(order._id),
      };
    }
    // Already paid/shipped/delivered/refunded/needs_attention: nothing to change
    return {
      claimed: true,
      status: previousStatus,
      orderId: String(order._id),
    };
  }

  const { status, attentionReason } = await applyPaidSideEffects(order);

  // A concurrent caller that lost the stock lease computes 'paid' and may
  // write pending → paid first, so the attention flag must also match 'paid'
  // — otherwise an oversold order would stay plain 'paid'.
  if (status === 'needs_attention') {
    await Order.updateOne(
      { _id: order._id, status: { $in: ['pending', 'paid'] } },
      { $set: { status, attentionReason } },
    );
  } else if (previousStatus === 'pending') {
    await Order.updateOne(
      { _id: order._id, status: 'pending' },
      { $set: { status, attentionReason } },
    );
  }

  // Re-read: a concurrent caller may have flagged the order. An oversold
  // (needs_attention) order must not get an "Order confirmed" email.
  const current = await Order.findById(order._id).select('status').lean();
  if (current?.status !== 'needs_attention') {
    await sendConfirmationEmailOnce(order);
  }

  return { claimed, status, orderId: String(order._id) };
}

async function handleCheckoutSessionCompleted(session, stripe) {
  let orderId = extractOrderId(session);
  if (
    (session.metadata?.kind === 'order_payment' ||
      session.mode === 'payment') &&
    isSessionPaid(session)
  ) {
    const result = await markOrderPaidFromSession(session);
    orderId = result.orderId || orderId;
  }
  await deleteTemporaryCoupon(stripe, session.metadata?.stripeCouponId);
  return orderId;
}

/**
 * Cancel a still-unpaid checkout order and give its reserved stock back.
 *
 * The cancel is conditional (only a pending, unpaid order), and the restock
 * is claimed separately by restoreStockOnce. So a webhook retry after a failed
 * restock still releases the hold, and the webhook and the reconciler can run
 * it concurrently without restocking twice.
 * @returns {Promise<boolean>} true when this call released the stock
 */
async function releaseUnpaidCheckout(orderId) {
  // On a replica set the cancel and the restock commit or abort together:
  // an expired checkout can no longer be left canceled-but-stock-held.
  if (supportsTransactions()) {
    return runInTransaction(async (session) => {
      await Order.updateOne(
        {
          _id: orderId,
          status: 'pending',
          paymentStatus: { $nin: ['paid', 'refunded'] },
        },
        { $set: { paymentStatus: 'failed', status: 'canceled' } },
        { session },
      );
      const order = await Order.findById(orderId).session(session);
      if (
        !order ||
        order.status !== 'canceled' ||
        ['paid', 'refunded'].includes(order.paymentStatus)
      ) {
        return false;
      }
      return restoreStockOnce(Order, Product, order, session);
    });
  }

  await Order.updateOne(
    {
      _id: orderId,
      status: 'pending',
      paymentStatus: { $nin: ['paid', 'refunded'] },
    },
    { $set: { paymentStatus: 'failed', status: 'canceled' } },
  );
  const order = await Order.findById(orderId);
  if (
    !order ||
    order.status !== 'canceled' ||
    ['paid', 'refunded'].includes(order.paymentStatus)
  ) {
    return false;
  }
  return restoreStockOnce(Order, Product, order);
}

/**
 * Session timed out (expires_at) or a delayed payment failed: fail a
 * still-unpaid order and release the stock reserved at checkout.
 */
async function handleCheckoutSessionExpired(session, stripe) {
  const orderId = extractOrderId(session);
  if (orderId) {
    await releaseUnpaidCheckout(orderId);
  }
  await deleteTemporaryCoupon(stripe, session.metadata?.stripeCouponId);
  return orderId;
}

// Stale = its Checkout session has certainly expired at Stripe (TTL plus
// clock-skew/latency margin), so nothing can still pay for it.
const STALE_CHECKOUT_GRACE_MS = 10 * 60 * 1000;

/**
 * Settle checkouts whose Stripe webhook never arrived: missed
 * `checkout.session.completed` (marked paid) or `.expired` (stock released).
 * Stripe is asked for the real session state before anything is released. A
 * lookup failure, or an async payment that is still settling, leaves the
 * order for the next run.
 *
 * Every write is claimed conditionally (markOrderPaidFromSession,
 * releaseUnpaidCheckout), so concurrent runs on several API instances can't
 * double-apply anything. No leader election is needed.
 * @returns {Promise<{ paid: number, released: number, skipped: number }>}
 */
async function reconcileStaleCheckouts({ now = Date.now(), limit = 100 } = {}) {
  const cutoff = new Date(
    now - CHECKOUT_SESSION_TTL_SECONDS * 1000 - STALE_CHECKOUT_GRACE_MS,
  );
  const stale = await Order.find({
    status: 'pending',
    paymentStatus: { $in: ['pending', 'failed'] },
    stockDecremented: true,
    stockRestored: false,
    createdAt: { $lt: cutoff },
  })
    .sort({ createdAt: 1 })
    .limit(limit)
    .select('_id stripeSessionId')
    .lean();

  const result = { paid: 0, released: 0, skipped: 0 };
  if (stale.length === 0) return result;

  let stripe = null;
  try {
    stripe = getStripeOrThrow();
  } catch {
    // Stripe no longer configured: no session can be paid, release on age.
  }

  for (const { _id, stripeSessionId } of stale) {
    try {
      if (stripe && stripeSessionId) {
        let session = await stripe.checkout.sessions.retrieve(stripeSessionId);
        if (session.status === 'open') {
          // Past expires_at but not yet closed at Stripe: close it first, so
          // it can't be paid after the stock goes back on sale.
          session = await stripe.checkout.sessions.expire(stripeSessionId);
        }
        if (session.status === 'complete') {
          if (isSessionPaid(session)) {
            await markOrderPaidFromSession(session);
            result.paid += 1;
          } else {
            // Delayed method still settling: async_payment_* will decide.
            result.skipped += 1;
          }
          continue;
        }
      }
      if (await releaseUnpaidCheckout(_id)) result.released += 1;
    } catch (err) {
      result.skipped += 1;
      logger.error({ err }, `Checkout reconciliation failed for order ${_id}`);
    }
  }

  if (result.paid || result.released) {
    logger.info(result, 'Reconciled stale checkouts');
  }
  return result;
}

async function handlePaymentIntentFailed(paymentIntent) {
  const orderId = paymentIntent?.metadata?.orderId || null;
  const or = [];
  if (paymentIntent?.id) or.push({ paymentIntentId: paymentIntent.id });
  if (orderId) or.push({ _id: orderId });
  if (or.length === 0) return null;

  const $set = { paymentStatus: 'failed' };
  if (paymentIntent?.id) $set.paymentIntentId = paymentIntent.id;

  const updated = await Order.findOneAndUpdate(
    { $or: or, paymentStatus: { $nin: ['paid', 'refunded'] } },
    { $set },
    { new: true },
  );
  return updated ? String(updated._id) : orderId;
}

/** Refund issued (dashboard or API): sync payment/fulfillment status and release stock. */
async function handleChargeRefunded(charge) {
  const paymentIntentId = extractPaymentIntentId(charge);
  const metaOrderId = charge?.metadata?.orderId || null;
  const or = [];
  if (paymentIntentId) or.push({ paymentIntentId });
  if (metaOrderId) or.push({ _id: metaOrderId });
  if (or.length === 0) return null;

  const order = await Order.findOne({ $or: or });
  if (!order) return metaOrderId;

  const refundAmount = Number(charge.amount_refunded || 0) / 100;
  const latestRefund = charge.refunds?.data?.[0];
  const $set = { refundAmount };
  if (latestRefund?.id) $set.refundId = latestRefund.id;

  const fullyRefunded =
    charge.refunded === true ||
    (charge.amount > 0 && charge.amount_refunded >= charge.amount);

  if (fullyRefunded) {
    $set.paymentStatus = 'refunded';
    if (!order.refundedAt) $set.refundedAt = new Date();
    if (canTransitionOrderStatus(order.status, 'refunded').ok) {
      $set.status = 'refunded';
      $set.attentionReason = '';
    }
  }

  await Order.updateOne({ _id: order._id }, { $set });

  // A refund on goods that already shipped (goodwill, or a return refund)
  // must not restock them — returns restock on 'received' instead.
  if (fullyRefunded && !hasOrderShipped(order)) {
    await restoreStockOnce(Order, Product, order);
  }
  return String(order._id);
}

module.exports = {
  CHECKOUT_SESSION_TTL_SECONDS,
  isSessionPaid,
  markOrderPaidFromSession,
  handleCheckoutSessionCompleted,
  handleCheckoutSessionExpired,
  releaseUnpaidCheckout,
  handlePaymentIntentFailed,
  handleChargeRefunded,
  reconcileStaleCheckouts,
};
