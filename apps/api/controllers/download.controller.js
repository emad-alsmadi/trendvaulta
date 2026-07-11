const asyncHandler = require('express-async-handler');
const Download = require('../models/Download');
const Template = require('../models/Template');
const Order = require('../models/Order');

/**
 * @desc    Get all downloads for current user
 * @route   GET /api/downloads/my
 * @access  Private
 */
const getMyDownloads = asyncHandler(async (req, res) => {
  const downloads = await Download.find({ user: req.user.id })
    .populate('template', 'title cover price category')
    .populate('order', 'status paymentStatus createdAt')
    .sort({ createdAt: -1 });

  res.json(downloads);
});

/**
 * @desc    Get download by ID
 * @route   GET /api/downloads/:id
 * @access  Private
 */
const getDownloadById = asyncHandler(async (req, res) => {
  const download = await Download.findById(req.params.id)
    .populate('template', 'title cover price category fileUrl')
    .populate('order', 'status paymentStatus createdAt');

  if (!download) {
    res.status(404);
    throw new Error('Download not found');
  }

  // Check ownership
  if (download.user.toString() !== req.user.id.toString()) {
    res.status(403);
    throw new Error('Not authorized to access this download');
  }

  res.json(download);
});

/**
 * @desc    Record a download and increment download count
 * @route   POST /api/downloads/:id/download
 * @access  Private
 */
const recordDownload = asyncHandler(async (req, res) => {
  const download = await Download.findById(req.params.id);

  if (!download) {
    res.status(404);
    throw new Error('Download not found');
  }

  // Check ownership
  if (download.user.toString() !== req.user.id.toString()) {
    res.status(403);
    throw new Error('Not authorized to access this download');
  }

  // Check download limit
  if (download.downloadCount >= download.downloadLimit) {
    res.status(403);
    throw new Error('Download limit reached');
  }

  // Increment download count and update last download date
  download.downloadCount += 1;
  download.lastDownloadDate = new Date();
  await download.save();

  // Get template file URL
  const template = await Template.findById(download.template);
  if (!template) {
    res.status(404);
    throw new Error('Template not found');
  }

  res.json({
    message: 'Download recorded successfully',
    downloadCount: download.downloadCount,
    lastDownloadDate: download.lastDownloadDate,
    fileUrl: template.fileUrl,
    remainingDownloads: download.downloadLimit - download.downloadCount,
  });
});

/**
 * @desc    Create download entry after successful payment
 * @route   POST /api/downloads
 * @access  Private
 */
const createDownload = asyncHandler(async (req, res) => {
  const { templateId, orderId } = req.body;

  // Verify order exists and belongs to user
  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (order.user.toString() !== req.user.id.toString()) {
    res.status(403);
    throw new Error('Not authorized to create download for this order');
  }

  // Verify order is paid
  if (order.paymentStatus !== 'paid') {
    res.status(400);
    throw new Error('Order must be paid to create download');
  }

  // Verify template exists and is in order
  const template = await Template.findById(templateId);
  if (!template) {
    res.status(404);
    throw new Error('Template not found');
  }

  const templateInOrder = order.items.some(
    (item) => item.template.toString() === templateId
  );
  if (!templateInOrder) {
    res.status(400);
    throw new Error('Template not found in order');
  }

  // Check if download already exists
  const existingDownload = await Download.findOne({
    user: req.user.id,
    template: templateId,
    order: orderId,
  });

  if (existingDownload) {
    res.status(400);
    throw new Error('Download already exists for this template and order');
  }

  // Create download entry
  const download = await Download.create({
    user: req.user.id,
    template: templateId,
    order: orderId,
    downloadCount: 0,
    downloadLimit: 10, // Default limit
  });

  const populatedDownload = await Download.findById(download.id)
    .populate('template', 'title cover price category')
    .populate('order', 'status paymentStatus createdAt');

  res.status(201).json(populatedDownload);
});

/**
 * @desc    Delete download entry
 * @route   DELETE /api/downloads/:id
 * @access  Private
 */
const deleteDownload = asyncHandler(async (req, res) => {
  const download = await Download.findById(req.params.id);

  if (!download) {
    res.status(404);
    throw new Error('Download not found');
  }

  // Check ownership
  if (download.user.toString() !== req.user.id.toString()) {
    res.status(403);
    throw new Error('Not authorized to delete this download');
  }

  await download.deleteOne();

  res.json({ message: 'Download removed successfully' });
});

module.exports = {
  getMyDownloads,
  getDownloadById,
  recordDownload,
  createDownload,
  deleteDownload,
};
