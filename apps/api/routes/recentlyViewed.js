const express = require('express');
const router = express.Router();
const { verfiyToken } = require('../middlewares/verfiyToken');
const {
  trackRecentlyViewed,
  getRecentlyViewed,
} = require('../controllers/recentlyViewed.controller');

// JWT required — anonymous clients keep localStorage only
router.post('/me/recently-viewed', verfiyToken, trackRecentlyViewed);
router.get('/me/recently-viewed', verfiyToken, getRecentlyViewed);

module.exports = router;
