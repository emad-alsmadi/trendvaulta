const mongoose = require('mongoose');
const Joi = require('joi');

const TemplateSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 200,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Creator',
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 500,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    cover: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    collection: 'templates',
  },
);

const Template = mongoose.model('Template', TemplateSchema);

const validateCreateTemplate = (obj) => {
  const schema = Joi.object({
    title: Joi.string().min(3).max(200).required(),
    author: Joi.string().hex().length(24).required(),
    description: Joi.string().min(3).max(200).required(),
    price: Joi.number().min(0).required(),
    cover: Joi.string().trim().required(),
  });
  const { error } = schema.validate(obj);
  return error;
};

const validateUpdateTemplate = (obj) => {
  const schema = Joi.object({
    title: Joi.string().min(3).max(200),
    author: Joi.string().hex().length(24),
    description: Joi.string().min(3).max(200),
    price: Joi.number().min(0),
    cover: Joi.string().trim(),
  });
  const { error } = schema.validate(obj);
  return error;
};

module.exports = { Template, validateCreateTemplate, validateUpdateTemplate };
