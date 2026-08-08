import { logger } from '@/lib/utils/logger';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/with-auth';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { SessionService } from '@/lib/services/session.service';

/**
 * GET /api/auth/sessions
 * List all active and recent devices/sessions for the authenticated user.
 */
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const userId = req.user.sub;
    const currentSessionId = req.user.sid;

    const sessions = await SessionService.listUserSessions(userId, currentSessionId);

    return successResponse({ sessions });
  } catch (error: any) {
    logger.error('Error fetching user sessions:', error);
    return errorResponse('SERVER_ERROR', 'Failed to retrieve active sessions', 500);
  }
});
