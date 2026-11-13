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
const { verifyToken } = require('../middlewares/verifyToken');
const { checkRolePermission } = require('../middlewares/checkRolePermission');
const { validate } = require('../middlewares/validate');
const {
  createTestimonialSchema,
  updateTestimonialSchema,
} = require('../validators/testimonial.validator');

// Public endpoint - get active testimonials for storefront
router.get('/storefront/testimonials', getTestimonials);

// Admin endpoints
router.get(
  '/testimonials/admin',
  verifyToken,
  checkRolePermission('content:read'),
  getAllTestimonials,
);
router.get(
  '/testimonials/:id',
  verifyToken,
  checkRolePermission('content:read'),
  getTestimonialById,
);
router.post(
  '/testimonials',
  verifyToken,
  checkRolePermission('content:write'),
  validate(createTestimonialSchema),
  createTestimonial,
);
router.put(
  '/testimonials/:id',
  verifyToken,
  checkRolePermission('content:write'),
  validate(updateTestimonialSchema),
  updateTestimonial,
);
router.delete(
  '/testimonials/:id',
  verifyToken,
  checkRolePermission('content:delete'),
  deleteTestimonial,
);

module.exports = router;
