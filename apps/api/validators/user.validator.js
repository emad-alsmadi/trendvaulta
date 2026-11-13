const Joi = require('joi');

const validateRegisterUser = (obj) => {
  const schema = Joi.object({
    email: Joi.string().trim().min(5).max(100).required().email(),
    username: Joi.string().trim().min(2).max(200).required(),
    password: Joi.string().trim().min(8).max(100).required(),
    roles: Joi.any().forbidden(),
  });
  return schema.validate(obj, { stripUnknown: true });
};

const validateLoginUser = (obj) => {
  const schema = Joi.object({
    email: Joi.string().trim().min(5).max(100).required().email(),
    password: Joi.string().trim().min(8).max(100).required(),
  });
  return schema.validate(obj);
};

const validateUpdateUser = (obj) => {
  const schema = Joi.object({
    email: Joi.string().trim().min(5).max(100).email(),
    username: Joi.string().trim().min(2).max(200),
    password: Joi.string().trim().min(8).max(100),
    roles: Joi.array().items(Joi.string().valid('user', 'admin', 'moderator')),
    disabled: Joi.boolean(),
    adminNotes: Joi.string().trim().max(2000).allow(''),
  }).min(1);
  return schema.validate(obj);
};

const validateUpdateProfile = (obj) => {
  const schema = Joi.object({
    username: Joi.string().trim().min(3).max(200).required(),
    email: Joi.string().trim().lowercase().email().max(100).required(),
    // Required (checked in the controller) only when the email changes.
    currentPassword: Joi.string().max(128).allow('').optional(),
  });
  return schema.validate(obj);
};

const validateCreateAddress = (obj) => {
  const schema = Joi.object({
    label: Joi.string().trim().max(40).allow('').optional(),
    name: Joi.string().trim().min(2).max(200).required(),
    phone: Joi.string().trim().min(6).max(30).required(),
    address: Joi.string().trim().min(5).max(300).required(),
    city: Joi.string().trim().min(2).max(100).required(),
    zip: Joi.string().trim().min(2).max(20).required(),
    country: Joi.string().trim().length(2).uppercase().allow('').optional(),
    isDefault: Joi.boolean().optional(),
  });
  return schema.validate(obj);
};

const validateUpdateAddress = (obj) => {
  const schema = Joi.object({
    label: Joi.string().trim().max(40).allow(''),
    name: Joi.string().trim().min(2).max(200),
    phone: Joi.string().trim().min(6).max(30),
    address: Joi.string().trim().min(5).max(300),
    city: Joi.string().trim().min(2).max(100),
    zip: Joi.string().trim().min(2).max(20),
    country: Joi.string().trim().length(2).uppercase().allow(''),
    isDefault: Joi.boolean(),
  }).min(1);
  return schema.validate(obj);
};

module.exports = {
  validateRegisterUser,
  validateLoginUser,
  validateUpdateUser,
  validateUpdateProfile,
  validateCreateAddress,
  validateUpdateAddress,
};
