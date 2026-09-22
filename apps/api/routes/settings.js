const express = require('express');
const router = express.Router();
const { verfiyToken } = require('../middlewares/verfiyToken');
const { checkRolePermission } = require('../middlewares/checkRolePermission');

const { getSettings, updateSettings } = require('../controllers/settings.controller');

router.get(
  '/admin/settings',
  verfiyToken,
  checkRolePermission('content:read'),
  getSettings,
);

router.put(
  '/admin/settings',
  verfiyToken,
  checkRolePermission('content:write'),
  updateSettings,
);

module.exports = router;
