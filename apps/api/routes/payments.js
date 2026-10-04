const express = require('express');
const router = express.Router();

const { optionalVerifyToken } = require('../middlewares/optionalVerifyToken');
const {
  checkoutRateLimit,
  verifyPaymentRateLimit,
  quoteRateLimit,
} = require('../middlewares/rateLimit');
const {
  getPaymentsSetupStatus,
  quoteOrder,
  createCheckoutSession,
  verifyPaymentStatus,
} = require('../controllers/payment.controller');

router.get('/payments/setup-status', getPaymentsSetupStatus);

// Public: price a cart server-side (no order is created)
router.post('/payments/quote', quoteRateLimit, quoteOrder);

// Signed in or guest (plan P0-03): a guest sends `email` instead.
// optionalVerifyToken runs before the limiter so an authenticated caller is
// keyed by their own user id (not lumped into the shared 'anonymous'
// bucket with every other request from the same IP/NAT) — it never blocks
// the request, so guest checkout is unaffected.
router.post(
  '/payments/checkout-session',
  optionalVerifyToken,
  checkoutRateLimit,
  createCheckoutSession,
);

// The owner's session, or a guest's `guestToken` for that order
router.post(
  '/payments/verify-payment',
  optionalVerifyToken,
  verifyPaymentRateLimit,
  verifyPaymentStatus,
);

module.exports = router;
