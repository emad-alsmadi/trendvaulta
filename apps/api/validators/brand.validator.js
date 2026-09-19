const Joi = require('joi');

const createBrandSchema = Joi.object({
  name: Joi.string().required().max(100),
  description: Joi.string().allow('', null),
  logo: Joi.string().allow('', null).max(500),
  website: Joi.string().allow('', null).max(500),
  active: Joi.boolean().default(true),
});

const updateBrandSchema = Joi.object({
  name: Joi.string().max(100),
  description: Joi.string().allow('', null),
  logo: Joi.string().allow('', null).max(500),
  website: Joi.string().allow('', null).max(500),
  active: Joi.boolean(),
}).min(1);

module.exports = {
  createBrandSchema,
  updateBrandSchema,
};
