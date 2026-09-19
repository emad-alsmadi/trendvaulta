const express = require('express');
const router = express.Router();
const { authRateLimit, refreshRateLimit } = require('../middlewares/rateLimit');

const {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
} = require('../controllers/auth.controller');

router.post('/auth/register', authRateLimit, registerUser);
router.post('/auth/login', authRateLimit, loginUser);
router.post('/auth/refresh', refreshRateLimit, refreshAccessToken);
router.post('/auth/logout', logoutUser);

module.exports = router;
