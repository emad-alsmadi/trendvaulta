const asyncHandler = require('express-async-handler');
const { verfiyToken } = require('../middlewares/verfiyToken');
const {
  User,
  validateCreateAddress,
  validateUpdateAddress,
} = require('../models/User');
const bcrypt = require('bcryptjs');
const { getUserPermissions } = require('../middlewares/rolePermissions');
const {
  MAX_ADDRESSES,
  shouldBecomeDefault,
  canAddAddress,
  pickDefaultToPromote,
  toPublicAddress,
  toPublicAddresses,
} = require('../utils/address');

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
    permissions: getUserPermissions(user.roles || ['user']),
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

/**
 * @desc Get current user's saved addresses
 * @route /api/auth/addresses
 * @method GET
 * @access private
 */
const getAddresses = asyncHandler(async (req, res) => {
  const userId = req.user?.id ?? req.user?._id;
  if (!userId) {
    return res.status(401).json({ message: 'Token is not valid!' });
  }

  const user = await User.findById(userId).select('addresses').lean();
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.status(200).json({ data: toPublicAddresses(user.addresses) });
});

/**
 * @desc Add a new address to the current user's address book
 * @route /api/auth/addresses
 * @method POST
 * @access private
 */
const createAddress = asyncHandler(async (req, res) => {
  const userId = req.user?.id ?? req.user?._id;
  if (!userId) {
    return res.status(401).json({ message: 'Token is not valid!' });
  }

  const { error, value } = validateCreateAddress(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const user = await User.findById(userId).select('addresses');
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (!canAddAddress(user.addresses.length)) {
    return res.status(409).json({
      message: `You can save up to ${MAX_ADDRESSES} addresses`,
    });
  }

  const willBeDefault = shouldBecomeDefault(user.addresses, value.isDefault);
  if (willBeDefault) {
    user.addresses.forEach((addr) => {
      addr.isDefault = false;
    });
  }

  user.addresses.push({
    label: value.label || 'Home',
    name: value.name,
    phone: value.phone,
    address: value.address,
    city: value.city,
    zip: value.zip,
    country: value.country || '',
    isDefault: willBeDefault,
  });

  await user.save();

  const created = user.addresses[user.addresses.length - 1];

  res.status(201).json({
    message: 'Address added',
    data: toPublicAddress(created),
  });
});

/**
 * @desc Update an address on the current user's address book
 * @route /api/auth/addresses/:addressId
 * @method PUT
 * @access private
 */
const updateAddress = asyncHandler(async (req, res) => {
  const userId = req.user?.id ?? req.user?._id;
  if (!userId) {
    return res.status(401).json({ message: 'Token is not valid!' });
  }

  const { error, value } = validateUpdateAddress(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const user = await User.findById(userId).select('addresses');
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const addr = user.addresses.id(req.params.addressId);
  if (!addr) {
    return res.status(404).json({ message: 'Address not found' });
  }

  if (value.isDefault === true) {
    user.addresses.forEach((a) => {
      a.isDefault = false;
    });
  }

  if (value.label !== undefined) addr.label = value.label || 'Home';
  if (value.name !== undefined) addr.name = value.name;
  if (value.phone !== undefined) addr.phone = value.phone;
  if (value.address !== undefined) addr.address = value.address;
  if (value.city !== undefined) addr.city = value.city;
  if (value.zip !== undefined) addr.zip = value.zip;
  if (value.country !== undefined) addr.country = value.country;
  if (value.isDefault !== undefined) addr.isDefault = value.isDefault;

  // If this was the only default and got explicitly unset, keep it default
  // (there must always be a default once any address exists).
  if (value.isDefault === false && pickDefaultToPromote(user.addresses) === String(addr._id)) {
    addr.isDefault = true;
  }

  await user.save();

  res.status(200).json({
    message: 'Address updated',
    data: toPublicAddress(addr),
  });
});

/**
 * @desc Delete an address from the current user's address book
 * @route /api/auth/addresses/:addressId
 * @method DELETE
 * @access private
 */
const deleteAddress = asyncHandler(async (req, res) => {
  const userId = req.user?.id ?? req.user?._id;
  if (!userId) {
    return res.status(401).json({ message: 'Token is not valid!' });
  }

  const user = await User.findById(userId).select('addresses');
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const addr = user.addresses.id(req.params.addressId);
  if (!addr) {
    return res.status(404).json({ message: 'Address not found' });
  }

  addr.deleteOne();

  const promoteId = pickDefaultToPromote(user.addresses);
  if (promoteId) {
    const promoted = user.addresses.id(promoteId);
    if (promoted) promoted.isDefault = true;
  }

  await user.save();

  res.status(200).json({ message: 'Address deleted' });
});

/**
 * @desc Set an address as the default for the current user
 * @route /api/auth/addresses/:addressId/default
 * @method PATCH
 * @access private
 */
const setDefaultAddress = asyncHandler(async (req, res) => {
  const userId = req.user?.id ?? req.user?._id;
  if (!userId) {
    return res.status(401).json({ message: 'Token is not valid!' });
  }

  const user = await User.findById(userId).select('addresses');
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const addr = user.addresses.id(req.params.addressId);
  if (!addr) {
    return res.status(404).json({ message: 'Address not found' });
  }

  user.addresses.forEach((a) => {
    a.isDefault = String(a._id) === String(addr._id);
  });

  await user.save();

  res.status(200).json({
    message: 'Default address updated',
    data: toPublicAddresses(user.addresses),
  });
});

module.exports = {
  getProfile,
  updateProfile,
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};
