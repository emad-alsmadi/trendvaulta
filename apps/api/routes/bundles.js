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
const { verifyToken } = require('../middlewares/verifyToken');
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
  verifyToken,
  checkRolePermission('content:read'),
  getAllBundles,
);
router.get(
  '/bundles/:id',
  verifyToken,
  checkRolePermission('content:read'),
  getBundleById,
);
router.post(
  '/bundles',
  verifyToken,
  checkRolePermission('content:write'),
  validate(createBundleSchema),
  createBundle,
);
router.put(
  '/bundles/:id',
  verifyToken,
  checkRolePermission('content:write'),
  validate(updateBundleSchema),
  updateBundle,
);
router.delete(
  '/bundles/:id',
  verifyToken,
  checkRolePermission('content:delete'),
  deleteBundle,
);

module.exports = router;
