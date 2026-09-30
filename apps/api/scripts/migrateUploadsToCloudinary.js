#!/usr/bin/env node
/**
 * Move images from apps/api/uploads to Cloudinary and rewrite every database
 * reference to them (see utils/uploadMigration.js).
 *
 *   node scripts/migrateUploadsToCloudinary.js           # dry run: report only
 *   node scripts/migrateUploadsToCloudinary.js --apply   # upload + rewrite
 *
 * Run it on a machine that still has the uploads folder, with MONGO_URL (and
 * DB_NAME) pointing at the database to fix and the CLOUDINARY_* credentials
 * set. It is safe to re-run: each file is uploaded under its own UUID with
 * overwriting off, so a second upload returns the existing asset, and
 * already-rewritten references no longer match.
 *
 * Options: --uploads-dir <path> (default apps/api/uploads)
 */
require('dotenv').config();
const path = require('node:path');
const mongoose = require('mongoose');
const { connectToDB } = require('../config/db');
const {
  UPLOADS_DIR,
  MIME_EXTENSIONS,
  matchesImageSignature,
  uploadToCloudinary,
} = require('../services/storage.service');
const { migrateLocalUploads } = require('../utils/uploadMigration');

const MIME_BY_EXTENSION = Object.fromEntries(
  Object.entries(MIME_EXTENSIONS).map(([mime, ext]) => [ext, mime]),
);
MIME_BY_EXTENSION.jpeg = 'image/jpeg';

function parseArgs(argv) {
  const args = { apply: false, uploadsDir: UPLOADS_DIR };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--apply') args.apply = true;
    else if (argv[i] === '--uploads-dir') args.uploadsDir = path.resolve(argv[(i += 1)]);
    else throw new Error(`Unknown option: ${argv[i]}`);
  }
  return args;
}

/** Upload one local file, refusing anything that isn't really an image. */
async function uploadFile(fileName, buffer) {
  const ext = path.extname(fileName).slice(1).toLowerCase();
  const mimeType = MIME_BY_EXTENSION[ext];
  if (!mimeType || !matchesImageSignature(buffer, mimeType)) {
    throw new Error(`not a ${ext || 'known'} image; skipped`);
  }
  const publicId = path.basename(fileName, path.extname(fileName));
  const { url } = await uploadToCloudinary(buffer, { originalName: fileName, mimeType }, { publicId });
  return url;
}

async function main() {
  const { apply, uploadsDir } = parseArgs(process.argv.slice(2));
  if (apply) {
    const missing = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'].filter(
      (name) => !process.env[name]?.trim(),
    );
    if (missing.length) throw new Error(`--apply needs ${missing.join(', ')}`);
  }

  await connectToDB();
  const dbName = mongoose.connection.db.databaseName;
  console.log(`${apply ? 'APPLY' : 'DRY RUN'}: database "${dbName}", uploads ${uploadsDir}\n`);

  const report = await migrateLocalUploads({
    db: mongoose.connection.db,
    uploadsDir,
    upload: uploadFile,
    apply,
  });

  for (const [name, stats] of Object.entries(report.byCollection)) {
    console.log(`${name}: ${stats.references} reference(s) in ${stats.documents} document(s)`);
    for (const [field, count] of Object.entries(stats.paths)) console.log(`    ${field}  ×${count}`);
  }
  console.log(
    `\nScanned ${report.documentsScanned} documents; ${report.references} local image reference(s) in ${report.documentsWithRefs}.`,
  );
  if (report.missingFiles.length) {
    console.log(
      `${report.missingFiles.length} referenced file(s) are not in the uploads folder and stay as they are:\n  ${report.missingFiles.join('\n  ')}`,
    );
  }
  if (apply) {
    console.log(`Uploaded ${report.filesUploaded} file(s); updated ${report.documentsUpdated} document(s).`);
    for (const f of report.failed) console.log(`  FAILED ${f.fileName}: ${f.error}`);
  } else {
    console.log('Nothing was changed. Re-run with --apply to upload and rewrite.');
  }
  return report.failed.length ? 1 : 0;
}

main()
  .then(async (code) => {
    await mongoose.disconnect();
    process.exit(code);
  })
  .catch(async (err) => {
    console.error(err.message || err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
