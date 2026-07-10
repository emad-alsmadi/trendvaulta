const mongoose = require('mongoose');
const Joi = require('joi');

const ReviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Template',
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
  },
  {
    timestamps: true,
    collection: 'reviews',
  },
);

// Ensure one review per user per template
ReviewSchema.index({ user: 1, template: 1 }, { unique: true });

const Review = mongoose.model('Review', ReviewSchema);

const validateCreateReview = (obj) => {
  const schema = Joi.object({
    template: Joi.string().hex().length(24).required(),
    rating: Joi.number().min(1).max(5).required(),
    comment: Joi.string().min(3).max(1000).required(),
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

module.exports = { Review, validateCreateReview, validateUpdateReview };
