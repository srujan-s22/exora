import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { AuthService } from '@/lib/services/auth.service';
import { TicketService } from '@/lib/services/ticket.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { validateTicketSchema } from '@/lib/validators/ticket.schema';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';
import { safeErrorMessage } from '@/lib/utils/sanitize';

import { withRateLimit } from '@/lib/middleware/rate-limit';

/**
 * POST /api/tickets/validate
 * Validates a scanned ticket QR payload and registers entry status.
 * Restricted to gate check-in operators and admins.
 * Security Note: Rate-limited to 60 scans/min to block automated QR forgery attempts
 * while supporting peak-hour entrance flow for staff.
 */
export const POST = withRateLimit(
  {
    windowMs: 60000, // 1 minute
    maxRequests: 60, // Max 60 validation scans per minute per IP
    keyPrefix: 'ticket-validate',
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

      if (user.role !== 'gate' && user.role !== 'admin' && user.role !== 'super_admin') {
        return errorResponse('FORBIDDEN', 'Access denied: Scanners can only be operated by gate staff.', 403);
      }

      const body = await req.json();
      const parsed = validateTicketSchema.safeParse(body);
      if (!parsed.success) {
        return errorResponse('VALIDATION_ERROR', 'Invalid scanner input data.', 400, parsed.error.flatten().fieldErrors);
      }

      const validationResult = await TicketService.validate(parsed.data, user.id);

      return successResponse(validationResult);
    } catch (error: any) {
      logger.error('Error in POST /api/tickets/validate:', error);
      return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to validate ticket'), 500);
    }
  }
);
