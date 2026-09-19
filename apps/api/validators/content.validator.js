const Joi = require('joi');

const createContentSchema = Joi.object({
  key: Joi.string().required().max(100),
  title: Joi.string().allow('', null).max(200),
  body: Joi.string().allow('', null),
  active: Joi.boolean().default(true),
});

const updateContentSchema = Joi.object({
  key: Joi.string().max(100),
  title: Joi.string().allow('', null).max(200),
  body: Joi.string().allow('', null),
  active: Joi.boolean(),
}).min(1);

module.exports = {
  createContentSchema,
  updateContentSchema,
};
