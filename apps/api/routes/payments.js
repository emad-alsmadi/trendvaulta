const express = require('express');
const router = express.Router();

const { verfiyToken } = require('../middlewares/verfiyToken');
const { checkoutRateLimit } = require('../middlewares/rateLimit');
const { validate } = require('../middlewares/validate');
const {
  createCheckoutSessionSchema,
  verifyPaymentSchema,
} = require('../validators/payment.validator');
const {
  getPaymentsSetupStatus,
  createCheckoutSession,
  verifyPaymentStatus,
} = require('../controllers/payment.controller');

router.get('/payments/setup-status', getPaymentsSetupStatus);

router.post(
  '/payments/checkout-session',
  checkoutRateLimit,
  verfiyToken,
  validate(createCheckoutSessionSchema),
  createCheckoutSession,
);

router.post(
  '/payments/verify-payment',
  checkoutRateLimit,
  verfiyToken,
  validate(verifyPaymentSchema),
  verifyPaymentStatus,
);

module.exports = router;
