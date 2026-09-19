const Joi = require('joi');

const createProductQuestionSchema = Joi.object({
  productId: Joi.string().required(),
  question: Joi.string().required(),
});

const answerProductQASchema = Joi.object({
  answer: Joi.string().allow('', null),
  approved: Joi.boolean(),
}).min(1);

const markHelpfulSchema = Joi.object({
  helpful: Joi.boolean().required(),
});

module.exports = {
  createProductQuestionSchema,
  answerProductQASchema,
  markHelpfulSchema,
};
