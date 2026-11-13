const Joi = require('joi');
const { ORDER_STATUSES } = require('../utils/orderTransitions');

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
  title: Joi.any().strip(),
  price: Joi.any().strip(),
});

const orderItemsSchema = Joi.array()
  .items(orderItemSchema)
  .min(1)
  .max(100)
  .required();

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
    delivery: Joi.boolean().optional(),
    shippingMethod: Joi.string().trim().max(50).optional(),
    couponCode: Joi.string().trim().max(50).allow('', null).optional(),
    email: Joi.string().trim().lowercase().email().max(100).optional(),
    locale: Joi.string().valid('en', 'ar').optional(),
    shippingPrice: Joi.any().strip(),
    taxPrice: Joi.any().strip(),
  });
  return schema.validate(obj, { stripUnknown: true });
};

const validateQuote = (obj) => {
  const schema = Joi.object({
    items: Joi.array()
      .items(orderItemSchema.keys({ price: Joi.number().min(0).optional() }))
      .min(1)
      .max(100)
      .required(),
    couponCode: Joi.string().trim().max(50).allow('', null).optional(),
    delivery: Joi.boolean().optional(),
    shippingMethod: Joi.string().trim().max(50).optional(),
    shippingAddress: Joi.object({
      country: Joi.string().trim().length(2).uppercase().optional(),
      zip: Joi.string().trim().min(2).max(20).optional(),
      city: Joi.string().trim().min(2).max(100).optional(),
    }).optional(),
  });
  return schema.validate(obj, { stripUnknown: true });
};

const validateOrderTracking = (obj) => {
  const schema = Joi.object({
    trackingNumber: Joi.string().trim().allow('').optional(),
    trackingCarrier: Joi.string().trim().allow('').optional(),
    trackingUrl: Joi.string().trim().allow('').optional(),
    trackingEvent: Joi.object({
      status: Joi.string()
        .valid(
          'picked_up',
          'in_transit',
          'out_for_delivery',
          'delivered',
          'exception',
        )
        .required(),
      description: Joi.string().trim().allow('').optional(),
      location: Joi.string().trim().allow('').optional(),
    }).optional(),
  });
  return schema.validate(obj);
};

const validateOrderStatus = (obj) => {
  const schema = Joi.object({
    status: Joi.string()
      .valid(...ORDER_STATUSES)
      .required(),
  });
  return schema.validate(obj);
};

module.exports = {
  orderItemSchema,
  orderItemsSchema,
  validateCreateOrder,
  validateQuote,
  validateOrderTracking,
  validateOrderStatus,
};
