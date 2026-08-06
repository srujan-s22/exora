import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { AuthService } from '@/lib/services/auth.service';
import { CancellationRequestService } from '@/lib/services/cancellation-request.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';
import { safeErrorMessage } from '@/lib/utils/sanitize';
import { hasAdminPermission } from '@/lib/utils/permission-helpers';

/**
 * POST /api/cancellation-requests/[id]/approve
 * Admin / Super Admin approves a cancellation request, completing ticket soft-cancellation.
 */
export async function POST(
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

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return errorResponse('FORBIDDEN', 'Access denied: Admin privileges required', 403);
    }

    const canApprove =
      hasAdminPermission(user, 'canApproveTicketCancellation') ||
      hasAdminPermission(user, 'canApproveEntryTicketCancellation') ||
      hasAdminPermission(user, 'canApproveRideTicketCancellation');

    if (!canApprove) {
      return errorResponse('FORBIDDEN', 'Access denied: You do not have permission to approve cancellation requests', 403);
    }

    const { id } = await params;
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';

    const result = await CancellationRequestService.approveRequest(id, user, { ipAddress, userAgent });

    return successResponse({
      message: 'Cancellation request approved successfully. Transaction has been voided.',
      cancellationRequest: result.request.toJSON(),
      sale: result.sale.toJSON(),
    });
  } catch (error: any) {
    logger.error('Error in POST /api/cancellation-requests/[id]/approve:', error);
    return errorResponse('BAD_REQUEST', safeErrorMessage(error, 'Failed to approve cancellation request'), 400);
  }
}
