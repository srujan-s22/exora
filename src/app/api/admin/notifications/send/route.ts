import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { AuthService } from '@/lib/services/auth.service';
import { NotificationService } from '@/lib/services/notification.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';

/**
 * POST /api/admin/notifications/send
 * Allows Super Admin to send broadcast notifications to selected roles or specific users.
 */
export async function POST(req: NextRequest) {
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

    // Security Check: Strictly Super Admin only
    if (user.role !== 'super_admin') {
      return errorResponse('FORBIDDEN', 'Access Denied: Only Super Administrators can send notifications.', 403);
    }

    const body = await req.json();
    const { targetType, targetRoles, recipientUserIds, title, message, type } = body;

    if (!title || typeof title !== 'string' || title.trim().length < 2) {
      return errorResponse('VALIDATION_ERROR', 'Notification title is required (minimum 2 characters).', 400);
    }

    if (!message || typeof message !== 'string' || message.trim().length < 2) {
      return errorResponse('VALIDATION_ERROR', 'Notification message is required (minimum 2 characters).', 400);
    }

    const result = await NotificationService.sendBroadcastNotifications({
      senderId: user.id,
      targetType: targetType || 'roles',
      targetRoles,
      recipientUserIds,
      title,
      message,
      type: type || 'announcement',
    });

    return successResponse(result);
  } catch (error: any) {
    logger.error('Error in POST /api/admin/notifications/send:', error);
    return errorResponse('INTERNAL_ERROR', error.message || 'Failed to send broadcast notifications', 500);
  }
}
