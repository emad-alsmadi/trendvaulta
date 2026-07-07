const mongoose = require('mongoose');

const StripeWebhookEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('StripeWebhookEvent', StripeWebhookEventSchema);
