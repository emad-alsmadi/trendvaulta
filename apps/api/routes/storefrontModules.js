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
const { verfiyToken } = require('../middlewares/verfiyToken');
const { checkRolePermission } = require('../middlewares/checkRolePermission');

// Public endpoint - get active modules for storefront
router.get('/storefront/modules', getStorefrontModules);

// Admin endpoints
router.get('/storefront-modules/admin', verfiyToken, checkRolePermission('content:read'), getAllStorefrontModules);
router.get('/storefront-modules/:id', verfiyToken, checkRolePermission('content:read'), getStorefrontModuleById);
router.post('/storefront-modules', verfiyToken, checkRolePermission('content:write'), createStorefrontModule);
router.put('/storefront-modules/:id', verfiyToken, checkRolePermission('content:write'), updateStorefrontModule);
router.delete('/storefront-modules/:id', verfiyToken, checkRolePermission('content:delete'), deleteStorefrontModule);

module.exports = router;
