const mongoose = require('mongoose');
const {
  orderItemSchema,
  orderItemsSchema,
  validateCreateOrder,
  validateQuote,
} = require('../validators/order.validator');

const OrderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    qty: {
      type: Number,
      required: true,
      min: 1,
    },
    cover: {
      type: String,
      required: true,
      trim: true,
    },
    variant: {
      size: { type: String, trim: true },
      color: { type: String, trim: true },
      colorCode: { type: String, trim: true },
      sku: { type: String, trim: true },
    },
  },
  { _id: false },
);

const ShippingAddressSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 200,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      minlength: 6,
      maxlength: 30,
    },
    address: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 300,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    zip: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 20,
    },
    country: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 2,
      default: '',
    },
    notes: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { _id: false },
);

const OrderSchema = new mongoose.Schema(
  {
    // null for a guest order (plan P0-03), which carries guestEmail instead.
    // A guest order is attached to an account once someone registers and
    // confirms that same email (services/guestOrders.service.js attachGuestOrders).
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      required: [
        function requireUserUnlessGuest() {
          return !this.guestEmail;
        },
        'An order needs a customer account or a guest email',
      ],
    },
    guestEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 100,
      default: '',
    },
    // Storefront language at checkout: a guest's emails use it (an account's
    // emails use the account's language) — plan P1-02.
    locale: {
      type: String,
      enum: ['en', 'ar'],
      default: 'en',
    },
    items: {
      type: [OrderItemSchema],
      validate: [
        (v) => Array.isArray(v) && v.length > 0,
        'Order items are required',
      ],
      required: true,
    },
    shippingAddress: {
      type: ShippingAddressSchema,
      required: true,
    },
    status: {
      type: String,
      enum: [
        'pending',
        'paid',
        'shipped',
        'delivered',
        'canceled',
        'needs_attention',
        'refunded',
      ],
      default: 'pending',
    },
    attentionReason: {
      type: String,
      enum: [
        'insufficient_stock',
        'paid_after_cancel',
        'refund_failed',
        'manual_refund_required',
        '',
      ],
      default: '',
    },
    // Fulfilment chosen at checkout (see resolveFulfillment): delivery=false
    // / shippingMethod 'none' = store pickup, otherwise the zone/method
    // handle that was priced. No defaults, so older orders read as unknown.
    delivery: {
      type: Boolean,
    },
    shippingMethod: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    itemsPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    // Set when staff mark the order shipped; refunds after this never
    // restock (see hasOrderShipped). Absent on orders shipped before it.
    shippedAt: {
      type: Date,
    },
    // Amount Stripe captured (session.amount_total / 100), set when paid.
    // Refund caps use this; absent on unpaid and older orders.
    amountPaid: {
      type: Number,
      min: 0,
    },
    shippingPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    taxPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    discountAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    couponCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
      default: null,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    stripeSessionId: {
      type: String,
      trim: true,
      default: '',
    },
    paymentIntentId: {
      type: String,
      trim: true,
      default: '',
    },
    paidAt: {
      type: Date,
    },
    stockDecremented: {
      type: Boolean,
      default: false,
    },
    couponIncremented: {
      type: Boolean,
      default: false,
    },
    salesCountIncremented: {
      type: Boolean,
      default: false,
    },
    confirmationEmailSent: {
      type: Boolean,
      default: false,
    },
    stockRestored: {
      type: Boolean,
      default: false,
    },
    refundId: {
      type: String,
      trim: true,
      default: '',
    },
    refundedAt: {
      type: Date,
    },
    refundAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    // Sequential per year (TV-2026-000123), assigned once when the payment is
    // captured (utils/invoice.js ensureInvoiceNumber) and never changed.
    invoiceNumber: {
      type: String,
      trim: true,
      default: '',
    },
    invoiceIssuedAt: {
      type: Date,
    },
    // Short claim while a number is being allocated, so concurrent callers
    // can't each burn one; a stale claim (crash) is taken over after 1 min.
    invoiceClaimedAt: {
      type: Date,
      default: null,
    },
    trackingNumber: {
      type: String,
      trim: true,
      default: '',
    },
    trackingCarrier: {
      type: String,
      trim: true,
      default: '',
    },
    trackingUrl: {
      type: String,
      trim: true,
      default: '',
    },
    // Set when staff mark the order delivered; starts the return window
    // (utils/returns.js). Older orders fall back to tracking/updatedAt.
    deliveredAt: {
      type: Date,
    },
    trackingEvents: {
      type: [
        {
          status: {
            type: String,
            enum: [
              'picked_up',
              'in_transit',
              'out_for_delivery',
              'delivered',
              'exception',
            ],
          },
          description: {
            type: String,
            trim: true,
            default: '',
          },
          location: {
            type: String,
            trim: true,
            default: '',
          },
          timestamp: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },
    returnRequest: {
      type: {
        status: {
          type: String,
          enum: [
            'none',
            'requested',
            'approved',
            'rejected',
            'received',
            'refunded',
          ],
          default: 'none',
        },
        reason: {
          type: String,
          trim: true,
          default: '',
        },
        items: [
          {
            productId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'Product',
            },
            title: {
              type: String,
              trim: true,
            },
            qty: {
              type: Number,
              min: 1,
            },
            reason: {
              type: String,
              trim: true,
            },
          },
        ],
        requestedAt: {
          type: Date,
        },
        approvedAt: {
          type: Date,
        },
        receivedAt: {
          type: Date,
        },
        rejectedAt: {
          type: Date,
        },
        refundedAt: {
          type: Date,
        },
        refundId: {
          type: String,
          trim: true,
          default: '',
        },
        refundAmount: {
          type: Number,
          min: 0,
          default: 0,
        },
        // Where and how to send the items back — written by staff on
        // approval, shown to the customer.
        instructions: {
          type: String,
          trim: true,
          maxlength: 2000,
          default: '',
        },
        // Message to the customer (e.g. why a return was rejected).
        notes: {
          type: String,
          trim: true,
          default: '',
        },
      },
      default: null,
    },
  },
  { timestamps: true },
);

// My orders / admin list
OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ paymentStatus: 1, createdAt: -1 });
// Stripe lookups (verify-payment, webhook handlers)
OrderSchema.index({ stripeSessionId: 1 }, { sparse: true });
OrderSchema.index({ paymentIntentId: 1 }, { sparse: true });
// Guest orders by email: coupon per-customer limits, attaching to an account
OrderSchema.index(
  { guestEmail: 1, createdAt: -1 },
  { partialFilterExpression: { guestEmail: { $gt: '' } } },
);
// An invoice number is issued once: unique among orders that have one
OrderSchema.index(
  { invoiceNumber: 1 },
  { unique: true, partialFilterExpression: { invoiceNumber: { $gt: '' } } },
);

const Order = mongoose.model('Order', OrderSchema);

module.exports = {
  Order,
  orderItemSchema,
  orderItemsSchema,
  validateCreateOrder,
  validateQuote,
};
