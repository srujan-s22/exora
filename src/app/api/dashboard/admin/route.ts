import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { AuthService } from '@/lib/services/auth.service';
import { DashboardService } from '@/lib/services/dashboard.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';

/**
 * GET /api/dashboard/admin
 * Fetch cross-exhibition administrative metrics.
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

    if (user.role !== 'admin') {
      return errorResponse('FORBIDDEN', 'Access denied: Administrators only.', 403);
    }

    const metrics = await DashboardService.getAdminMetrics();

    return successResponse(metrics);
  } catch (error: any) {
    logger.error('Error in GET /api/dashboard/admin:', error);
    return errorResponse('INTERNAL_ERROR', error.message || 'Failed to fetch admin metrics', 500);
  }
}
