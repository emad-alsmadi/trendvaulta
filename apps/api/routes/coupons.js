const express = require('express');
const router = express.Router();
const { verfiyToken } = require('../middlewares/verfiyToken');
const { checkRolePermission } = require('../middlewares/checkRolePermission');
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
router.post('/coupons/validate', couponValidateRateLimit, validateCoupon);
router.get('/coupons/code/:code', couponValidateRateLimit, getCouponByCode);

// Admin routes
router.get(
  '/coupons',
  verfiyToken,
  checkRolePermission('coupons:read'),
  getAllCoupons,
);
router.get(
  '/coupons/:id',
  verfiyToken,
  checkRolePermission('coupons:read'),
  getCouponById,
);

router.post(
  '/coupons',
  verfiyToken,
  checkRolePermission('coupons:write'),
  createCoupon,
);

router.put(
  '/coupons/:id',
  verfiyToken,
  checkRolePermission('coupons:write'),
  updateCoupon,
);

router.delete(
  '/coupons/:id',
  verfiyToken,
  checkRolePermission('coupons:delete'),
  deleteCoupon,
);

// Usage is incremented on paid webhook/verify — admin-only manual bump for ops
router.post(
  '/coupons/:id/use',
  verfiyToken,
  checkRolePermission('coupons:write'),
  incrementCouponUsage,
);

module.exports = router;
