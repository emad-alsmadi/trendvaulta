const express = require('express');
const router = express.Router();
<<<<<<< HEAD
const { verfiyToken } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const {
  trackRecentlyViewedSchema,
} = require('../validators/recentlyViewed.validator');
=======
const { verfiyToken } = require('../middlewares/verfiyToken');
>>>>>>> 67b9dc3e877d9b331e31c1fa941386f5e3b4c602
const {
  trackRecentlyViewed,
  getRecentlyViewed,
} = require('../controllers/recentlyViewed.controller');

// JWT required — anonymous clients keep localStorage only
router.post(
  '/me/recently-viewed',
  verfiyToken,
  validate(trackRecentlyViewedSchema),
  trackRecentlyViewed,
);
router.get('/me/recently-viewed', verfiyToken, getRecentlyViewed);

module.exports = router;
