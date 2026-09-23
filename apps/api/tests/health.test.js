/**
 * The platform health check must answer without auth or rate limiting, and
 * must report 503 (not 200) while Mongo is down so a rolling deploy does not
 * route traffic to an instance that cannot serve a single query.
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { app, mongoose, connectDb, disconnectDb, dbIt } = require('./setup');

describe('GET /health', () => {
  it('reports 503 and db:disconnected while Mongo is not connected', async () => {
    // readyState 0 = disconnected. The suite has not called connectDb yet.
    assert.equal(mongoose.connection.readyState, 0);
    const res = await request(app).get('/health');
    assert.equal(res.status, 503);
    assert.equal(res.body.status, 'degraded');
    assert.equal(res.body.db, 'disconnected');
    assert.equal(typeof res.body.uptime, 'number');
  });
});

describe('GET /health (connected)', () => {
  before(connectDb);
  after(disconnectDb);

  dbIt('reports 200 and db:connected once Mongo is up', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.db, 'connected');
  });

  dbIt('is not behind the auth middleware', async () => {
    const res = await request(app).get('/health').set('Authorization', '');
    assert.equal(res.status, 200);
  });
});
