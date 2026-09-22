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

const validateUpdateStoreSettings = (obj) => {
  const schema = Joi.object({
    storeName: Joi.string().trim().max(200),
    contactEmail: Joi.string().trim().max(200).allow('', null),
    currency: Joi.string().trim().max(10),
    shipping: shippingSchema,
    taxRatePercent: Joi.number().min(0).max(100),
  });
  return schema.validate(obj);
};

module.exports = {
  StoreSettings,
  SINGLETON_ID,
  validateUpdateStoreSettings,
};
