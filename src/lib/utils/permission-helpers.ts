import type { AuthUser } from '@/types/auth.types';
import type { UserPermissionKey } from '@/lib/config/roles';

/**
 * Server-side helper to check if an authenticated user has a specific permission.
 * - Super admins and admins inherently have full access to counter operations.
 * - Counter staff are evaluated against their assigned user permissions.
 */
export function hasCounterPermission(user: AuthUser | null | undefined, permission: UserPermissionKey): boolean {
  if (!user) return false;
  if (user.role === 'super_admin' || user.role === 'admin') {
    return true;
  }
  return !!user.permissions?.[permission];
}

/**
 * Server-side helper to check if an admin user has a specific administrative permission.
 * - Super admins always have full access.
 * - Admin users are evaluated against their assigned user permissions.
 */
export function hasAdminPermission(user: AuthUser | null | undefined, permission: UserPermissionKey): boolean {
  if (!user) return false;
  if (user.role === 'super_admin') {
    return true;
  }
  if (user.role === 'admin') {
    return !!user.permissions?.[permission];
  }
  return false;
}

