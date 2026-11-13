const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/verifyToken');
const { validate } = require('../middlewares/validate');
const {
  trackRecentlyViewedSchema,
} = require('../validators/recentlyViewed.validator');
const {
  trackRecentlyViewed,
  getRecentlyViewed,
} = require('../controllers/recentlyViewed.controller');

// JWT required — anonymous clients keep localStorage only
router.post(
  '/me/recently-viewed',
  verifyToken,
  validate(trackRecentlyViewedSchema),
  trackRecentlyViewed,
);
router.get('/me/recently-viewed', verifyToken, getRecentlyViewed);

module.exports = router;
