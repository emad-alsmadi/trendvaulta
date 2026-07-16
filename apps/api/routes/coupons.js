const express = require('express');
const router = express.Router();
const { verfiyToken } = require('../middlewares/verfiyToken');
const { checkRolePermission } = require('../middlewares/checkRolePermission');

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
router.post('/coupons/validate', validateCoupon);
router.get('/coupons/code/:code', getCouponByCode);

// Admin routes
router.get('/coupons', verfiyToken, checkRolePermission('coupons:read'), getAllCoupons);
router.get('/coupons/:id', verfiyToken, checkRolePermission('coupons:read'), getCouponById);

router.post('/coupons', verfiyToken, checkRolePermission('coupons:write'), createCoupon);

router.put('/coupons/:id', verfiyToken, checkRolePermission('coupons:write'), updateCoupon);

router.delete('/coupons/:id', verfiyToken, checkRolePermission('coupons:delete'), deleteCoupon);

router.post('/coupons/:id/use', verfiyToken, incrementCouponUsage);

module.exports = router;
