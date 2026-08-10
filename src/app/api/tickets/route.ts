import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { TicketService } from '@/lib/services/ticket.service';
import { AuthService } from '@/lib/services/auth.service';
import { successResponse, createdResponse, errorResponse } from '@/lib/utils/api-response';
import { adminCreateTicketSchema } from '@/lib/validators/ticket.schema';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';
import { safeErrorMessage } from '@/lib/utils/sanitize';

/**
 * GET /api/tickets
 * List tickets with optional filters: exhibitionId, status, ticketType, search.
 * Admins see all; counter/gate staff see only their own exhibition context.
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
    const exhibitionId = searchParams.get('exhibitionId') || '';
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const ticketType = searchParams.get('ticketType') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    // Non-admins can only see their own tickets
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      const result = await TicketService.listBySeller(user.id, { page, limit });
      return successResponse(result);
    }

    const result = await TicketService.listByExhibition(
      exhibitionId,
      {
        page,
        limit,
        search,
        status,
        ticketType,
        startDate,
        endDate,
      },
      user
    );

    return successResponse(result);
  } catch (error: any) {
    logger.error('Error in GET /api/tickets:', error);
    return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to list tickets'), 500);
  }
}

/**
 * POST /api/tickets
 * Bulk create tickets. Admin only.
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
      return errorResponse('FORBIDDEN', 'Only administrators can create tickets via this endpoint', 403);
    }

    const body = await req.json();
    const parsed = adminCreateTicketSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid ticket data', 400, parsed.error.flatten().fieldErrors);
    }

    const result = await TicketService.create(
      {
        ...parsed.data,
        source: 'admin',
        notes: parsed.data.notes,
      },
      user.id
    );

    return createdResponse({
      tickets: result.tickets,
      qrDataUrls: result.qrDataUrls,
      count: result.tickets.length,
    });
  } catch (error: any) {
    logger.error('Error in POST /api/tickets:', error);

    // Surface capacity/validation errors as 400 instead of 500
    if (
      error.message?.includes('Capacity') ||
      error.message?.includes('not configured') ||
      error.message?.includes('not found') ||
      error.message?.includes('closed to active')
    ) {
      return errorResponse('VALIDATION_ERROR', error.message, 400);
    }

    return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to create tickets'), 500);
  }
}
