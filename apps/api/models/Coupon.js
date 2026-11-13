const mongoose = require('mongoose');
const {
  validateCreateCoupon,
  validateUpdateCoupon,
  validateCouponCode,
} = require('../validators/coupon.validator');

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
    // Max paid orders per customer using this code; null = unlimited.
    perCustomerLimit: {
      type: Number,
      default: null,
      min: 1,
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

module.exports = {
  Coupon,
  validateCreateCoupon,
  validateUpdateCoupon,
  validateCouponCode,
};
