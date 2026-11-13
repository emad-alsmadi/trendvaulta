const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/verifyToken');
const {
  optionalVerifyToken,
  optionalVerifyTokenStrict,
} = require('../middlewares/optionalVerifyToken');
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

router.post('/orders', verifyToken, createOrder);
router.get('/orders/my', verifyToken, getMyOrders);

router.get(
  '/orders',
  verifyToken,
  checkRolePermission('orders:read'),
  getAllOrders,
);

router.patch(
  '/orders/:id/status',
  verifyToken,
  checkRolePermission('orders:write'),
  updateOrderStatus,
);

router.patch(
  '/orders/:id/tracking',
  verifyToken,
  checkRolePermission('orders:write'),
  updateOrderTracking,
);

/**
 * @desc Guest order page (plan P0-03): { orderId, token } from the emailed
 * link. POST so the token stays out of URLs and access logs.
 */
router.post('/orders/guest/lookup', verifyPaymentRateLimit, getGuestOrder);

router.get('/orders/:id', verifyToken, getOrderById);

/**
 * @desc Customer cancel their own order: the owner's session, or a guest's
 * `guestToken` in the body
 */
router.post('/orders/:id/cancel', verifyPaymentRateLimit, optionalVerifyToken, cancelOrder);

/**
 * @desc Get order invoice: owner/staff session, or a guest's
 * `X-Guest-Token` header. Strict variant: the staff branch reads any
 * order, so a revoked session (role change, disabled account) must not pass.
 */
router.get('/orders/:id/invoice', optionalVerifyTokenStrict, getOrderInvoice);

/**
 * @desc Return request routes
 */
router.post('/orders/:id/return', verifyToken, createReturnRequest);
router.get('/orders/:id/return', verifyToken, getReturnRequest);
router.patch(
  '/orders/:id/return',
  verifyToken,
  checkRolePermission('orders:write'),
  updateReturnRequest,
);

module.exports = router;
