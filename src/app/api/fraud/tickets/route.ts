import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { AuthService } from '@/lib/services/auth.service';
import { FraudService } from '@/lib/services/fraud.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';

/**
 * GET /api/fraud/tickets
 * Query full lifecycle logs of a single ticket. Admin only.
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

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return errorResponse('FORBIDDEN', 'Access denied: Administrators only.', 403);
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('id') || searchParams.get('ticketNumber');

    if (!query) {
      return errorResponse('VALIDATION_ERROR', 'Ticket ID or Ticket Number parameter is required.', 400);
    }

    const forensics = await FraudService.getTicketForensics(query);
    return successResponse(forensics);
  } catch (error: any) {
    logger.error('Error in GET /api/fraud/tickets:', error);
    return errorResponse('INTERNAL_ERROR', error.message || 'Failed to query ticket forensics logs', 500);
  }
}
