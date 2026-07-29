import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { RideService } from '@/lib/services/ride.service';
import { AuthService } from '@/lib/services/auth.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { validateRideTicketSchema } from '@/lib/validators/ride.schema';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';

import { withRateLimit } from '@/lib/middleware/rate-limit';
import { safeErrorMessage } from '@/lib/utils/sanitize';

/**
 * POST /api/rides/tickets/validate
 * Validates a ride ticket scan. Scoped to gate staff and admins.
 * Security Note: Rate-limited to 60 scans/min per IP to prevent QR scanning brute-force abuse.
 */
export const POST = withRateLimit(
  {
    windowMs: 60000, // 1 minute
    maxRequests: 60,
    keyPrefix: 'ride-ticket-validate',
  },
  async (req: NextRequest) => {
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

      if (user.role !== 'ride' && user.role !== 'admin' && user.role !== 'super_admin') {
        return errorResponse('FORBIDDEN', 'Access Denied: Ride ticket scanning restricted to ride operators.', 403);
      }

      const body = await req.json();
      const parsed = validateRideTicketSchema.safeParse(body);
      if (!parsed.success) {
        return errorResponse('VALIDATION_ERROR', 'Invalid scanner validation payload.', 400, parsed.error.flatten().fieldErrors);
      }

      const result = await RideService.validateTicket(parsed.data, user.id);
      return successResponse(result);
    } catch (error: any) {
      logger.error('Error in POST /api/rides/tickets/validate:', error);

      if (error.message?.includes('Access Denied')) {
        return errorResponse('FORBIDDEN', error.message, 403);
      }

      return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to complete validation scan.'), 500);
    }
  }
);
