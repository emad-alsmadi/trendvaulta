const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/verifyToken');
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
// Public like /shipping/zones: guests check out with an email (plan P0-03)
// and need the delivery options for their address; nothing here is per-user.
router.get('/shipping/methods', getShippingMethodsForAddress);

router.get(
  '/admin/shipping/zones',
  verifyToken,
  checkRolePermission('shipping:read'),
  getAllShippingZonesAdmin,
);

router.post(
  '/admin/shipping/zones',
  verifyToken,
  checkRolePermission('shipping:write'),
  createShippingZone,
);

router.get(
  '/admin/shipping/zones/:id',
  verifyToken,
  checkRolePermission('shipping:read'),
  getShippingZoneById,
);

router.put(
  '/admin/shipping/zones/:id',
  verifyToken,
  checkRolePermission('shipping:write'),
  updateShippingZone,
);

router.delete(
  '/admin/shipping/zones/:id',
  verifyToken,
  checkRolePermission('shipping:write'),
  deleteShippingZone,
);

router.post(
  '/admin/shipping/zones/:id/methods',
  verifyToken,
  checkRolePermission('shipping:write'),
  addShippingMethod,
);

router.put(
  '/admin/shipping/zones/:id/methods/:methodId',
  verifyToken,
  checkRolePermission('shipping:write'),
  updateShippingMethod,
);

router.delete(
  '/admin/shipping/zones/:id/methods/:methodId',
  verifyToken,
  checkRolePermission('shipping:write'),
  deleteShippingMethod,
);

module.exports = router;