const asyncHandler = require('express-async-handler');
const ProductQA = require('../models/ProductQA');
const Product = require('../models/Product');

/**
 * Get Q&A for a product (public)
 * Only returns approved questions
 *
 * @route GET /api/products/:id/qa
 * @access Public
 */
const getProductQA = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findById(id).select('_id').lean();
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  const qa = await ProductQA.find({
    product: id,
    approved: true,
  })
    .populate('askedBy', 'name email')
    .populate('answeredBy', 'name email')
    .sort({ helpful: -1, createdAt: -1 })
    .lean();

  res.status(200).json({
    message: 'ok',
    results: qa,
  });
});

/**
 * Get all Q&A (admin)
 * Admin endpoint with pagination
 */
const getAllProductQA = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, productId, approved } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const query = {};
  if (productId) query.product = productId;
  if (approved !== undefined) query.approved = approved === 'true';

  const [qa, total] = await Promise.all([
    ProductQA.find(query)
      .populate('product', 'title')
      .populate('askedBy', 'name email')
      .populate('answeredBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    ProductQA.countDocuments(query),
  ]);

  res.status(200).json({
    message: 'ok',
    data: qa,
    meta: {
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      limit: limitNum,
    },
  });
});

/**
 * Get a single Q&A by ID
 * Admin endpoint
 */
const getProductQAById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const qa = await ProductQA.findById(id)
    .populate('product', 'title')
    .populate('askedBy', 'name email')
    .populate('answeredBy', 'name email')
    .lean();

  if (!qa) {
    return res.status(404).json({ message: 'Q&A not found' });
  }

  res.status(200).json({
    message: 'ok',
    data: qa,
  });
});

/**
 * Create a new question
 * Public endpoint (requires auth)
 */
const createProductQuestion = asyncHandler(async (req, res) => {
  const { productId, question } = req.body;
  const userId = req.user?.id;

  if (!productId || !question) {
    return res
      .status(400)
      .json({ message: 'productId and question are required' });
  }

  const product = await Product.findById(productId).select('_id').lean();
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  const qa = await ProductQA.create({
    product: productId,
    question,
    askedBy: userId,
    approved: false, // Requires admin approval
  });

  const populatedQA = await ProductQA.findById(qa._id)
    .populate('product', 'title')
    .populate('askedBy', 'name email')
    .lean();

  res.status(201).json({
    message: 'Question submitted successfully',
    data: populatedQA,
  });
});

/**
 * Answer a question
 * Admin endpoint
 */
const answerProductQuestion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { answer, approved } = req.body;
  const userId = req.user?.id;

  const qa = await ProductQA.findById(id);
  if (!qa) {
    return res.status(404).json({ message: 'Q&A not found' });
  }

  if (answer !== undefined) {
    qa.answer = answer;
    qa.answeredBy = userId;
  }
  if (approved !== undefined) qa.approved = approved;

  await qa.save();

  const populatedQA = await ProductQA.findById(qa._id)
    .populate('product', 'title')
    .populate('askedBy', 'name email')
    .populate('answeredBy', 'name email')
    .lean();

  res.status(200).json({
    message: 'Answer saved successfully',
    data: populatedQA,
  });
});

/**
 * Mark question as helpful/not helpful
 * Public endpoint (requires auth)
 */
const markHelpful = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { helpful } = req.body;

  const qa = await ProductQA.findById(id);
  if (!qa) {
    return res.status(404).json({ message: 'Q&A not found' });
  }

  if (helpful === true) {
    qa.helpful += 1;
  } else if (helpful === false) {
    qa.notHelpful += 1;
  }

  await qa.save();

  res.status(200).json({
    message: 'Feedback saved successfully',
    data: { helpful: qa.helpful, notHelpful: qa.notHelpful },
  });
});

/**
 * Delete a Q&A
 * Admin endpoint
 */
const deleteProductQA = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const qa = await ProductQA.findById(id);
  if (!qa) {
    return res.status(404).json({ message: 'Q&A not found' });
  }

  await ProductQA.findByIdAndDelete(id);

  res.status(200).json({
    message: 'Q&A deleted successfully',
  });
});

module.exports = {
  getProductQA,
  getAllProductQA,
  getProductQAById,
  createProductQuestion,
  answerProductQuestion,
  markHelpful,
  deleteProductQA,
};
