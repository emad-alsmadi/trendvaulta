const express = require('express');
const router = express.Router();

const { verfiyToken } = require('../middlewares/verfiyToken');
<<<<<<< HEAD
const { checkoutRateLimit } = require('../middlewares/rateLimit');
const { validate } = require('../middlewares/validate');
const {
  createCheckoutSessionSchema,
  verifyPaymentSchema,
} = require('../validators/payment.validator');
=======
const {
  checkoutRateLimit,
  verifyPaymentRateLimit,
  quoteRateLimit,
} = require('../middlewares/rateLimit');
>>>>>>> 67b9dc3e877d9b331e31c1fa941386f5e3b4c602
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
  validate(createCheckoutSessionSchema),
  createCheckoutSession,
);

router.post(
  '/payments/verify-payment',
  verifyPaymentRateLimit,
  verfiyToken,
  validate(verifyPaymentSchema),
  verifyPaymentStatus,
);

module.exports = router;
