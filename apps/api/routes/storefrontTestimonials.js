const express = require('express');
const router = express.Router();
const {
  getTestimonials,
  getAllTestimonials,
  getTestimonialById,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
} = require('../controllers/testimonials.controller');
const { verfiyToken } = require('../middlewares/verfiyToken');
const { checkRolePermission } = require('../middlewares/checkRolePermission');

// Public endpoint - get active testimonials for storefront
router.get('/storefront/testimonials', getTestimonials);

// Admin endpoints
router.get(
  '/testimonials/admin',
  verfiyToken,
  checkRolePermission('content:read'),
  getAllTestimonials,
);
router.get(
  '/testimonials/:id',
  verfiyToken,
  checkRolePermission('content:read'),
  getTestimonialById,
);
router.post(
  '/testimonials',
  verfiyToken,
  checkRolePermission('content:write'),
  createTestimonial,
);
router.put(
  '/testimonials/:id',
  verfiyToken,
  checkRolePermission('content:write'),
  updateTestimonial,
);
router.delete(
  '/testimonials/:id',
  verfiyToken,
  checkRolePermission('content:delete'),
  deleteTestimonial,
);

module.exports = router;
