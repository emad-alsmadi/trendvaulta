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
const { verifyToken } = require('../middlewares/verifyToken');
const { checkRolePermission } = require('../middlewares/checkRolePermission');
const { validate } = require('../middlewares/validate');
const {
  createLookbookSchema,
  updateLookbookSchema,
} = require('../validators/lookbook.validator');

// Public endpoint - get active lookbooks for storefront
router.get('/storefront/lookbooks', getLookbooks);

// Admin endpoints
router.get(
  '/lookbooks/admin',
  verifyToken,
  checkRolePermission('content:read'),
  getAllLookbooks,
);
router.get(
  '/lookbooks/:id',
  verifyToken,
  checkRolePermission('content:read'),
  getLookbookById,
);
router.post(
  '/lookbooks',
  verifyToken,
  checkRolePermission('content:write'),
  validate(createLookbookSchema),
  createLookbook,
);
router.put(
  '/lookbooks/:id',
  verifyToken,
  checkRolePermission('content:write'),
  validate(updateLookbookSchema),
  updateLookbook,
);
router.delete(
  '/lookbooks/:id',
  verifyToken,
  checkRolePermission('content:delete'),
  deleteLookbook,
);

module.exports = router;
