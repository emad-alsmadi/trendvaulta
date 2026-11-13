const Joi = require('joi');

const MERCHANDISING_BADGES = ['bestseller', 'new', 'lowStock'];

const validateCreateProduct = (obj) => {
  const schema = Joi.object({
    title: Joi.string().min(3).max(200).required(),
    brand: Joi.string().hex().length(24).required(),
    description: Joi.string().min(3).max(2000).required(),
    price: Joi.number().min(0).required(),
    cover: Joi.string().trim().required(),
    images: Joi.array().items(Joi.string().trim()),
    category: Joi.string()
      .valid(
        'makeup',
        'perfumes',
        'clothing',
        'skincare',
        'accessories',
        'home',
      )
      .required(),
    subcategory: Joi.string().trim().required(),
    variants: Joi.array().items(
      Joi.object({
        size: Joi.string().trim(),
        color: Joi.string().trim(),
        colorCode: Joi.string().trim(),
        stock: Joi.number().min(0).default(0),
        price: Joi.number().min(0),
        sku: Joi.string().trim(),
      }),
    ),
    material: Joi.string().trim(),
    weight: Joi.number().min(0),
    dimensions: Joi.object({
      length: Joi.number().min(0),
      width: Joi.number().min(0),
      height: Joi.number().min(0),
    }),
    shippingInfo: Joi.object({
      weight: Joi.number().min(0),
      dimensions: Joi.object({
        length: Joi.number().min(0),
        width: Joi.number().min(0),
        height: Joi.number().min(0),
      }),
      requiresSpecialHandling: Joi.boolean().default(false),
    }),
    stock: Joi.number().min(0).default(0),
    sku: Joi.string().trim(),
    isActive: Joi.boolean().default(true),
    featured: Joi.boolean().default(false),
    badges: Joi.array().items(
      Joi.string().valid(...MERCHANDISING_BADGES),
    ),
  });
  const { error } = schema.validate(obj);
  return error;
};

const validateUpdateProduct = (obj) => {
  const schema = Joi.object({
    title: Joi.string().min(3).max(200),
    brand: Joi.string().hex().length(24),
    description: Joi.string().min(3).max(2000),
    price: Joi.number().min(0),
    cover: Joi.string().trim(),
    images: Joi.array().items(Joi.string().trim()),
    category: Joi.string().valid(
      'makeup',
      'perfumes',
      'clothing',
      'skincare',
      'accessories',
      'home',
    ),
    subcategory: Joi.string().trim(),
    variants: Joi.array().items(
      Joi.object({
        size: Joi.string().trim(),
        color: Joi.string().trim(),
        colorCode: Joi.string().trim(),
        stock: Joi.number().min(0),
        price: Joi.number().min(0),
        sku: Joi.string().trim(),
      }),
    ),
    material: Joi.string().trim(),
    weight: Joi.number().min(0),
    dimensions: Joi.object({
      length: Joi.number().min(0),
      width: Joi.number().min(0),
      height: Joi.number().min(0),
    }),
    shippingInfo: Joi.object({
      weight: Joi.number().min(0),
      dimensions: Joi.object({
        length: Joi.number().min(0),
        width: Joi.number().min(0),
        height: Joi.number().min(0),
      }),
      requiresSpecialHandling: Joi.boolean(),
    }),
    stock: Joi.number().min(0),
    sku: Joi.string().trim(),
    isActive: Joi.boolean(),
    featured: Joi.boolean(),
    badges: Joi.array().items(
      Joi.string().valid(...MERCHANDISING_BADGES),
    ),
    expectedUpdatedAt: Joi.date().iso(),
  });
  const { error } = schema.validate(obj);
  return error;
};

module.exports = {
  validateCreateProduct,
  validateUpdateProduct,
};
