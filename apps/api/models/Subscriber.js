const mongoose = require('mongoose');
const {
  validateSubscribe,
  validateConfirm,
  validateUnsubscribe,
} = require('../validators/subscriber.validator');

const SubscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      minlength: 5,
      maxlength: 100,
    },
    source: {
      type: String,
      enum: ['footer', 'checkout', 'other'],
      default: 'footer',
    },
    // Double opt-in: an address is `pending` until its owner clicks the
    // confirmation link, and only `subscribed` addresses may be mailed.
    status: {
      type: String,
      enum: ['pending', 'subscribed', 'unsubscribed'],
      default: 'pending',
    },
    confirmedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

// `unique: true` on the email path already creates the unique index; a
// second explicit schema.index() on the same key only warns at boot.

const Subscriber = mongoose.model('Subscriber', SubscriberSchema);

module.exports = {
  Subscriber,
  validateSubscribe,
  validateConfirm,
  validateUnsubscribe,
};
