import { logger } from '@/lib/utils/logger';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/with-auth';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { SessionService } from '@/lib/services/session.service';

/**
 * GET /api/admin/sessions
 * List system-wide active sessions for Super Admins and authorized admins.
 */
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const isSuperAdmin = req.user.role === 'super_admin';
    const isAuthorizedAdmin =
      req.user.role === 'admin' &&
      Boolean(req.user.permissions?.canManageSessions);

    if (!isSuperAdmin && !isAuthorizedAdmin) {
      return errorResponse('FORBIDDEN', 'Access denied. Active session management system permission is required for full session view.', 403);
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role') || undefined;

    const sessions = await SessionService.listAllActiveSessions({ role, limit: 100 });

    return successResponse({ sessions });
  } catch (error: any) {
    logger.error('Error fetching admin system sessions:', error);
    return errorResponse('SERVER_ERROR', 'Failed to retrieve administrative active sessions', 500);
  }
});
