const express = require('express');
const router = express.Router();
const {
  getStorefrontCategories,
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categories.controller');
const { verfiyToken } = require('../middlewares/verfiyToken');
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
  verfiyToken,
  checkRolePermission('products:read'),
  getAdminCategories,
);
router.post(
  '/categories',
  verfiyToken,
  checkRolePermission('products:write'),
  validate(createCategorySchema),
  createCategory,
);
router.put(
  '/categories/:id',
  verfiyToken,
  checkRolePermission('products:write'),
  validate(updateCategorySchema),
  updateCategory,
);
router.delete(
  '/categories/:id',
  verfiyToken,
  checkRolePermission('products:delete'),
  deleteCategory,
);

module.exports = router;
