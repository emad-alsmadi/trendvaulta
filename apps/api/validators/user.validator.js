const Joi = require('joi');

const createUserSchema = Joi.object({
  name: Joi.string().required().max(100),
  email: Joi.string().email().required().lowercase(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('customer', 'admin').default('customer'),
  phone: Joi.string().allow('', null),
  address: Joi.object({
    street: Joi.string().allow('', null),
    city: Joi.string().allow('', null),
    postalCode: Joi.string().allow('', null),
    country: Joi.string().allow('', null),
  }).allow(null),
  active: Joi.boolean().default(true),
});

const updateUserSchema = Joi.object({
  name: Joi.string().max(100),
  email: Joi.string().email().lowercase(),
  password: Joi.string().min(6),
  role: Joi.string().valid('customer', 'admin'),
  phone: Joi.string().allow('', null),
  address: Joi.object({
    street: Joi.string().allow('', null),
    city: Joi.string().allow('', null),
    postalCode: Joi.string().allow('', null),
    country: Joi.string().allow('', null),
  }).allow(null),
  active: Joi.boolean(),
}).min(1);

const updateProfileSchema = Joi.object({
  name: Joi.string().max(100),
  phone: Joi.string().allow('', null),
  address: Joi.object({
    street: Joi.string().allow('', null),
    city: Joi.string().allow('', null),
    postalCode: Joi.string().allow('', null),
    country: Joi.string().allow('', null),
  }).allow(null),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  updateProfileSchema,
  changePasswordSchema,
};
