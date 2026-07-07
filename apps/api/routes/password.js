const express = require('express');
const router = express.Router();
const {
  sendForgotPasswordLink,
  resetPassword,
} = require('../controllers/password.controller');

/**
 * @desc Send Forgot Password Link
 * @route /password/forgot-password
 * @method POST
 * @access public
 */
router.post('/password/forgot-password', sendForgotPasswordLink);

/**
 * @desc  Reset Password
 * @route /password/reset-password/:userId/:token
 * @method POST
 * @access public
 */
router.post('/password/reset-password/:userId/:token', resetPassword);

module.exports = router;
