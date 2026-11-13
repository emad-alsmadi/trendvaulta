const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/verifyToken');
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
  replyToReview,
  deleteReviewReply,
  moderateReview,
} = require('../controllers/review.controller');

// Public
router.get('/reviews/product/:productId', getProductReviews);

// Admin (before /:reviewId patterns)
router.get(
  '/reviews/admin',
  verifyToken,
  checkRolePermission('reviews:read'),
  getAdminReviews,
);
router.put(
  '/reviews/admin/:reviewId/reply',
  verifyToken,
  checkRolePermission('reviews:write'),
  replyToReview,
);
router.patch(
  '/reviews/admin/:reviewId/status',
  verifyToken,
  checkRolePermission('reviews:write'),
  moderateReview,
);
router.delete(
  '/reviews/admin/:reviewId/reply',
  verifyToken,
  checkRolePermission('reviews:write'),
  deleteReviewReply,
);
router.delete(
  '/reviews/admin/:reviewId',
  verifyToken,
  checkRolePermission('reviews:delete'),
  adminDeleteReview,
);

// Authenticated customer
router.post(
  '/reviews',
  verifyToken,
  createReview,
);
router.put(
  '/reviews/:reviewId',
  verifyToken,
  updateReview,
);
router.delete('/reviews/:reviewId', verifyToken, deleteReview);
router.get('/reviews/my/:productId', verifyToken, getMyReview);
router.get('/reviews/my', verifyToken, getMyReviews);

module.exports = router;
