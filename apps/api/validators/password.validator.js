const Joi = require('joi');

const resetPasswordSchema = Joi.object({
  password: Joi.string().min(8).max(100).required(),
});

module.exports = {
  resetPasswordSchema,
};
