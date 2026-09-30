const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const { User, validateUpdateUser } = require('../models/User');
const { RefreshToken } = require('../models/RefreshToken');
const { Wishlist } = require('../models/Wishlist');
const { RecentlyViewed } = require('../models/RecentlyViewed');
const { Subscriber } = require('../models/Subscriber');
const { revokeAllForUser } = require('../utils/refreshTokens');
const { parsePagination } = require('../utils/pagination');
const { normalizeSearchTerm } = require('../utils/search');
const { buildSort } = require('../utils/sort');

const APP_ROLES = ['user', 'admin', 'moderator'];

/** Columns the admin user table may sort on. */
const USER_SORT_FIELDS = ['createdAt', 'username', 'email'];

/**
 * True when no OTHER enabled admin exists — removing admin rights from (or
 * disabling/deleting) `userId` would lock the store out of the dashboard.
 */
async function isLastAdmin(userId) {
  const otherAdmins = await User.countDocuments({
    _id: { $ne: userId },
    roles: 'admin',
    disabled: { $ne: true },
  });
  return otherAdmins === 0;
}

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

  // Taking admin rights away (role change or disable) must never leave the
  // store without an admin, and an admin cannot demote themselves.
  const losesAdmin =
    (update.roles !== undefined && !update.roles.includes('admin')) ||
    update.disabled === true;
  if (losesAdmin) {
    const target = await User.findById(req.params.id).select('roles').lean();
    if (target?.roles?.includes('admin')) {
      if (String(req.params.id) === String(req.user?.id)) {
        return res
          .status(400)
          .json({ message: 'You cannot remove your own admin role' });
      }
      if (await isLastAdmin(req.params.id)) {
        return res.status(400).json({
          message: 'This is the last active admin. Make someone else an admin first.',
        });
      }
    }
  }

  if (req.body.password) {
    // Admins may reset other accounts, but their own password must go
    // through /password/change, which checks the current one first.
    if (String(req.params.id) === String(req.user?.id)) {
      return res.status(400).json({
        message: 'Change your own password from Settings (current password required)',
      });
    }
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

  // Disabling, a new password or a role change ends every session now:
  // refresh tokens are revoked here, and the stateless access token (which
  // carries the old roles) dies within its 15-minute TTL.
  if (update.password || update.disabled || update.roles !== undefined) {
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
  if (String(req.params.id) === String(req.user?.id)) {
    return res.status(400).json({ message: 'You cannot delete your own account' });
  }

  const user = await User.findById(req.params.id).select('email roles').lean();
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  if (user.roles?.includes('admin') && (await isLastAdmin(user._id))) {
    return res.status(400).json({
      message: 'This is the last active admin. Make someone else an admin first.',
    });
  }

  // Anonymise instead of deleting: orders, reviews and refunds keep a valid
  // user reference (a hard delete orphaned them), while the personal data
  // is erased and the account can never sign in again. Order shipping
  // addresses are kept as part of the sales record.
  const unusablePassword = await bcrypt.hash(
    crypto.randomBytes(32).toString('hex'),
    10,
  );
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        email: `deleted-${user._id}@deleted.invalid`,
        username: 'Deleted user',
        password: unusablePassword,
        roles: ['user'],
        addresses: [],
        stripeCustomerId: '',
        adminNotes: '',
        disabled: true,
      },
    },
  );
  await revokeAllForUser(RefreshToken, user._id);
  await Promise.all([
    Wishlist.deleteMany({ user: user._id }),
    RecentlyViewed.deleteMany({ user: user._id }),
    Subscriber.deleteMany({ email: user.email }),
  ]);

  res.status(200).json({ message: 'User has been deleted (personal data erased)' });
});

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};
