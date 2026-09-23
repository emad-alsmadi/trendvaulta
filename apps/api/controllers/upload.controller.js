const asyncHandler = require('express-async-handler');
const {
  saveUploadedFile,
  matchesImageSignature,
} = require('../services/storage.service');

/**
 * Resolve the public origin used to build absolute upload URLs.
 * Prefers UPLOAD_PUBLIC_BASE_URL (e.g. once uploads move behind a CDN);
 * otherwise falls back to this API's own request origin.
 * @param {import('express').Request} req
 * @returns {string} origin with no trailing slash
 */
const resolvePublicBaseUrl = (req) => {
  const configured = process.env.UPLOAD_PUBLIC_BASE_URL;
  if (configured) return configured.replace(/\/+$/, '');
  return `${req.protocol}://${req.get('host')}`;
};

/**
 * Handle a single product/brand image upload.
 * Expects Multer (memory storage) to have already populated req.file.
 *
 * @route POST /api/uploads
 * @access Private (requires products:write or brands:write permission)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>} JSON { message, data: { url } }
 */
const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image file was uploaded' });
  }

  const { buffer, originalname, mimetype } = req.file;
  if (!matchesImageSignature(buffer, mimetype)) {
    return res.status(400).json({
      message: 'This file is not a valid JPEG, PNG, WEBP, or GIF image',
    });
  }

  const saved = await saveUploadedFile(buffer, {
    originalName: originalname,
    mimeType: mimetype,
  });

  // Cloudinary returns an absolute CDN URL; local storage returns a path
  // served by this API under /uploads.
  const url = saved.url || `${resolvePublicBaseUrl(req)}${saved.publicPath}`;

  res.status(201).json({
    message: 'Image uploaded',
    data: { url },
  });
});

module.exports = {
  uploadImage,
  resolvePublicBaseUrl,
};
