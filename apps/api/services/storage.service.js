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

/**
 * Whether the bytes really are the image type the client claimed.
 *
 * Multer's `mimetype` is whatever the browser (or an attacker) sent, so an
 * HTML or SVG file renamed `.png` would otherwise be stored and served from
 * our origin. Checking the file signature closes that without a dependency.
 * @param {Buffer} buf
 * @param {string} mimeType
 */
const matchesImageSignature = (buf, mimeType) => {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return false;
  switch (mimeType) {
    case 'image/jpeg':
      return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    case 'image/png':
      return buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case 'image/gif':
      return buf.subarray(0, 4).toString('ascii') === 'GIF8';
    case 'image/webp':
      return (
        buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buf.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    default:
      return false;
  }
};

/** `local` (default, dev) or `cloudinary` (production). */
const storageDriver = () =>
  (process.env.STORAGE_DRIVER || 'local').trim().toLowerCase();

const cloudinaryConfig = () => ({
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
  folder: (process.env.CLOUDINARY_FOLDER || 'trendvaulta').trim(),
});

/**
 * Cloudinary request signature: SHA-1 of the signed params, sorted by name
 * and joined as `k=v&k=v`, with the API secret appended.
 * https://cloudinary.com/documentation/authentication_signatures
 * @param {Record<string, string|number>} params
 * @param {string} apiSecret
 */
const signCloudinaryParams = (params, apiSecret) => {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return crypto.createHash('sha1').update(payload + apiSecret).digest('hex');
};

/** Errors from the storage provider surface as 502, not as our own 500. */
const storageError = (message, cause) => {
  const err = new Error(message);
  err.statusCode = 502;
  if (cause) err.cause = cause;
  return err;
};

/**
 * Upload to Cloudinary over its REST API (Node's global fetch/FormData, so
 * no SDK dependency). Returns the CDN URL.
 */
const uploadToCloudinary = async (fileBuffer, info) => {
  const { cloudName, apiKey, apiSecret, folder } = cloudinaryConfig();
  const publicId = crypto.randomUUID();
  const params = {
    folder,
    public_id: publicId,
    timestamp: Math.floor(Date.now() / 1000),
  };

  const form = new FormData();
  form.append(
    'file',
    new Blob([fileBuffer], { type: info.mimeType || 'application/octet-stream' }),
    buildFileName(info),
  );
  for (const [key, value] of Object.entries(params)) form.append(key, String(value));
  form.append('api_key', apiKey);
  form.append('signature', signCloudinaryParams(params, apiSecret));

  let res;
  try {
    res = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
      { method: 'POST', body: form, signal: AbortSignal.timeout(30_000) },
    );
  } catch (err) {
    throw storageError('Image storage is unreachable. Please try again.', err);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.secure_url) {
    // Provider detail goes to the log, not to the client.
    console.error('Cloudinary upload failed:', res.status, body?.error?.message);
    throw storageError('Image storage rejected the upload. Please try again.');
  }
  return { fileName: body.public_id, publicPath: body.secure_url, url: body.secure_url };
};

/**
 * `folder/uuid` from a Cloudinary delivery URL, or null for any other URL.
 * e.g. https://res.cloudinary.com/<cloud>/image/upload/v1712/trendvaulta/<uuid>.jpg
 */
const cloudinaryPublicIdFromUrl = (url) => {
  const { cloudName } = cloudinaryConfig();
  const match = String(url || '').match(
    /^https:\/\/res\.cloudinary\.com\/([^/]+)\/image\/upload\/(?:v\d+\/)?(.+)\.[a-z0-9]+$/i,
  );
  if (!match || match[1] !== cloudName) return null;
  return match[2];
};

const ensureUploadsDir = async () => {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
};

/**
 * Store an uploaded image with the configured driver.
 * Local: writes to UPLOADS_DIR and returns a path under /uploads.
 * Cloudinary: uploads and returns the CDN URL as `url` (and `publicPath`).
 * @param {Buffer} fileBuffer
 * @param {{ originalName?: string, mimeType?: string }} info
 * @returns {Promise<{ fileName: string, publicPath: string, url?: string }>}
 */
const saveUploadedFile = async (fileBuffer, info = {}) => {
  if (!Buffer.isBuffer(fileBuffer)) {
    throw new Error('saveUploadedFile requires a Buffer');
  }
  if (storageDriver() === 'cloudinary') {
    return uploadToCloudinary(fileBuffer, info);
  }
  await ensureUploadsDir();
  const fileName = buildFileName(info);
  const filePath = path.join(UPLOADS_DIR, fileName);
  await fs.writeFile(filePath, fileBuffer);
  return { fileName, publicPath: `/uploads/${fileName}` };
};

/**
 * Best-effort delete of a previously uploaded file by its public path
 * (e.g. "/uploads/<uuid>.jpg") or its Cloudinary URL. Silently ignores
 * missing files.
 * Not yet wired into product/brand update flows — exported for later use
 * once replacing an image also cleans up the old file.
 * @param {string} publicPath
 * @returns {Promise<boolean>} true if a file was removed
 */
const deleteUploadedFile = async (publicPath) => {
  const publicId = cloudinaryPublicIdFromUrl(publicPath);
  if (publicId) {
    const { cloudName, apiKey, apiSecret } = cloudinaryConfig();
    const params = { public_id: publicId, timestamp: Math.floor(Date.now() / 1000) };
    const form = new FormData();
    for (const [key, value] of Object.entries(params)) form.append(key, String(value));
    form.append('api_key', apiKey);
    form.append('signature', signCloudinaryParams(params, apiSecret));
    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/destroy`,
        { method: 'POST', body: form, signal: AbortSignal.timeout(15_000) },
      );
      const body = await res.json().catch(() => ({}));
      return res.ok && body.result === 'ok';
    } catch {
      return false;
    }
  }
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
  matchesImageSignature,
  signCloudinaryParams,
  cloudinaryPublicIdFromUrl,
};
