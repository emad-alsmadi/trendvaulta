const Joi = require('joi');

const createProductSchema = Joi.object({
  title: Joi.string().required().max(200),
  description: Joi.string().allow('', null),
  price: Joi.number().min(0).required(),
  comparePrice: Joi.number().min(0).allow(null),
  sku: Joi.string().allow('', null).max(100),
  barcode: Joi.string().allow('', null).max(100),
  brand: Joi.string().allow('', null),
  category: Joi.string().allow('', null),
  tags: Joi.array().items(Joi.string()).default([]),
  images: Joi.array().items(Joi.string()).default([]),
  stock: Joi.number().min(0).default(0),
  active: Joi.boolean().default(true),
});

const updateProductSchema = Joi.object({
  title: Joi.string().max(200),
  description: Joi.string().allow('', null),
  price: Joi.number().min(0),
  comparePrice: Joi.number().min(0).allow(null),
  sku: Joi.string().allow('', null).max(100),
  barcode: Joi.string().allow('', null).max(100),
  brand: Joi.string().allow('', null),
  category: Joi.string().allow('', null),
  tags: Joi.array().items(Joi.string()),
  images: Joi.array().items(Joi.string()),
  stock: Joi.number().min(0),
  active: Joi.boolean(),
}).min(1);

module.exports = {
  createProductSchema,
  updateProductSchema,
};
