const Joi = require('joi');

const orderItemSchema = Joi.object({
  product: Joi.string().required(),
  quantity: Joi.number().min(1).required(),
  price: Joi.number().min(0).required(),
});

const createOrderSchema = Joi.object({
  items: Joi.array().items(orderItemSchema).min(1).required(),
  shippingAddress: Joi.object({
    fullName: Joi.string().required(),
    address: Joi.string().required(),
    city: Joi.string().required(),
    postalCode: Joi.string().required(),
    country: Joi.string().required(),
    phone: Joi.string().required(),
  }).required(),
  paymentMethod: Joi.string().required(),
  couponCode: Joi.string().allow('', null),
});

const updateOrderSchema = Joi.object({
  status: Joi.string().valid('pending', 'processing', 'shipped', 'delivered', 'cancelled'),
  trackingNumber: Joi.string().allow('', null),
  notes: Joi.string().allow('', null),
}).min(1);

module.exports = {
  createOrderSchema,
  updateOrderSchema,
};
