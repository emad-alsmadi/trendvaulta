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
} = require('../controllers/order.controller');

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

module.exports = router;
