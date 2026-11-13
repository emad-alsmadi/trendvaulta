const Joi = require('joi');

const shippingSchema = Joi.object({
  standardRateUsd: Joi.number().min(0),
  expressRateUsd: Joi.number().min(0),
  freeShippingThresholdUsd: Joi.number().min(0),
});

const invoiceSchema = Joi.object({
  legalName: Joi.string().trim().max(200).allow(''),
  address: Joi.string().trim().max(500).allow(''),
  taxId: Joi.string().trim().max(60).allow(''),
  prefix: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[A-Z0-9]{1,10}$/)
    .messages({ 'string.pattern.base': 'Invoice prefix must be 1-10 letters or digits' }),
});

const validateUpdateStoreSettings = (obj) => {
  const schema = Joi.object({
    storeName: Joi.string().trim().max(200),
    contactEmail: Joi.string().trim().max(200).allow('', null),
    currency: Joi.string().trim().max(10),
    shipping: shippingSchema,
    taxRatePercent: Joi.number().min(0).max(100),
    invoice: invoiceSchema,
  });
  return schema.validate(obj);
};

module.exports = {
  validateUpdateStoreSettings,
};
