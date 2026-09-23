const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { v2: cloudinary } = require('cloudinary');

const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');

// Configure Cloudinary if credentials are available
if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/** Mimetype -> file extension used for stored files. */
const MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/**
 * Pick a safe file extension for a stored upload.
 * Prefers the mimetype's canonical extension; falls back to the original
 * filename's extension (sanitized) when the mimetype isn't recognized.
 * @param {{ originalName?: string, mimeType?: string }} info
 * @returns {string} extension without a leading dot (defaults to 'bin')
 */
const resolveExtension = ({ originalName, mimeType } = {}) => {
  if (mimeType && MIME_EXTENSIONS[mimeType]) {
    return MIME_EXTENSIONS[mimeType];
  }
  const ext = path.extname(String(originalName || '')).replace(/^\./, '');
  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, '');
  return safeExt || 'bin';
};

/**
 * Build a content-addressed-by-uuid filename for an upload.
 * @param {{ originalName?: string, mimeType?: string }} info
 * @returns {string} e.g. "b3f1...-uuid.jpg"
 */
const buildFileName = (info) => {
  const ext = resolveExtension(info);
  return `${crypto.randomUUID()}.${ext}`;
};

const ensureUploadsDir = async () => {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
};

/**
 * Save an uploaded file buffer to Cloudinary (if configured) or local disk.
 * @param {Buffer} fileBuffer
 * @param {{ originalName?: string, mimeType?: string }} info
 * @returns {Promise<{ fileName: string, publicPath: string }>}
 */
const saveUploadedFile = async (fileBuffer, info = {}) => {
  if (!Buffer.isBuffer(fileBuffer)) {
    throw new Error('saveUploadedFile requires a Buffer');
  }

  // Use Cloudinary if configured
  if (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  ) {
    try {
      const ext = resolveExtension(info);
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              resource_type: 'image',
              folder: 'trendvaulta',
              format: ext,
              transformation: [
                { quality: 'auto', fetch_format: 'auto' },
                { width: 1200, crop: 'limit' },
              ],
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            },
          )
          .end(fileBuffer);
      });

      return {
        fileName: result.public_id,
        publicPath: result.secure_url,
      };
    } catch (error) {
      console.error(
        'Cloudinary upload failed, falling back to local storage:',
        error,
      );
      // Fall back to local storage on error
    }
  }

  // Local storage fallback
  await ensureUploadsDir();
  const fileName = buildFileName(info);
  const filePath = path.join(UPLOADS_DIR, fileName);
  await fs.writeFile(filePath, fileBuffer);
  return { fileName, publicPath: `/uploads/${fileName}` };
};

/**
 * Best-effort delete of a previously uploaded file by its public path
 * (e.g. "/uploads/<uuid>.jpg" or Cloudinary URL). Silently ignores missing files.
 * Not yet wired into product/brand update flows — exported for later use
 * once replacing an image also cleans up the old file.
 * @param {string} publicPath
 * @returns {Promise<boolean>} true if a file was removed
 */
const deleteUploadedFile = async (publicPath) => {
  if (!publicPath) return false;

  // Check if it's a Cloudinary URL
  if (publicPath.includes('cloudinary.com')) {
    try {
      const publicId = publicPath.split('/').slice(-2).join('/').split('.')[0];
      await cloudinary.uploader.destroy(publicId);
      return true;
    } catch {
      return false;
    }
  }

  // Local storage deletion
  const fileName = path.basename(String(publicPath || ''));
  if (!fileName || fileName.includes('..')) return false;
  const filePath = path.join(UPLOADS_DIR, fileName);
  try {
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
};

module.exports = {
  UPLOADS_DIR,
  MIME_EXTENSIONS,
  resolveExtension,
  buildFileName,
  saveUploadedFile,
  deleteUploadedFile,
};
