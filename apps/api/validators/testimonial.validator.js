const Joi = require('joi');

const createTestimonialSchema = Joi.object({
  name: Joi.string().required().max(100),
  role: Joi.string().allow('', null).max(100),
  content: Joi.string().required(),
  rating: Joi.number().min(1).max(5).default(5),
  imageUrl: Joi.string().allow('', null).max(500),
  active: Joi.boolean().default(true),
  sortOrder: Joi.number().default(0),
});

const updateTestimonialSchema = Joi.object({
  name: Joi.string().max(100),
  role: Joi.string().allow('', null).max(100),
  content: Joi.string(),
  rating: Joi.number().min(1).max(5),
  imageUrl: Joi.string().allow('', null).max(500),
  active: Joi.boolean(),
  sortOrder: Joi.number(),
}).min(1);

module.exports = {
  createTestimonialSchema,
  updateTestimonialSchema,
};
