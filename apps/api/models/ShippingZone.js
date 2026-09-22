const mongoose = require('mongoose');
const Joi = require('joi');

const ShippingMethodSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    handle: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 50,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    priceUsd: {
      type: Number,
      required: true,
      min: 0,
    },
    estimatedDaysMin: {
      type: Number,
      min: 0,
      default: 1,
    },
    estimatedDaysMax: {
      type: Number,
      min: 0,
      default: 5,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { _id: true },
);

const ShippingZoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    countries: {
      type: [String],
      default: [],
      validate: {
        validator: (v) => Array.isArray(v),
        message: 'Countries must be an array of ISO 3166-1 alpha-2 codes',
      },
    },
    regionPattern: {
      type: String,
      trim: true,
      default: '',
    },
    postalCodePattern: {
      type: String,
      trim: true,
      default: '',
    },
    methods: {
      type: [ShippingMethodSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

ShippingZoneSchema.index({ isActive: 1, sortOrder: 1 });
ShippingZoneSchema.index({ countries: 1 });

const ShippingZone = mongoose.model('ShippingZone', ShippingZoneSchema);

const shippingMethodSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  handle: Joi.string().trim().min(1).max(50).lowercase().required(),
  description: Joi.string().trim().max(500).allow('').optional(),
  priceUsd: Joi.number().min(0).required(),
  estimatedDaysMin: Joi.number().integer().min(0).optional(),
  estimatedDaysMax: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional(),
  sortOrder: Joi.number().integer().optional(),
});

const validateShippingZone = (obj) => {
  const schema = Joi.object({
    name: Joi.string().trim().min(1).max(200).required(),
    countries: Joi.array().items(Joi.string().length(2).uppercase()).optional(),
    regionPattern: Joi.string().trim().allow('').optional(),
    postalCodePattern: Joi.string().trim().allow('').optional(),
    methods: Joi.array().items(shippingMethodSchema).optional(),
    isActive: Joi.boolean().optional(),
    sortOrder: Joi.number().integer().optional(),
  });
  return schema.validate(obj, { stripUnknown: true });
};

const validateShippingMethod = (obj) => {
  const schema = shippingMethodSchema;
  return schema.validate(obj, { stripUnknown: true });
};

module.exports = {
  ShippingZone,
  validateShippingZone,
  validateShippingMethod,
  ShippingMethodSchema,
};