const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/verifyToken');
const { checkRolePermission } = require('../middlewares/checkRolePermission');
const { validate } = require('../middlewares/validate');
const {
  createOfferSchema,
  updateOfferSchema,
} = require('../validators/offer.validator');

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
  verifyToken,
  checkRolePermission('offers:read'),
  getAllOffers,
);

router.get(
  '/offers/:id',
  verifyToken,
  checkRolePermission('offers:read'),
  getOfferById,
);

router.post(
  '/offers',
  verifyToken,
  checkRolePermission('offers:write'),
  validate(createOfferSchema),
  createOffer,
);

router.put(
  '/offers/:id',
  verifyToken,
  checkRolePermission('offers:write'),
  validate(updateOfferSchema),
  updateOffer,
);

router.delete(
  '/offers/:id',
  verifyToken,
  checkRolePermission('offers:delete'),
  deleteOffer,
);

module.exports = router;
