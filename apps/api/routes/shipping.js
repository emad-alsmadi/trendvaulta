const express = require('express');
const router = express.Router();

const { verfiyToken } = require('../middlewares/verfiyToken');
const { checkRolePermission } = require('../middlewares/checkRolePermission');

const {
  getShippingZones,
  getAllShippingZonesAdmin,
  getShippingZoneById,
  createShippingZone,
  updateShippingZone,
  deleteShippingZone,
  addShippingMethod,
  updateShippingMethod,
  deleteShippingMethod,
  getShippingMethodsForAddress,
} = require('../controllers/shipping.controller');

router.get('/shipping/zones', getShippingZones);
router.get('/shipping/methods', verfiyToken, getShippingMethodsForAddress);

router.get(
  '/admin/shipping/zones',
  verfiyToken,
  checkRolePermission('shipping:read'),
  getAllShippingZonesAdmin,
);

router.post(
  '/admin/shipping/zones',
  verfiyToken,
  checkRolePermission('shipping:write'),
  createShippingZone,
);

router.get(
  '/admin/shipping/zones/:id',
  verfiyToken,
  checkRolePermission('shipping:read'),
  getShippingZoneById,
);

router.put(
  '/admin/shipping/zones/:id',
  verfiyToken,
  checkRolePermission('shipping:write'),
  updateShippingZone,
);

router.delete(
  '/admin/shipping/zones/:id',
  verfiyToken,
  checkRolePermission('shipping:write'),
  deleteShippingZone,
);

router.post(
  '/admin/shipping/zones/:id/methods',
  verfiyToken,
  checkRolePermission('shipping:write'),
  addShippingMethod,
);

router.put(
  '/admin/shipping/zones/:id/methods/:methodId',
  verfiyToken,
  checkRolePermission('shipping:write'),
  updateShippingMethod,
);

router.delete(
  '/admin/shipping/zones/:id/methods/:methodId',
  verfiyToken,
  checkRolePermission('shipping:write'),
  deleteShippingMethod,
);

module.exports = router;