const express = require('express');
const router = express.Router();
const { verfiyToken } = require('../middlewares/verfiyToken');
const { checkRolePermission } = require('../middlewares/checkRolePermission');
const { contactRateLimit } = require('../middlewares/rateLimit');

const {
  createContactMessage,
  getAdminContactMessages,
} = require('../controllers/contact.controller');

// Admin (static segment first)
router.get(
  '/contact/admin',
  verfiyToken,
  checkRolePermission('content:read'),
  getAdminContactMessages,
);

// Public
router.post('/contact', contactRateLimit, createContactMessage);

module.exports = router;
