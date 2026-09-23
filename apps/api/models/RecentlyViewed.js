const mongoose = require('mongoose');

const MAX_RECENTLY_VIEWED = 12;

const RecentlyViewedItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    viewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

/**
 * One document per user; `items` kept newest-first and capped at 12.
 */
const RecentlyViewedSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    items: {
      type: [RecentlyViewedItemSchema],
      default: [],
      validate: {
        validator(items) {
          return !items || items.length <= MAX_RECENTLY_VIEWED;
        },
        message: `items cannot exceed ${MAX_RECENTLY_VIEWED}`,
      },
    },
  },
  {
    timestamps: true,
    collection: 'recently_viewed',
  },
);


const RecentlyViewed = mongoose.model('RecentlyViewed', RecentlyViewedSchema);

module.exports = {
  RecentlyViewed,
  MAX_RECENTLY_VIEWED,
};
