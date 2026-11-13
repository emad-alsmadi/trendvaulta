const mongoose = require('mongoose');
const {
  validateCreateReview,
  validateReviewReply,
  validateReviewStatus,
  validateUpdateReview,
} = require('../validators/review.validator');

const ReviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 1000,
    },
    verifiedPurchase: {
      type: Boolean,
      default: false,
    },
    // Moderation (API-327). Default 'approved' keeps today's publish-on-
    // submit behavior unchanged — this only adds the admin capability to
    // hide/reject a review without deleting it; it does not gate new
    // reviews behind manual review. Existing documents created before this
    // field existed read as 'approved' via this same default, so no
    // backfill is needed.
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
      index: true,
    },
    // One public reply from the store. `repliedBy` is kept for the audit
    // trail only — the public product feed strips it (review.controller.js).
    reply: {
      text: { type: String, trim: true, maxlength: 1000 },
      repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      repliedAt: { type: Date },
    },
  },
  {
    timestamps: true,
    collection: 'reviews',
  },
);

ReviewSchema.index({ user: 1, product: 1 }, { unique: true });

const Review = mongoose.model('Review', ReviewSchema);

module.exports = {
  Review,
  validateReviewStatus,
  validateCreateReview,
  validateUpdateReview,
  validateReviewReply,
};
