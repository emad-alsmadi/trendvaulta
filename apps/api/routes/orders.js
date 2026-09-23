const express = require('express');
const router = express.Router();

const { verfiyToken } = require('../middlewares/verfiyToken');
const { checkRolePermission } = require('../middlewares/checkRolePermission');

const {
  createOrder,
  getMyOrders,
  getOrderById,
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

router.get('/orders/:id', verfiyToken, getOrderById);

/**
 * @desc Customer cancel their own order
 */
router.post('/orders/:id/cancel', verfiyToken, cancelOrder);

/**
 * @desc Get order invoice
 */
router.get('/orders/:id/invoice', verfiyToken, getOrderInvoice);

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
