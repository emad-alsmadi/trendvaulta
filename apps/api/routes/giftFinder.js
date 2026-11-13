const express = require('express');
const router = express.Router();
const {
  getGiftFinderConfig,
  getAllGiftFinderConfigs,
  getGiftFinderConfigById,
  createGiftFinderConfig,
  updateGiftFinderConfig,
  deleteGiftFinderConfig,
} = require('../controllers/giftFinder.controller');
const { verifyToken } = require('../middlewares/verifyToken');
const { checkRolePermission } = require('../middlewares/checkRolePermission');
const { validate } = require('../middlewares/validate');
const {
  createGiftFinderConfigSchema,
  updateGiftFinderConfigSchema,
} = require('../validators/giftFinder.validator');

// Public endpoint - get active gift finder config for storefront
router.get('/storefront/gift-finder', getGiftFinderConfig);

// Admin endpoints
router.get(
  '/gift-finder/admin',
  verifyToken,
  checkRolePermission('content:read'),
  getAllGiftFinderConfigs,
);
router.get(
  '/gift-finder/:id',
  verifyToken,
  checkRolePermission('content:read'),
  getGiftFinderConfigById,
);
router.post(
  '/gift-finder',
  verifyToken,
  checkRolePermission('content:write'),
  validate(createGiftFinderConfigSchema),
  createGiftFinderConfig,
);
router.put(
  '/gift-finder/:id',
  verifyToken,
  checkRolePermission('content:write'),
  validate(updateGiftFinderConfigSchema),
  updateGiftFinderConfig,
);
router.delete(
  '/gift-finder/:id',
  verifyToken,
  checkRolePermission('content:delete'),
  deleteGiftFinderConfig,
);

module.exports = router;
