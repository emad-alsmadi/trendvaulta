const Joi = require('joi');

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().lowercase(),
});

const resetPasswordSchema = Joi.object({
  password: Joi.string().min(6).required(),
});

module.exports = {
  forgotPasswordSchema,
  resetPasswordSchema,
};
