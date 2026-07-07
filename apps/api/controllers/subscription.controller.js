const asyncHandler = require('express-async-handler');
const { User } = require('../models/User');
const Subscription = require('../models/Subscription');
const { getStripeOrThrow, getFrontendBaseUrl } = require('../services/stripe.service');

/**
 * Returns flags used by the storefront to enable/disable subscription checkout.
 * @desc Subscription billing readiness (Stripe env)
 * @route GET /api/subscriptions/setup-status
 * @method GET
 * @access Public
 */
function getSubscriptionSetupStatus(req, res) {
  const stripeOk = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
  const priceOk = Boolean(process.env.STRIPE_SUBSCRIPTION_PRICE_ID?.trim());
  res.status(200).json({
    ready: stripeOk && priceOk,
    stripeSecretConfigured: stripeOk,
    subscriptionPriceConfigured: priceOk,
  });
}

/**
 * Creates a Stripe Billing Checkout Session (subscription mode) for the signed-in user.
 * @desc Start Craftify Pro subscription checkout
 * @route POST /api/subscriptions/checkout-session
 * @method POST
 * @access Private (Bearer token)
 */
const createSubscriptionCheckoutSession = asyncHandler(async (req, res) => {
  const priceId = process.env.STRIPE_SUBSCRIPTION_PRICE_ID?.trim();
  if (!priceId) {
    return res.status(422).json({
      code: 'SUBSCRIPTION_PRICE_MISSING',
      message:
        'Membership signup is not available at the moment. Please try again later or contact support.',
      detail:
        'Missing STRIPE_SUBSCRIPTION_PRICE_ID. In Stripe Dashboard → Product catalog, create a recurring price and set price_… in backend/.env.',
    });
  }

  let stripe;
  try {
    stripe = getStripeOrThrow();
  } catch (_e) {
    return res.status(422).json({
      code: 'STRIPE_SECRET_MISSING',
      message:
        'We cannot process memberships right now. Please try again later or contact support.',
      detail:
        'Missing STRIPE_SECRET_KEY. Add your Stripe secret key (sk_test_… / sk_live_…) to backend/.env.',
    });
  }

  const userId = req.user?.id ?? req.user?._id;
  if (!userId) {
    return res.status(401).json({ message: 'Token is not valid!' });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: String(user._id) },
    });
    customerId = customer.id;
    user.stripeCustomerId = customerId;
    await user.save();
  }

  const frontend = getFrontendBaseUrl();

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontend}/profile?subscription=success`,
      cancel_url: `${frontend}/pricing?subscription=canceled`,
      metadata: {
        userId: String(user._id),
        kind: 'subscription_checkout',
      },
      subscription_data: {
        metadata: { userId: String(user._id) },
      },
    });
  } catch (stripeErr) {
    const raw =
      stripeErr && typeof stripeErr.message === 'string'
        ? stripeErr.message
        : 'Stripe subscription checkout failed';
    return res.status(502).json({
      message:
        'We could not open the secure payment page. Please try again in a few minutes.',
      detail: `${raw} — Confirm STRIPE_SUBSCRIPTION_PRICE_ID is a recurring price in the same Stripe mode (test/live) as STRIPE_SECRET_KEY.`,
    });
  }

  res.status(200).json({ url: session.url });
});

/**
 * Creates a Stripe Customer Portal session so the user can manage billing.
 * @desc Open Stripe billing portal
 * @route POST /api/subscriptions/portal
 * @method POST
 * @access Private (Bearer token)
 */
const createBillingPortalSession = asyncHandler(async (req, res) => {
  let stripe;
  try {
    stripe = getStripeOrThrow();
  } catch (_e) {
    return res.status(422).json({
      code: 'STRIPE_SECRET_MISSING',
      message:
        'Billing management is unavailable right now. Please try again later or contact support.',
      detail: 'Missing STRIPE_SECRET_KEY in backend/.env.',
    });
  }
  const userId = req.user?.id ?? req.user?._id;
  if (!userId) {
    return res.status(401).json({ message: 'Token is not valid!' });
  }

  const user = await User.findById(userId);
  if (!user?.stripeCustomerId) {
    return res.status(400).json({
      message:
        'There is no billing profile on file yet. Subscribe first, then you can manage billing.',
    });
  }

  const frontend = getFrontendBaseUrl();
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${frontend}/profile`,
  });

  res.status(200).json({ url: session.url });
});

/**
 * Returns the latest subscription record synced from Stripe webhooks for this user.
 * @desc Current user subscription
 * @route GET /api/subscriptions/me
 * @method GET
 * @access Private (Bearer token)
 */
const getMySubscription = asyncHandler(async (req, res) => {
  const userId = req.user?.id ?? req.user?._id;
  if (!userId) {
    return res.status(401).json({ message: 'Token is not valid!' });
  }

  const sub = await Subscription.findOne({ user: userId })
    .sort({ updatedAt: -1 })
    .lean();

  res.status(200).json(sub || null);
});

module.exports = {
  getSubscriptionSetupStatus,
  createSubscriptionCheckoutSession,
  createBillingPortalSession,
  getMySubscription,
};
