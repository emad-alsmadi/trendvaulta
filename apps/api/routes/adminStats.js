const express = require('express');
const router = express.Router();

const { verfiyToken } = require('../middlewares/verfiyToken');
const { checkRolePermission } = require('../middlewares/checkRolePermission');
const {
  getAdminStats,
  getAdminAnalytics,
  getLowStockProducts,
} = require('../controllers/adminStats.controller');

/**
 * @route GET /api/admin/stats
 * @access Private (orders:read)
 */
router.get(
  '/admin/stats',
  verfiyToken,
  checkRolePermission('orders:read'),
  getAdminStats,
);

/**
 * @route GET /api/admin/analytics
 * @access Private (orders:read)
 */
router.get(
  '/admin/analytics',
  verfiyToken,
  checkRolePermission('orders:read'),
  getAdminAnalytics,
);

/**
 * @route GET /api/admin/low-stock
 * @access Private (products:read)
 */
router.get(
  '/admin/low-stock',
  verfiyToken,
  checkRolePermission('products:read'),
  getLowStockProducts,
);

module.exports = router;
