const Joi = require('joi');

const validateCreateReview = (obj) => {
  const schema = Joi.object({
    product: Joi.string().hex().length(24).required(),
    rating: Joi.number().min(1).max(5).required(),
    comment: Joi.string().min(3).max(1000).required(),
  });
  const { error } = schema.validate(obj);
  return error;
};

const validateReviewReply = (obj) => {
  const schema = Joi.object({
    text: Joi.string().trim().min(2).max(1000).required(),
  });
  const { error } = schema.validate(obj);
  return error;
};

const validateReviewStatus = (obj) => {
  const schema = Joi.object({
    status: Joi.string().valid('pending', 'approved', 'rejected').required(),
  });
  const { error } = schema.validate(obj);
  return error;
};

const validateUpdateReview = (obj) => {
  const schema = Joi.object({
    rating: Joi.number().min(1).max(5),
    comment: Joi.string().min(3).max(1000),
  }).min(1);
  const { error } = schema.validate(obj);
  return error;
};

module.exports = {
  validateCreateReview,
  validateReviewReply,
  validateReviewStatus,
  validateUpdateReview,
};
