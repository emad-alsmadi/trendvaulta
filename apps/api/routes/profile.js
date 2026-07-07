const express = require('express');
const router = express.Router();
const { verfiyToken } = require('../middlewares/verfiyToken');
const {
  getProfile,
  updateProfile,
} = require('../controllers/profile.controller');

/**
 * @desc Get current user profile
 * @route /api/auth/profile
 * @method GET
 * @access private
 */
router.get('/auth/profile', verfiyToken, getProfile);

/**
 * @desc Update current user profile (username, email)
 * @route /api/auth/profile
 * @method PUT
 * @access private
 */
router.put('/auth/profile', verfiyToken, updateProfile);

module.exports = router;
