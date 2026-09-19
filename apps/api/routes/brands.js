const express = require('express');
const router = express.Router();
const { verfiyToken } = require('../middlewares/verfiyToken');
const { checkRolePermission } = require('../middlewares/checkRolePermission');
const { validate } = require('../middlewares/validate');
const {
  createBrandSchema,
  updateBrandSchema,
} = require('../validators/brand.validator');

const {
  getAllBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
} = require('../controllers/brand.controller');

router.get('/brands', getAllBrands);
router.get('/brands/:id', getBrandById);

router.post(
  '/brands',
  verfiyToken,
  checkRolePermission('brands:write'),
  validate(createBrandSchema),
  createBrand,
);

router.put(
  '/brands/:id',
  verfiyToken,
  checkRolePermission('brands:write'),
  validate(updateBrandSchema),
  updateBrand,
);

router.delete(
  '/brands/:id',
  verfiyToken,
  checkRolePermission('brands:delete'),
  deleteBrand,
);

module.exports = router;
