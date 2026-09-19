const Joi = require('joi');

const createReviewSchema = Joi.object({
  product: Joi.string().required(),
  rating: Joi.number().min(1).max(5).required(),
  title: Joi.string().allow('', null).max(200),
  comment: Joi.string().allow('', null),
  verified: Joi.boolean().default(false),
  active: Joi.boolean().default(true),
});

const updateReviewSchema = Joi.object({
  rating: Joi.number().min(1).max(5),
  title: Joi.string().allow('', null).max(200),
  comment: Joi.string().allow('', null),
  verified: Joi.boolean(),
  active: Joi.boolean(),
}).min(1);

module.exports = {
  createReviewSchema,
  updateReviewSchema,
};
