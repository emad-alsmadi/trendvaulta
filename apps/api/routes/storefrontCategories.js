const express = require('express');
const router = express.Router();
const {
  getStorefrontCategories,
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categories.controller');
const { verifyToken } = require('../middlewares/verifyToken');
const { checkRolePermission } = require('../middlewares/checkRolePermission');
const { validate } = require('../middlewares/validate');
const {
  createCategorySchema,
  updateCategorySchema,
} = require('../validators/category.validator');

// Public storefront category shortcuts
router.get('/storefront/categories', getStorefrontCategories);

// Admin — categories are catalog data, so they share the products:* permissions
router.get(
  '/categories/admin',
  verifyToken,
  checkRolePermission('products:read'),
  getAdminCategories,
);
router.post(
  '/categories',
  verifyToken,
  checkRolePermission('products:write'),
  validate(createCategorySchema),
  createCategory,
);
router.put(
  '/categories/:id',
  verifyToken,
  checkRolePermission('products:write'),
  validate(updateCategorySchema),
  updateCategory,
);
router.delete(
  '/categories/:id',
  verifyToken,
  checkRolePermission('products:delete'),
  deleteCategory,
);

module.exports = router;
