import { errorResponse } from '@/lib/utils/api-response';
import type { AuthenticatedRequest } from './with-auth';
import type { UserRoleType } from '@/lib/config/roles';

type AuthenticatedHandler = (
  req: AuthenticatedRequest,
  context?: { params: Promise<Record<string, string>> }
) => Promise<Response>;

/**
 * API middleware that checks if the authenticated user has the required role.
 * Must be used AFTER withAuth.
 */
export function withRole(allowedRoles: UserRoleType[], handler: AuthenticatedHandler) {
  return async (
    req: AuthenticatedRequest,
    context?: { params: Promise<Record<string, string>> }
  ): Promise<Response> => {
    if (!req.user) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(
        'FORBIDDEN',
        'You do not have permission to perform this action',
        403
      );
    }

    return handler(req, context);
  };
}
