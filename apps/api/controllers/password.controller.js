const asyncHandler = require('express-async-handler');
const { validationBody } = require('../utils/errors');
const logger = require('../utils/logger');
const { sendPasswordChangedEmail, sendPasswordResetEmail } = require('../utils/mail');
const Joi = require('joi');
const { User } = require('../models/User');
const { RefreshToken } = require('../models/RefreshToken');
const { revokeAllForUser } = require('../utils/refreshTokens');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  LOCKED_RESPONSE,
  isAccountLocked,
  recordFailedPassword,
  clearFailedPasswords,
} = require('../utils/loginLockout');

const forgotPasswordSchema = Joi.object({
  email: Joi.string().trim().lowercase().max(100).email().required(),
});

// Same body whether or not the account exists (no email enumeration).
const FORGOT_PASSWORD_MESSAGE =
  'If an account exists for that email, a password reset link has been sent.';

const resetPasswordParamsSchema = Joi.object({
  userId: Joi.string()
    .hex()
    .length(24)
    .required()
    .messages({ '*': 'Invalid or expired reset link' }),
  token: Joi.string().trim().max(1000).required(),
});

const resetPasswordBodySchema = Joi.object({
  password: Joi.string().min(8).max(128).required(),
}).unknown(true);

// Unknown user and bad token are indistinguishable, so a caller cannot probe
// which user ids exist by replaying the reset endpoint.
const RESET_LINK_INVALID_MESSAGE = 'Invalid or expired reset link';

/**
 * Send a password reset link to the user's email.
 *
 * This endpoint generates a reset token and emails it to the user.
 *
 * @route POST /api/password/forgot-password
 * @access Public
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON confirmation message
 */
const sendForgotPasswordLink = asyncHandler(async (req, res) => {
  try {
    const { error, value } = forgotPasswordSchema.validate(req.body || {});
    if (error) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'A valid email is required' });
    }
    const { email } = value;

    if (!process.env.JWT_SECRET_KEY) {
      return res.status(500).json({ message: 'Server misconfigured' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({ message: FORGOT_PASSWORD_MESSAGE });
    }

    const secret = process.env.JWT_SECRET_KEY + user.password;
    const token = jwt.sign({ email: user.email, id: user._id }, secret, {
      // 5 minutes was too tight for real-world email delivery latency —
      // the token is already single-use in effect (the signing secret
      // includes the current password hash, so it dies the moment the
      // password actually changes).
      expiresIn: '30m',
    });
    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const link = `${frontendBaseUrl}/password/reset-password/${user.id}/${token}`;

    // Never return the link in the response: anyone can request a reset for
    // any email, so echoing it (even outside production) hands over the
    // account. Same generic 200 regardless of delivery outcome, so a send
    // failure doesn't reveal whether the address is registered.
    await sendPasswordResetEmail({ to: user.email, link }).catch((err) =>
      logger.error({ err }, 'Password reset email failed'),
    );
    if (process.env.NODE_ENV === 'development') {
      logger.info(`[dev] Password reset link for ${user.email}: ${link}`);
    }
    return res.status(200).json({ message: FORGOT_PASSWORD_MESSAGE });
  } catch (error) {
    logger.error({ err: error }, 'Forgot-password request failed');
    if (process.env.NODE_ENV !== 'production') {
      return res.status(500).json({ message: 'Failed to generate reset link' });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * Reset user password using a reset token.
 *
 * @route POST /api/password/reset-password/:userId/:token
 * @access Public
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON confirmation message
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { error: paramsError, value: params } = resetPasswordParamsSchema.validate(
    { userId: req.params.userId, token: req.params.token },
    { stripUnknown: true },
  );
  if (paramsError) {
    return res.status(400).json({ code: 'RESET_LINK_INVALID', message: RESET_LINK_INVALID_MESSAGE });
  }

  const { error: bodyError } = resetPasswordBodySchema.validate(req.body ?? {});
  if (bodyError) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Password is required and must be 8-128 characters',
    });
  }

  const user = await User.findById(params.userId);
  if (!user) {
    return res.status(400).json({ code: 'RESET_LINK_INVALID', message: RESET_LINK_INVALID_MESSAGE });
  }
  const secret = process.env.JWT_SECRET_KEY + user.password;

  try {
    jwt.verify(params.token, secret);

    user.password = await bcrypt.hash(req.body.password, await bcrypt.genSalt(10));
    await user.save();
  } catch {
    return res.status(400).json({ code: 'RESET_LINK_INVALID', message: RESET_LINK_INVALID_MESSAGE });
  }

  // Every existing session must re-authenticate with the new password
  await revokeAllForUser(RefreshToken, user._id).catch((revokeErr) => {
    logger.error({ err: revokeErr }, 'Failed to revoke sessions after password reset');
  });
  // Heads-up to the owner, in their language (P1-02). Best effort.
  await sendPasswordChangedEmail({ to: user.email }).catch(() => {});

  return res.status(200).json({ message: 'Password updated successfully' });
});

/**
 * Change password for authenticated user.
 *
 * @route POST /api/password/change
 * @access Private
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON confirmation message
 */
const changePassword = asyncHandler(async (req, res) => {
  const userId = req.user?.id ?? req.user?._id;
  if (!userId) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Token is not valid!' });
  }

  const schema = Joi.object({
    currentPassword: Joi.string().min(8).required(),
    newPassword: Joi.string().min(8).required(),
  });

  const { error, value } = schema.validate(req.body || {});
  if (error) {
    return res.status(400).json(validationBody(error));
  }

  const user = await User.findById(userId).select('+failedLoginAttempts +lockUntil');
  if (!user) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found' });
  }

  if (isAccountLocked(user)) {
    return res.status(429).json(LOCKED_RESPONSE);
  }

  const isMatch = await bcrypt.compare(value.currentPassword, user.password);
  if (!isMatch) {
    await recordFailedPassword(User, user._id);
    return res.status(400).json({ code: 'CURRENT_PASSWORD_INCORRECT', message: 'Current password is incorrect' });
  }
  await clearFailedPasswords(User, user);

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(value.newPassword, salt);
  await user.save();

  await revokeAllForUser(RefreshToken, user._id).catch((revokeErr) => {
    logger.error({ err: revokeErr }, 'Failed to revoke sessions after password change');
  });
  await sendPasswordChangedEmail({ to: user.email }).catch(() => {});

  return res.status(200).json({ message: 'Password updated successfully' });
});

module.exports = {
  sendForgotPasswordLink,
  resetPassword,
  changePassword,
};
