const asyncHandler = require('express-async-handler');
const { Review, validateCreateReview, validateUpdateReview } = require('../models/Review');
const { Template } = require('../models/Template');

/**
 * Helper function to update template's average rating and review count
 */
const updateTemplateRating = asyncHandler(async (templateId) => {
  const reviews = await Review.find({ template: templateId });
  const reviewCount = reviews.length;
  
  if (reviewCount === 0) {
    await Template.findByIdAndUpdate(templateId, {
      averageRating: 0,
      reviewCount: 0,
    });
    return;
  }
  
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = totalRating / reviewCount;
  
  await Template.findByIdAndUpdate(templateId, {
    averageRating: parseFloat(averageRating.toFixed(1)),
    reviewCount,
  });
});

/**
 * Create a new review for a template.
 *
 * @route POST /api/reviews
 * @access Private
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON with created review
 */
const createReview = asyncHandler(async (req, res) => {
  const { template, rating, comment } = req.body;
  const userId = req.user.id;

  // Validate input
  const error = validateCreateReview({ template, rating, comment });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  // Verify template exists
  const templateDoc = await Template.findById(template);
  if (!templateDoc) {
    return res.status(404).json({ message: 'Template not found' });
  }

  // Check if user already reviewed this template
  const existingReview = await Review.findOne({
    user: userId,
    template,
  });

  if (existingReview) {
    return res.status(400).json({ message: 'You have already reviewed this template' });
  }

  // Create review
  const review = new Review({
    user: userId,
    template,
    rating,
    comment,
  });

  await review.save();

  // Update template's rating
  await updateTemplateRating(template);

  // Populate user data for response
  await review.populate('user', 'username email');

  res.status(201).json(review);
});

/**
 * Update an existing review.
 *
 * @route PUT /api/reviews/:reviewId
 * @access Private
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON with updated review
 */
const updateReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const { rating, comment } = req.body;
  const userId = req.user.id;

  // Validate input
  const error = validateUpdateReview({ rating, comment });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  // Find review and verify ownership
  const review = await Review.findById(reviewId);
  if (!review) {
    return res.status(404).json({ message: 'Review not found' });
  }

  if (review.user.toString() !== userId) {
    return res.status(403).json({ message: 'Not authorized to update this review' });
  }

  // Update review
  if (rating !== undefined) review.rating = rating;
  if (comment !== undefined) review.comment = comment;

  await review.save();

  // Update template's rating
  await updateTemplateRating(review.template);

  // Populate user data for response
  await review.populate('user', 'username email');

  res.status(200).json(review);
});

/**
 * Delete a review.
 *
 * @route DELETE /api/reviews/:reviewId
 * @access Private
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON confirmation message
 */
const deleteReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const userId = req.user.id;

  // Find review and verify ownership
  const review = await Review.findById(reviewId);
  if (!review) {
    return res.status(404).json({ message: 'Review not found' });
  }

  if (review.user.toString() !== userId) {
    return res.status(403).json({ message: 'Not authorized to delete this review' });
  }

  const templateId = review.template;

  await Review.findByIdAndDelete(reviewId);

  // Update template's rating
  await updateTemplateRating(templateId);

  res.status(200).json({ message: 'Review deleted successfully' });
});

/**
 * Get all reviews for a specific template.
 *
 * @route GET /api/reviews/template/:templateId
 * @access Public
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON array of reviews
 */
const getTemplateReviews = asyncHandler(async (req, res) => {
  const { templateId } = req.params;

  const reviews = await Review.find({ template: templateId })
    .populate('user', 'username email')
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json(reviews);
});

/**
 * Get the authenticated user's review for a specific template.
 *
 * @route GET /api/reviews/my/:templateId
 * @access Private
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON with user's review or null
 */
const getMyReview = asyncHandler(async (req, res) => {
  const { templateId } = req.params;
  const userId = req.user.id;

  const review = await Review.findOne({
    user: userId,
    template: templateId,
  })
    .populate('user', 'username email')
    .lean();

  res.status(200).json(review || null);
});

/**
 * Get all reviews by the authenticated user.
 *
 * @route GET /api/reviews/my
 * @access Private
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON array of user's reviews
 */
const getMyReviews = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const reviews = await Review.find({ user: userId })
    .populate('template')
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json(reviews);
});

module.exports = {
  createReview,
  updateReview,
  deleteReview,
  getTemplateReviews,
  getMyReview,
  getMyReviews,
};
