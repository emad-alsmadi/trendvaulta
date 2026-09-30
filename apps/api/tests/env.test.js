/**
 * Boot-time environment validation (config/env.js), including the
 * production rule that images must go to durable storage (P0-07).
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { validateEnv } = require('../config/env');

const CLOUDINARY = {
  STORAGE_DRIVER: 'cloudinary',
  CLOUDINARY_CLOUD_NAME: 'demo',
  CLOUDINARY_API_KEY: 'key',
  CLOUDINARY_API_SECRET: 'secret',
};

function productionEnv(overrides = {}) {
  return {
    NODE_ENV: 'production',
    MONGO_URL: 'mongodb://db.example/trendvaulta',
    JWT_SECRET_KEY: 'x'.repeat(32),
    FRONTEND_URL: 'https://shop.example',
    SMTP_HOST: 'smtp.example',
    ...CLOUDINARY,
    ...overrides,
  };
}

/** validateEnv logs warnings to the console; keep test output clean. */
function quietly(fn) {
  const warn = console.warn;
  console.warn = () => {};
  try {
    return fn();
  } finally {
    console.warn = warn;
  }
}

function problemsOf(env) {
  try {
    quietly(() => validateEnv(env));
    return [];
  } catch (err) {
    assert.equal(err.code, 'ENV_INVALID');
    return err.message.split('\n - ').slice(1);
  }
}

describe('validateEnv: storage', () => {
  it('accepts a complete production config on Cloudinary', () => {
    assert.deepEqual(problemsOf(productionEnv()), []);
  });

  it('refuses local storage in production, whether explicit or by default', () => {
    for (const driver of ['local', undefined]) {
      const env = productionEnv({ STORAGE_DRIVER: driver });
      const problems = problemsOf(env);
      assert.equal(problems.length, 1, String(driver));
      assert.match(problems[0], /STORAGE_DRIVER=cloudinary is required in production/);
      assert.match(problems[0], /ALLOW_LOCAL_STORAGE=true/);
    }
  });

  it('allows local storage in production only with the explicit opt-out, and warns', () => {
    const env = productionEnv({ STORAGE_DRIVER: 'local', ALLOW_LOCAL_STORAGE: 'true' });
    const { warnings } = quietly(() => validateEnv(env));
    assert.ok(warnings.some((w) => /persistent volume/.test(w)));
    // Any other value is not an opt-out
    assert.equal(
      problemsOf(productionEnv({ STORAGE_DRIVER: 'local', ALLOW_LOCAL_STORAGE: '1' })).length,
      1,
    );
  });

  it('keeps local storage the silent default outside production', () => {
    for (const NODE_ENV of ['development', 'test']) {
      const { warnings } = quietly(() =>
        validateEnv({ NODE_ENV, MONGO_URL: 'mongodb://localhost', JWT_SECRET_KEY: 'dev' }),
      );
      assert.equal(warnings.some((w) => /STORAGE_DRIVER/.test(w)), false, NODE_ENV);
    }
  });

  it('still requires every Cloudinary credential when the driver is cloudinary', () => {
    const problems = problemsOf(productionEnv({ CLOUDINARY_API_SECRET: '' }));
    assert.deepEqual(problems, ['CLOUDINARY_API_SECRET is required when STORAGE_DRIVER=cloudinary']);
  });

  it('rejects an unknown driver', () => {
    assert.match(problemsOf(productionEnv({ STORAGE_DRIVER: 's3' }))[0], /must be "local" or "cloudinary"/);
  });
});
