const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const { User, validateUpdateUser } = require('../models/User');
const { verfiyToken } = require('../middlewares/verfiyToken');
const { checkRolePermission } = require('../middlewares/checkRolePermission');

const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require('../controllers/user.controller');

/**
 * @desc Get All Users
 * @route /api/users
 * @method GET
 * @access private (requires users:read permission)
 */
router.get(
  '/users',
  verfiyToken,
  checkRolePermission('users:read'),
  getAllUsers,
);

/**
 * @desc Get User By Id
 * @route /api/users/:id
 * @method GET
 * @access private (requires users:read permission)
 */
router.get(
  '/users/:id',
  verfiyToken,
  checkRolePermission('users:read'),
  getUserById,
);

/**
 * @desc Update User
 * @route /api/users/:id
 * @method Put
 * @access private (requires users:write permission)
 */
router.put(
  '/users/:id',
  verfiyToken,
  checkRolePermission('users:write'),
  updateUser,
);

/**
 * @desc Delete User
 * @route /api/users/:id
 * @method Delete
 * @access private (requires users:delete permission)
 */
router.delete(
  '/users/:id',
  verfiyToken,
  checkRolePermission('users:delete'),
  deleteUser,
);

module.exports = router;
