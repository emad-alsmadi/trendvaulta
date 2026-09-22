const asyncHandler = require('express-async-handler');
const {
  Order,
  validateCreateOrder,
  validateQuote,
} = require('../models/Order');
const { Product } = require('../models/Product');
const StripeWebhookEvent = require('../models/StripeWebhookEvent');
const {
  getStripeOrThrow,
  getFrontendBaseUrl,
} = require('../services/stripe.service');
const {
  buildNormalizedOrderLines,
  quoteOrderLines,
  resolveShippingPrice,
  resolveTaxPrice,
  loadValidCouponByCode,
  calculateCouponDiscount,
  decrementStockForPaidOrder,
  restoreStockOnce,
  incrementCouponUsedCount,
  incrementSalesCountForPaidOrder,
} = require('../utils/commerce');
const { canTransitionOrderStatus } = require('../utils/orderTransitions');
const {
  claimWebhookEvent,
  markWebhookEventProcessed,
  releaseWebhookEvent,
} = require('../utils/stripeWebhookIdempotency');
const { sendOrderConfirmationEmail } = require('../utils/mail');
const { User } = require('../models/User');

function dollarsToCents(amount) {
  return Math.round(Number(amount) * 100);
}

const CHECKOUT_SESSION_TTL_SECONDS = 30 * 60;

function getPaymentsSetupStatus(_req, res) {
  const ready = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
  res.status(200).json({ ready });
}

/**
 * Public cart/checkout quote. Prices lines server-side, validates the coupon
 * and shipping, and reports stock/price drift as warnings. Creates nothing.
 * @route POST /api/payments/quote
 */
const quoteOrder = asyncHandler(async (req, res) => {
  const { error, value } = validateQuote(req.body || {});
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { items, couponCode, delivery, shippingMethod } = value;
  const { lines, itemsPrice, warnings } = await quoteOrderLines(Product, items);

  let discountAmount = 0;
  let couponValid = false;
  let couponMessage = null;
  if (couponCode) {
    const coupon = await loadValidCouponByCode(couponCode);
    const result = calculateCouponDiscount(coupon, itemsPrice);
    couponValid = result.valid;
    couponMessage = result.valid ? null : result.message;
    discountAmount = result.discountAmount;
  }

  const shippingPrice = await resolveShippingPrice({
    delivery,
    shippingMethod,
    itemsPrice,
  });
  const taxPrice = await resolveTaxPrice(itemsPrice);
  const totalPrice = Math.max(
    0,
    itemsPrice - discountAmount + shippingPrice + taxPrice,
  );

  res.status(200).json({
    lines,
    itemsPrice,
    discountAmount,
    couponValid,
    couponMessage,
    shippingPrice,
    taxPrice,
    totalPrice,
    warnings,
  });
});

const createCheckoutSession = asyncHandler(async (req, res) => {
  let stripe;
  try {
    stripe = getStripeOrThrow();
  } catch (_e) {
    return res.status(503).json({
      code: 'STRIPE_SECRET_MISSING',
      message:
        'Checkout is not available right now. Please try again later or contact support.',
      detail: 'Missing STRIPE_SECRET_KEY in backend/.env.',
    });
  }

  const userId = req.user?.id ?? req.user?._id;
  if (!userId) {
    return res.status(401).json({ message: 'Token is not valid!' });
  }

  const { error, value } = validateCreateOrder(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { items, shippingAddress, couponCode, delivery, shippingMethod } =
    value;

  let normalizedItems;
  let itemsPrice;
  try {
    ({ normalizedItems, itemsPrice } = await buildNormalizedOrderLines(
      Product,
      items,
    ));
  } catch (lineErr) {
    return res.status(lineErr.statusCode || 400).json({
      message: lineErr.message || 'Unable to build order lines',
    });
  }

  let discountAmount = 0;
  let couponId = null;
  let normalizedCouponCode = '';
  if (couponCode) {
    const coupon = await loadValidCouponByCode(couponCode);
    const result = calculateCouponDiscount(coupon, itemsPrice);
    if (!result.valid) {
      return res.status(400).json({ message: result.message });
    }
    discountAmount = result.discountAmount;
    couponId = coupon._id;
    normalizedCouponCode = coupon.code;
  }

  const shippingPrice = await resolveShippingPrice({
    delivery,
    shippingMethod,
    itemsPrice,
  });
  const taxPrice = await resolveTaxPrice(itemsPrice);
  const totalPrice = Math.max(
    0,
    itemsPrice - discountAmount + shippingPrice + taxPrice,
  );

  const order = await Order.create({
    user: userId,
    items: normalizedItems,
    shippingAddress: {
      ...shippingAddress,
      notes: shippingAddress.notes || '',
    },
    status: 'pending',
    itemsPrice,
    shippingPrice,
    taxPrice,
    discountAmount,
    couponCode: normalizedCouponCode,
    couponId,
    totalPrice,
    paymentStatus: 'pending',
    stripeSessionId: '',
    paymentIntentId: '',
    stockDecremented: false,
    salesCountIncremented: false,
  });

  const lineItems = normalizedItems.map((it) => ({
    price_data: {
      currency: 'usd',
      product_data: {
        name: it.title,
        images:
          it.cover && /^https?:\/\//i.test(it.cover) ? [it.cover] : undefined,
      },
      unit_amount: dollarsToCents(it.price),
    },
    quantity: it.qty,
  }));

  if (shippingPrice > 0) {
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: { name: 'Shipping' },
        unit_amount: dollarsToCents(shippingPrice),
      },
      quantity: 1,
    });
  }

  if (taxPrice > 0) {
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: { name: 'Tax' },
        unit_amount: dollarsToCents(taxPrice),
      },
      quantity: 1,
    });
  }

  const frontend = getFrontendBaseUrl();

  let session;
  try {
    const sessionParams = {
      mode: 'payment',
      line_items: lineItems,
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_SESSION_TTL_SECONDS,
      success_url: `${frontend}/checkout/success?order_id=${order._id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontend}/checkout/cancel?order_id=${order._id}`,
      client_reference_id: String(order._id),
      metadata: {
        orderId: String(order._id),
        userId: String(userId),
        kind: 'order_payment',
        totalPrice: String(totalPrice),
      },
      payment_intent_data: {
        metadata: {
          orderId: String(order._id),
          userId: String(userId),
        },
      },
    };

    // Apply server-calculated discount via a one-time Stripe coupon (unit_amount cannot be negative)
    if (discountAmount > 0) {
      const stripeCoupon = await stripe.coupons.create({
        amount_off: dollarsToCents(discountAmount),
        currency: 'usd',
        duration: 'once',
        name: normalizedCouponCode || 'Order discount',
      });
      sessionParams.discounts = [{ coupon: stripeCoupon.id }];
      // Remembered so the webhook can delete the one-off coupon afterwards
      sessionParams.metadata.stripeCouponId = stripeCoupon.id;
    }

    session = await stripe.checkout.sessions.create(sessionParams);
  } catch (stripeErr) {
    await Order.findByIdAndDelete(order._id);
    const raw =
      stripeErr && typeof stripeErr.message === 'string'
        ? stripeErr.message
        : 'Stripe Checkout could not be created';
    return res.status(502).json({
      message:
        'We could not open the secure payment page. Please try again shortly.',
      detail: `${raw} — Verify Stripe keys and test/live mode match.`,
    });
  }

  order.stripeSessionId = session.id;
  await order.save();

  res.status(200).json({
    url: session.url,
    orderId: String(order._id),
    sessionId: session.id,
  });
});

function extractOrderId(obj) {
  return obj?.metadata?.orderId || obj?.client_reference_id || null;
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
    console.warn(
      `Could not delete temporary Stripe coupon ${couponId}:`,
      couponErr?.message || couponErr,
    );
  }
}

async function sendConfirmationEmailOnce(order) {
  if (order.confirmationEmailSent) return;
  try {
    const user = await User.findById(order.user).select('email').lean();
    const sent = await sendOrderConfirmationEmail({
      to: user?.email,
      orderId: String(order._id),
      totalPrice: order.totalPrice,
      items: order.items,
    });
    if (sent) {
      await Order.updateOne(
        { _id: order._id, confirmationEmailSent: false },
        { $set: { confirmationEmailSent: true } },
      );
    }
  } catch (mailErr) {
    console.error(
      'Order confirmation email error (payment still paid):',
      mailErr?.message || mailErr,
    );
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
/**
 * Lease a one-shot side-effect flag on the order. Returns true when this
 * caller won the lease (flag was false); the flag is flipped BEFORE the
 * side-effect runs so concurrent callers cannot double-apply it. Callers
 * must release the lease (flip back) if the side-effect fails.
 */
async function leaseOrderFlag(orderId, flag) {
  const res = await Order.updateOne(
    { _id: orderId, [flag]: false },
    { $set: { [flag]: true } },
  );
  return (res.modifiedCount ?? res.nModified ?? 0) === 1;
}

async function releaseOrderFlag(orderId, flag) {
  await Order.updateOne({ _id: orderId }, { $set: { [flag]: false } }).catch(
    () => {},
  );
}

/**
 * Run the post-payment side-effects (stock, coupon, salesCount, email) for an
 * order that is already `paymentStatus: 'paid'`. Every effect is guarded by a
 * flag lease, so this is safe to call from concurrent callers and on Stripe
 * retries after a transient failure.
 * @returns {Promise<{ status: string, attentionReason: string }>}
 */
async function applyPaidSideEffects(order) {
  let status = 'paid';
  let attentionReason = '';

  if (await leaseOrderFlag(order._id, 'stockDecremented')) {
    try {
      await decrementStockForPaidOrder(Product, order);
    } catch (stockErr) {
      await releaseOrderFlag(order._id, 'stockDecremented');
      if (stockErr?.statusCode !== 409) throw stockErr;
      status = 'needs_attention';
      attentionReason = 'insufficient_stock';
      console.error(
        `Order ${order._id} paid but stock is insufficient:`,
        stockErr.message,
      );
    }
  }

  if (order.couponId && (await leaseOrderFlag(order._id, 'couponIncremented'))) {
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

  return { status, attentionReason };
}

async function markOrderPaidFromSession(session) {
  const orderId = extractOrderId(session);
  if (!orderId) return { claimed: false, orderId: null };

  const paymentIntentId = extractPaymentIntentId(session);
  const $set = { paymentStatus: 'paid', paidAt: new Date() };
  if (paymentIntentId) $set.paymentIntentId = paymentIntentId;
  if (session.id) $set.stripeSessionId = session.id;

  let order = await Order.findOneAndUpdate(
    { _id: orderId, paymentStatus: { $nin: ['paid', 'refunded'] } },
    { $set },
    { new: true },
  );
  let claimed = true;

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
      return { claimed: false, status: order.status, orderId: String(order._id) };
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
        { $set: { status: 'needs_attention', attentionReason: 'paid_after_cancel' } },
      );
      console.warn(
        `Order ${order._id} was paid after cancellation; flagged needs_attention`,
      );
      return { claimed: true, status: 'needs_attention', orderId: String(order._id) };
    }
    // Already paid/shipped/delivered/refunded/needs_attention: nothing to change
    return { claimed: true, status: previousStatus, orderId: String(order._id) };
  }

  const { status, attentionReason } = await applyPaidSideEffects(order);

  if (previousStatus === 'pending' || status === 'needs_attention') {
    await Order.updateOne(
      { _id: order._id, status: previousStatus },
      { $set: { status, attentionReason } },
    );
  }

  await sendConfirmationEmailOnce(order);

  return { claimed, status, orderId: String(order._id) };
}

async function handleCheckoutSessionCompleted(session, stripe) {
  let orderId = extractOrderId(session);
  if (
    session.metadata?.kind === 'order_payment' ||
    session.mode === 'payment'
  ) {
    const result = await markOrderPaidFromSession(session);
    orderId = result.orderId || orderId;
  }
  await deleteTemporaryCoupon(stripe, session.metadata?.stripeCouponId);
  return orderId;
}

/** Session timed out (expires_at): fail a still-unpaid order. Stock is never reserved before payment. */
async function handleCheckoutSessionExpired(session, stripe) {
  const orderId = extractOrderId(session);
  if (orderId) {
    await Order.updateOne(
      {
        _id: orderId,
        status: 'pending',
        paymentStatus: { $nin: ['paid', 'refunded'] },
      },
      { $set: { paymentStatus: 'failed', status: 'canceled' } },
    );
  }
  await deleteTemporaryCoupon(stripe, session.metadata?.stripeCouponId);
  return orderId;
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

  if (fullyRefunded) {
    await restoreStockOnce(Order, Product, order);
  }
  return String(order._id);
}

const stripeWebhook = asyncHandler(async (req, res) => {
  const stripe = getStripeOrThrow();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return res.status(500).json({ message: 'Stripe webhook secret missing' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    return res
      .status(400)
      .send(`Webhook signature verification failed: ${err.message}`);
  }

  const claim = await claimWebhookEvent(StripeWebhookEvent, event.id, {
    type: event.type,
  });
  if (claim.duplicate) {
    return res.status(200).json({ received: true, duplicate: true });
  }

  let orderId = null;
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        orderId = await handleCheckoutSessionCompleted(event.data.object, stripe);
        break;
      case 'checkout.session.expired':
        orderId = await handleCheckoutSessionExpired(event.data.object, stripe);
        break;
      case 'payment_intent.payment_failed':
        orderId = await handlePaymentIntentFailed(event.data.object);
        break;
      case 'charge.refunded':
        orderId = await handleChargeRefunded(event.data.object);
        break;
      default:
        break;
    }
  } catch (procErr) {
    await releaseWebhookEvent(StripeWebhookEvent, event.id);
    console.error('Stripe webhook processing error:', procErr);
    return res.status(500).json({ message: 'Webhook handler failed' });
  }

  await markWebhookEventProcessed(StripeWebhookEvent, event.id, {
    orderId,
    status: 'processed',
  });

  res.status(200).json({ received: true });
});

const verifyPaymentStatus = asyncHandler(async (req, res) => {
  const stripe = getStripeOrThrow();
  const userId = req.user?.id ?? req.user?._id;
  if (!userId) {
    return res.status(401).json({ message: 'Token is not valid!' });
  }

  const { orderId } = req.body;
  if (!orderId) {
    return res.status(400).json({ message: 'Order ID is required' });
  }

  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  if (order.user.toString() !== String(userId)) {
    return res
      .status(403)
      .json({ message: 'Not authorized to access this order' });
  }

  if (order.paymentStatus === 'paid') {
    return res.status(200).json({ paymentStatus: 'paid', alreadyPaid: true });
  }

  if (!order.stripeSessionId) {
    return res
      .status(400)
      .json({ message: 'No Stripe session associated with this order' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(
      order.stripeSessionId,
    );

    if (session.payment_status === 'paid' && session.status === 'complete') {
      await markOrderPaidFromSession(session);
      return res.status(200).json({ paymentStatus: 'paid', verified: true });
    }

    return res.status(200).json({
      paymentStatus: session.payment_status,
      sessionStatus: session.status,
      verified: false,
    });
  } catch (stripeErr) {
    console.error('Stripe session retrieval error:', stripeErr);
    return res
      .status(500)
      .json({ message: 'Failed to verify payment status with Stripe' });
  }
});

module.exports = {
  getPaymentsSetupStatus,
  quoteOrder,
  createCheckoutSession,
  stripeWebhook,
  verifyPaymentStatus,
};
