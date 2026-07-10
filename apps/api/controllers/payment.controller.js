const asyncHandler = require('express-async-handler');
const { Order, validateCreateOrder } = require('../models/Order');
const { Template } = require('../models/Template');
const StripeWebhookEvent = require('../models/StripeWebhookEvent');
const Subscription = require('../models/Subscription');
const {
  getStripeOrThrow,
  getFrontendBaseUrl,
} = require('../services/stripe.service');

function dollarsToCents(amount) {
  return Math.round(Number(amount) * 100);
}

async function buildNormalizedOrderLines(items) {
  const templateIds = items.map((i) => i.template);
  const templates = await Template.find({ _id: { $in: templateIds } });
  if (templates.length !== templateIds.length) {
    const err = new Error('One or more templates not found');
    err.statusCode = 400;
    throw err;
  }

  const templatesById = new Map(templates.map((t) => [String(t._id), t]));

  const normalizedItems = items.map((i) => {
    const t = templatesById.get(String(i.template));
    if (!t) return null;
    return {
      template: t._id,
      title: t.title,
      price: Number(t.price),
      qty: Number(i.qty),
      cover: t.cover,
    };
  });

  if (normalizedItems.some((x) => !x)) {
    const err = new Error('One or more templates not found');
    err.statusCode = 404;
    throw err;
  }

  const itemsPrice = normalizedItems.reduce(
    (sum, it) => sum + it.price * it.qty,
    0,
  );

  return { normalizedItems, itemsPrice };
}

/**
 * Public flag so the storefront can skip Stripe Checkout when the secret key is not set.
 * @desc One-time payment (Stripe) readiness
 * @route GET /api/payments/setup-status
 * @method GET
 * @access Public
 */
function getPaymentsSetupStatus(_req, res) {
  const ready = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
  res.status(200).json({ ready });
}

/**
 * Creates order draft + Stripe Checkout Session (payment mode) for template purchases.
 * @desc One-time cart checkout via Stripe
 * @route POST /api/payments/checkout-session
 * @method POST
 * @access Private (Bearer token)
 */
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

  const { items, shippingAddress } = value;
  const shippingPrice = Number(value.shippingPrice ?? 0);
  const taxPrice = Number(value.taxPrice ?? 0);

  const { normalizedItems, itemsPrice } =
    await buildNormalizedOrderLines(items);
  const totalPrice = itemsPrice + shippingPrice + taxPrice;

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
    totalPrice,
    paymentStatus: 'pending',
    stripeSessionId: '',
    paymentIntentId: '',
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
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: `${frontend}/checkout/success?order_id=${order._id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontend}/checkout/cancel?order_id=${order._id}`,
      client_reference_id: String(order._id),
      metadata: {
        orderId: String(order._id),
        userId: String(userId),
        kind: 'order_payment',
      },
      payment_intent_data: {
        metadata: {
          orderId: String(order._id),
          userId: String(userId),
        },
      },
    });
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

async function markOrderPaidFromSession(session) {
  const orderId = session.metadata?.orderId || session.client_reference_id;
  if (!orderId) return;

  const order = await Order.findById(orderId);
  if (!order) return;

  if (order.paymentStatus === 'paid') return;

  const pi = session.payment_intent;
  const paymentIntentId = typeof pi === 'string' ? pi : pi?.id || '';

  order.paymentStatus = 'paid';
  order.status = 'paid';
  order.stripeSessionId = session.id || order.stripeSessionId;
  order.paymentIntentId = paymentIntentId || order.paymentIntentId;
  order.paidAt = new Date();
  await order.save();
}

async function upsertSubscriptionFromStripe(subscription, fallbackUserId) {
  let userId = subscription.metadata?.userId || fallbackUserId || null;
  if (!userId) {
    const existing = await Subscription.findOne({
      stripeSubscriptionId: subscription.id,
    })
      .select('user')
      .lean();
    userId = existing?.user ? String(existing.user) : null;
  }
  if (!userId) {
    console.warn(
      'Stripe subscription event without user mapping:',
      subscription.id,
    );
    return;
  }

  const priceId = subscription.items?.data?.[0]?.price?.id || '';

  await Subscription.findOneAndUpdate(
    { stripeSubscriptionId: subscription.id },
    {
      user: userId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : undefined,
    },
    { upsert: true, new: true },
  );
}

async function handleCheckoutSessionCompleted(session) {
  if (session.mode === 'subscription') {
    const subId = session.subscription;
    if (!subId) return;
    const stripe = getStripeOrThrow();
    const fullSub =
      typeof subId === 'string'
        ? await stripe.subscriptions.retrieve(subId)
        : subId;
    const userId = session.metadata?.userId;
    await upsertSubscriptionFromStripe(fullSub, userId);
    return;
  }

  if (
    session.metadata?.kind === 'order_payment' ||
    session.mode === 'payment'
  ) {
    await markOrderPaidFromSession(session);
  }
}

/**
 * Verifies Stripe webhook signatures and syncs paid orders / subscriptions.
 * @desc Stripe webhook receiver (raw body)
 * @route POST /api/webhooks/stripe
 * @method POST
 * @access Stripe only (signing secret)
 */
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

  try {
    await StripeWebhookEvent.create({ eventId: event.id });
  } catch (e) {
    if (e && e.code === 11000) {
      return res.status(200).json({ received: true, duplicate: true });
    }
    throw e;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await upsertSubscriptionFromStripe(sub, sub.metadata?.userId);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subId = invoice.subscription;
        if (subId) {
          await Subscription.findOneAndUpdate(
            { stripeSubscriptionId: String(subId) },
            { status: 'past_due' },
          );
        }
        break;
      }
      default:
        break;
    }
  } catch (procErr) {
    await StripeWebhookEvent.deleteOne({ eventId: event.id }).catch(() => {});
    console.error('Stripe webhook processing error:', procErr);
    return res.status(500).json({ message: 'Webhook handler failed' });
  }

  res.status(200).json({ received: true });
});

/**
 * Verify payment status from Stripe and update order if paid
 * @desc Manually verify payment status (fallback for webhook issues)
 * @route POST /api/payments/verify-payment
 * @method POST
 * @access Private (Bearer token)
 */
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

  if (order.user.toString() !== userId) {
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
    } else {
      return res.status(200).json({
        paymentStatus: session.payment_status,
        sessionStatus: session.status,
        verified: false,
      });
    }
  } catch (stripeErr) {
    console.error('Stripe session retrieval error:', stripeErr);
    return res
      .status(500)
      .json({ message: 'Failed to verify payment status with Stripe' });
  }
});

module.exports = {
  getPaymentsSetupStatus,
  createCheckoutSession,
  stripeWebhook,
  verifyPaymentStatus,
};
