const express = require('express');
const router = express.Router();
const { verfiyToken } = require('../middlewares/verfiyToken');
const { checkRolePermission } = require('../middlewares/checkRolePermission');

const {
  createReview,
  updateReview,
  deleteReview,
  getProductReviews,
  getMyReview,
  getMyReviews,
  getAdminReviews,
  adminDeleteReview,
} = require('../controllers/review.controller');

// Public
router.get('/reviews/product/:productId', getProductReviews);

// Admin (before /:reviewId patterns)
router.get(
  '/reviews/admin',
  verfiyToken,
  checkRolePermission('reviews:read'),
  getAdminReviews,
);
router.delete(
  '/reviews/admin/:reviewId',
  verfiyToken,
  checkRolePermission('reviews:delete'),
  adminDeleteReview,
);

// Authenticated customer
router.post(
  '/reviews',
  verfiyToken,
  createReview,
);
router.put(
  '/reviews/:reviewId',
  verfiyToken,
  updateReview,
);
router.delete('/reviews/:reviewId', verfiyToken, deleteReview);
router.get('/reviews/my/:productId', verfiyToken, getMyReview);
router.get('/reviews/my', verfiyToken, getMyReviews);

module.exports = router;
