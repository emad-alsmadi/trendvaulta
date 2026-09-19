const mongoose = require('mongoose');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
// User Schema
const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 100,
      unique: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 200,
    },
    password: {
      type: String,
      required: true,
      trim: true,
      minlength: 8,
      maxlength: 200,
    },
    roles: [
      {
        type: String,
        enum: ['user', 'admin', 'moderator'],
        default: 'user',
      },
    ],
    stripeCustomerId: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true },
);

// Short-lived on purpose: this JWT cannot be revoked server-side once issued,
// so a small blast radius matters more than avoiding refresh calls. Sessions
// stay alive via the refresh token (see utils/refreshTokens.js), which *can*
// be revoked/rotated.
const ACCESS_TOKEN_TTL = '15m';

UserSchema.methods.generateToken = function() {
  return jwt.sign(
    { id: String(this._id), roles: this._doc.roles },
    process.env.JWT_SECRET_KEY,
    { expiresIn: ACCESS_TOKEN_TTL },
  );
};
const User = mongoose.model('User', UserSchema);

// Validate Register User
const validateRegisterUser = (obj) => {
  const schema = Joi.object({
    email: Joi.string().trim().min(5).max(100).required().email(),
    username: Joi.string().trim().min(2).max(200).required(),
    password: Joi.string().trim().min(8).max(100).required(),
    // Public registration must never accept client-supplied roles
    roles: Joi.any().forbidden(),
  });
  return schema.validate(obj, { stripUnknown: true });
};
// Validate Login User
const validateLoginUser = (obj) => {
  const schema = Joi.object({
    email: Joi.string().trim().min(5).max(100).required().email(),
    password: Joi.string().trim().min(8).max(100).required(),
  });
  return schema.validate(obj);
};
// Validate Update User
const validateUpdateUser = (obj) => {
  const schema = Joi.object({
    email: Joi.string().trim().min(5).max(100).email(),
    username: Joi.string().trim().min(2).max(200),
    password: Joi.string().trim().min(8).max(100),
    roles: Joi.array().items(Joi.string().valid('user', 'admin', 'moderator')),
  }).min(1);
  return schema.validate(obj);
};
module.exports = {
  User,
  validateLoginUser,
  validateRegisterUser,
  validateUpdateUser,
};
