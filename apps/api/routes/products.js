const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/verifyToken');
const { optionalVerifyToken } = require('../middlewares/optionalVerifyToken');
const { checkRolePermission } = require('../middlewares/checkRolePermission');

const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/product.controller');

router.get('/products', optionalVerifyToken, getAllProducts);
router.get('/products/:id', optionalVerifyToken, getProductById);

router.post(
  '/products',
  verifyToken,
  checkRolePermission('products:write'),
  createProduct,
);

router.put(
  '/products/:id',
  verifyToken,
  checkRolePermission('products:write'),
  updateProduct,
);

router.delete(
  '/products/:id',
  verifyToken,
  checkRolePermission('products:delete'),
  deleteProduct,
);

module.exports = router;
