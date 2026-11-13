const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/verifyToken');
const { checkRolePermission } = require('../middlewares/checkRolePermission');
const { contactRateLimit } = require('../middlewares/rateLimit');

const {
  createContactMessage,
  getAdminContactMessages,
  updateContactMessage,
} = require('../controllers/contact.controller');

// Admin (static segment first)
router.get(
  '/contact/admin',
  verifyToken,
  checkRolePermission('content:read'),
  getAdminContactMessages,
);
router.patch(
  '/contact/admin/:id',
  verifyToken,
  checkRolePermission('content:write'),
  updateContactMessage,
);

// Public
router.post('/contact', contactRateLimit, createContactMessage);

module.exports = router;
