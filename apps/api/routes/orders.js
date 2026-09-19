const express = require('express');
const router = express.Router();

const { verfiyToken } = require('../middlewares/verfiyToken');
const { checkRolePermission } = require('../middlewares/checkRolePermission');
const { validate } = require('../middlewares/validate');
const {
  createOrderSchema,
  updateOrderSchema,
} = require('../validators/order.validator');

const {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
} = require('../controllers/order.controller');

router.post('/orders', verfiyToken, validate(createOrderSchema), createOrder);
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
  validate(updateOrderSchema),
  updateOrderStatus,
);

router.get('/orders/:id', verfiyToken, getOrderById);

module.exports = router;
