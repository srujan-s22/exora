import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { AuthService } from '@/lib/services/auth.service';
import { TicketService } from '@/lib/services/ticket.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';

/**
 * GET /api/tickets/scans
 * List entrance scans records. Scoped by operator staff ID if not admin.
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

    if (user.role !== 'admin' && user.role !== 'gate') {
      return errorResponse('FORBIDDEN', 'Access denied', 403);
    }

    const { searchParams } = new URL(req.url);
    const exhibitionId = searchParams.get('exhibitionId') || undefined;
    const resultFilter = searchParams.get('result') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Gate staff is scoped to their own shift scans
    const scannedBy = user.role !== 'admin' ? user.id : (searchParams.get('scannedBy') || undefined);

    const result = await TicketService.listScans({
      page,
      limit,
      exhibitionId,
      scannedBy,
      result: resultFilter,
    });

    return successResponse(result);
  } catch (error: any) {
    logger.error('Error in GET /api/tickets/scans:', error);
    return errorResponse('INTERNAL_ERROR', error.message || 'Failed to list scans', 500);
  }
}
