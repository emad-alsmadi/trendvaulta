const express = require('express');
const router = express.Router();
const { passwordRateLimit } = require('../middlewares/rateLimit');
const { validate } = require('../middlewares/validate');
const { resetPasswordSchema } = require('../validators/password.validator');
const {
  sendForgotPasswordLink,
  resetPassword,
  changePassword,
} = require('../controllers/password.controller');

const { verfiyToken } = require('../middlewares/verfiyToken');

router.post(
  '/password/forgot-password',
  passwordRateLimit,
  sendForgotPasswordLink,
);
router.post(
  '/password/reset-password/:userId/:token',
  passwordRateLimit,
  validate(resetPasswordSchema),
  resetPassword,
);
router.post(
  '/password/change',
  verfiyToken,
  passwordRateLimit,
  changePassword,
);

module.exports = router;
