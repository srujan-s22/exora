import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { AuthService } from '@/lib/services/auth.service';
import { FraudService } from '@/lib/services/fraud.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';

/**
 * GET /api/fraud/staff/[id]
 * Fetch chronological staff activity logs timeline. Admin only.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return errorResponse('FORBIDDEN', 'Access denied: Administrators only.', 403);
    }

    const { id } = await params;
    const timeline = await FraudService.getStaffActivityTimeline(id);
    return successResponse(timeline);
  } catch (error: any) {
    logger.error('Error in GET /api/fraud/staff/[id]:', error);
    return errorResponse('INTERNAL_ERROR', error.message || 'Failed to fetch staff timeline activity logs', 500);
  }
}
