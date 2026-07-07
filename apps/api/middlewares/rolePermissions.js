// Role-based permission configuration
const ROLE_PERMISSIONS = {
  // User permissions - can read only
  user: ['creators:read', 'templates:read', 'users:read:own'],

  // Moderator permissions - can read/write most things
  moderator: [
    'creators:read',
    'creators:write',
    'templates:read',
    'templates:write',
    'users:read',
  ],

  // Admin permissions - can do everything
  admin: [
    'creators:read',
    'creators:write',
    'creators:delete',
    'templates:read',
    'templates:write',
    'templates:delete',
    'users:read',
    'users:write',
    'users:delete',
  ],
};

// Check if user has specific permission
const hasPermission = (userPermissions, requiredPermission) => {
  return userPermissions.some(
    (permission) => permission === requiredPermission,
  );
};

// Get all permissions for a role
const getRolePermissions = (role) => {
  return ROLE_PERMISSIONS[role] || [];
};

// Get all permissions for user roles (array)
const getUserPermissions = (userRoles) => {
  const allPermissions = new Set();

  userRoles.forEach((role) => {
    const rolePerms = getRolePermissions(role);
    rolePerms.forEach((perm) => allPermissions.add(perm));
  });

  return Array.from(allPermissions);
};

module.exports = {
  ROLE_PERMISSIONS,
  hasPermission,
  getRolePermissions,
  getUserPermissions,
};
