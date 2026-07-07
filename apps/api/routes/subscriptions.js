const express = require('express');
const router = express.Router();

const { verfiyToken } = require('../middlewares/verfiyToken');
const {
  getSubscriptionSetupStatus,
  createSubscriptionCheckoutSession,
  createBillingPortalSession,
  getMySubscription,
} = require('../controllers/subscription.controller');

/**
 * @desc Whether Stripe subscription billing is configured on the server
 * @route GET /api/subscriptions/setup-status
 * @method GET
 * @access public
 */
router.get('/subscriptions/setup-status', getSubscriptionSetupStatus);

/**
 * @desc Start Stripe Checkout for Craftify Pro (subscription mode)
 * @route POST /api/subscriptions/checkout-session
 * @method POST
 * @access private
 */
router.post(
  '/subscriptions/checkout-session',
  verfiyToken,
  createSubscriptionCheckoutSession,
);

/**
 * @desc Open Stripe Customer Portal for billing / cancellation
 * @route POST /api/subscriptions/portal
 * @method POST
 * @access private
 */
router.post('/subscriptions/portal', verfiyToken, createBillingPortalSession);

/**
 * @desc Signed-in user’s subscription snapshot (from webhooks)
 * @route GET /api/subscriptions/me
 * @method GET
 * @access private
 */
router.get('/subscriptions/me', verfiyToken, getMySubscription);

module.exports = router;
