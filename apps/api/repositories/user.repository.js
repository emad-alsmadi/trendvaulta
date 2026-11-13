/**
 * User repository — isolates all MongoDB data access for the User model.
 *
 * Controllers and services call these methods instead of Mongoose directly.
 * Password hashing/comparison lives in utils/password.js (not here), since
 * it is a cryptographic concern, not a data-access concern.
 */
const { User } = require('../models/User');

/**
 * Find users with pagination, filtering, sorting and field projection.
 * @param {object} params
 * @param {object} params.match - Mongoose match filter
 * @param {string} params.select - Mongoose field selection string
 * @param {object} params.sort - Mongoose sort object
 * @param {number} params.skip
 * @param {number} params.limit
 * @returns {Promise<{ users: Array, total: number }>}
 */
async function findUsers({ match, select, sort, skip, limit }) {
  const [users, total] = await Promise.all([
    User.find(match)
      .select(select)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(match),
  ]);
  return { users, total };
}

/**
 * Find a user by id with optional field projection.
 * @param {string} id
 * @param {string|object} [select]
 * @returns {Promise<import('mongoose').Document|null>}
 */
async function findUserById(id, select) {
  const query = User.findById(id);
  if (select) query.select(select);
  return query.lean();
}

/**
 * Update a user by id.
 * @param {string} id
 * @param {object} updateData
 * @param {string|object} [select]
 * @returns {Promise<import('mongoose').Document|null>}
 */
async function updateUser(id, updateData, select) {
  const query = User.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true },
  );
  if (select) query.select(select);
  return query;
}

/**
 * Update one user matching a filter.
 * @param {object} filter
 * @param {object} update
 * @returns {Promise<import('mongoose').UpdateResult>}
 */
async function updateOne(filter, update) {
  return User.updateOne(filter, update);
}

/**
 * Count users matching a filter.
 * @param {object} match
 * @returns {Promise<number>}
 */
async function countUsers(match) {
  return User.countDocuments(match);
}

module.exports = {
  findUsers,
  findUserById,
  updateUser,
  updateOne,
  countUsers,
};
