const express = require('express');
const router = express.Router();
const { authRateLimit, refreshRateLimit } = require('../middlewares/rateLimit');
const { validate } = require('../middlewares/validate');
const { refreshSchema } = require('../validators/auth.validator');

const {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
} = require('../controllers/auth.controller');

router.post('/auth/register', authRateLimit, registerUser);
router.post('/auth/login', authRateLimit, loginUser);
router.post(
  '/auth/refresh',
  refreshRateLimit,
  validate(refreshSchema),
  refreshAccessToken,
);
router.post('/auth/logout', logoutUser);

module.exports = router;
