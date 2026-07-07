const express = require('express');
const router = express.Router();

const { verfiyToken } = require('../middlewares/verfiyToken');

const {
  createOrder,
  getMyOrders,
  getOrderById,
} = require('../controllers/order.controller');

router.post('/orders', verfiyToken, createOrder);
router.get('/orders/my', verfiyToken, getMyOrders);
router.get('/orders/:id', verfiyToken, getOrderById);

module.exports = router;
