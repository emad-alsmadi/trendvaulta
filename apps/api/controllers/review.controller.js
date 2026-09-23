const asyncHandler = require('express-async-handler');
const {
  Review,
  validateCreateReview,
  validateUpdateReview,
  validateReviewReply,
} = require('../models/Review');
const { Product } = require('../models/Product');
const { Order } = require('../models/Order');
const { buildSort } = require('../utils/sort');
const { normalizeSearchTerm } = require('../utils/search');

/** Columns the admin review table may sort on. */
const REVIEW_SORT_FIELDS = ['createdAt', 'rating'];

/**
 * Whether userId has a paid/refunded, non-canceled order containing productId.
 * Factored out so the query shape is unit-testable / reusable.
 */
const hasVerifiedPurchase = async (userId, productId) => {
  return Boolean(
    await Order.exists({
      user: userId,
      'items.productId': productId,
      paymentStatus: { $in: ['paid', 'refunded'] },
      status: { $ne: 'canceled' },
    }),
  );
};

/**
 * Helper function to update product's average rating and review count
 */
const updateProductRating = asyncHandler(async (productId) => {
  const reviews = await Review.find({ product: productId });
  const reviewCount = reviews.length;

  if (reviewCount === 0) {
    await Product.findByIdAndUpdate(productId, {
      averageRating: 0,
      reviewCount: 0,
    });
    return;
  }

  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = totalRating / reviewCount;

  await Product.findByIdAndUpdate(productId, {
    averageRating: parseFloat(averageRating.toFixed(1)),
    reviewCount,
  });
});

/**
 * Create a new review for a product.
 *
 * @route POST /api/reviews
 * @access Private
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON with created review
 */
const createReview = asyncHandler(async (req, res) => {
  const { product, rating, comment } = req.body;
  const userId = req.user.id;

  // Validate input
  const error = validateCreateReview({ product, rating, comment });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  // Verify product exists
  const productDoc = await Product.findById(product);
  if (!productDoc) {
    return res.status(404).json({ message: 'Product not found' });
  }

  // Check if user already reviewed this product
  const existingReview = await Review.findOne({
    user: userId,
    product,
  });

  if (existingReview) {
    return res
      .status(400)
      .json({ message: 'You have already reviewed this product' });
  }

  // Reviews are gated on having actually purchased the product (paid or
  // refunded order, not canceled). Admin/moderator can still bypass to
  // moderate, but only a real purchase earns the verified badge.
  const verifiedPurchase = await hasVerifiedPurchase(userId, product);
  const roles = req.user?.roles || [];
  const canBypass = roles.includes('admin') || roles.includes('moderator');

  if (!verifiedPurchase && !canBypass) {
    return res.status(403).json({
      message: 'You can review this product after purchasing it.',
      code: 'PURCHASE_REQUIRED',
    });
  }

  // Create review
  const review = new Review({
    user: userId,
    product,
    rating,
    comment,
    verifiedPurchase,
  });

  await review.save();

  // Update product's rating
  await updateProductRating(product);

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
    return res
      .status(403)
      .json({ message: 'Not authorized to update this review' });
  }

  // Update review
  if (rating !== undefined) review.rating = rating;
  if (comment !== undefined) review.comment = comment;

  await review.save();

  // Update product's rating
  await updateProductRating(review.product);

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
    return res
      .status(403)
      .json({ message: 'Not authorized to delete this review' });
  }

  const productId = review.product;

  await Review.findByIdAndDelete(reviewId);

  // Update product's rating
  await updateProductRating(productId);

  res.status(200).json({ message: 'Review deleted successfully' });
});

/**
 * Get all reviews for a specific product.
 *
 * @route GET /api/reviews/product/:productId
 * @access Public
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON array of reviews
 */
const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const reviews = await Review.find({ product: productId })
    // The reply's author is a staff account; the public sees the store's
    // voice, not which employee wrote it.
    .select('-reply.repliedBy')
    .populate('user', 'username')
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json(reviews);
});

/**
 * Get the authenticated user's review for a specific product.
 *
 * @route GET /api/reviews/my/:productId
 * @access Private
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON with user's review or null
 */
const getMyReview = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const userId = req.user.id;

  const review = await Review.findOne({
    user: userId,
    product: productId,
  })
    .select('-reply.repliedBy')
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
    .select('-reply.repliedBy')
    .populate('product')
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json(reviews);
});

/**
 * Admin: list all reviews (paginated).
 *
 * Supports `page`, `limit`, `q` (comment text), `rating` (1-5), `sort`/`order`.
 * @route GET /api/reviews/admin
 * @access Private (reviews:read)
 */
const getAdminReviews = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 50));
  const skip = (page - 1) * limit;
  const sort = buildSort(req.query.sort, req.query.order, REVIEW_SORT_FIELDS);

  // Filters run in the query, not on the page the client happens to hold —
  // otherwise a search would only ever see the current page of results.
  const query = {};
  const term = normalizeSearchTerm(req.query.q);
  if (term) {
    query.comment = { $regex: term, $options: 'i' };
  }
  const rating = parseInt(req.query.rating, 10);
  if (rating >= 1 && rating <= 5) {
    query.rating = rating;
  }

  const [data, total] = await Promise.all([
    Review.find(query)
      .populate('user', 'username email')
      .populate('product', 'title cover sku')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments(query),
  ]);

  res.status(200).json({
    data,
    meta: {
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      limit,
    },
  });
});

/**
 * Admin: publish or replace the store's reply to a review.
 * @route PUT /api/reviews/admin/:reviewId/reply
 * @access Private (reviews:write)
 */
const replyToReview = asyncHandler(async (req, res) => {
  const error = validateReviewReply(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  const review = await Review.findByIdAndUpdate(
    req.params.reviewId,
    {
      $set: {
        reply: {
          text: req.body.text.trim(),
          repliedBy: req.user.id,
          repliedAt: new Date(),
        },
      },
    },
    { new: true, runValidators: true },
  )
    .populate('user', 'username email')
    .populate('product', 'title cover sku')
    .lean();
  if (!review) {
    return res.status(404).json({ message: 'Review not found' });
  }
  res.status(200).json({ message: 'Reply saved', data: review });
});

/**
 * Admin: remove the store's reply from a review.
 * @route DELETE /api/reviews/admin/:reviewId/reply
 * @access Private (reviews:write)
 */
const deleteReviewReply = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndUpdate(
    req.params.reviewId,
    { $unset: { reply: 1 } },
    { new: true },
  ).lean();
  if (!review) {
    return res.status(404).json({ message: 'Review not found' });
  }
  res.status(200).json({ message: 'Reply removed' });
});

/**
 * Admin: delete any review.
 * @route DELETE /api/reviews/admin/:reviewId
 * @access Private (reviews:delete)
 */
const adminDeleteReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const review = await Review.findById(reviewId);
  if (!review) {
    return res.status(404).json({ message: 'Review not found' });
  }

  const productId = review.product;
  await Review.findByIdAndDelete(reviewId);
  await updateProductRating(productId);

  res.status(200).json({ message: 'Review deleted successfully' });
});

module.exports = {
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
  hasVerifiedPurchase,
};
