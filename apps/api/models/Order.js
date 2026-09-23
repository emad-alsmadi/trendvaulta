const mongoose = require('mongoose');
const Joi = require('joi');

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
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
    itemsPrice: {
      type: Number,
      required: true,
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
        refundAmount: {
          type: Number,
          min: 0,
          default: 0,
        },
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

const Order = mongoose.model('Order', OrderSchema);

/** Shared client line shape: productId/qty/variant hints only (server prices lines). */
const orderItemSchema = Joi.object({
  productId: Joi.string().hex().length(24).required(),
  qty: Joi.number().integer().min(1).required(),
  variant: Joi.object({
    size: Joi.string().trim().allow('', null),
    color: Joi.string().trim().allow('', null),
    colorCode: Joi.string().trim().allow('', null),
    sku: Joi.string().trim().allow('', null),
  }).optional(),
  // Client price/title/cover ignored by server — allowed for backward compat only
  title: Joi.any().strip(),
  price: Joi.any().strip(),
});

const orderItemsSchema = Joi.array().items(orderItemSchema).min(1).required();

const validateCreateOrder = (obj) => {
  const schema = Joi.object({
    items: orderItemsSchema,
    shippingAddress: Joi.object({
      name: Joi.string().trim().min(2).max(200).required(),
      phone: Joi.string().trim().min(6).max(30).required(),
      address: Joi.string().trim().min(5).max(300).required(),
      city: Joi.string().trim().min(2).max(100).required(),
      zip: Joi.string().trim().min(2).max(20).required(),
      country: Joi.string().trim().length(2).uppercase().optional(),
      notes: Joi.string().trim().max(500).allow('').optional(),
    }).required(),
    // Client shippingPrice/taxPrice ignored — use delivery / shippingMethod
    delivery: Joi.boolean().optional(),
    shippingMethod: Joi.string()
      .valid('none', 'standard', 'express')
      .optional(),
    couponCode: Joi.string().trim().max(50).allow('', null).optional(),
    shippingPrice: Joi.any().strip(),
    taxPrice: Joi.any().strip(),
  });

  return schema.validate(obj, { stripUnknown: true });
};

/**
 * POST /payments/quote body. Same line shape as createOrder, but the client's
 * last-seen unit price is kept so the server can flag price drift.
 */
const validateQuote = (obj) => {
  const schema = Joi.object({
    items: Joi.array()
      .items(orderItemSchema.keys({ price: Joi.number().min(0).optional() }))
      .min(1)
      .max(100)
      .required(),
    couponCode: Joi.string().trim().max(50).allow('', null).optional(),
    delivery: Joi.boolean().optional(),
    shippingMethod: Joi.string()
      .valid('none', 'standard', 'express')
      .optional(),
    shippingAddress: Joi.object({
      country: Joi.string().trim().length(2).uppercase().optional(),
      zip: Joi.string().trim().min(2).max(20).optional(),
      city: Joi.string().trim().min(2).max(100).optional(),
    }).optional(),
  });

  return schema.validate(obj, { stripUnknown: true });
};

module.exports = {
  Order,
  orderItemSchema,
  orderItemsSchema,
  validateCreateOrder,
  validateQuote,
};
