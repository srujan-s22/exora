import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { RideService } from '@/lib/services/ride.service';
import { AuthService } from '@/lib/services/auth.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';
import { hasCounterPermission } from '@/lib/utils/permission-helpers';

/**
 * GET /api/rides/sales
 * Fetch ride sales filtered by rideId, exhibitionId, soldBy.
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

    if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'counter') {
      return errorResponse('FORBIDDEN', 'Access denied', 403);
    }

    if (!hasCounterPermission(user, 'canViewRideSales')) {
      return errorResponse('FORBIDDEN', 'Access denied: You do not have permission to view ride sales', 403);
    }

    const { searchParams } = new URL(req.url);
    const rideId = searchParams.get('rideId') || undefined;
    const exhibitionId = searchParams.get('exhibitionId') || undefined;
    const soldBy = user.role !== 'admin' && user.role !== 'super_admin' ? user.id : (searchParams.get('soldBy') || undefined);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const data = await RideService.listSales({
      rideId,
      exhibitionId,
      soldBy,
      page,
      limit,
    });

    return successResponse(data);
  } catch (error: any) {
    logger.error('Error in GET /api/rides/sales:', error);
    return errorResponse('INTERNAL_ERROR', error.message || 'Failed to query sales transaction records.', 500);
  }
}
