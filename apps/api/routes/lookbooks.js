const express = require('express');
const router = express.Router();
const {
  getLookbooks,
  getAllLookbooks,
  getLookbookById,
  createLookbook,
  updateLookbook,
  deleteLookbook,
} = require('../controllers/lookbook.controller');
const { verfiyToken } = require('../middlewares/verfiyToken');
const { checkRolePermission } = require('../middlewares/checkRolePermission');

// Public endpoint - get active lookbooks for storefront
router.get('/storefront/lookbooks', getLookbooks);

// Admin endpoints
router.get(
  '/lookbooks/admin',
  verfiyToken,
  checkRolePermission('content:read'),
  getAllLookbooks,
);
router.get(
  '/lookbooks/:id',
  verfiyToken,
  checkRolePermission('content:read'),
  getLookbookById,
);
router.post(
  '/lookbooks',
  verfiyToken,
  checkRolePermission('content:write'),
  createLookbook,
);
router.put(
  '/lookbooks/:id',
  verfiyToken,
  checkRolePermission('content:write'),
  updateLookbook,
);
router.delete(
  '/lookbooks/:id',
  verfiyToken,
  checkRolePermission('content:delete'),
  deleteLookbook,
);

module.exports = router;
