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
const { verfiyToken } = require('../middlewares/auth');
const { checkRolePermission } = require('../middlewares/checkRolePermission');

// Public endpoint - get active gift finder config for storefront
router.get('/storefront/gift-finder', getGiftFinderConfig);

// Admin endpoints
router.get(
  '/gift-finder/admin',
  verfiyToken,
  checkRolePermission('content:read'),
  getAllGiftFinderConfigs,
);
router.get(
  '/gift-finder/:id',
  verfiyToken,
  checkRolePermission('content:read'),
  getGiftFinderConfigById,
);
router.post(
  '/gift-finder',
  verfiyToken,
  checkRolePermission('content:write'),
  createGiftFinderConfig,
);
router.put(
  '/gift-finder/:id',
  verfiyToken,
  checkRolePermission('content:write'),
  updateGiftFinderConfig,
);
router.delete(
  '/gift-finder/:id',
  verfiyToken,
  checkRolePermission('content:delete'),
  deleteGiftFinderConfig,
);

module.exports = router;
