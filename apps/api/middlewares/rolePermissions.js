// Role-based permission configuration (TrendVaulta retail domain)
const ROLE_PERMISSIONS = {
  user: ['users:read:own'],

  moderator: [
    'products:read',
    'products:write',
    'brands:read',
    'brands:write',
    'coupons:read',
    'offers:read',
    'orders:read',
    'reviews:read',
    'reviews:delete',
    'users:read',
    'content:read',
    'content:write',
  ],

  admin: [
    'products:read',
    'products:write',
    'products:delete',
    'brands:read',
    'brands:write',
    'brands:delete',
    'coupons:read',
    'coupons:write',
    'coupons:delete',
    'offers:read',
    'offers:write',
    'offers:delete',
    'orders:read',
    'orders:write',
    'reviews:read',
    'reviews:write',
    'reviews:delete',
    'users:read',
    'users:write',
    'users:delete',
    'content:read',
    'content:write',
    'content:delete',
    'content:*',
    'shipping:read',
    'shipping:write',
  ],
};

const hasPermission = (userPermissions, requiredPermission) => {
  // Exact match
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  // Wildcard match (e.g., content:* matches content:read)
  const [resource] = requiredPermission.split(':');
  const wildcard = `${resource}:*`;
  return userPermissions.includes(wildcard);
};

const getRolePermissions = (role) => {
  return ROLE_PERMISSIONS[role] || [];
};

const getUserPermissions = (userRoles) => {
  const allPermissions = new Set();
  const roles = Array.isArray(userRoles) ? userRoles : [];

  roles.forEach((role) => {
    getRolePermissions(role).forEach((perm) => allPermissions.add(perm));
  });

  return Array.from(allPermissions);
};

module.exports = {
  ROLE_PERMISSIONS,
  hasPermission,
  getRolePermissions,
  getUserPermissions,
};
