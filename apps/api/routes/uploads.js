const express = require('express');
const multer = require('multer');
const router = express.Router();
const { verfiyToken } = require('../middlewares/verfiyToken');
const { getUserPermissions } = require('../middlewares/rolePermissions');
const { uploadImage } = require('../controllers/upload.controller');

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE');
      err.message = 'Only JPEG, PNG, WEBP, or GIF images are allowed';
      return cb(err);
    }
    cb(null, true);
  },
});

/**
 * Product and brand image uploads share this one endpoint, so neither
 * checkRolePermission('products:write') nor ('brands:write') alone fits —
 * this small inline OR check avoids modifying the shared middleware.
 */
const requireProductsOrBrandsWrite = (req, res, next) => {
  const permissions = getUserPermissions(req.user?.roles || ['user']);
  if (
    permissions.includes('products:write') ||
    permissions.includes('brands:write')
  ) {
    req.userPermissions = permissions;
    return next();
  }
  return res.status(403).json({
    message: 'You do not have permission to perform this action',
    code: 'FORBIDDEN',
  });
};

const handleUpload = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Image is too large (max 5MB)' });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          message: err.message || 'Unsupported image type',
        });
      }
      return res.status(400).json({ message: 'Image upload failed' });
    }
    if (err) return next(err);
    next();
  });
};

router.post(
  '/uploads',
  verfiyToken,
  requireProductsOrBrandsWrite,
  handleUpload,
  uploadImage,
);

module.exports = router;
