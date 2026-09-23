const mongoose = require('mongoose');
const Joi = require('joi');

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

const validateCreateReview = (obj) => {
  const schema = Joi.object({
    product: Joi.string().hex().length(24).required(),
    rating: Joi.number().min(1).max(5).required(),
    comment: Joi.string().min(3).max(1000).required(),
  });
  const { error } = schema.validate(obj);
  return error;
};

const validateReviewReply = (obj) => {
  const schema = Joi.object({
    text: Joi.string().trim().min(2).max(1000).required(),
  });
  const { error } = schema.validate(obj);
  return error;
};

const validateUpdateReview = (obj) => {
  const schema = Joi.object({
    rating: Joi.number().min(1).max(5),
    comment: Joi.string().min(3).max(1000),
  }).min(1);
  const { error } = schema.validate(obj);
  return error;
};

module.exports = {
  Review,
  validateCreateReview,
  validateUpdateReview,
  validateReviewReply,
};
