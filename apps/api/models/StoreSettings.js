const mongoose = require('mongoose');
const Joi = require('joi');

// Singleton document: there is only ever one StoreSettings row, keyed by a
// fixed _id so findOneAndUpdate(..., { upsert: true }) always targets it.
const SINGLETON_ID = 'default';

const StoreSettingsSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: SINGLETON_ID,
    },
    storeName: {
      type: String,
      trim: true,
      maxlength: 200,
      default: 'TrendVaulta',
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 200,
      default: '',
    },
    currency: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 10,
      default: 'usd',
    },
    shipping: {
      standardRateUsd: {
        type: Number,
        min: 0,
        default: 5,
      },
      expressRateUsd: {
        type: Number,
        min: 0,
        default: 15,
      },
      // 0 disables the free-shipping threshold
      freeShippingThresholdUsd: {
        type: Number,
        min: 0,
        default: 0,
      },
    },
    taxRatePercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    // Seller block printed on invoices (utils/invoice.js)
    invoice: {
      legalName: {
        type: String,
        trim: true,
        maxlength: 200,
        default: '',
      },
      address: {
        type: String,
        trim: true,
        maxlength: 500,
        default: '',
      },
      taxId: {
        type: String,
        trim: true,
        maxlength: 60,
        default: '',
      },
      // TV → TV-2026-000123. Changing it only affects numbers issued later.
      prefix: {
        type: String,
        trim: true,
        uppercase: true,
        maxlength: 10,
        match: /^[A-Z0-9]+$/,
        default: 'TV',
      },
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'storesettings',
    _id: false,
  },
);

const StoreSettings = mongoose.model('StoreSettings', StoreSettingsSchema);

const shippingSchema = Joi.object({
  standardRateUsd: Joi.number().min(0),
  expressRateUsd: Joi.number().min(0),
  freeShippingThresholdUsd: Joi.number().min(0),
});

const invoiceSchema = Joi.object({
  legalName: Joi.string().trim().max(200).allow(''),
  address: Joi.string().trim().max(500).allow(''),
  taxId: Joi.string().trim().max(60).allow(''),
  prefix: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[A-Z0-9]{1,10}$/)
    .messages({ 'string.pattern.base': 'Invoice prefix must be 1-10 letters or digits' }),
});

const validateUpdateStoreSettings = (obj) => {
  const schema = Joi.object({
    storeName: Joi.string().trim().max(200),
    contactEmail: Joi.string().trim().max(200).allow('', null),
    currency: Joi.string().trim().max(10),
    shipping: shippingSchema,
    taxRatePercent: Joi.number().min(0).max(100),
    invoice: invoiceSchema,
  });
  return schema.validate(obj);
};

module.exports = {
  StoreSettings,
  SINGLETON_ID,
  validateUpdateStoreSettings,
};
