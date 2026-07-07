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

module.exports = {
  getStripeOrThrow,
  getFrontendBaseUrl,
};
