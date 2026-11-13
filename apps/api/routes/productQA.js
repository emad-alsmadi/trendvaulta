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
const { verifyToken } = require('../middlewares/verifyToken');
const { checkRolePermission } = require('../middlewares/checkRolePermission');
const { validate } = require('../middlewares/validate');
const {
  qaQuestionRateLimit,
  qaVoteRateLimit,
} = require('../middlewares/rateLimit');
const {
  createProductQuestionSchema,
  answerProductQASchema,
  markHelpfulSchema,
} = require('../validators/productQA.validator');

// Public endpoint - get approved Q&A for a product
router.get('/products/:id/qa', getProductQA);

// Public endpoint - submit a question (requires auth)
router.post(
  '/products/:id/qa',
  verifyToken,
  qaQuestionRateLimit,
  validate(createProductQuestionSchema),
  createProductQuestion,
);

// Public endpoint - mark as helpful (requires auth)
router.post(
  '/qa/:id/helpful',
  verifyToken,
  qaVoteRateLimit,
  validate(markHelpfulSchema),
  markHelpful,
);

// Admin endpoints
router.get(
  '/qa/admin',
  verifyToken,
  checkRolePermission('content:read'),
  getAllProductQA,
);
router.get(
  '/qa/:id',
  verifyToken,
  checkRolePermission('content:read'),
  getProductQAById,
);
router.put(
  '/qa/:id/answer',
  verifyToken,
  checkRolePermission('content:write'),
  validate(answerProductQASchema),
  answerProductQuestion,
);
router.delete(
  '/qa/:id',
  verifyToken,
  checkRolePermission('content:delete'),
  deleteProductQA,
);

module.exports = router;
