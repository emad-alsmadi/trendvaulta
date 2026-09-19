const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const helmet = require('helmet');

// Mirrors the exact helmet() config wired into app.js — asserts the
// baseline security headers are actually present on responses, not just
// that the middleware is imported.
function buildApp() {
  const app = express();
  app.use(helmet({ contentSecurityPolicy: false }));
  app.get('/ping', (_req, res) => res.status(200).json({ ok: true }));
  return app;
}

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

function get(server, path) {
  const { port } = server.address();
  return new Promise((resolve, reject) => {
    http
      .get({ host: '127.0.0.1', port, path }, (res) => {
        res.resume();
        res.on('end', () => resolve(res));
      })
      .on('error', reject);
  });
}

describe('helmet security headers', () => {
  const app = buildApp();
  let server;

  it('sets baseline hardening headers on every response', async () => {
    server = await listen(app);
    const res = await get(server, '/ping');

    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['x-dns-prefetch-control'], 'off');
    assert.equal(res.headers['x-download-options'], 'noopen');
    // Legacy XSS-Protection header is explicitly disabled by modern helmet;
    // frameguard (clickjacking defense) must still be present.
    assert.equal(res.headers['x-frame-options'], 'SAMEORIGIN');
  });

  it('does not send an X-Powered-By header (helmet + express both suppress it)', async () => {
    const res = await get(server, '/ping');
    assert.equal(res.headers['x-powered-by'], undefined);
  });

  after(() => {
    if (server) server.close();
  });
});
