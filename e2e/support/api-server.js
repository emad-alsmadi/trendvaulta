/**
 * E2E API: the real apps/api on a throwaway in-memory MongoDB, seeded with a
 * small catalogue, a staff account and one contact message. It never reads
 * a developer database and never sends mail (mail and Stripe are off).
 *
 * Started by playwright.config.ts (webServer); stops with the test run.
 */
const { createRequire } = require('node:module');
const { spawn } = require('node:child_process');
const path = require('node:path');

const apiDir = path.resolve(__dirname, '../../apps/api');
const req = createRequire(path.join(apiDir, 'package.json'));
const { MongoMemoryServer } = req('mongodb-memory-server');
const mongoose = req('mongoose');
const bcrypt = req('bcryptjs');

const { E2E, PORTS } = require('./env');

async function seed(db) {
  const now = new Date();
  await db.collection('users').insertOne({
    email: E2E.adminEmail,
    username: 'e2e-admin',
    password: await bcrypt.hash(E2E.adminPassword, 10),
    roles: ['admin'],
    createdAt: now,
    updatedAt: now,
  });
  const brand = await db.collection('brands').insertOne({
    name: 'Aurelia',
    slug: 'aurelia',
    description: 'E2E brand',
    logo: '',
    isActive: true,
    featured: true,
    createdAt: now,
    updatedAt: now,
  });
  await db.collection('products').insertMany(
    E2E.products.map((p, i) => ({
      title: p.title,
      description: `${p.title} for end-to-end tests`,
      brand: brand.insertedId,
      price: p.price,
      basePrice: p.price,
      cover: '',
      images: [],
      category: 'makeup',
      subcategory: 'lipstick',
      stock: 10,
      variants: [],
      isActive: true,
      featured: i === 0,
      averageRating: 0,
      reviewCount: 0,
      salesCount: 0,
      createdAt: now,
      updatedAt: now,
    })),
  );
  await db.collection('contactmessages').insertOne({
    name: 'Grace Hopper',
    email: 'grace@example.com',
    subject: E2E.messageSubject,
    message: 'I ordered last week and still have no tracking number.',
    status: 'new',
    staffNote: '',
    handledBy: null,
    handledAt: null,
    ip: '',
    createdAt: now,
    updatedAt: now,
  });
}

(async () => {
  const mem = await MongoMemoryServer.create();
  const uri = mem.getUri();
  await mongoose.connect(uri, { dbName: 'e2e' });
  await seed(mongoose.connection.db);
  await mongoose.disconnect();

  const child = spawn(process.execPath, ['app.js'], {
    cwd: apiDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: String(PORTS.api),
      MONGO_URL: uri,
      DB_NAME: 'e2e',
      JWT_SECRET_KEY: 'e2e-secret-not-for-production-0123456789',
      FRONTEND_URL: `http://localhost:${PORTS.website}`,
      DASHBOARD_URL: `http://localhost:${PORTS.dashboard}`,
      CHECKOUT_RECONCILE_INTERVAL_MS: '0',
      // Blank, not deleted: app.js loads dotenv, which only fills absent keys
      STRIPE_SECRET_KEY: '',
      STRIPE_WEBHOOK_SECRET: '',
      SMTP_HOST: '',
      SMTP_USER: '',
      EMAIL_USER: '',
      EMAIL_PASSWORD: '',
      STORAGE_DRIVER: 'local',
      RATE_LIMIT_AUTH_MAX: '1000',
    },
  });

  const stop = async () => {
    child.kill();
    await mem.stop().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  child.on('exit', async (code) => {
    await mem.stop().catch(() => {});
    process.exit(code ?? 0);
  });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
