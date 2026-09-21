const express = require('express');
const router = express.Router();

const { verfiyToken } = require('../middlewares/verfiyToken');
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

router.post(
  '/payments/checkout-session',
  checkoutRateLimit,
  verfiyToken,
  createCheckoutSession,
);

router.post(
  '/payments/verify-payment',
  verifyPaymentRateLimit,
  verfiyToken,
  verifyPaymentStatus,
);

module.exports = router;
