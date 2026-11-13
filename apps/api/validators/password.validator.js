const Joi = require('joi');

const resetPasswordSchema = Joi.object({
  password: Joi.string().min(8).max(100).required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().trim().lowercase().max(100).email().required(),
});

const resetPasswordParamsSchema = Joi.object({
  userId: Joi.string()
    .hex()
    .length(24)
    .required()
    .messages({ '*': 'Invalid or expired reset link' }),
  token: Joi.string().trim().max(1000).required(),
});

const resetPasswordBodySchema = Joi.object({
  password: Joi.string().min(8).max(128).required(),
}).unknown(true);

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(8).required(),
  newPassword: Joi.string().min(8).required(),
});

module.exports = {
  resetPasswordSchema,
  forgotPasswordSchema,
  resetPasswordParamsSchema,
  resetPasswordBodySchema,
  changePasswordSchema,
};
