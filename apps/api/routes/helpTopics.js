const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/verifyToken');
const { checkRolePermission } = require('../middlewares/checkRolePermission');
const { validate } = require('../middlewares/validate');
const {
  createHelpTopicSchema,
  updateHelpTopicSchema,
} = require('../validators/helpTopic.validator');

const {
  getHelpTopics,
  getAllHelpTopics,
  getHelpTopicById,
  createHelpTopic,
  updateHelpTopic,
  deleteHelpTopic,
} = require('../controllers/helpTopic.controller');

// Public storefront list
router.get('/storefront/help', getHelpTopics);

// Admin routes (static segment before :id)
router.get(
  '/help-topics/admin',
  verifyToken,
  checkRolePermission('content:read'),
  getAllHelpTopics,
);

router.get(
  '/help-topics/:id',
  verifyToken,
  checkRolePermission('content:read'),
  getHelpTopicById,
);

router.post(
  '/help-topics',
  verifyToken,
  checkRolePermission('content:write'),
  validate(createHelpTopicSchema),
  createHelpTopic,
);

router.put(
  '/help-topics/:id',
  verifyToken,
  checkRolePermission('content:write'),
  validate(updateHelpTopicSchema),
  updateHelpTopic,
);

router.delete(
  '/help-topics/:id',
  verifyToken,
  checkRolePermission('content:delete'),
  deleteHelpTopic,
);

module.exports = router;
