import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { RideService } from '@/lib/services/ride.service';
import { AuthService } from '@/lib/services/auth.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';

/**
 * GET /api/dashboard/ride-stats
 * Aggregated analytics for rides. Can return:
 * 1. Single ride stats (if query has ?rideId=...)
 * 2. All rides stats for exhibition (if query has ?exhibitionId=...)
 * 3. Operator dashboard metrics (if query has ?staffDashboard=true)
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
    const rideId = searchParams.get('rideId');
    const exhibitionId = searchParams.get('exhibitionId');
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const staffDashboard = searchParams.get('staffDashboard') === 'true';

    if (staffDashboard) {
      const data = await RideService.getStaffDashboardData(user.id);
      if (!data) {
        return successResponse({ assigned: false });
      }
      return successResponse({ assigned: true, ...data });
    }

    if (rideId) {
      const stats = await RideService.getStats(rideId, startDate, endDate);
      return successResponse(stats);
    }

    if (exhibitionId) {
      const rides = await RideService.list({ exhibitionId });
      const statsPromises = rides.map(r => RideService.getStats(r.id, startDate, endDate));
      const allStats = await Promise.all(statsPromises);
      return successResponse(allStats);
    }

    return errorResponse('VALIDATION_ERROR', 'Parameters rideId, exhibitionId or staffDashboard is required.', 400);
  } catch (error: any) {
    logger.error('Error in GET /api/dashboard/ride-stats:', error);
    return errorResponse('INTERNAL_ERROR', error.message || 'Failed to aggregate statistics.', 500);
  }
}
