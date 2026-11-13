const Joi = require('joi');

const CONTACT_STATUSES = ['new', 'read', 'closed'];

const validateContactMessage = (obj) => {
  const schema = Joi.object({
    name: Joi.string().trim().min(2).max(80).required(),
    email: Joi.string().trim().min(5).max(100).required().email(),
    subject: Joi.string().trim().min(2).max(120).required(),
    message: Joi.string().trim().min(10).max(2000).required(),
    website: Joi.string().trim().allow('').optional(),
  });
  return schema.validate(obj);
};

const validateUpdateContactMessage = (obj) => {
  const schema = Joi.object({
    status: Joi.string().valid(...CONTACT_STATUSES),
    staffNote: Joi.string().trim().allow('').max(1000),
  })
    .or('status', 'staffNote')
    .messages({ 'object.missing': 'Provide a status or a staff note' });
  return schema.validate(obj);
};

module.exports = {
  validateContactMessage,
  validateUpdateContactMessage,
  CONTACT_STATUSES,
};
