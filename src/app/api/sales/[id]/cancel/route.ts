import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { Sale as SaleModel } from '@/lib/db/models/sale.model';
import { Ticket as TicketModel } from '@/lib/db/models/ticket.model';
import { SystemSettings } from '@/lib/db/models/system-settings.model';
import { AuthService } from '@/lib/services/auth.service';
import { AuditService } from '@/lib/services/audit.service';
import { CancellationRequestService } from '@/lib/services/cancellation-request.service';
import { connectToDatabase } from '@/lib/db/connection';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';
import { safeErrorMessage } from '@/lib/utils/sanitize';
import { hasCounterPermission, hasAdminPermission } from '@/lib/utils/permission-helpers';

/**
 * POST /api/sales/[id]/cancel
 * Entry ticket sale cancellation route.
 * - Counter staff: Creates a PENDING cancellation request for Admin approval.
 * - Authorized Admin / Super Admin: Directly soft-cancels the transaction.
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

    if (!hasCounterPermission(user, 'canCancelEntryTickets')) {
      return errorResponse('FORBIDDEN', 'Access denied: You do not have permission to cancel entry ticket sales', 403);
    }

    const { id } = await params;
    const body = await req.json();
    const { reason, note } = body;
    if (!reason || !reason.trim()) {
      return errorResponse('VALIDATION_ERROR', 'Cancellation reason is required.', 400);
    }

    const userAgent = req.headers.get('user-agent') || 'unknown';
    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';

    // Counter staff flow: Create approval request
    if (user.role === 'counter') {
      const requestDoc = await CancellationRequestService.createRequest(
        { saleId: id, saleType: 'entry', cancellationReason: reason.trim(), note },
        user,
        { ipAddress, userAgent }
      );

      return successResponse({
        message: 'Cancellation request submitted to Admin for approval',
        cancellationPending: true,
        cancellationRequest: requestDoc.toJSON(),
      });
    }

    // Admin / Super Admin flow: Verify approval permission
    const canApprove =
      hasAdminPermission(user, 'canApproveTicketCancellation') ||
      hasAdminPermission(user, 'canApproveEntryTicketCancellation');

    if (!canApprove) {
      return errorResponse('FORBIDDEN', 'Access denied: You do not have permission to approve cancellations', 403);
    }

    const sale = await SaleModel.findById(id);
    if (!sale) {
      return errorResponse('NOT_FOUND', 'Transaction not found', 404);
    }

    if (sale.status === 'cancelled') {
      return errorResponse('BAD_REQUEST', 'Transaction is already cancelled', 400);
    }

    const settings = await SystemSettings.findOne();
    const windowSeconds = settings?.cancellationWindowSeconds || 30;

    // Perform soft-cancellation on Sale
    sale.status = 'cancelled';
    sale.cancelledAt = new Date();
    sale.cancelledBy = user.id as any;
    sale.cancelReason = reason.trim();
    sale.cancellationWindowSeconds = windowSeconds;
    sale.cancellationStatus = 'approved';
    await sale.save();

    // Soft-cancel all linked tickets
    await TicketModel.updateMany(
      { _id: { $in: sale.tickets } },
      { $set: { status: 'cancelled', cancellationStatus: 'approved' } }
    );

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
        override: true,
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
