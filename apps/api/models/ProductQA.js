const mongoose = require('mongoose');

const ProductQASchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      trim: true,
    },
    askedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    answeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    helpful: {
      type: Number,
      default: 0,
    },
    notHelpful: {
      type: Number,
      default: 0,
    },
    approved: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true, collection: 'product_qa' }
);

ProductQASchema.index({ product: 1, approved: 1 });
ProductQASchema.index({ approved: 1 });

module.exports = mongoose.model('ProductQA', ProductQASchema);
