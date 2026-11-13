const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/verifyToken');
const { checkRolePermission } = require('../middlewares/checkRolePermission');

const { getSettings, updateSettings } = require('../controllers/settings.controller');

router.get(
  '/admin/settings',
  verifyToken,
  checkRolePermission('content:read'),
  getSettings,
);

router.put(
  '/admin/settings',
  verifyToken,
  checkRolePermission('settings:write'),
  updateSettings,
);

module.exports = router;
