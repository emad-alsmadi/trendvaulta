const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parsePagination } = require('./pagination');

describe('parsePagination', () => {
  it('applies defaults when page/limit are missing', () => {
    const { page, limit, skip } = parsePagination({});
    assert.equal(page, 1);
    assert.equal(limit, 20);
    assert.equal(skip, 0);
  });

  it('uses a caller-supplied defaultLimit', () => {
    const { limit } = parsePagination({}, { defaultLimit: 12 });
    assert.equal(limit, 12);
  });

  it('clamps limit to maxLimit — the actual fix for the unbounded product list bug', () => {
    const { limit } = parsePagination({ limit: '999999' }, { maxLimit: 100 });
    assert.equal(limit, 100);
  });

  it('clamps limit to at least 1 even for zero/negative input', () => {
    assert.equal(parsePagination({ limit: '0' }).limit, 1);
    assert.equal(parsePagination({ limit: '-5' }).limit, 1);
  });

  it('clamps page to at least 1 even for zero/negative/garbage input', () => {
    assert.equal(parsePagination({ page: '0' }).page, 1);
    assert.equal(parsePagination({ page: '-3' }).page, 1);
    assert.equal(parsePagination({ page: 'abc' }).page, 1);
  });

  it('falls back to the default limit for non-numeric input', () => {
    const { limit } = parsePagination({ limit: 'abc' }, { defaultLimit: 12 });
    assert.equal(limit, 12);
  });

  it('computes skip from page and limit', () => {
    const { skip } = parsePagination({ page: '3', limit: '10' });
    assert.equal(skip, 20);
  });

  it('honors valid page/limit within bounds', () => {
    const { page, limit, skip } = parsePagination({ page: '2', limit: '25' }, { maxLimit: 100 });
    assert.equal(page, 2);
    assert.equal(limit, 25);
    assert.equal(skip, 25);
  });
});
