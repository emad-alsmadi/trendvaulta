const Joi = require('joi');
const { TOP_LEVEL_SLUGS, SLUG_PATTERN } = require('../models/Category');

// Only subcategories are created through the API; the top-level set is fixed
// (see models/Category.js), so `parent` is required and must be one of it.
const createCategorySchema = Joi.object({
  slug: Joi.string().trim().lowercase().max(64).pattern(SLUG_PATTERN).required()
    .messages({ 'string.pattern.base': 'Slug may only contain lowercase letters, numbers and single hyphens' }),
  parent: Joi.string().valid(...TOP_LEVEL_SLUGS).required(),
  name: Joi.string().trim().max(80).required(),
  description: Joi.string().trim().max(300).allow(''),
  imageUrl: Joi.string().trim().max(500).allow(''),
  sortOrder: Joi.number().integer(),
  isActive: Joi.boolean(),
});

// slug and parent are deliberately absent: products store them, so changing
// either would silently detach every product filed under the old value.
const updateCategorySchema = Joi.object({
  name: Joi.string().trim().max(80),
  description: Joi.string().trim().max(300).allow(''),
  imageUrl: Joi.string().trim().max(500).allow(''),
  sortOrder: Joi.number().integer(),
  isActive: Joi.boolean(),
}).min(1);

module.exports = {
  createCategorySchema,
  updateCategorySchema,
};
