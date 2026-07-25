import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { AuthService } from '@/lib/services/auth.service';
import { AnalyticsService, type AnalyticsQueryOptions } from '@/lib/services/analytics.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';

/**
 * GET /api/admin/analytics
 * Enterprise analytics data API for Admin and Super Admin users.
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

    // Access Control: Strictly restrict to admin and super_admin
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return errorResponse('FORBIDDEN', 'Access Denied: Analytics console is restricted to Administrators only.', 403);
    }

    const { searchParams } = new URL(req.url);
    const exhibitionId = searchParams.get('exhibitionId') || undefined;
    const dateRange = (searchParams.get('dateRange') as AnalyticsQueryOptions['dateRange']) || '7d';
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const data = await AnalyticsService.getAnalyticsData({
      exhibitionId,
      dateRange,
      startDate,
      endDate,
    });

    return successResponse(data);
  } catch (error: any) {
    logger.error('Error in GET /api/admin/analytics:', error);
    return errorResponse('INTERNAL_ERROR', error.message || 'Failed to generate analytics dashboard data', 500);
  }
}
