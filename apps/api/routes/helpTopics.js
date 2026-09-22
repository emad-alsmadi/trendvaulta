const express = require('express');
const router = express.Router();
const { verfiyToken } = require('../middlewares/verfiyToken');
const { checkRolePermission } = require('../middlewares/checkRolePermission');

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
  verfiyToken,
  checkRolePermission('content:read'),
  getAllHelpTopics,
);

router.get(
  '/help-topics/:id',
  verfiyToken,
  checkRolePermission('content:read'),
  getHelpTopicById,
);

router.post(
  '/help-topics',
  verfiyToken,
  checkRolePermission('content:write'),
  createHelpTopic,
);

router.put(
  '/help-topics/:id',
  verfiyToken,
  checkRolePermission('content:write'),
  updateHelpTopic,
);

router.delete(
  '/help-topics/:id',
  verfiyToken,
  checkRolePermission('content:delete'),
  deleteHelpTopic,
);

module.exports = router;
