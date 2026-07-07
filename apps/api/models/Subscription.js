const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    stripeSubscriptionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    stripePriceId: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      trim: true,
      default: 'incomplete',
    },
    currentPeriodEnd: {
      type: Date,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Subscription', SubscriptionSchema);
