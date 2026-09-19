const express = require('express');
const router = express.Router();
const { passwordRateLimit } = require('../middlewares/rateLimit');
const { validate } = require('../middlewares/validate');
const {
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../validators/password.validator');
const {
  sendForgotPasswordLink,
  resetPassword,
} = require('../controllers/password.controller');

router.post(
  '/password/forgot-password',
  passwordRateLimit,
  validate(forgotPasswordSchema),
  sendForgotPasswordLink,
);
router.post(
  '/password/reset-password/:userId/:token',
  passwordRateLimit,
  validate(resetPasswordSchema),
  resetPassword,
);

module.exports = router;
