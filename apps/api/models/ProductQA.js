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
      maxlength: 500,
    },
    answer: {
      type: String,
      trim: true,
      maxlength: 2000,
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
    // Who voted which way — one vote per user, switchable. Hidden from reads
    // so the public list doesn't ship voter ids.
    helpfulVoters: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      select: false,
    },
    notHelpfulVoters: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      select: false,
    },
    approved: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true, collection: 'product_qa' }
);

ProductQASchema.index({ product: 1, approved: 1 });
// Moderation queue: pending questions across every product. Not served by the
// compound above, which is prefixed on `product`.
ProductQASchema.index({ approved: 1 });

module.exports = mongoose.model('ProductQA', ProductQASchema);
