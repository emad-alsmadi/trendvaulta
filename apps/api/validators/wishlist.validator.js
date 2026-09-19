const Joi = require('joi');

const addToWishlistSchema = Joi.object({
  product: Joi.string().required(),
});

module.exports = {
  addToWishlistSchema,
};
