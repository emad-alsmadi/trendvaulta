const express = require('express');
const router = express.Router();

const { verfiyToken } = require('../middlewares/verfiyToken');
const { optionalVerifyToken } = require('../middlewares/optionalVerifyToken');
const { checkRolePermission } = require('../middlewares/checkRolePermission');
const { verifyPaymentRateLimit } = require('../middlewares/rateLimit');

const {
  createOrder,
  getMyOrders,
  getOrderById,
  getGuestOrder,
  getAllOrders,
  updateOrderStatus,
  updateOrderTracking,
  cancelOrder,
  getOrderInvoice,
} = require('../controllers/order.controller');
const {
  createReturnRequest,
  getReturnRequest,
  updateReturnRequest,
} = require('../controllers/return.controller');

router.post('/orders', verfiyToken, createOrder);
router.get('/orders/my', verfiyToken, getMyOrders);

router.get(
  '/orders',
  verfiyToken,
  checkRolePermission('orders:read'),
  getAllOrders,
);

router.patch(
  '/orders/:id/status',
  verfiyToken,
  checkRolePermission('orders:write'),
  updateOrderStatus,
);

router.patch(
  '/orders/:id/tracking',
  verfiyToken,
  checkRolePermission('orders:write'),
  updateOrderTracking,
);

/**
 * @desc Guest order page (plan P0-03): { orderId, token } from the emailed
 * link. POST so the token stays out of URLs and access logs.
 */
router.post('/orders/guest/lookup', verifyPaymentRateLimit, getGuestOrder);

router.get('/orders/:id', verfiyToken, getOrderById);

/**
 * @desc Customer cancel their own order: the owner's session, or a guest's
 * `guestToken` in the body
 */
router.post('/orders/:id/cancel', verifyPaymentRateLimit, optionalVerifyToken, cancelOrder);

/**
 * @desc Get order invoice: owner/staff session, or a guest's
 * `X-Guest-Token` header
 */
router.get('/orders/:id/invoice', optionalVerifyToken, getOrderInvoice);

/**
 * @desc Return request routes
 */
router.post('/orders/:id/return', verfiyToken, createReturnRequest);
router.get('/orders/:id/return', verfiyToken, getReturnRequest);
router.patch(
  '/orders/:id/return',
  verfiyToken,
  checkRolePermission('orders:write'),
  updateReturnRequest,
);

module.exports = router;
