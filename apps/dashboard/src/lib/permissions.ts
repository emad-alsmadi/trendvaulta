/**
 * Mirror of apps/api/middlewares/rolePermissions.js. The API is the source
 * of truth (every write is re-checked server-side); this copy only decides
 * what the UI shows so staff don't click into a 403.
 */
export const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
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
  ],
};

export const STAFF_ROLES = ['admin', 'moderator'] as const;

export function isStaffRole(role: string | undefined | null): boolean {
  return Boolean(role && (STAFF_ROLES as readonly string[]).includes(role));
}

export function getPermissionsForRole(role: string | undefined | null): string[] {
  if (!role) return [];
  return [...(ROLE_PERMISSIONS[role] ?? [])];
}

export function roleHasPermission(
  role: string | undefined | null,
  permission: string,
): boolean {
  return getPermissionsForRole(role).includes(permission);
}
