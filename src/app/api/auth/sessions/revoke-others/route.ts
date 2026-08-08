import { logger } from '@/lib/utils/logger';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/with-auth';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { SessionService } from '@/lib/services/session.service';

/**
 * POST /api/auth/sessions/revoke-others
 * Revoke all active sessions for the current user except the active session.
 */
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const userId = req.user.sub;
    const currentSessionId = req.user.sid;

    if (!currentSessionId) {
      return errorResponse('BAD_REQUEST', 'Current session ID not found in token', 400);
    }

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    const count = await SessionService.revokeAllOtherSessions(
      userId,
      currentSessionId,
      userId,
      ipAddress,
      userAgent
    );

    return successResponse({
      revokedCount: count,
      message: `Successfully logged out ${count} other active device${count === 1 ? '' : 's'}.`,
    });
  } catch (error: any) {
    logger.error('Error revoking other sessions:', error);
    return errorResponse('SERVER_ERROR', 'Failed to revoke other sessions', 500);
  }
});
