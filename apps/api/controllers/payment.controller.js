/**
 * Payment HTTP layer: request validation, the Stripe Checkout session
 * creation endpoint, the webhook endpoint and the verify-payment poll.
 * All payment domain logic (marking orders paid, side-effects, refund
 * syncing, stale-checkout reconciliation) lives in
 * services/payment.service.js.
 */

const asyncHandler = require('express-async-handler');
const { validationBody } = require('../utils/errors');
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { Order } = require('../models/Order');
const { Product } = require('../models/Product');
const StripeWebhookEvent = require('../models/StripeWebhookEvent');
const {
  validateCreateOrder,
  validateQuote,
} = require('../validators/order.validator');
const {
  getStripeOrThrow,
  getFrontendBaseUrl,
} = require('../services/stripe.service');
const {
  CHECKOUT_SESSION_TTL_SECONDS,
  isSessionPaid,
  markOrderPaidFromSession,
  handleCheckoutSessionCompleted,
  handleCheckoutSessionExpired,
  handlePaymentIntentFailed,
  handleChargeRefunded,
} = require('../services/payment.service');
const {
  buildNormalizedOrderLines,
  computeOrderTotal,
  quoteOrderLines,
  resolveFulfillment,
  resolveShippingPrice,
  resolveTaxPrice,
  loadValidCouponByCode,
  calculateCouponDiscount,
  checkCouponUsage,
  decrementStockForPaidOrder,
  restoreStockOnce,
} = require('../services/commerce.service');
const {
  guestOrderToken,
  isValidGuestToken,
} = require('../services/guestOrders.service');
const {
  claimWebhookEvent,
  markWebhookEventProcessed,
  releaseWebhookEvent,
} = require('../utils/stripeWebhookIdempotency');
const {
  supportsTransactions,
  runInTransaction,
} = require('../utils/transactions');

function dollarsToCents(amount) {
  return Math.round(Number(amount) * 100);
}

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
    return res.status(400).json(validationBody(error));
  }

  const { items, couponCode, shippingAddress } = value;
  // Same normalisation as checkout, so the quote matches what is charged.
  const fulfillment = resolveFulfillment(value);
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
    ...fulfillment,
    itemsPrice,
    country: shippingAddress?.country,
    zip: shippingAddress?.zip,
    region: shippingAddress?.city,
  });
  const taxPrice = await resolveTaxPrice(itemsPrice);
  const totalPrice = computeOrderTotal({
    itemsPrice,
    discountAmount,
    shippingPrice,
    taxPrice,
  });

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
    // The operator detail (env var name) never reaches the client — only
    // the server log, which is where it's actually actionable.
    logger.error(
      'Checkout attempted with STRIPE_SECRET_KEY missing from the backend environment',
    );
    return res.status(503).json({
      code: 'STRIPE_SECRET_MISSING',
      message:
        'Checkout is not available right now. Please try again later or contact support.',
      ...(process.env.NODE_ENV !== 'production'
        ? { detail: 'Missing STRIPE_SECRET_KEY in backend/.env.' }
        : {}),
    });
  }

  // Signed in, or a guest (decision D2): optionalVerifyToken on the route
  const userId = req.user?.id ?? req.user?._id ?? null;

  const { error, value } = validateCreateOrder(req.body);
  if (error) {
    return res.status(400).json(validationBody(error));
  }

  const { items, shippingAddress, couponCode } = value;
  // A guest's receipt and order link go to this address
  const guestEmail = userId ? '' : value.email || '';
  if (!userId && !guestEmail) {
    return res.status(400).json({
      code: 'GUEST_EMAIL_REQUIRED',
      message: 'Enter your email address to check out as a guest.',
    });
  }
  // Priced AND stored from the same normalised values (pickup = 'none').
  const fulfillment = resolveFulfillment(value);

  let normalizedItems;
  let itemsPrice;
  try {
    ({ normalizedItems, itemsPrice } = await buildNormalizedOrderLines(
      Product,
      items,
    ));
  } catch (lineErr) {
    return res.status(lineErr.statusCode || 400).json({
      // Only our own string codes (a Mongo error's numeric code stays private)
      ...(typeof lineErr.code === 'string' ? { code: lineErr.code } : {}),
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
      return res.status(400).json({
        code: result.code,
        ...(result.params && { params: result.params }),
        message: result.message,
      });
    }
    const usage = await checkCouponUsage(coupon, { userId, email: guestEmail });
    if (!usage.valid) {
      return res.status(400).json({
        code: usage.code,
        ...(usage.params && { params: usage.params }),
        message: usage.message,
      });
    }
    discountAmount = result.discountAmount;
    couponId = coupon._id;
    normalizedCouponCode = coupon.code;
  }

  const shippingPrice = await resolveShippingPrice({
    ...fulfillment,
    itemsPrice,
    country: shippingAddress.country,
    zip: shippingAddress.zip,
    region: shippingAddress.city,
  });
  const taxPrice = await resolveTaxPrice(itemsPrice);
  const totalPrice = computeOrderTotal({
    itemsPrice,
    discountAmount,
    shippingPrice,
    taxPrice,
  });

  const order = await Order.create({
    user: userId,
    guestEmail,
    // A guest's emails follow the storefront language (P1-02)
    locale: value.locale || 'en',
    items: normalizedItems,
    shippingAddress: {
      ...shippingAddress,
      notes: shippingAddress.notes || '',
    },
    status: 'pending',
    delivery: fulfillment.delivery,
    shippingMethod: fulfillment.shippingMethod,
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

  // Reserve the stock now rather than at payment, so two shoppers can't both
  // pay for the last unit. On a replica set the decrement and the flag
  // commit together — a failure can no longer leave stock held under an
  // order whose flag says it isn't (which would double-decrement at
  // payment). Elsewhere the flag still lands only after the decrement.
  try {
    if (supportsTransactions()) {
      await runInTransaction(async (session) => {
        await decrementStockForPaidOrder(Product, order, session);
        await Order.updateOne(
          { _id: order._id },
          { $set: { stockDecremented: true } },
          { session },
        );
      });
    } else {
      await decrementStockForPaidOrder(Product, order);
      await Order.updateOne(
        { _id: order._id },
        { $set: { stockDecremented: true } },
      );
    }
  } catch (stockErr) {
    await Order.findByIdAndDelete(order._id);
    if (stockErr?.code !== 'INSUFFICIENT_STOCK') throw stockErr;
    return res.status(409).json({
      code: 'OUT_OF_STOCK',
      message: stockErr.message,
    });
  }
  order.stockDecremented = true;

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
        userId: userId ? String(userId) : '',
        kind: 'order_payment',
        totalPrice: String(totalPrice),
      },
      payment_intent_data: {
        metadata: {
          orderId: String(order._id),
          userId: userId ? String(userId) : '',
        },
      },
      // Stripe prefills (and receipts to) the address the guest typed
      ...(guestEmail ? { customer_email: guestEmail } : {}),
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
    try {
      await restoreStockOnce(Order, Product, order);
      await Order.findByIdAndDelete(order._id);
    } catch (restoreErr) {
      // Keep the pending order: the checkout reconciler releases its hold
      // once it is stale (no session id means nothing can pay for it).
      logger.error(
        { err: restoreErr },
        `Order ${order._id}: could not release reserved stock after a Stripe error`,
      );
    }
    const raw =
      stripeErr && typeof stripeErr.message === 'string'
        ? stripeErr.message
        : 'Stripe Checkout could not be created';
    logger.error(
      { err: stripeErr },
      `Stripe Checkout session creation failed: ${raw}`,
    );
    return res.status(502).json({
      message:
        'We could not open the secure payment page. Please try again shortly.',
      ...(process.env.NODE_ENV !== 'production'
        ? { detail: `${raw} — Verify Stripe keys and test/live mode match.` }
        : {}),
    });
  }

  order.stripeSessionId = session.id;
  await order.save();

  res.status(200).json({
    url: session.url,
    orderId: String(order._id),
    sessionId: session.id,
    // Lets the success page confirm payment and link to the order without
    // an account; the same token is in the confirmation email.
    ...(guestEmail ? { guestToken: guestOrderToken(order) } : {}),
  });
});

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
      case 'checkout.session.async_payment_succeeded':
        orderId = await handleCheckoutSessionCompleted(
          event.data.object,
          stripe,
        );
        break;
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed':
        orderId = await handleCheckoutSessionExpired(event.data.object, stripe);
        break;
      case 'payment_intent.payment_failed':
        orderId = await handlePaymentIntentFailed(event.data.object);
        break;
      case 'charge.refunded':
        orderId = await handleChargeRefunded(event.data.object);
        break;
      // payment_intent.succeeded is deliberately ignored: writing 'paid' there
      // skipped stock/coupon/email side-effects and the paid-after-cancel
      // check. checkout.session.* events (and verify-payment) are the source
      // of truth and go through markOrderPaidFromSession.
      default:
        break;
    }
  } catch (procErr) {
    await releaseWebhookEvent(StripeWebhookEvent, event.id);
    logger.error({ err: procErr }, 'Stripe webhook processing error');
    return res.status(500).json({
      code: 'WEBHOOK_HANDLER_FAILED',
      message: 'Webhook handler failed',
    });
  }

  await markWebhookEventProcessed(StripeWebhookEvent, event.id, {
    orderId,
    status: 'processed',
  });

  res.status(200).json({ received: true });
});

const verifyPaymentStatus = asyncHandler(async (req, res) => {
  const stripe = getStripeOrThrow();
  // The owner's session, or a guest's order token (optionalVerifyToken)
  const userId = req.user?.id ?? req.user?._id ?? null;

  const { orderId, guestToken } = req.body || {};
  if (!orderId || !mongoose.isValidObjectId(orderId)) {
    return res
      .status(400)
      .json({ code: 'VALIDATION_ERROR', message: 'Order ID is required' });
  }

  const order = await Order.findById(orderId);
  if (!order) {
    return res
      .status(404)
      .json({ code: 'NOT_FOUND', message: 'Order not found' });
  }

  const isOwner = Boolean(
    userId && order.user && String(order.user) === String(userId),
  );
  if (!isOwner && !isValidGuestToken(order, guestToken)) {
    return res.status(userId || guestToken ? 403 : 401).json({
      code: 'FORBIDDEN',
      message: 'Not authorized to access this order',
    });
  }

  if (order.paymentStatus === 'paid') {
    return res.status(200).json({ paymentStatus: 'paid', alreadyPaid: true });
  }

  if (!order.stripeSessionId) {
    return res.status(400).json({
      code: 'NO_STRIPE_SESSION',
      message: 'No Stripe session associated with this order',
    });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(
      order.stripeSessionId,
    );

    if (isSessionPaid(session) && session.status === 'complete') {
      await markOrderPaidFromSession(session);
      return res.status(200).json({ paymentStatus: 'paid', verified: true });
    }

    return res.status(200).json({
      paymentStatus: session.payment_status,
      sessionStatus: session.status,
      verified: false,
    });
  } catch (stripeErr) {
    logger.error({ err: stripeErr }, 'Stripe session retrieval error');
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
