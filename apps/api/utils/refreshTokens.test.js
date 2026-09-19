const { describe, it, mock } = require('node:test');
const assert = require('node:assert/strict');
const {
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
} = require('./refreshTokens');

function makeDoc(overrides = {}) {
  return {
    user: 'user-1',
    tokenHash: 'hash-old',
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    replacedByHash: null,
    save: mock.fn(async () => {}),
    ...overrides,
  };
}

describe('issueRefreshToken', () => {
  it('creates a hashed token doc and returns the plaintext once', async () => {
    const created = {};
    const RefreshToken = {
      create: mock.fn(async (data) => {
        Object.assign(created, data);
        return { ...data };
      }),
    };

    const { plaintext, doc } = await issueRefreshToken(RefreshToken, 'user-1');

    assert.equal(RefreshToken.create.mock.callCount(), 1);
    assert.equal(created.user, 'user-1');
    // Stored value must never be the plaintext itself.
    assert.notEqual(created.tokenHash, plaintext);
    assert.equal(created.tokenHash.length, 64); // sha256 hex
    assert.ok(created.expiresAt instanceof Date);
    assert.equal(doc.tokenHash, created.tokenHash);
  });
});

describe('rotateRefreshToken', () => {
  it('rejects a missing/non-string token without touching the DB', async () => {
    const RefreshToken = { findOne: mock.fn(async () => null) };
    const result = await rotateRefreshToken(RefreshToken, '');
    assert.equal(result.status, 'invalid');
    assert.equal(RefreshToken.findOne.mock.callCount(), 0);
  });

  it('rejects a token that does not exist', async () => {
    const RefreshToken = { findOne: mock.fn(async () => null) };
    const result = await rotateRefreshToken(RefreshToken, 'unknown-token');
    assert.equal(result.status, 'invalid');
  });

  it('rejects an expired token', async () => {
    const doc = makeDoc({ expiresAt: new Date(Date.now() - 1000) });
    const RefreshToken = { findOne: mock.fn(async () => doc) };
    const result = await rotateRefreshToken(RefreshToken, 'some-token');
    assert.equal(result.status, 'expired');
  });

  it('detects reuse of an already-rotated token and revokes the chain', async () => {
    const doc = makeDoc({ revokedAt: new Date() });
    const RefreshToken = {
      findOne: mock.fn(async () => doc),
      updateMany: mock.fn(async () => ({ modifiedCount: 3 })),
    };
    const result = await rotateRefreshToken(RefreshToken, 'stolen-token');
    assert.equal(result.status, 'reused');
    assert.equal(result.userId, 'user-1');
    assert.equal(RefreshToken.updateMany.mock.callCount(), 1);
    assert.deepEqual(RefreshToken.updateMany.mock.calls[0].arguments[0], {
      user: 'user-1',
      revokedAt: null,
    });
  });

  it('rotates a valid token: revokes the old one and issues a new one', async () => {
    const doc = makeDoc();
    const createdNext = {};
    const RefreshToken = {
      findOne: mock.fn(async () => doc),
      create: mock.fn(async (data) => {
        Object.assign(createdNext, data);
        return { ...data };
      }),
    };

    const result = await rotateRefreshToken(RefreshToken, 'valid-token');

    assert.equal(result.status, 'ok');
    assert.equal(result.userId, 'user-1');
    assert.ok(result.plaintext);
    assert.ok(doc.revokedAt instanceof Date);
    assert.equal(doc.replacedByHash, createdNext.tokenHash);
    assert.equal(doc.save.mock.callCount(), 1);
  });
});

describe('revokeRefreshToken', () => {
  it('is a no-op for a missing token', async () => {
    const RefreshToken = { updateOne: mock.fn(async () => {}) };
    await revokeRefreshToken(RefreshToken, undefined);
    assert.equal(RefreshToken.updateOne.mock.callCount(), 0);
  });

  it('revokes only the matching, not-already-revoked token', async () => {
    const RefreshToken = {
      updateOne: mock.fn(async () => ({ modifiedCount: 1 })),
    };
    await revokeRefreshToken(RefreshToken, 'some-token');
    assert.equal(RefreshToken.updateOne.mock.callCount(), 1);
    const [filter, update] = RefreshToken.updateOne.mock.calls[0].arguments;
    assert.equal(filter.revokedAt, null);
    assert.ok(update.$set.revokedAt instanceof Date);
  });
});

describe('revokeAllForUser', () => {
  it('revokes every active token for the user', async () => {
    const RefreshToken = {
      updateMany: mock.fn(async () => ({ modifiedCount: 2 })),
    };
    await revokeAllForUser(RefreshToken, 'user-1');
    assert.equal(RefreshToken.updateMany.mock.callCount(), 1);
    assert.deepEqual(RefreshToken.updateMany.mock.calls[0].arguments[0], {
      user: 'user-1',
      revokedAt: null,
    });
  });
});
