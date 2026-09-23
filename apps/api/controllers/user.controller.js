const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const { User, validateUpdateUser } = require('../models/User');
const { RefreshToken } = require('../models/RefreshToken');
const { revokeAllForUser } = require('../utils/refreshTokens');
const { parsePagination } = require('../utils/pagination');
const { normalizeSearchTerm } = require('../utils/search');
const { buildSort } = require('../utils/sort');

const APP_ROLES = ['user', 'admin', 'moderator'];

/** Columns the admin user table may sort on. */
const USER_SORT_FIELDS = ['createdAt', 'username', 'email'];

/**
 * Get users, paginated.
 *
 * Supports `page`, `limit`, `q` (username or email), `role`, `sort`/`order`.
 * The legacy shape of this endpoint was an unbounded array of every user; it
 * now returns `{ data, meta }` like the other admin lists.
 *
 * @route GET /api/users
 * @access Private (admin)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON `{ data, meta }` (password excluded)
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 25 });
  const sort = buildSort(req.query.sort, req.query.order, USER_SORT_FIELDS);

  const query = {};

  const term = normalizeSearchTerm(req.query.q);
  if (term) {
    query.$or = [
      { username: { $regex: term, $options: 'i' } },
      { email: { $regex: term, $options: 'i' } },
    ];
  }

  const role = typeof req.query.role === 'string' ? req.query.role.trim() : '';
  if (APP_ROLES.includes(role)) {
    query.roles = role;
  }

  const [users, total] = await Promise.all([
    User.find(query).select('-password +adminNotes').sort(sort).skip(skip).limit(limit).lean(),
    User.countDocuments(query),
  ]);

  res.status(200).json({
    data: users,
    meta: { total, page, pages: Math.ceil(total / limit) || 1, limit },
  });
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
  const user = await User.findById(req.params.id).select('-password +adminNotes');
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
  if (req.body.email !== undefined) {
    update.email = String(req.body.email).trim().toLowerCase();
  }
  if (req.body.username !== undefined) update.username = req.body.username;
  if (req.body.roles !== undefined) update.roles = req.body.roles;
  if (req.body.adminNotes !== undefined) update.adminNotes = req.body.adminNotes;
  if (req.body.disabled !== undefined) {
    // An admin disabling their own account would lock themselves out with
    // nobody left to undo it.
    if (req.body.disabled && String(req.params.id) === String(req.user?.id)) {
      return res
        .status(400)
        .json({ message: 'You cannot disable your own account' });
    }
    update.disabled = req.body.disabled;
  }

  if (req.body.password) {
    const salt = await bcrypt.genSalt(10);
    update.password = await bcrypt.hash(req.body.password, salt);
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    { $set: update },
    { new: true },
  ).select('-password +adminNotes');

  if (!updatedUser) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Disabling ends every session now: refresh tokens are revoked here, and
  // the stateless access token dies within its 15-minute TTL (refresh is
  // also refused for disabled users, so it cannot be renewed).
  if (update.password || update.disabled) {
    await revokeAllForUser(RefreshToken, updatedUser._id);
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
