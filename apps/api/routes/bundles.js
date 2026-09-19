const express = require('express');
const router = express.Router();
const {
  getProductBundles,
  getAllBundles,
  getBundleById,
  createBundle,
  updateBundle,
  deleteBundle,
} = require('../controllers/bundle.controller');
const { verfiyToken } = require('../middlewares/auth');
const { checkRolePermission } = require('../middlewares/checkRolePermission');

// Public endpoint - get bundles for a product
router.get('/products/:id/bundles', getProductBundles);

// Admin endpoints
router.get(
  '/bundles/admin',
  verfiyToken,
  checkRolePermission('content:read'),
  getAllBundles,
);
router.get(
  '/bundles/:id',
  verfiyToken,
  checkRolePermission('content:read'),
  getBundleById,
);
router.post(
  '/bundles',
  verfiyToken,
  checkRolePermission('content:write'),
  createBundle,
);
router.put(
  '/bundles/:id',
  verfiyToken,
  checkRolePermission('content:write'),
  updateBundle,
);
router.delete(
  '/bundles/:id',
  verfiyToken,
  checkRolePermission('content:delete'),
  deleteBundle,
);

module.exports = router;
