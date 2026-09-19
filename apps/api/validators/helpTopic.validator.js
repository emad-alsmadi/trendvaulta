const Joi = require('joi');

const createHelpTopicSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().allow('', null),
  href: Joi.string().required(),
  icon: Joi.string().allow('', null),
  active: Joi.boolean().default(true),
  sortOrder: Joi.number().default(0),
});

const updateHelpTopicSchema = Joi.object({
  title: Joi.string(),
  description: Joi.string().allow('', null),
  href: Joi.string(),
  icon: Joi.string().allow('', null),
  active: Joi.boolean(),
  sortOrder: Joi.number(),
}).min(1);

module.exports = {
  createHelpTopicSchema,
  updateHelpTopicSchema,
};
