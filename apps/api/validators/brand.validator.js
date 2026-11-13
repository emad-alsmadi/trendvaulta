const Joi = require('joi');

const validateCreateBrand = (obj) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    slug: Joi.string().trim().lowercase().required(),
    description: Joi.string().max(500).allow(''),
    logo: Joi.string().trim().allow(''),
    website: Joi.string().trim().uri().allow(''),
    country: Joi.string().trim().allow(''),
    isActive: Joi.boolean().default(true),
    featured: Joi.boolean().default(false),
  });
  const { error } = schema.validate(obj);
  return error;
};

const validateUpdateBrand = (obj) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(100),
    slug: Joi.string().trim().lowercase(),
    description: Joi.string().max(500).allow(''),
    logo: Joi.string().trim().allow(''),
    website: Joi.string().trim().uri().allow(''),
    country: Joi.string().trim().allow(''),
    isActive: Joi.boolean(),
    featured: Joi.boolean(),
  });
  const { error } = schema.validate(obj);
  return error;
};

module.exports = {
  validateCreateBrand,
  validateUpdateBrand,
};
