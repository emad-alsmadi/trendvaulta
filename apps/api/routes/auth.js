const express = require('express');
const router = express.Router();
const {
  authRateLimit,
  refreshRateLimit,
  emailVerificationRateLimit,
} = require('../middlewares/rateLimit');
const { validate } = require('../middlewares/validate');
const { verfiyToken } = require('../middlewares/verfiyToken');
const { refreshSchema } = require('../validators/auth.validator');

const {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  verifyEmail,
  resendVerificationEmail,
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
router.post('/auth/verify-email', emailVerificationRateLimit, verifyEmail);
router.post(
  '/auth/verify-email/resend',
  emailVerificationRateLimit,
  verfiyToken,
  resendVerificationEmail,
);

module.exports = router;
