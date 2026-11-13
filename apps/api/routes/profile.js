const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/verifyToken');
const {
  getProfile,
  updateProfile,
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} = require('../controllers/profile.controller');
const { updateLocale } = require('../controllers/locale.controller');

/**
 * @desc Get current user profile
 * @route /api/auth/profile
 * @method GET
 * @access private
 */
router.get('/auth/profile', verifyToken, getProfile);

/**
 * @desc Update current user profile (username, email)
 * @route /api/auth/profile
 * @method PUT
 * @access private
 */
router.put('/auth/profile', verifyToken, updateProfile);

/**
 * @desc Remember the storefront language for the customer's emails (P1-02)
 * @route /api/auth/locale
 * @method PUT
 * @access private
 */
router.put('/auth/locale', verifyToken, updateLocale);

/**
 * @desc Address book for the current user
 * @route /api/auth/addresses
 * @method GET / POST
 * @access private
 */
router
  .route('/auth/addresses')
  .get(verifyToken, getAddresses)
  .post(verifyToken, createAddress);

/**
 * @desc Update / remove a single saved address
 * @route /api/auth/addresses/:addressId
 * @method PUT / DELETE
 * @access private
 */
router
  .route('/auth/addresses/:addressId')
  .put(verifyToken, updateAddress)
  .delete(verifyToken, deleteAddress);

/**
 * @desc Promote a saved address to the default
 * @route /api/auth/addresses/:addressId/default
 * @method PATCH
 * @access private
 */
router.patch('/auth/addresses/:addressId/default', verifyToken, setDefaultAddress);

module.exports = router;
