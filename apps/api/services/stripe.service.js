const Stripe = require('stripe');

function getStripeOrThrow() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    const err = new Error('Stripe is not configured');
    err.statusCode = 503;
    throw err;
  }
  return new Stripe(key);
}

function getFrontendBaseUrl() {
  const base =
    process.env.FRONTEND_URL ||
    process.env.PUBLIC_FRONTEND_URL ||
    'http://localhost:3001';
  return base.replace(/\/+$/, '');
}

/**
 * Refund a captured PaymentIntent (full refund unless amountCents is given).
 * Full refunds use a deterministic idempotency key so a retried admin action
 * cannot refund the same payment twice.
 * @param {import('stripe').Stripe} stripe
 * @param {string} paymentIntentId
 * @param {{ amountCents?: number }} [options]
 */
async function refundPaymentIntent(stripe, paymentIntentId, { amountCents } = {}) {
  if (!paymentIntentId) {
    const err = new Error('Missing payment intent id');
    err.statusCode = 400;
    throw err;
  }

  const params = { payment_intent: paymentIntentId };
  const requestOptions = {};
  if (Number.isInteger(amountCents) && amountCents > 0) {
    params.amount = amountCents;
  } else {
    requestOptions.idempotencyKey = `refund:${paymentIntentId}:full`;
  }

  return stripe.refunds.create(params, requestOptions);
}

module.exports = {
  getStripeOrThrow,
  getFrontendBaseUrl,
  refundPaymentIntent,
};
