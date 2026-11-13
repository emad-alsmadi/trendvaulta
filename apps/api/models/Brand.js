const mongoose = require('mongoose');
const {
  validateCreateBrand,
  validateUpdateBrand,
} = require('../validators/brand.validator');

const BrandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    logo: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'brands',
  },
);

BrandSchema.index({ featured: 1, isActive: 1 });

const Brand = mongoose.model('Brand', BrandSchema);

module.exports = { Brand, validateCreateBrand, validateUpdateBrand };
