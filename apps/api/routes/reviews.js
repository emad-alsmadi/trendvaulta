const express = require('express');
const router = express.Router();
const { verfiyToken } = require('../middlewares/verfiyToken');

const {
  createReview,
  updateReview,
  deleteReview,
  getTemplateReviews,
  getMyReview,
  getMyReviews,
} = require('../controllers/review.controller');

// Public route - get all reviews for a template
router.get('/reviews/template/:templateId', getTemplateReviews);

// Private routes - require authentication
router.post('/reviews', verfiyToken, createReview);
router.put('/reviews/:reviewId', verfiyToken, updateReview);
router.delete('/reviews/:reviewId', verfiyToken, deleteReview);
router.get('/reviews/my/:templateId', verfiyToken, getMyReview);
router.get('/reviews/my', verfiyToken, getMyReviews);

module.exports = router;
