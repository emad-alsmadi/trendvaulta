const express = require('express');
const path = require('node:path');
const helmet = require('helmet');
const requestLogger = require('./middlewares/requestLogger');
const cors = require('cors');
require('dotenv').config();
const { connectToDB } = require('./config/db');
const { createCorsOriginDelegate } = require('./middlewares/corsAllowlist');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const { validateEnv } = require('./config/env');
const logger = require('./utils/logger');
const mongoose = require('mongoose');

const paymentController = require('./controllers/payment.controller');

// Init App
const app = express();

// Behind a single reverse proxy (Render/Nginx): trust exactly one hop so
// req.ip reflects the client and cannot be spoofed via X-Forwarded-For.
app.set('trust proxy', 1);

app.post(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  paymentController.stripeWebhook,
);

app.use(express.json());

app.use(
  cors({
    origin: createCorsOriginDelegate(),
    credentials: true,
  }),
);

// Baseline security headers (CSP disabled: this process serves JSON only,
// no HTML views, so a content policy has nothing to protect and would only
// risk breaking Swagger/API-doc tooling if added later).
app.use(helmet({ contentSecurityPolicy: false }));

// Apply request logging middleware
app.use(requestLogger);

// Locally-stored product/brand upload images (see services/storage.service.js).
// Files are content-addressed by uuid, so a hard, long-lived cache is safe.
// `index: false` prevents directory-listing disclosure of the uploads folder.
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), {
    index: false,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    },
  }),
);

//Routers
app.use('/api/', require('./routes/uploads'));
app.use('/api/', require('./routes/products'));
app.use('/api/', require('./routes/productQA'));
app.use('/api/', require('./routes/bundles'));
app.use('/api/', require('./routes/brands'));
app.use('/api/', require('./routes/auth'));
app.use('/api/', require('./routes/profile'));
app.use('/api/', require('./routes/users'));
app.use('/api/', require('./routes/password'));
app.use('/api/', require('./routes/orders'));
app.use('/api/', require('./routes/payments'));
app.use('/api/', require('./routes/wishlist'));
app.use('/api/', require('./routes/recentlyViewed'));
app.use('/api/', require('./routes/reviews'));
app.use('/api/', require('./routes/coupons'));
app.use('/api/', require('./routes/recommendations'));
app.use('/api/', require('./routes/offers'));
app.use('/api/', require('./routes/giftFinder'));
app.use('/api/', require('./routes/lookbooks'));
app.use('/api/', require('./routes/storefrontTrust'));
app.use('/api/', require('./routes/storefrontCategories'));
app.use('/api/', require('./routes/storefrontTestimonials'));
app.use('/api/', require('./routes/storefrontWhyChooseUs'));
app.use('/api/', require('./routes/storefrontHome'));
app.use('/api/', require('./routes/storefrontModules'));
app.use('/api/', require('./routes/helpTopics'));
app.use('/api/', require('./routes/content'));
app.use('/api/', require('./routes/adminStats'));
app.use('/api/', require('./routes/settings'));
app.use('/api/', require('./routes/newsletter'));
app.use('/api/', require('./routes/contact'));
app.use('/api/', require('./routes/trendvaulta'));

// Friendly roots (this process is API-only; the Next.js app is a separate server)
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'TrendVaulta API',
    message:
      'This is the backend only. Open your Next.js frontend (usually another port) for the website.',
    apiOverview: '/api/',
    tip: 'If the frontend also tries to use port 3000, set PORT=5000 in backend/.env or change NEXT_PUBLIC_API_URL on the frontend.',
  });
});

app.get('/favicon.ico', (_req, res) => {
  res.status(204).end();
});

app.get('/api/', (_req, res) => {
  res.status(200).json({
    service: 'TrendVaulta REST API',
    examples: [
      'GET /api/products',
      'GET /api/brands',
      'POST /api/auth/login',
      'GET /api/orders/my',
      'POST /api/payments/quote',
      'POST /api/payments/checkout-session',
    ],
  });
});

app.get('/api/trendvaulta', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'trendvaulta-api',
    timestamp: new Date().toISOString(),
  });
});

//Error Handler Middlewares
app.use(notFoundHandler);

// The CORS delegate rejects with a plain Error; answer 403 instead of 500.
app.use((err, _req, res, next) => {
  if (err && String(err.message || '').startsWith('CORS blocked')) {
    return res.status(403).json({
      success: false,
      message: 'Origin not allowed',
      code: 'CORS_BLOCKED',
    });
  }
  return next(err);
});

app.use(errorHandler);

// Running Server
const port = process.env.PORT || 3000;

// How long to let in-flight requests finish before forcing the process down.
const SHUTDOWN_GRACE_MS = Number(process.env.SHUTDOWN_GRACE_MS) || 10_000;

/**
 * Close the HTTP server (stop accepting new connections, let in-flight
 * requests finish), then the Mongo connection. A hard timeout guarantees the
 * process still exits if a socket refuses to drain — otherwise the platform
 * (Render/Docker) SIGKILLs us mid-request anyway.
 */
function registerGracefulShutdown(server) {
  let shuttingDown = false;

  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received — shutting down gracefully`);

    const force = setTimeout(() => {
      logger.error('Graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, SHUTDOWN_GRACE_MS);
    // Don't let the timer itself keep the event loop alive.
    force.unref();

    try {
      await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
      await mongoose.connection.close(false);
      logger.info('Shutdown complete');
      clearTimeout(force);
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
      clearTimeout(force);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  // A rejected promise nobody handled leaves the process in an unknown
  // state; log it with full context and restart rather than limping on.
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled promise rejection');
    void shutdown('unhandledRejection');
  });

  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception');
    void shutdown('uncaughtException');
  });
}

async function start() {
  try {
    validateEnv();
    // function Connnection To Database
    await connectToDB();

    const server = app.listen(port, () => {
      logger.info(
        `Server is running in ${process.env.NODE_ENV} mode on port ${port}`,
      );
    });

    registerGracefulShutdown(server);
  } catch (err) {
    logger.error(
      { err },
      'Fatal: server failed to start (invalid environment or database unreachable)',
    );
    process.exit(1);
  }
}

// Only boot when executed directly (node app.js); tests require() the app
// to verify it loads without opening a port or touching the database.
if (require.main === module) {
  start();
}

module.exports = app;
