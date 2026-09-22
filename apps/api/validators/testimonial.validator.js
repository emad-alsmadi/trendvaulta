const Joi = require('joi');

const createTestimonialSchema = Joi.object({
  id: Joi.string().required().max(50),
  name: Joi.string().required().max(100),
  role: Joi.string().allow('', null).max(100),
  quote: Joi.string().required(),
  rating: Joi.number().min(1).max(5).default(5),
  active: Joi.boolean().default(true),
  sortOrder: Joi.number().default(0),
});

const updateTestimonialSchema = Joi.object({
  name: Joi.string().max(100),
  role: Joi.string().allow('', null).max(100),
  quote: Joi.string(),
  rating: Joi.number().min(1).max(5),
  active: Joi.boolean(),
  sortOrder: Joi.number(),
}).min(1);

module.exports = {
  createTestimonialSchema,
  updateTestimonialSchema,
};
