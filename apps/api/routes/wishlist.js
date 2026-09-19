const express = require('express');
const router = express.Router();
const { verfiyToken } = require('../middlewares/verfiyToken');
const { validate } = require('../middlewares/validate');
const { addToWishlistSchema } = require('../validators/wishlist.validator');

const {
  addToWishlist,
  removeFromWishlist,
  getMyWishlist,
  checkWishlist,
} = require('../controllers/wishlist.controller');

// All wishlist routes require authentication
router.post(
  '/wishlist',
  verfiyToken,
  validate(addToWishlistSchema),
  addToWishlist,
);
router.delete('/wishlist/:productId', verfiyToken, removeFromWishlist);
router.get('/wishlist/my', verfiyToken, getMyWishlist);
router.get('/wishlist/check/:productId', verfiyToken, checkWishlist);

module.exports = router;
