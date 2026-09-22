const express = require('express');
const router = express.Router();
const { verfiyToken } = require('../middlewares/verfiyToken');
const { optionalVerifyToken } = require('../middlewares/optionalVerifyToken');
const { checkRolePermission } = require('../middlewares/checkRolePermission');

const {
  getAllBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
} = require('../controllers/brand.controller');

router.get('/brands', optionalVerifyToken, getAllBrands);
router.get('/brands/:id', getBrandById);

router.post(
  '/brands',
  verfiyToken,
  checkRolePermission('brands:write'),
  createBrand,
);

router.put(
  '/brands/:id',
  verfiyToken,
  checkRolePermission('brands:write'),
  updateBrand,
);

router.delete(
  '/brands/:id',
  verfiyToken,
  checkRolePermission('brands:delete'),
  deleteBrand,
);

module.exports = router;
