const Joi = require('joi');

const trackRecentlyViewedSchema = Joi.object({
  productId: Joi.string().required(),
});

module.exports = {
  trackRecentlyViewedSchema,
};
