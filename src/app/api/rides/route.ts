import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { RideService } from '@/lib/services/ride.service';
import { AuthService } from '@/lib/services/auth.service';
import { successResponse, createdResponse, errorResponse } from '@/lib/utils/api-response';
import { createRideSchema } from '@/lib/validators/ride.schema';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';
import { safeErrorMessage } from '@/lib/utils/sanitize';

/**
 * GET /api/rides
 * List rides/games with optional exhibitionId scope filter.
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
    const exhibitionId = searchParams.get('exhibitionId') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;

    const result = await RideService.list({ exhibitionId, status, search }, user);
    return successResponse(result);
  } catch (error: any) {
    logger.error('Error in GET /api/rides:', error);
    return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to list rides'), 500);
  }
}

/**
 * POST /api/rides
 * Create a new ride. Admin only.
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return errorResponse('UNAUTHORIZED', 'Session token is missing', 401);
    }
    const user = await AuthService.verifyToken(token);
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return errorResponse('FORBIDDEN', 'Only administrators can create rides', 403);
    }

    const body = await req.json();
    const parsed = createRideSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid ride data', 400, parsed.error.flatten().fieldErrors);
    }

    const result = await RideService.create(parsed.data, user.id);
    return createdResponse(result);
  } catch (error: any) {
    logger.error('Error in POST /api/rides:', error);
    return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to create ride'), 500);
  }
}
