const express = require('express');
const router = express.Router();
const {
  getStorefrontModules,
  getAllStorefrontModules,
  getStorefrontModuleById,
  createStorefrontModule,
  updateStorefrontModule,
  deleteStorefrontModule,
} = require('../controllers/storefrontModule.controller');
const { verifyToken } = require('../middlewares/verifyToken');
const { checkRolePermission } = require('../middlewares/checkRolePermission');
const { validate } = require('../middlewares/validate');
const {
  createStorefrontModuleSchema,
  updateStorefrontModuleSchema,
} = require('../validators/storefrontModule.validator');

// Public endpoint - get active modules for storefront
router.get('/storefront/modules', getStorefrontModules);

// Admin endpoints
router.get(
  '/storefront-modules/admin',
  verifyToken,
  checkRolePermission('content:read'),
  getAllStorefrontModules,
);
router.get(
  '/storefront-modules/:id',
  verifyToken,
  checkRolePermission('content:read'),
  getStorefrontModuleById,
);
router.post(
  '/storefront-modules',
  verifyToken,
  checkRolePermission('content:write'),
  validate(createStorefrontModuleSchema),
  createStorefrontModule,
);
router.put(
  '/storefront-modules/:id',
  verifyToken,
  checkRolePermission('content:write'),
  validate(updateStorefrontModuleSchema),
  updateStorefrontModule,
);
router.delete(
  '/storefront-modules/:id',
  verifyToken,
  checkRolePermission('content:delete'),
  deleteStorefrontModule,
);

module.exports = router;
