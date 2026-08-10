import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { RideService } from '@/lib/services/ride.service';
import { AuthService } from '@/lib/services/auth.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';

/**
 * GET /api/rides/scans
 * Fetch scans filtered by rideId, exhibitionId, scannedBy.
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
    const rideId = searchParams.get('rideId') || undefined;
    const exhibitionId = searchParams.get('exhibitionId') || undefined;
    const scannedBy = searchParams.get('scannedBy') || undefined;
    const result = searchParams.get('result') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const data = await RideService.listScans({
      rideId,
      exhibitionId,
      scannedBy,
      result,
      page,
      limit,
    }, user);

    return successResponse(data);
  } catch (error: any) {
    logger.error('Error in GET /api/rides/scans:', error);
    return errorResponse('INTERNAL_ERROR', error.message || 'Failed to query scan logs.', 500);
  }
}
