import { errorResponse } from '@/lib/utils/api-response';
import { AuthService } from '@/lib/services/auth.service';
import { connectToDatabase } from '@/lib/db/connection';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';
import type { AuthenticatedRequest } from './with-auth';
import type { UserPermissionKey } from '@/lib/config/roles';
import { cookies } from 'next/headers';

type AuthenticatedHandler = (
  req: AuthenticatedRequest,
  context?: { params: Promise<Record<string, string>> }
) => Promise<Response>;

/**
 * API middleware that checks if the authenticated user has a specific user-level permission.
 * Must be used AFTER withAuth.
 *
 * Unlike withRole (which checks the role itself), this checks individual permission flags
 * stored on the user document (e.g., canCreateUsers, canResetPasswords).
 *
 * Super admins always pass permission checks.
 */
export function withPermission(permission: UserPermissionKey, handler: AuthenticatedHandler) {
  return async (
    req: AuthenticatedRequest,
    context?: { params: Promise<Record<string, string>> }
  ): Promise<Response> => {
    if (!req.user) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    // Super admins always have all permissions
    if (req.user.role === 'super_admin') {
      return handler(req, context);
    }

    // Check the specific permission from JWT payload
    const permissions = (req.user as any).permissions;
    if (!permissions || !permissions[permission]) {
      return errorResponse(
        'FORBIDDEN',
        `You do not have the required permission: ${permission}`,
        403
      );
    }

    return handler(req, context);
  };
}
