const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

/**
 * Liveness — no DB required.
 * @route GET /api/trendvaulta
 */
router.get('/trendvaulta', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'trendvaulta-api',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Readiness — Mongo connection must be ready.
 * @route GET /api/ready
 */
router.get('/ready', (_req, res) => {
  const ready = mongoose.connection.readyState === 1;
  if (!ready) {
    return res.status(503).json({
      status: 'not_ready',
      service: 'trendvaulta-api',
      db: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
  return res.status(200).json({
    status: 'ready',
    service: 'trendvaulta-api',
    db: 'connected',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
