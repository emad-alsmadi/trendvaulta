const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const {
  User,
  validateRegisterUser,
  validateLoginUser,
} = require('../models/User');

/**
 * Register a new user.
 *
 * @route POST /api/auth/register
 * @access Public
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON response containing created user fields and JWT token
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
  req.body.password = await bcrypt.hash(req.body.password, salt);
  user = new User({
    email: req.body.email,
    username: req.body.username,
    password: req.body.password,
    roles: req.body.roles || ['user'],
  });
  const result = await user.save();
  const token = user.generateToken();
  const { password, ...other } = result._doc;
  res.status(201).json({ message: 'User is Created', ...other, token });
});

/**
 * Login a user and return a JWT.
 *
 * @route POST /api/auth/login
 * @access Public
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON response containing user fields and JWT token
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
  const { password, ...other } = user._doc;

  res.status(200).json({ message: 'User is Login', ...other, token });
});

/**
 * Logout endpoint (stateless).
 *
 * Note: JWT is stored client-side; logout is performed by the frontend by clearing
 * auth cookies. This endpoint exists for API completeness.
 *
 * @route POST /api/auth/logout
 * @access Public
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON confirmation message
 */
const logoutUser = asyncHandler(async (req, res) => {
  res.status(200).json({ message: 'Logged out' });
});

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
};
