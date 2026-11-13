const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/verifyToken');
const { checkRolePermission } = require('../middlewares/checkRolePermission');
const { optionalVerifyToken } = require('../middlewares/optionalVerifyToken');
const { couponValidateRateLimit } = require('../middlewares/rateLimit');

const {
  getAllCoupons,
  getCouponById,
  getCouponByCode,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  incrementCouponUsage,
} = require('../controllers/coupon.controller');

// Public routes
// Optional auth: a signed-in shopper also gets their per-customer limit
// checked when applying the code, not only at payment.
router.post(
  '/coupons/validate',
  couponValidateRateLimit,
  optionalVerifyToken,
  validateCoupon,
);
router.get('/coupons/code/:code', couponValidateRateLimit, getCouponByCode);

// Admin routes
router.get(
  '/coupons',
  verifyToken,
  checkRolePermission('coupons:read'),
  getAllCoupons,
);
router.get(
  '/coupons/:id',
  verifyToken,
  checkRolePermission('coupons:read'),
  getCouponById,
);

router.post(
  '/coupons',
  verifyToken,
  checkRolePermission('coupons:write'),
  createCoupon,
);

router.put(
  '/coupons/:id',
  verifyToken,
  checkRolePermission('coupons:write'),
  updateCoupon,
);

router.delete(
  '/coupons/:id',
  verifyToken,
  checkRolePermission('coupons:delete'),
  deleteCoupon,
);

// Usage is incremented on paid webhook/verify — admin-only manual bump for ops
router.post(
  '/coupons/:id/use',
  verifyToken,
  checkRolePermission('coupons:write'),
  incrementCouponUsage,
);

module.exports = router;
