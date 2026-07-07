const asyncHandler = require('express-async-handler');
const nodemailer = require('nodemailer');
const { User } = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
    const email = req.body?.email;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not Found' });
    }

    if (!process.env.JWT_SECRET_KEY) {
      return res.status(500).json({ message: 'Server misconfigured' });
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
      const info = await transporter.sendMail(mailOptions);
      return res
        .status(200)
        .json({ message: 'Reset link sent', id: info.messageId });
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
  // TODO: Validation
  const user = await User.findById(req.params.userId);
  if (!user) {
    return res.status(404).json({ message: 'User not Found' });
  }
  const secret = process.env.JWT_SECRET_KEY + user.password;

  try {
    jwt.verify(req.params.token, secret);

    const salt = await bcrypt.genSalt(10);
    if (!req.body?.password || String(req.body.password).length < 8) {
      return res.status(400).json({
        message: 'Password is required and must be at least 8 characters',
      });
    }
    req.body.password = await bcrypt.hash(req.body.password, salt);

    user.password = req.body.password;
    await user.save();

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: 'Invalid or expired token' });
  }
});

module.exports = {
  sendForgotPasswordLink,
  resetPassword,
};
