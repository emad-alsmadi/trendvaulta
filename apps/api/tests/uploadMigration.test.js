/**
 * Local uploads → durable storage migration (P0-07, utils/uploadMigration.js).
 * Real in-memory MongoDB, a temporary uploads folder and a fake uploader.
 */
const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { mongoose, connectDb, disconnectDb, clearDb, dbIt } = require('./setup');
const {
  localUploadFileName,
  findLocalUploadRefs,
  migrateLocalUploads,
} = require('../utils/uploadMigration');

const A = '48c18e12-6691-43fa-a6cf-0e4f63814d95.png';
const B = 'f63134d2-d51c-475e-a4f6-76c2e4252a97.jpg';
const GONE = '00000000-0000-4000-8000-000000000000.png';
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

const local = (file, origin = 'http://localhost:3000') => `${origin}/uploads/${file}`;
const cdn = (file) => `https://res.cloudinary.com/demo/image/upload/v1/trendvaulta/${file}`;

describe('localUploadFileName', () => {
  it('recognises local upload URLs from any API origin, and bare paths', () => {
    assert.equal(localUploadFileName(local(A)), A);
    assert.equal(localUploadFileName(local(A, 'https://trendvaulta-api.onrender.com')), A);
    assert.equal(localUploadFileName(`/uploads/${A}`), A);
  });

  it('ignores everything else', () => {
    for (const value of [
      cdn(A),
      'https://example.com/images/uploads.png',
      `${local(A)}?w=200`,
      '/uploads/../.env',
      '/uploads/',
      42,
      null,
    ]) {
      assert.equal(localUploadFileName(value), null, String(value));
    }
  });
});

describe('findLocalUploadRefs', () => {
  it('returns $set-ready paths through nested objects and arrays', () => {
    const refs = findLocalUploadRefs({
      _id: 'x',
      cover: local(A),
      images: [cdn(A), local(B)],
      hero: { slides: [{ image: `/uploads/${A}` }] },
      title: 'no image',
    });
    assert.deepEqual(
      refs.map((r) => [r.path, r.fileName]),
      [
        ['cover', A],
        ['images.1', B],
        ['hero.slides.0.image', A],
      ],
    );
  });
});

describe('migrateLocalUploads', () => {
  let uploadsDir;
  let uploads;
  const upload = async (fileName) => {
    uploads.push(fileName);
    return cdn(fileName);
  };
  const db = () => mongoose.connection.db;

  before(async () => {
    await connectDb();
    uploadsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tv-uploads-'));
    await fs.writeFile(path.join(uploadsDir, A), PNG);
    await fs.writeFile(path.join(uploadsDir, B), PNG);
  });
  after(async () => {
    await fs.rm(uploadsDir, { recursive: true, force: true });
    await disconnectDb();
  });
  beforeEach(async () => {
    await clearDb();
    // clearDb only empties collections that belong to a Mongoose model; the
    // migration scans every collection, so empty the raw ones too.
    if (mongoose.connection.readyState === 1) {
      for (const { name } of await db().listCollections({}, { nameOnly: true }).toArray()) {
        await db().collection(name).deleteMany({});
      }
    }
    uploads = [];
  });

  async function seed() {
    await db().collection('products').insertOne({
      title: 'Linen Shirt',
      cover: local(A),
      images: [local(A), local(B), cdn('already.png')],
    });
    await db().collection('brands').insertOne({ name: 'Aurelia', logo: local(GONE) });
    await db().collection('orders').insertOne({ items: [{ title: 'Linen Shirt', cover: local(A) }] });
    await db().collection('storefrontmodules').insertOne({
      key: 'hero',
      config: { slides: [{ image: `/uploads/${B}` }] },
    });
  }

  dbIt('a dry run reports every reference and missing file, and changes nothing', async () => {
    await seed();
    const before = await db().collection('products').findOne({});

    const report = await migrateLocalUploads({ db: db(), uploadsDir, upload });

    assert.equal(report.apply, false);
    assert.equal(report.references, 6);
    assert.equal(report.documentsWithRefs, 4);
    assert.deepEqual(report.byCollection.products.paths, { cover: 1, 'images.$': 2 });
    assert.deepEqual(report.byCollection.orders.paths, { 'items.$.cover': 1 });
    assert.deepEqual(report.missingFiles, [GONE]);
    assert.deepEqual(uploads, []);
    assert.deepEqual(await db().collection('products').findOne({}), before);
  });

  dbIt('apply uploads each file once and rewrites every reference to it', async () => {
    await seed();

    const report = await migrateLocalUploads({ db: db(), uploadsDir, upload, apply: true });

    assert.deepEqual(uploads.sort(), [A, B].sort());
    assert.equal(report.filesUploaded, 2);
    assert.equal(report.documentsUpdated, 3);

    const product = await db().collection('products').findOne({});
    assert.equal(product.cover, cdn(A));
    assert.deepEqual(product.images, [cdn(A), cdn(B), cdn('already.png')]);
    assert.equal((await db().collection('orders').findOne({})).items[0].cover, cdn(A));
    assert.equal(
      (await db().collection('storefrontmodules').findOne({})).config.slides[0].image,
      cdn(B),
    );
    // A file that is not on disk is never rewritten
    assert.equal((await db().collection('brands').findOne({})).logo, local(GONE));
  });

  dbIt('is safe to re-run: the second run finds nothing left to move', async () => {
    await seed();
    await migrateLocalUploads({ db: db(), uploadsDir, upload, apply: true });
    uploads = [];

    const again = await migrateLocalUploads({ db: db(), uploadsDir, upload, apply: true });

    assert.deepEqual(uploads, []);
    assert.equal(again.documentsUpdated, 0);
    assert.equal(again.references, 1, 'only the missing brand logo remains');
  });

  dbIt('keeps going when one upload fails, and leaves that file’s references alone', async () => {
    await seed();
    const flaky = async (fileName) => {
      if (fileName === B) throw new Error('Cloudinary 500');
      return cdn(fileName);
    };

    const report = await migrateLocalUploads({ db: db(), uploadsDir, upload: flaky, apply: true });

    assert.deepEqual(report.failed, [{ fileName: B, error: 'Cloudinary 500' }]);
    const product = await db().collection('products').findOne({});
    assert.equal(product.cover, cdn(A));
    assert.equal(product.images[1], local(B));
  });

  it('refuses apply without an uploader', async () => {
    await assert.rejects(
      migrateLocalUploads({ db: {}, uploadsDir: '.', apply: true }),
      /upload function is required/,
    );
  });
});
