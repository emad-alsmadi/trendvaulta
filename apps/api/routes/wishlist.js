const express = require('express');
const router = express.Router();
const { verfiyToken } = require('../middlewares/verfiyToken');

const {
  addToWishlist,
  removeFromWishlist,
  getMyWishlist,
  checkWishlist,
} = require('../controllers/wishlist.controller');

// All wishlist routes require authentication
router.post('/wishlist/:productId', verfiyToken, addToWishlist);
router.delete('/wishlist/:productId', verfiyToken, removeFromWishlist);
router.get('/wishlist/my', verfiyToken, getMyWishlist);
router.get('/wishlist/check/:productId', verfiyToken, checkWishlist);

module.exports = router;
