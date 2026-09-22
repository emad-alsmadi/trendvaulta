/**
 * Regression test for middlewares/requestLogger.js.
 *
 * pino-http invokes its hooks as customLogLevel(req, res, err),
 * customSuccessMessage(req, res, responseTime), customErrorMessage(req, res,
 * err) and customProps(req, res). The response-finish hooks must therefore
 * not assume their first argument is the response, otherwise every request
 * ends in an uncaught TypeError. The integration suites stub this middleware
 * out (see tests/setup.js); this test runs the real one.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const net = require('node:net');

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL ||= 'silent';

const requestLogger = require('../middlewares/requestLogger');

function fakeExchange({ method = 'GET', url = '/api/trendvaulta', statusCode = 200 } = {}) {
  const socket = new net.Socket();
  const req = new http.IncomingMessage(socket);
  req.method = method;
  req.url = url;
  req.headers = { 'user-agent': 'node:test', 'content-type': 'application/json' };
  const res = new http.ServerResponse(req);
  res.statusCode = statusCode;
  res.req = req;
  return { req, res, socket };
}

describe('requestLogger middleware', () => {
  it('does not throw when a successful response finishes', () => {
    const { req, res, socket } = fakeExchange({ statusCode: 200 });
    let nextCalled = false;
    requestLogger(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);
    assert.ok(req.id, 'request id is assigned');

    // pino-http runs its finish hooks synchronously from this event
    assert.doesNotThrow(() => res.emit('finish'));
    socket.destroy();
  });

  it('does not throw when an error response finishes', () => {
    const { req, res, socket } = fakeExchange({ statusCode: 500 });
    requestLogger(req, res, () => {});
    assert.doesNotThrow(() => res.emit('finish'));
    socket.destroy();
  });
});
