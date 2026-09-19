const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const {
  User,
  validateRegisterUser,
  validateLoginUser,
} = require('../models/User');
const { RefreshToken } = require('../models/RefreshToken');
const {
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} = require('../utils/refreshTokens');

/**
 * Register a new user.
 *
 * @route POST /api/auth/register
 * @access Public
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON response containing created user fields, access token, and refresh token
 */
const registerUser = asyncHandler(async (req, res) => {
  if (!req.body) {
    return res.status(400).json({ message: 'Request body is required' });
  }
  const { error } = validateRegisterUser(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  let user = await User.findOne({ email: req.body.email });
  if (user) {
    return res.status(400).json({ message: 'This user already registered' });
  }
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(req.body.password, salt);
  user = new User({
    email: req.body.email,
    username: req.body.username,
    password: hashedPassword,
    // Never trust client-supplied roles on public registration
    roles: ['user'],
  });
  const result = await user.save();
  const token = user.generateToken();
  const { plaintext: refreshToken } = await issueRefreshToken(
    RefreshToken,
    result._id,
  );
  const { password, ...other } = result._doc;
  res
    .status(201)
    .json({ message: 'User is Created', ...other, token, refreshToken });
});

/**
 * Login a user and return an access token + refresh token.
 *
 * @route POST /api/auth/login
 * @access Public
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON response containing user fields, access token, and refresh token
 */
const loginUser = asyncHandler(async (req, res) => {
  if (!req.body) {
    return res.status(400).json({ message: 'Request body is required' });
  }
  const { error } = validateLoginUser(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  let user = await User.findOne({ email: req.body.email });
  if (!user) {
    return res.status(400).json({ message: 'invalid email or password' });
  }

  const isPasswordMatch = await bcrypt.compare(
    req.body.password,
    user.password,
  );
  if (!isPasswordMatch) {
    return res.status(400).json({ message: 'invalid email or password' });
  }
  const token = user.generateToken();
  const { plaintext: refreshToken } = await issueRefreshToken(
    RefreshToken,
    user._id,
  );
  const { password, ...other } = user._doc;

  res
    .status(200)
    .json({ message: 'User is Login', ...other, token, refreshToken });
});

/**
 * Exchange a valid, unexpired refresh token for a new access token.
 * The refresh token itself is rotated (old one revoked, new one issued) on
 * every successful call — reuse of an already-rotated token revokes the
 * whole session chain for that user.
 *
 * @route POST /api/auth/refresh
 * @access Public (bearer is the refresh token itself)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const refreshAccessToken = asyncHandler(async (req, res) => {
  const presented = req.body?.refreshToken;
  if (!presented || typeof presented !== 'string') {
    return res.status(400).json({ message: 'refreshToken is required' });
  }

  const result = await rotateRefreshToken(RefreshToken, presented);

  if (result.status === 'invalid' || result.status === 'expired') {
    return res.status(401).json({ message: 'Refresh token is not valid' });
  }
  if (result.status === 'reused') {
    return res.status(401).json({
      message: 'Session has been revoked. Please sign in again.',
      code: 'REFRESH_TOKEN_REUSED',
    });
  }

  const user = await User.findById(result.userId).select('-password');
  if (!user) {
    return res.status(401).json({ message: 'Refresh token is not valid' });
  }

  const token = user.generateToken();
  res.status(200).json({ token, refreshToken: result.plaintext });
});

/**
 * Logout: revokes the presented refresh token server-side so it can no
 * longer be exchanged for a new access token, then the frontend clears its
 * cookies. The short-lived access JWT already in flight simply expires on
 * its own (it cannot be revoked early — see models/User.js).
 *
 * @route POST /api/auth/logout
 * @access Public
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON confirmation message
 */
const logoutUser = asyncHandler(async (req, res) => {
  await revokeRefreshToken(RefreshToken, req.body?.refreshToken);
  res.status(200).json({ message: 'Logged out' });
});

module.exports = {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
};
