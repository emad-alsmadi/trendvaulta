const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/verifyToken');

const {
  addToWishlist,
  removeFromWishlist,
  getMyWishlist,
  checkWishlist,
} = require('../controllers/wishlist.controller');

// All wishlist routes require authentication
router.post('/wishlist/:productId', verifyToken, addToWishlist);
router.delete('/wishlist/:productId', verifyToken, removeFromWishlist);
router.get('/wishlist/my', verifyToken, getMyWishlist);
router.get('/wishlist/check/:productId', verifyToken, checkWishlist);

module.exports = router;
