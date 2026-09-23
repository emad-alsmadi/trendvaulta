/**
 * buildSort is the only thing standing between a query string and a Mongo
 * sort object, so it carries the whole allow-list guarantee.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { buildSort } = require('./sort');

const ALLOWED = ['createdAt', 'totalPrice', 'status'];

describe('buildSort', () => {
  it('sorts by an allowed field, descending unless asc is asked for', () => {
    assert.deepEqual(buildSort('totalPrice', 'desc', ALLOWED), {
      totalPrice: -1,
      _id: -1,
    });
    assert.deepEqual(buildSort('totalPrice', 'asc', ALLOWED), {
      totalPrice: 1,
      _id: 1,
    });
  });

  it('breaks ties on _id so paging cannot repeat or skip a document', () => {
    const sort = buildSort('status', 'asc', ALLOWED);
    assert.deepEqual(Object.keys(sort), ['status', '_id']);
  });

  it('does not double up when sorting by _id itself', () => {
    assert.deepEqual(buildSort('_id', 'asc', ['_id']), { _id: 1 });
  });

  it('falls back when the field is absent, empty or not allowed', () => {
    const fallback = { createdAt: -1 };
    assert.deepEqual(buildSort(undefined, 'asc', ALLOWED), fallback);
    assert.deepEqual(buildSort('', 'asc', ALLOWED), fallback);
    assert.deepEqual(buildSort('   ', 'asc', ALLOWED), fallback);
    assert.deepEqual(buildSort('password', 'asc', ALLOWED), fallback);
    assert.deepEqual(buildSort('user.email', 'asc', ALLOWED), fallback);
  });

  it('rejects operator-shaped and non-string keys rather than passing them through', () => {
    const fallback = { createdAt: -1 };
    assert.deepEqual(buildSort('$where', 'asc', ALLOWED), fallback);
    assert.deepEqual(buildSort({ $ne: 1 }, 'asc', ALLOWED), fallback);
    assert.deepEqual(buildSort(['createdAt'], 'asc', ALLOWED), fallback);
    assert.deepEqual(buildSort(42, 'asc', ALLOWED), fallback);
  });

  it('treats any order but asc as descending', () => {
    for (const order of [undefined, 'nonsense', 'DESC', null, 1]) {
      assert.equal(buildSort('status', order, ALLOWED).status, -1);
    }
    // ...and is case-insensitive about asc.
    assert.equal(buildSort('status', 'ASC', ALLOWED).status, 1);
  });

  it('honours a caller-supplied fallback', () => {
    assert.deepEqual(buildSort('nope', 'asc', ALLOWED, { name: 1 }), { name: 1 });
  });

  it('returns a fresh object so a caller cannot mutate the shared fallback', () => {
    const fallback = { createdAt: -1 };
    const first = buildSort('nope', 'asc', ALLOWED, fallback);
    first.createdAt = 1;
    assert.equal(buildSort('nope', 'asc', ALLOWED, fallback).createdAt, -1);
  });
});
