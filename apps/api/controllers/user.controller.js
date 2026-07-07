const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const { User, validateUpdateUser } = require('../models/User');

/**
 * Get all users.
 *
 * @route GET /api/users
 * @access Private (admin)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON array of users (password excluded)
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password');
  res.status(200).json(users);
});

/**
 * Get user by id.
 *
 * @route GET /api/users/:id
 * @access Private (admin)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON user document (password excluded)
 */
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (user) {
    res.status(200).json(user);
  } else {
    res.status(404).json({ message: 'User not found' });
  }
});

/**
 * Update user by id.
 *
 * @route PUT /api/users/:id
 * @access Private (admin)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON updated user
 */
const updateUser = asyncHandler(async (req, res) => {
  const { error } = validateUpdateUser(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const update = {};
  if (req.body.email !== undefined) update.email = req.body.email;
  if (req.body.username !== undefined) update.username = req.body.username;
  if (req.body.roles !== undefined) update.roles = req.body.roles;

  if (req.body.password) {
    const salt = await bcrypt.genSalt(10);
    update.password = await bcrypt.hash(req.body.password, salt);
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    { $set: update },
    { new: true },
  ).select('-password');

  if (!updatedUser) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.status(200).json({ message: 'User is Updated', updatedUser });
});

/**
 * Delete user by id.
 *
 * @route DELETE /api/users/:id
 * @access Private (admin)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON confirmation message
 */
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (user) {
    res.status(200).json({ message: 'User has been deleted' });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
});

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};
