const express = require('express');
const router = express.Router();
const { verfiyToken } = require('../middlewares/verfiyToken');
const { checkRolePermission } = require('../middlewares/checkRolePermission');

const {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} = require('../controllers/template.controller');

router.get('/templates', getAllTemplates);
router.get('/templates/:id', getTemplateById);

router.post(
  '/templates',
  verfiyToken,
  checkRolePermission('templates:write'),
  createTemplate,
);

router.put(
  '/templates/:id',
  verfiyToken,
  checkRolePermission('templates:write'),
  updateTemplate,
);

router.delete(
  '/templates/:id',
  verfiyToken,
  checkRolePermission('templates:delete'),
  deleteTemplate,
);

module.exports = router;
