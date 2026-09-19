const express = require('express');
const router = express.Router();
const { verfiyToken } = require('../middlewares/verfiyToken');
const { checkRolePermission } = require('../middlewares/checkRolePermission');

const {
  getContent,
  getAllContent,
  getContentById,
  createContent,
  updateContent,
  deleteContent,
} = require('../controllers/content.controller');

// Public storefront content by type
router.get('/content', getContent);

// Admin routes (static segment before :id)
router.get(
  '/content/admin',
  verfiyToken,
  checkRolePermission('content:read'),
  getAllContent,
);

router.get(
  '/content/:id',
  verfiyToken,
  checkRolePermission('content:read'),
  getContentById,
);

router.post(
  '/content',
  verfiyToken,
  checkRolePermission('content:write'),
  createContent,
);

router.put(
  '/content/:id',
  verfiyToken,
  checkRolePermission('content:write'),
  updateContent,
);

router.delete(
  '/content/:id',
  verfiyToken,
  checkRolePermission('content:delete'),
  deleteContent,
);

module.exports = router;
