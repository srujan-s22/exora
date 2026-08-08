import { logger } from '@/lib/utils/logger';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/with-auth';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { SessionService } from '@/lib/services/session.service';
import { Session } from '@/lib/db/models/session.model';
import { connectToDatabase } from '@/lib/db/connection';

/**
 * POST /api/auth/sessions/[id]/revoke
 * Revoke a specific session by sessionId.
 */
export const POST = withAuth(async (req: AuthenticatedRequest, context?: { params: Promise<Record<string, string>> }) => {
  try {
    const params = await context?.params;
    const targetSessionId = params?.id;

    if (!targetSessionId) {
      return errorResponse('BAD_REQUEST', 'Session ID parameter is required', 400);
    }

    await connectToDatabase();
    const sessionDoc = await Session.findOne({ sessionId: targetSessionId });
    if (!sessionDoc) {
      return errorResponse('NOT_FOUND', 'Session record not found', 404);
    }

    const currentUserId = req.user.sub;
    const isOwner = sessionDoc.userId.toString() === currentUserId;
    const isSuperAdmin = req.user.role === 'super_admin';
    const isAuthorizedAdmin = req.user.role === 'admin' && Boolean(req.user.permissions?.canManageSessions);

    if (!isOwner && !isSuperAdmin && !isAuthorizedAdmin) {
      return errorResponse('FORBIDDEN', 'You do not have permission to revoke this session', 403);
    }

    // Protection rule: Admins cannot revoke Super Admin sessions
    if (!isSuperAdmin && !isOwner && sessionDoc.role === 'super_admin') {
      return errorResponse('FORBIDDEN', 'Admins are not permitted to revoke Super Admin sessions', 403);
    }

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    const reason = isOwner
      ? 'Revoked by user from device settings'
      : `Revoked by administrator (${req.user.staffId})`;

    await SessionService.revokeSession(
      targetSessionId,
      currentUserId,
      reason,
      ipAddress,
      userAgent
    );

    return successResponse({
      sessionId: targetSessionId,
      message: 'Session revoked successfully',
    });
  } catch (error: any) {
    logger.error('Error revoking session:', error);
    return errorResponse('SERVER_ERROR', 'Failed to revoke session', 500);
  }
});
