const express = require('express');
const router = express.Router();
const { verfiyToken } = require('../middlewares/verfiyToken');
const { checkRolePermission } = require('../middlewares/checkRolePermission');
const { newsletterRateLimit } = require('../middlewares/rateLimit');

const {
  subscribe,
  unsubscribe,
  getAdminSubscribers,
} = require('../controllers/newsletter.controller');

// Admin (static segment first)
router.get(
  '/newsletter/admin',
  verfiyToken,
  checkRolePermission('content:read'),
  getAdminSubscribers,
);

// Public
router.post('/newsletter', newsletterRateLimit, subscribe);
router.post('/newsletter/unsubscribe', newsletterRateLimit, unsubscribe);

module.exports = router;
