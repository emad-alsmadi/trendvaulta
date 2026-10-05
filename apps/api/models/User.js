const mongoose = require('mongoose');
const Joi = require('joi');
const jwt = require('jsonwebtoken');

// Saved address book entry. Same field names/constraints as Order's
// ShippingAddressSchema (apps/api/models/Order.js) so it maps directly onto
// the checkout form; see apps/api/utils/address.js for the pure
// default-selection helpers shared by the controller.
const AddressSchema = new mongoose.Schema({
  label: {
    type: String,
    trim: true,
    maxlength: 40,
    default: 'Home',
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 200,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    minlength: 6,
    maxlength: 30,
  },
  address: {
    type: String,
    required: true,
    trim: true,
    minlength: 5,
    maxlength: 300,
  },
  city: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100,
  },
  zip: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 20,
  },
  country: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: 2,
    default: '',
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
});

// User Schema
const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
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
    addresses: {
      type: [AddressSchema],
      default: [],
    },
    // Per-account brute-force protection (auth.controller loginUser): after
    // too many wrong passwords the account is locked until lockUntil. Kept
    // in the DB so it holds across restarts/instances, unlike the IP limiter.
    // select:false keeps them out of every other query.
    failedLoginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    lockUntil: {
      type: Date,
      select: false,
    },
    // Admin-disabled accounts keep their data and order history but cannot
    // sign in or refresh a session. Preferred over deleting a customer.
    disabled: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Bumped whenever every access token already issued to this account
    // must die immediately rather than linger up to 15 minutes (disable,
    // role change, password change/reset — see utils/refreshTokens.js
    // bumpTokenVersion). Carried in the JWT; verfiyToken rejects a token
    // whose version doesn't match the current one.
    tokenVersion: {
      type: Number,
      default: 0,
    },
    // Language of this customer's emails (plan P1-02): the storefront
    // language they last used while signed in (PUT /auth/locale).
    locale: {
      type: String,
      enum: ['en', 'ar'],
      default: 'en',
    },
    // Email ownership (utils/emailVerification.js). No default on purpose:
    // accounts created before verification existed have no such field and
    // count as verified (grandfathered); new sign-ups and email changes set
    // it to null until the link is opened. Token stored hashed, single-use.
    emailVerifiedAt: {
      type: Date,
    },
    emailVerificationTokenHash: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    emailVerificationSentAt: {
      type: Date,
      select: false,
    },
    // Internal staff notes. select:false so no customer-facing endpoint
    // (profile, login, reviews…) can ever return them by accident — admin
    // endpoints opt in with .select('+adminNotes').
    adminNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
      select: false,
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
    {
      id: String(this._id),
      roles: this._doc.roles,
      // Defaults to 0 for a doc fetched before this field existed, matching
      // the schema default — verfiyToken compares against the same default.
      tokenVersion: this._doc.tokenVersion ?? 0,
    },
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
    disabled: Joi.boolean(),
    adminNotes: Joi.string().trim().max(2000).allow(''),
  }).min(1);
  return schema.validate(obj);
};
// Validate Create Address
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

// Validate Update Address
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
  User,
  validateLoginUser,
  validateRegisterUser,
  validateUpdateUser,
  validateCreateAddress,
  validateUpdateAddress,
};
