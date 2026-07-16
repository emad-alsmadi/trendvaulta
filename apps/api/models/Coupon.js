const mongoose = require('mongoose');
const Joi = require('joi');

const CouponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      minlength: 3,
      maxlength: 50,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    expirationDate: {
      type: Date,
      required: true,
    },
    usageLimit: {
      type: Number,
      default: null,
      min: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    minimumOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    collection: 'coupons',
  },
);

const Coupon = mongoose.model('Coupon', CouponSchema);

const validateCreateCoupon = (obj) => {
  const schema = Joi.object({
    code: Joi.string().min(3).max(50).uppercase().required(),
    discountType: Joi.string().valid('percentage', 'fixed').required(),
    discountValue: Joi.number().min(0).required(),
    expirationDate: Joi.date().required(),
    usageLimit: Joi.number().min(1).allow(null),
    minimumOrderAmount: Joi.number().min(0).default(0),
    isActive: Joi.boolean().default(true),
    description: Joi.string().max(500).allow('', null),
  });
  const { error } = schema.validate(obj);
  return error;
};

const validateUpdateCoupon = (obj) => {
  const schema = Joi.object({
    code: Joi.string().min(3).max(50).uppercase(),
    discountType: Joi.string().valid('percentage', 'fixed'),
    discountValue: Joi.number().min(0),
    expirationDate: Joi.date(),
    usageLimit: Joi.number().min(1).allow(null),
    minimumOrderAmount: Joi.number().min(0),
    isActive: Joi.boolean(),
    description: Joi.string().max(500).allow('', null),
  });
  const { error } = schema.validate(obj);
  return error;
};

const validateCouponCode = (obj) => {
  const schema = Joi.object({
    code: Joi.string().required(),
    orderAmount: Joi.number().min(0).required(),
  });
  const { error } = schema.validate(obj);
  return error;
};

module.exports = {
  Coupon,
  validateCreateCoupon,
  validateUpdateCoupon,
  validateCouponCode,
};
