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
const { validate } = require('../middlewares/validate');
const {
  createBundleSchema,
  updateBundleSchema,
} = require('../validators/bundle.validator');

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
  validate(createBundleSchema),
  createBundle,
);
router.put(
  '/bundles/:id',
  verfiyToken,
  checkRolePermission('content:write'),
  validate(updateBundleSchema),
  updateBundle,
);
router.delete(
  '/bundles/:id',
  verfiyToken,
  checkRolePermission('content:delete'),
  deleteBundle,
);

module.exports = router;
