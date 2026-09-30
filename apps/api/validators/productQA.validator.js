const Joi = require('joi');

// productId is the route param (/products/:id/qa); body copy is accepted for
// clients that still send it. The controller enforces presence.
const createProductQuestionSchema = Joi.object({
  productId: Joi.string(),
  // Same bounds as the storefront form (ProductQaSection).
  question: Joi.string().trim().min(10).max(500).required(),
});

const answerProductQASchema = Joi.object({
  answer: Joi.string().trim().max(2000).allow('', null),
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
