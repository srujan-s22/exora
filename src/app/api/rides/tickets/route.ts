import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { RideService } from '@/lib/services/ride.service';
import { AuthService } from '@/lib/services/auth.service';
import { successResponse, createdResponse, errorResponse } from '@/lib/utils/api-response';
import { createRideTicketSchema } from '@/lib/validators/ride.schema';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';
import { hasCounterPermission } from '@/lib/utils/permission-helpers';

/**
 * POST /api/rides/tickets
 * Purchase ride ticket(s). Restricted to counter staff and admins.
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return errorResponse('UNAUTHORIZED', 'Session token is missing', 401);
    }
    const user = await AuthService.verifyToken(token);
    if (!user || (user.role !== 'counter' && user.role !== 'admin' && user.role !== 'super_admin')) {
      return errorResponse('FORBIDDEN', 'Access Denied: Ticket sales restricted to counters and admins.', 403);
    }

    if (!hasCounterPermission(user, 'canSellRideTickets')) {
      return errorResponse('FORBIDDEN', 'Access denied: You do not have permission to sell ride tickets', 403);
    }

    const body = await req.json();
    const parsed = createRideTicketSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid ticket purchase parameters.', 400, parsed.error.flatten().fieldErrors);
    }

    const result = await RideService.createTickets(parsed.data, user.id);
    return createdResponse(result);
  } catch (error: any) {
    logger.error('Error in POST /api/rides/tickets:', error);
    
    if (
      error.message?.includes('closed') ||
      error.message?.includes('not found') ||
      error.message?.includes('deactivated')
    ) {
      return errorResponse('VALIDATION_ERROR', error.message, 400);
    }
    
    return errorResponse('INTERNAL_ERROR', error.message || 'Failed to complete ticket transaction.', 500);
  }
}
