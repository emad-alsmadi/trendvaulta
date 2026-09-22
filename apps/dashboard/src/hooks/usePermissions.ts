import { useCallback, useMemo } from 'react';
import { getAuthRole } from '../lib/auth';
import { getPermissionsForRole, isStaffRole } from '../lib/permissions';

/**
 * Permissions derived from the signed-in role cookie. Returns a stable
 * `can(permission)` predicate for hiding write controls the API would 403.
 */
export function usePermissions() {
  const role = getAuthRole();
  const permissions = useMemo(() => getPermissionsForRole(role), [role]);
  const can = useCallback(
    (permission: string) => permissions.includes(permission),
    [permissions],
  );
  return { role, permissions, can, isStaff: isStaffRole(role) };
}
