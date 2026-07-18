import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { Sale as SaleModel } from '@/lib/db/models/sale.model';
import { Ticket as TicketModel } from '@/lib/db/models/ticket.model';
import { SystemSettings } from '@/lib/db/models/system-settings.model';
import { AuthService } from '@/lib/services/auth.service';
import { AuditService } from '@/lib/services/audit.service';
import { connectToDatabase } from '@/lib/db/connection';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';
import { safeErrorMessage } from '@/lib/utils/sanitize';

/**
 * POST /api/sales/[id]/cancel
 * Soft-cancels a general ticket sale transaction and marks all its tickets as cancelled.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return errorResponse('UNAUTHORIZED', 'Session token is missing', 401);
    }
    const user = await AuthService.verifyToken(token);
    if (!user) {
      return errorResponse('UNAUTHORIZED', 'Invalid or expired session', 401);
    }

    if (user.role !== 'counter' && user.role !== 'admin' && user.role !== 'super_admin') {
      return errorResponse('FORBIDDEN', 'Access denied', 403);
    }

    const { id } = await params;
    const sale = await SaleModel.findById(id);
    if (!sale) {
      return errorResponse('NOT_FOUND', 'Transaction not found', 404);
    }

    if (sale.status === 'cancelled') {
      return errorResponse('BAD_REQUEST', 'Transaction is already cancelled', 400);
    }

    // Get time-limit configuration
    const settings = await SystemSettings.findOne();
    const windowSeconds = settings?.cancellationWindowSeconds || 30;

    const elapsedMs = Date.now() - new Date(sale.soldAt).getTime();

    // Check if within window (counters only; admins/super_admins can override)
    if (user.role === 'counter' && elapsedMs > windowSeconds * 1000) {
      return errorResponse('FORBIDDEN', 'Cancellation window has expired.', 403);
    }

    const body = await req.json();
    const { reason } = body;
    if (!reason || !reason.trim()) {
      return errorResponse('VALIDATION_ERROR', 'Cancellation reason is required.', 400);
    }

    // Perform soft-cancellation on Sale
    sale.status = 'cancelled';
    sale.cancelledAt = new Date();
    sale.cancelledBy = user.id as any;
    sale.cancelReason = reason.trim();
    sale.cancellationWindowSeconds = windowSeconds;
    await sale.save();

    // Soft-cancel all linked tickets
    await TicketModel.updateMany(
      { _id: { $in: sale.tickets } },
      { $set: { status: 'cancelled' } }
    );

    // Retrieve network details for audit trail
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';

    // Log to Audit History
    await AuditService.create({
      action: 'transaction.cancelled' as any,
      performedBy: user.id as any,
      performedByRole: user.role,
      targetType: 'sale' as any,
      targetId: sale._id.toString(),
      details: {
        reason: reason.trim(),
        ticketCount: sale.ticketCount,
        totalAmount: sale.totalAmount,
        ticketType: sale.ticketType,
        ipAddress,
        userAgent,
        override: user.role !== 'counter',
      },
    });

    return successResponse({
      message: 'Transaction successfully cancelled',
      sale: sale.toJSON(),
    });
  } catch (error: any) {
    logger.error('Error in POST /api/sales/[id]/cancel:', error);
    return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to cancel transaction'), 500);
  }
}
