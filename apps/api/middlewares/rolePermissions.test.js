const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  ROLE_PERMISSIONS,
  hasPermission,
  getRolePermissions,
  getUserPermissions,
} = require('./rolePermissions');

describe('ROLE_PERMISSIONS map', () => {
  it('does not grant any permissions to a bare "user" role beyond reading their own record', () => {
    assert.deepEqual(ROLE_PERMISSIONS.user, ['users:read:own']);
  });

  it('never grants legacy Craftify-era templates:*/creators:* permissions', () => {
    const allGranted = Object.values(ROLE_PERMISSIONS).flat();
    for (const permission of allGranted) {
      assert.ok(
        !permission.startsWith('templates:') &&
          !permission.startsWith('creators:'),
        `unexpected legacy permission: ${permission}`,
      );
    }
  });

  it('admin has write+delete on every commerce resource', () => {
    const admin = ROLE_PERMISSIONS.admin;
    for (const resource of ['products', 'brands', 'coupons', 'offers', 'orders', 'reviews', 'users', 'content']) {
      assert.ok(admin.includes(`${resource}:read`), `admin missing ${resource}:read`);
    }
    for (const resource of ['products', 'brands', 'coupons', 'offers', 'reviews', 'users', 'content']) {
      assert.ok(admin.includes(`${resource}:delete`), `admin missing ${resource}:delete`);
    }
  });

  it('moderator cannot delete products, write orders, or manage users', () => {
    const moderator = ROLE_PERMISSIONS.moderator;
    assert.ok(!moderator.includes('products:delete'));
    assert.ok(!moderator.includes('orders:write'));
    assert.ok(!moderator.includes('users:write'));
    assert.ok(!moderator.includes('users:delete'));
  });
});

describe('hasPermission', () => {
  it('returns true only for an exact match', () => {
    assert.equal(hasPermission(['products:read', 'products:write'], 'products:write'), true);
    assert.equal(hasPermission(['products:read'], 'products:write'), false);
  });

  it('returns false for an empty permission list', () => {
    assert.equal(hasPermission([], 'products:read'), false);
  });
});

describe('getRolePermissions', () => {
  it('returns an empty array for an unknown role', () => {
    assert.deepEqual(getRolePermissions('superuser'), []);
  });

  it('returns the exact configured list for a known role', () => {
    assert.deepEqual(getRolePermissions('moderator'), ROLE_PERMISSIONS.moderator);
  });
});

describe('getUserPermissions', () => {
  it('unions permissions across multiple roles without duplicates', () => {
    const perms = getUserPermissions(['user', 'moderator']);
    const unique = new Set(perms);
    assert.equal(perms.length, unique.size, 'expected no duplicate permissions');
    assert.ok(perms.includes('users:read:own'));
    assert.ok(perms.includes('products:write'));
  });

  it('gives admin strictly more permissions than moderator', () => {
    const adminPerms = new Set(getUserPermissions(['admin']));
    const modPerms = getUserPermissions(['moderator']);
    for (const perm of modPerms) {
      assert.ok(adminPerms.has(perm), `admin missing moderator permission: ${perm}`);
    }
    assert.ok(adminPerms.size > modPerms.length);
  });

  it('treats a non-array roles value as no roles (fails closed, not open)', () => {
    assert.deepEqual(getUserPermissions(undefined), []);
    assert.deepEqual(getUserPermissions(null), []);
    assert.deepEqual(getUserPermissions('admin'), []);
  });

  it('ignores unknown roles rather than throwing', () => {
    assert.deepEqual(getUserPermissions(['not-a-real-role']), []);
  });
});
