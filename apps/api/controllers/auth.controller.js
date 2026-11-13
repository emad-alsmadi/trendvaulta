const asyncHandler = require('express-async-handler');
const { validationBody } = require('../utils/errors');
const { User } = require('../models/User');
const { RefreshToken } = require('../models/RefreshToken');
const { Order } = require('../models/Order');
const {
  validateRegisterUser,
  validateLoginUser,
} = require('../validators/user.validator');
const {
  register: authRegister,
  login: authLogin,
  refresh: authRefresh,
  logout: authLogout,
  verifyEmail: authVerifyEmail,
  resendVerificationEmail: authResendVerificationEmail,
} = require('../services/auth.service');

/** Register a new user. POST /api/auth/register (Public) */
const registerUser = asyncHandler(async (req, res) => {
  if (!req.body) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Request body is required' });
  }
  const { error } = validateRegisterUser(req.body);
  if (error) {
    return res.status(400).json(validationBody(error));
  }
  const result = await authRegister(
    { User, RefreshToken },
    { email: req.body.email, username: req.body.username, password: req.body.password },
  );
  return res.status(result.status).json(result.data);
});

/** Login a user. POST /api/auth/login (Public) */
const loginUser = asyncHandler(async (req, res) => {
  if (!req.body) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Request body is required' });
  }
  const { error } = validateLoginUser(req.body);
  if (error) {
    return res.status(400).json(validationBody(error));
  }
  const result = await authLogin(
    { User, RefreshToken, Order },
    { email: req.body.email, password: req.body.password },
  );
  return res.status(result.status).json(result.data);
});

/** Exchange refresh token for a new access token. POST /api/auth/refresh (Public) */
const refreshAccessToken = asyncHandler(async (req, res) => {
  const result = await authRefresh(
    { RefreshToken, User },
    req.body?.refreshToken,
  );
  return res.status(result.status).json(result.data);
});

/** Revoke a refresh token. POST /api/auth/logout (Public) */
const logoutUser = asyncHandler(async (req, res) => {
  const result = await authLogout(
    { RefreshToken },
    req.body?.refreshToken,
  );
  return res.status(result.status).json(result.data);
});

/** Confirm an email address from the emailed link. POST /api/auth/verify-email (Public) */
const verifyEmail = asyncHandler(async (req, res) => {
  const result = await authVerifyEmail({ User, Order }, req.body?.token);
  return res.status(result.status).json(result.data);
});

/** Resend a confirmation link. POST /api/auth/verify-email/resend (Private) */
const resendVerificationEmail = asyncHandler(async (req, res) => {
  const result = await authResendVerificationEmail({ User }, req.user?.id);
  if (result.headers) {
    Object.entries(result.headers).forEach(([key, value]) => res.setHeader(key, value));
  }
  return res.status(result.status).json(result.data);
});

module.exports = {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  verifyEmail,
  resendVerificationEmail,
};
