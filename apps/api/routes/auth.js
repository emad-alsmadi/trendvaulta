const express = require('express');
const router = express.Router();

const {
  registerUser,
  loginUser,
  logoutUser,
} = require('../controllers/auth.controller');

/**
 * @desc Register New User
 * @route /api/auth/register
 * @method Post
 * @access public
 */
router.post('/auth/register', registerUser);

/**
 * @desc Login User
 * @route /api/auth/login
 * @method Post
 * @access public
 */
router.post('/auth/login', loginUser);

/**
 * @desc Logout User
 * @route /api/auth/logout
 * @method Post
 * @access public
 */
router.post('/auth/logout', logoutUser);

module.exports = router;
