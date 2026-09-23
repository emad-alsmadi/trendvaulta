const asyncHandler = require('express-async-handler');
const nodemailer = require('nodemailer');
const Joi = require('joi');
const { User } = require('../models/User');
const { RefreshToken } = require('../models/RefreshToken');
const { revokeAllForUser } = require('../utils/refreshTokens');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
      return res.status(400).json({ message: 'A valid email is required' });
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
      expiresIn: '5m',
    });
    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const link = `${frontendBaseUrl}/password/reset-password/${user.id}/${token}`;

    const transportOptions = process.env.SMTP_HOST
      ? {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
          secure: String(process.env.SMTP_SECURE || 'false') === 'true',
          auth: process.env.SMTP_USER
            ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
              }
            : undefined,
        }
      : {
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
          },
        };

    const fromAddress =
      process.env.SMTP_USER || process.env.EMAIL_USER || 'no-reply@example.com';

    const transporter = nodemailer.createTransport({
      ...transportOptions,
      ...(process.env.NODE_ENV !== 'production'
        ? { tls: { rejectUnauthorized: false } }
        : {}),
    });

    const mailOptions = {
      from: fromAddress,
      to: user.email,
      subject: 'Reset Password',
      text: `Click on the link to reset your password: ${link}`,
    };

    try {
      await transporter.sendMail(mailOptions);
      return res.status(200).json({ message: FORGOT_PASSWORD_MESSAGE });
    } catch (error) {
      console.log(error);
      if (process.env.NODE_ENV !== 'production') {
        return res.status(200).json({
          message: 'Reset link generated (email delivery failed in dev)',
          resetPasswordLink: link,
        });
      }
      return res.status(500).json({ message: 'Failed to send email' });
    }
  } catch (error) {
    console.log(error);
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
    return res.status(400).json({ message: RESET_LINK_INVALID_MESSAGE });
  }

  const { error: bodyError } = resetPasswordBodySchema.validate(req.body ?? {});
  if (bodyError) {
    return res.status(400).json({
      message: 'Password is required and must be 8-128 characters',
    });
  }

  const user = await User.findById(params.userId);
  if (!user) {
    return res.status(400).json({ message: RESET_LINK_INVALID_MESSAGE });
  }
  const secret = process.env.JWT_SECRET_KEY + user.password;

  try {
    jwt.verify(params.token, secret);

    user.password = await bcrypt.hash(req.body.password, await bcrypt.genSalt(10));
    await user.save();
  } catch {
    return res.status(400).json({ message: RESET_LINK_INVALID_MESSAGE });
  }

  // Every existing session must re-authenticate with the new password
  await revokeAllForUser(RefreshToken, user._id).catch((revokeErr) => {
    console.error('Failed to revoke sessions after password reset:', revokeErr);
  });

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
    return res.status(401).json({ message: 'Token is not valid!' });
  }

  const schema = Joi.object({
    currentPassword: Joi.string().min(8).required(),
    newPassword: Joi.string().min(8).required(),
  });

  const { error, value } = schema.validate(req.body || {});
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const isMatch = await bcrypt.compare(value.currentPassword, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: 'Current password is incorrect' });
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(value.newPassword, salt);
  await user.save();

  await revokeAllForUser(RefreshToken, user._id).catch((revokeErr) => {
    console.error('Failed to revoke sessions after password change:', revokeErr);
  });

  return res.status(200).json({ message: 'Password updated successfully' });
});

module.exports = {
  sendForgotPasswordLink,
  resetPassword,
  changePassword,
};
