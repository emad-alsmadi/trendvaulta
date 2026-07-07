const express = require('express');
const router = express.Router();

const { verfiyToken } = require('../middlewares/verfiyToken');
const {
  getPaymentsSetupStatus,
  createCheckoutSession,
} = require('../controllers/payment.controller');

/**
 * @desc Whether Stripe one-time Checkout is configured on the server
 * @route GET /api/payments/setup-status
 * @method GET
 * @access public
 */
router.get('/payments/setup-status', getPaymentsSetupStatus);

/**
 * @desc Create a Stripe Checkout Session (one-time payment) for cart checkout
 * @route POST /api/payments/checkout-session
 * @method POST
 * @access private
 */
router.post('/payments/checkout-session', verfiyToken, createCheckoutSession);

module.exports = router;
