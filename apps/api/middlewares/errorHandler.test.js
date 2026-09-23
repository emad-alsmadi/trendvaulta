/**
 * Unhandled 5xx faults carry driver/runtime text (collection names, query
 * shapes, host names). In production the body must say nothing beyond
 * "Internal server error"; errors we raised on purpose (AppError) keep their
 * author-written message, and mapped client errors are unaffected.
 */
const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV ||= 'test';
process.env.LOG_LEVEL ||= 'silent';

const { errorHandler } = require('./errorHandler');
const { AppError, NotFoundError } = require('../utils/errors');

const ORIGINAL_ENV = process.env.NODE_ENV;

function capture(err) {
  const sent = {};
  const res = {
    status(code) {
      sent.status = code;
      return this;
    },
    json(body) {
      sent.body = body;
      return this;
    },
  };
  errorHandler(err, { method: 'GET', url: '/api/x', path: '/api/x' }, res, () => {});
  return sent;
}

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_ENV;
});

describe('errorHandler production leakage', () => {
  it('replaces an unexpected 500 message in production', () => {
    process.env.NODE_ENV = 'production';
    const leak = new Error(
      'E QUERY failed on db trendvaulta_prod collection users near host 10.0.0.4',
    );
    const sent = capture(leak);
    assert.equal(sent.status, 500);
    assert.equal(sent.body.message, 'Internal server error');
    assert.equal(sent.body.code, 'INTERNAL_ERROR');
    assert.equal(sent.body.stack, undefined);
    assert.ok(!JSON.stringify(sent.body).includes('trendvaulta_prod'));
    assert.ok(!JSON.stringify(sent.body).includes('10.0.0.4'));
  });

  it('keeps a deliberate AppError message at 5xx in production', () => {
    process.env.NODE_ENV = 'production';
    const sent = capture(new AppError('Payment provider unavailable', 503, 'STRIPE_DOWN'));
    assert.equal(sent.status, 503);
    assert.equal(sent.body.message, 'Payment provider unavailable');
    assert.equal(sent.body.code, 'STRIPE_DOWN');
  });

  it('leaves mapped client errors alone in production', () => {
    process.env.NODE_ENV = 'production';
    const cast = new Error('Cast to ObjectId failed');
    cast.name = 'CastError';
    const sent = capture(cast);
    assert.equal(sent.status, 400);
    assert.equal(sent.body.message, 'Invalid ID format');

    const notFound = capture(new NotFoundError('Product'));
    assert.equal(notFound.status, 404);
    assert.equal(notFound.body.message, 'Product not found');
  });

  it('keeps the raw message outside production for debugging', () => {
    process.env.NODE_ENV = 'development';
    const sent = capture(new Error('boom in aggregate stage 3'));
    assert.equal(sent.status, 500);
    assert.equal(sent.body.message, 'boom in aggregate stage 3');
  });
});
