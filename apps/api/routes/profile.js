const express = require('express');
const router = express.Router();
const { verfiyToken } = require('../middlewares/verfiyToken');
const {
  getProfile,
  updateProfile,
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
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

/**
 * @desc Address book for the current user
 * @route /api/auth/addresses
 * @method GET / POST
 * @access private
 */
router
  .route('/auth/addresses')
  .get(verfiyToken, getAddresses)
  .post(verfiyToken, createAddress);

/**
 * @desc Update / remove a single saved address
 * @route /api/auth/addresses/:addressId
 * @method PUT / DELETE
 * @access private
 */
router
  .route('/auth/addresses/:addressId')
  .put(verfiyToken, updateAddress)
  .delete(verfiyToken, deleteAddress);

/**
 * @desc Promote a saved address to the default
 * @route /api/auth/addresses/:addressId/default
 * @method PATCH
 * @access private
 */
router.patch('/auth/addresses/:addressId/default', verfiyToken, setDefaultAddress);

module.exports = router;
