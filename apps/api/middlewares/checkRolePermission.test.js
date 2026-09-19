const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { checkRolePermission } = require('./checkRolePermission');

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe('checkRolePermission', () => {
  it('rejects with 401 when req.user is missing (no token verified)', () => {
    const mw = checkRolePermission('products:write');
    const req = {};
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.error, 'NO_TOKEN');
  });

  it('rejects with 403 when the user role lacks the required permission', () => {
    const mw = checkRolePermission('products:delete');
    const req = { user: { roles: ['moderator'] } };
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.requiredPermission, 'products:delete');
  });

  it('calls next() and attaches userPermissions when the role has the permission', () => {
    const mw = checkRolePermission('products:write');
    const req = { user: { roles: ['moderator'] } };
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.ok(Array.isArray(req.userPermissions));
    assert.ok(req.userPermissions.includes('products:write'));
  });

  it('treats a user with no roles array as the default "user" role, not as admin', () => {
    const mw = checkRolePermission('products:write');
    const req = { user: {} };
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
  });

  it('never grants admin-only permissions to a plain user role', () => {
    const mw = checkRolePermission('users:delete');
    const req = { user: { roles: ['user'] } };
    const res = mockRes();
    let nextCalled = false;
    mw(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
  });
});
