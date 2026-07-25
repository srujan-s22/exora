import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { AuthService } from '@/lib/services/auth.service';
import { NotificationService } from '@/lib/services/notification.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';

/**
 * GET /api/admin/notifications/history
 * Retrieves history of broadcast notifications sent by Super Admins.
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return errorResponse('UNAUTHORIZED', 'Session token is missing', 401);
    }

    const user = await AuthService.verifyToken(token);
    if (!user) {
      return errorResponse('UNAUTHORIZED', 'Invalid or expired session', 401);
    }

    if (user.role !== 'super_admin' && user.role !== 'admin') {
      return errorResponse('FORBIDDEN', 'Access Denied', 403);
    }

    const history = await NotificationService.getSentBroadcastHistory(30);

    return successResponse(history);
  } catch (error: any) {
    logger.error('Error in GET /api/admin/notifications/history:', error);
    return errorResponse('INTERNAL_ERROR', error.message || 'Failed to fetch notification history', 500);
  }
}
