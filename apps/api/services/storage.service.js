const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');

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
 * Save an uploaded file buffer to local disk and return its public path.
 * @param {Buffer} fileBuffer
 * @param {{ originalName?: string, mimeType?: string }} info
 * @returns {Promise<{ fileName: string, publicPath: string }>}
 */
const saveUploadedFile = async (fileBuffer, info = {}) => {
  if (!Buffer.isBuffer(fileBuffer)) {
    throw new Error('saveUploadedFile requires a Buffer');
  }
  await ensureUploadsDir();
  const fileName = buildFileName(info);
  const filePath = path.join(UPLOADS_DIR, fileName);
  await fs.writeFile(filePath, fileBuffer);
  return { fileName, publicPath: `/uploads/${fileName}` };
};

/**
 * Best-effort delete of a previously uploaded file by its public path
 * (e.g. "/uploads/<uuid>.jpg"). Silently ignores missing files.
 * Not yet wired into product/brand update flows — exported for later use
 * once replacing an image also cleans up the old file.
 * @param {string} publicPath
 * @returns {Promise<boolean>} true if a file was removed
 */
const deleteUploadedFile = async (publicPath) => {
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
