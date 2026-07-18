import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { TicketService } from '@/lib/services/ticket.service';
import { AuthService } from '@/lib/services/auth.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';
import { safeErrorMessage } from '@/lib/utils/sanitize';

/**
 * GET /api/tickets/[id]
 * Get detailed information about a single ticket, including populated references.
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
    const ticket = await TicketService.findById(id);
    if (!ticket) {
      return errorResponse('NOT_FOUND', 'Ticket not found', 404);
    }

    // Dynamically generate the real QR data URL for the client on demand
    const { generateQrDataUrl } = await import('@/lib/utils/qr');
    const qrDataUrl = await generateQrDataUrl(ticket.qrPayload);

    return successResponse({
      ...ticket,
      qrDataUrl,
    });
  } catch (error: any) {
    logger.error('Error in GET /api/tickets/[id]:', error);
    return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to retrieve ticket'), 500);
  }
}

/**
 * DELETE /api/tickets/[id]
 * Cancel a ticket. Admin only. This is a soft operation — status is set to 'cancelled'.
 */
export async function DELETE(
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
      return errorResponse('FORBIDDEN', 'Only administrators can cancel tickets', 403);
    }

    const { id } = await params;
    const ticket = await TicketService.cancel(id, user.id);
    if (!ticket) {
      return errorResponse('NOT_FOUND', 'Ticket not found', 404);
    }

    return successResponse({ message: 'Ticket successfully cancelled', ticket });
  } catch (error: any) {
    logger.error('Error in DELETE /api/tickets/[id]:', error);

    if (error.message?.includes('already cancelled')) {
      return errorResponse('CONFLICT', error.message, 409);
    }

    return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to cancel ticket'), 500);
  }
}
