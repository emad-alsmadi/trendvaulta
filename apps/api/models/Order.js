const mongoose = require('mongoose');
const Joi = require('joi');

const OrderItemSchema = new mongoose.Schema(
  {
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Template',
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
      enum: ['pending', 'paid', 'shipped', 'delivered', 'canceled'],
      default: 'pending',
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
  },
  { timestamps: true },
);

const Order = mongoose.model('Order', OrderSchema);

const validateCreateOrder = (obj) => {
  const schema = Joi.object({
    items: Joi.array()
      .items(
        Joi.object({
          template: Joi.string().hex().length(24),
          templateId: Joi.string().hex().length(24),
          qty: Joi.number().integer().min(1).required(),
          title: Joi.string().trim().min(1).max(300).optional(),
          price: Joi.number().min(0).optional(),
          cover: Joi.string().trim().min(3).max(2000).optional(),
        }).custom((value, helpers) => {
          const id = value.template || value.templateId;
          if (!id) {
            return helpers.error('any.custom', {
              message: 'Each item requires template or templateId',
            });
          }
          return { ...value, template: id };
        }),
      )
      .min(1)
      .required(),
    shippingAddress: Joi.object({
      name: Joi.string().trim().min(2).max(200).required(),
      phone: Joi.string().trim().min(6).max(30).required(),
      address: Joi.string().trim().min(5).max(300).required(),
      city: Joi.string().trim().min(2).max(100).required(),
      zip: Joi.string().trim().min(2).max(20).required(),
      notes: Joi.string().trim().max(500).allow('').optional(),
    }).required(),
    shippingPrice: Joi.number().min(0).optional(),
    taxPrice: Joi.number().min(0).optional(),
  });

  return schema.validate(obj);
};

module.exports = {
  Order,
  validateCreateOrder,
};
