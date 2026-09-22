const express = require('express');
const router = express.Router();
const { verfiyToken } = require('../middlewares/verfiyToken');
const { checkRolePermission } = require('../middlewares/checkRolePermission');

const {
  getOffers,
  getAllOffers,
  getOfferById,
  createOffer,
  updateOffer,
  deleteOffer,
} = require('../controllers/offer.controller');

// Public storefront list
router.get('/offers', getOffers);

// Admin routes (static segment before :id)
router.get(
  '/offers/admin',
  verfiyToken,
  checkRolePermission('offers:read'),
  getAllOffers,
);

router.get(
  '/offers/:id',
  verfiyToken,
  checkRolePermission('offers:read'),
  getOfferById,
);

router.post(
  '/offers',
  verfiyToken,
  checkRolePermission('offers:write'),
  createOffer,
);

router.put(
  '/offers/:id',
  verfiyToken,
  checkRolePermission('offers:write'),
  updateOffer,
);

router.delete(
  '/offers/:id',
  verfiyToken,
  checkRolePermission('offers:delete'),
  deleteOffer,
);

module.exports = router;
