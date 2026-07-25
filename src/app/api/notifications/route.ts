import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { AuthService } from '@/lib/services/auth.service';
import { NotificationService } from '@/lib/services/notification.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';

/**
 * GET /api/notifications
 * Retrieves notifications and unread count for authenticated user.
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

    const { searchParams } = new URL(req.url);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    const result = await NotificationService.getUserNotifications(user.id, limit);

    return successResponse(result);
  } catch (error: any) {
    logger.error('Error in GET /api/notifications:', error);
    return errorResponse('INTERNAL_ERROR', error.message || 'Failed to retrieve notifications', 500);
  }
}

/**
 * PATCH /api/notifications
 * Marks notification(s) or all notifications as read for authenticated user.
 */
export async function PATCH(req: NextRequest) {
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

    let notificationIds: string[] | undefined;
    try {
      const body = await req.json();
      if (Array.isArray(body.notificationIds)) {
        notificationIds = body.notificationIds;
      }
    } catch {
      // Body is optional; if omitted, marks all unread notifications as read
    }

    const result = await NotificationService.markAsRead(user.id, notificationIds);

    return successResponse(result);
  } catch (error: any) {
    logger.error('Error in PATCH /api/notifications:', error);
    return errorResponse('INTERNAL_ERROR', error.message || 'Failed to update notifications', 500);
  }
}
