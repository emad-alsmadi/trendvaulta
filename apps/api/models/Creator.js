const mongoose = require('mongoose');
const Joi = require('joi');

const CreatorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 200,
    },
    country: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    bio: {
      type: String,
      trim: true,
      minlength: 3,
      maxlength: 500,
    },
    roles: [
      {
        type: String,
        enum: ['user', 'admin', 'moderator'],
        default: 'user',
      },
    ],
  },
  {
    timestamps: true,
    collection: 'creators',
  },
);

const Creator = mongoose.model('Creator', CreatorSchema);

const validateCreateCreator = (obj) => {
  const schema = Joi.object({
    name: Joi.string().min(3).max(200).required(),
    country: Joi.string().min(2).max(100).allow('').optional(),
    bio: Joi.string().min(3).max(500).allow('').optional(),
    roles: Joi.array()
      .items(Joi.string().valid('user', 'admin', 'moderator'))
      .default(['user']),
  });
  const { error } = schema.validate(obj);
  return error;
};

const validateUpdateCreator = (obj) => {
  const schema = Joi.object({
    name: Joi.string().min(3).max(200),
    country: Joi.string().min(2).max(100).allow(''),
    bio: Joi.string().min(3).max(500).allow(''),
    roles: Joi.array().items(Joi.string().valid('user', 'admin', 'moderator')),
  }).min(1);
  const { error } = schema.validate(obj);
  return error;
};

module.exports = { Creator, validateCreateCreator, validateUpdateCreator };
