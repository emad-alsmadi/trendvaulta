const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/verifyToken');
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
router.get('/brands/:id', optionalVerifyToken, getBrandById);

router.post(
  '/brands',
  verifyToken,
  checkRolePermission('brands:write'),
  createBrand,
);

router.put(
  '/brands/:id',
  verifyToken,
  checkRolePermission('brands:write'),
  updateBrand,
);

router.delete(
  '/brands/:id',
  verifyToken,
  checkRolePermission('brands:delete'),
  deleteBrand,
);

module.exports = router;
