const mongoose = require('mongoose');

const BundleItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  { _id: false },
);

const BundleSchema = new mongoose.Schema(
  {
    primaryProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      unique: true,
    },
    items: {
      type: [BundleItemSchema],
      required: true,
      validate: {
        validator(items) {
          return items && items.length >= 2;
        },
        message: 'Bundle must have at least 2 items',
      },
    },
    bundlePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    savings: {
      type: Number,
      required: true,
      min: 0,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true, collection: 'bundles' }
);

BundleSchema.index({ primaryProduct: 1, active: 1 });

module.exports = mongoose.model('Bundle', BundleSchema);
