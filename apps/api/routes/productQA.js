const express = require('express');
const router = express.Router();
const {
  getProductQA,
  getAllProductQA,
  getProductQAById,
  createProductQuestion,
  answerProductQuestion,
  markHelpful,
  deleteProductQA,
} = require('../controllers/productQA.controller');
const { verfiyToken } = require('../middlewares/verfiyToken');
const { checkRolePermission } = require('../middlewares/checkRolePermission');

// Public endpoint - get approved Q&A for a product
router.get('/products/:id/qa', getProductQA);

// Public endpoint - submit a question (requires auth)
router.post('/products/:id/qa', verfiyToken, createProductQuestion);

// Public endpoint - mark as helpful (requires auth)
router.post('/qa/:id/helpful', verfiyToken, markHelpful);

// Admin endpoints
router.get('/qa/admin', verfiyToken, checkRolePermission('content:read'), getAllProductQA);
router.get('/qa/:id', verfiyToken, checkRolePermission('content:read'), getProductQAById);
router.put('/qa/:id/answer', verfiyToken, checkRolePermission('content:write'), answerProductQuestion);
router.delete('/qa/:id', verfiyToken, checkRolePermission('content:delete'), deleteProductQA);

module.exports = router;
