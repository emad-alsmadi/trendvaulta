/**
 * Boot-time environment validation.
 *
 * Several protections in this API are gated on NODE_ENV === 'production'
 * (CORS allowlist, TLS verification for SMTP, hiding reset links / error
 * details). Failing fast on a missing variable is far cheaper than shipping
 * a server that silently runs in development mode.
 */
const ALWAYS_REQUIRED = ['MONGO_URL', 'JWT_SECRET_KEY'];
const PRODUCTION_REQUIRED = ['FRONTEND_URL'];
const KNOWN_ENVS = ['development', 'test', 'production'];

function isSet(name, env) {
  return typeof env[name] === 'string' && env[name].trim().length > 0;
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{ nodeEnv: string, warnings: string[] }}
 * @throws {Error} listing every missing/invalid variable
 */
function validateEnv(env = process.env) {
  const problems = [];
  const warnings = [];

  const nodeEnv = (env.NODE_ENV || '').trim();
  if (!nodeEnv) {
    warnings.push(
      'NODE_ENV is not set; defaulting to "development" (relaxed CORS, TLS checks off, reset links echoed).',
    );
    env.NODE_ENV = 'development';
  } else if (!KNOWN_ENVS.includes(nodeEnv)) {
    problems.push(
      `NODE_ENV must be one of ${KNOWN_ENVS.join(', ')} (got "${nodeEnv}")`,
    );
  }

  const production = env.NODE_ENV === 'production';

  for (const name of ALWAYS_REQUIRED) {
    if (!isSet(name, env)) problems.push(`${name} is required`);
  }

  const driver = (env.STORAGE_DRIVER || 'local').trim().toLowerCase();
  if (!['local', 'cloudinary'].includes(driver)) {
    problems.push(`STORAGE_DRIVER must be "local" or "cloudinary" (got "${driver}")`);
  } else if (driver === 'cloudinary') {
    for (const name of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) {
      if (!isSet(name, env)) problems.push(`${name} is required when STORAGE_DRIVER=cloudinary`);
    }
  } else if (production) {
    warnings.push(
      'STORAGE_DRIVER is local: uploaded images live on this server\'s disk and are lost on redeploy unless apps/api/uploads is a persistent volume.',
    );
  }

  if (production) {
    for (const name of PRODUCTION_REQUIRED) {
      if (!isSet(name, env)) problems.push(`${name} is required in production`);
    }
    if (isSet('JWT_SECRET_KEY', env) && env.JWT_SECRET_KEY.trim().length < 32) {
      problems.push('JWT_SECRET_KEY must be at least 32 characters in production');
    }
    if (isSet('STRIPE_SECRET_KEY', env) && !isSet('STRIPE_WEBHOOK_SECRET', env)) {
      problems.push(
        'STRIPE_WEBHOOK_SECRET is required when STRIPE_SECRET_KEY is set (payments would never be confirmed)',
      );
    }
    if (env.CORS_RELAXED === 'true') {
      problems.push('CORS_RELAXED=true is not allowed in production');
    }
    for (const flag of ['DEV_ALLOW_DIRECT_ORDERS', 'ALLOW_DIRECT_ORDERS']) {
      if (env[flag] === 'true') {
        problems.push(`${flag}=true is not allowed in production`);
      }
    }
    if (!isSet('SMTP_HOST', env) && !isSet('EMAIL_USER', env)) {
      warnings.push(
        'No SMTP_* or EMAIL_* configured: password reset and order confirmation emails will fail.',
      );
    }
  }

  if (problems.length > 0) {
    const err = new Error(
      `Invalid environment configuration:\n - ${problems.join('\n - ')}`,
    );
    err.code = 'ENV_INVALID';
    throw err;
  }

  for (const w of warnings) console.warn(`[env] ${w}`);
  return { nodeEnv: env.NODE_ENV, warnings };
}

module.exports = { validateEnv, ALWAYS_REQUIRED, PRODUCTION_REQUIRED };
