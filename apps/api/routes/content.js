const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/verifyToken');
const { checkRolePermission } = require('../middlewares/checkRolePermission');
const { validate } = require('../middlewares/validate');
const {
  createContentSchema,
  updateContentSchema,
} = require('../validators/content.validator');

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
  verifyToken,
  checkRolePermission('content:read'),
  getAllContent,
);

router.get(
  '/content/:id',
  verifyToken,
  checkRolePermission('content:read'),
  getContentById,
);

router.post(
  '/content',
  verifyToken,
  checkRolePermission('content:write'),
  validate(createContentSchema),
  createContent,
);

router.put(
  '/content/:id',
  verifyToken,
  checkRolePermission('content:write'),
  validate(updateContentSchema),
  updateContent,
);

router.delete(
  '/content/:id',
  verifyToken,
  checkRolePermission('content:delete'),
  deleteContent,
);

module.exports = router;
