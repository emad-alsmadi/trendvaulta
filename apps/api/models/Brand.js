const mongoose = require('mongoose');
const Joi = require('joi');

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
BrandSchema.index({ name: 1 });

const Brand = mongoose.model('Brand', BrandSchema);

const validateCreateBrand = (obj) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    slug: Joi.string().trim().lowercase().required(),
    description: Joi.string().max(500),
    logo: Joi.string().trim(),
    website: Joi.string().trim().uri(),
    country: Joi.string().trim(),
    isActive: Joi.boolean().default(true),
    featured: Joi.boolean().default(false),
  });
  const { error } = schema.validate(obj);
  return error;
};

const validateUpdateBrand = (obj) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(100),
    slug: Joi.string().trim().lowercase(),
    description: Joi.string().max(500),
    logo: Joi.string().trim(),
    website: Joi.string().trim().uri(),
    country: Joi.string().trim(),
    isActive: Joi.boolean(),
    featured: Joi.boolean(),
  });
  const { error } = schema.validate(obj);
  return error;
};

module.exports = { Brand, validateCreateBrand, validateUpdateBrand };
