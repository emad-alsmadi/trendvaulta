const asyncHandler = require('express-async-handler');
const { verfiyToken } = require('../middlewares/verfiyToken');
const { User } = require('../models/User');
const bcrypt = require('bcryptjs');

/**
 * @desc Get current user profile
 * @route /api/auth/profile
 * @method GET
 * @access private
 */
const getProfile = asyncHandler(async (req, res) => {
  const userId = req.user?.id ?? req.user?._id;
  if (!userId) {
    return res.status(401).json({ message: 'Token is not valid!' });
  }

  const user = await User.findById(userId).select('-password').lean();
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.status(200).json({
    user,
    permissions: req.userPermissions || [],
  });
});

/**
 * @desc Update current user profile (username, email)
 * @route /api/auth/profile
 * @method PUT
 * @access private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user?.id ?? req.user?._id;
  if (!userId) {
    return res.status(401).json({ message: 'Token is not valid!' });
  }

  const { username, email } = req.body;

  // Basic validation
  if (!username || typeof username !== 'string' || username.trim().length < 3) {
    return res
      .status(400)
      .json({ message: 'Username must be at least 3 characters long' });
  }

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ message: 'Valid email is required' });
  }

  // Trim inputs
  const trimmedUsername = username.trim();
  const trimmedEmail = email.trim().toLowerCase();

  // Check if username/email already taken by another user
  const existingUser = await User.findOne({
    _id: { $ne: userId },
    $or: [{ username: trimmedUsername }, { email: trimmedEmail }],
  }).lean();

  if (existingUser) {
    const field =
      existingUser.username === trimmedUsername ? 'username' : 'email';
    return res.status(409).json({ message: `${field} already taken` });
  }

  // Update user
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      username: trimmedUsername,
      email: trimmedEmail,
    },
    { new: true, runValidators: true, context: 'query' },
  )
    .select('-password')
    .lean();

  if (!updatedUser) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.status(200).json({
    message: 'Profile updated successfully',
    user: updatedUser,
  });
});

module.exports = {
  getProfile,
  updateProfile,
};
