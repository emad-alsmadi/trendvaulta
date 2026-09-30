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

// Signed in or guest (plan P0-03): a guest sends `email` instead
router.post(
  '/payments/checkout-session',
  checkoutRateLimit,
  optionalVerifyToken,
  createCheckoutSession,
);

// The owner's session, or a guest's `guestToken` for that order
router.post(
  '/payments/verify-payment',
  verifyPaymentRateLimit,
  optionalVerifyToken,
  verifyPaymentStatus,
);

module.exports = router;
