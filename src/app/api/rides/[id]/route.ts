import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { RideService } from '@/lib/services/ride.service';
import { AuthService } from '@/lib/services/auth.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { updateRideSchema } from '@/lib/validators/ride.schema';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';

/**
 * GET /api/rides/[id]
 * Retrieve dynamic properties, populated operators for a specific ride/game.
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

    const { id } = await params;
    const ride = await RideService.findById(id);
    if (!ride) {
      return errorResponse('NOT_FOUND', 'Ride/Game not found', 404);
    }

    return successResponse(ride);
  } catch (error: any) {
    logger.error('Error in GET /api/rides/[id]:', error);
    return errorResponse('INTERNAL_ERROR', error.message || 'Failed to retrieve ride details', 500);
  }
}

/**
 * PUT /api/rides/[id]
 * Update ride settings, assign staff. Admin only.
 */
export async function PUT(
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
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return errorResponse('FORBIDDEN', 'Only administrators can update rides', 403);
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = updateRideSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid ride configuration details.', 400, parsed.error.flatten().fieldErrors);
    }

    const result = await RideService.update(id, parsed.data, user.id);
    if (!result) {
      return errorResponse('NOT_FOUND', 'Ride/Game not found to update.', 404);
    }

    return successResponse(result);
  } catch (error: any) {
    logger.error('Error in PUT /api/rides/[id]:', error);
    return errorResponse('INTERNAL_ERROR', error.message || 'Failed to update ride settings', 500);
  }
}
