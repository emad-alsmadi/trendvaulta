/**
 * Move images stored on the API's local disk (apps/api/uploads) to durable
 * storage and rewrite every database reference to them.
 *
 * Local uploads are saved as `<api origin>/uploads/<uuid>.<ext>` (see
 * upload.controller.js), with whatever origin served the upload. So any
 * string ending in `/uploads/<file>` is a candidate, whatever its host. A
 * reference is only rewritten when that exact file exists in the local
 * uploads folder; everything else is reported and left untouched.
 *
 * Collections are scanned generically (products, brands, categories, CMS,
 * and the cover copies in order lines alike), so a new image field needs no
 * change here.
 */
const fs = require('node:fs/promises');
const path = require('node:path');

const LOCAL_UPLOAD_URL = /^(?:https?:\/\/[^/\s?#]+)?\/uploads\/([A-Za-z0-9][A-Za-z0-9._-]{0,200})$/;

/** The file name a local upload URL points to, or null. */
function localUploadFileName(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(LOCAL_UPLOAD_URL);
  if (!match || match[1].includes('..')) return null;
  return match[1];
}

function isPlainContainer(value) {
  if (Array.isArray(value)) return true;
  if (!value || typeof value !== 'object') return false;
  // ObjectId, Decimal128, Binary…: not documents
  if (value._bsontype) return false;
  if (value instanceof Date || Buffer.isBuffer(value)) return false;
  return true;
}

/**
 * Every local-upload reference inside a document, as `$set`-ready dotted
 * paths (array elements included, e.g. `images.1`, `items.0.cover`).
 * @returns {{ path: string, fileName: string, value: string }[]}
 */
function findLocalUploadRefs(doc, prefix = '') {
  const refs = [];
  if (!isPlainContainer(doc)) return refs;
  for (const [key, value] of Object.entries(doc)) {
    if (!prefix && key === '_id') continue;
    const dotted = prefix ? `${prefix}.${key}` : key;
    const fileName = localUploadFileName(value);
    if (fileName) {
      refs.push({ path: dotted, fileName, value });
    } else if (isPlainContainer(value)) {
      refs.push(...findLocalUploadRefs(value, dotted));
    }
  }
  return refs;
}

async function fileExists(filePath) {
  try {
    return (await fs.stat(filePath)).isFile();
  } catch {
    return false;
  }
}

/**
 * @param {object} args
 * @param {import('mongodb').Db} args.db
 * @param {string} args.uploadsDir
 * @param {(fileName: string, buffer: Buffer) => Promise<string>} [args.upload]
 *   stores one file durably and returns its public URL (required with apply)
 * @param {boolean} [args.apply] false (default) = dry run: report only
 * @returns {Promise<object>} report
 */
async function migrateLocalUploads({ db, uploadsDir, upload, apply = false }) {
  if (apply && typeof upload !== 'function') {
    throw new Error('migrateLocalUploads: an upload function is required with apply');
  }

  const report = {
    apply,
    documentsScanned: 0,
    documentsWithRefs: 0,
    references: 0,
    documentsUpdated: 0,
    filesUploaded: 0,
    failed: [],
    byCollection: {},
    missingFiles: [],
  };
  const missing = new Set();
  const urlByFile = new Map();
  const existsCache = new Map();

  const exists = async (fileName) => {
    if (!existsCache.has(fileName)) {
      existsCache.set(fileName, await fileExists(path.join(uploadsDir, fileName)));
    }
    return existsCache.get(fileName);
  };

  const collections = (await db.listCollections({}, { nameOnly: true }).toArray())
    .map((c) => c.name)
    .filter((name) => !name.startsWith('system.'))
    .sort();

  for (const name of collections) {
    const collection = db.collection(name);
    for await (const doc of collection.find({})) {
      report.documentsScanned += 1;
      const refs = findLocalUploadRefs(doc);
      if (refs.length === 0) continue;

      report.documentsWithRefs += 1;
      report.references += refs.length;
      const stats = (report.byCollection[name] ||= { documents: 0, references: 0, paths: {} });
      stats.documents += 1;
      stats.references += refs.length;

      const $set = {};
      const unchanged = {};
      for (const ref of refs) {
        const field = ref.path.replace(/\.\d+(?=\.|$)/g, '.$');
        stats.paths[field] = (stats.paths[field] || 0) + 1;

        if (!(await exists(ref.fileName))) {
          missing.add(ref.fileName);
          continue;
        }
        if (!apply) continue;

        if (!urlByFile.has(ref.fileName)) {
          try {
            const buffer = await fs.readFile(path.join(uploadsDir, ref.fileName));
            urlByFile.set(ref.fileName, await upload(ref.fileName, buffer));
            report.filesUploaded += 1;
          } catch (err) {
            urlByFile.set(ref.fileName, null);
            report.failed.push({ fileName: ref.fileName, error: String(err?.message || err) });
          }
        }
        const url = urlByFile.get(ref.fileName);
        if (!url) continue;
        $set[ref.path] = url;
        unchanged[ref.path] = ref.value;
      }

      if (apply && Object.keys($set).length > 0) {
        // Only if nobody edited those fields meanwhile; a skipped document is
        // picked up by the next run.
        const res = await collection.updateOne({ _id: doc._id, ...unchanged }, { $set });
        if (res.modifiedCount === 1) report.documentsUpdated += 1;
      }
    }
  }

  report.missingFiles = [...missing].sort();
  return report;
}

module.exports = {
  localUploadFileName,
  findLocalUploadRefs,
  migrateLocalUploads,
};
