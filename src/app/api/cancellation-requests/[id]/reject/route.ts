import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { AuthService } from '@/lib/services/auth.service';
import { CancellationRequestService } from '@/lib/services/cancellation-request.service';
import { rejectCancellationRequestSchema } from '@/lib/validators/cancellation-request.schema';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';
import { safeErrorMessage } from '@/lib/utils/sanitize';
import { hasAdminPermission } from '@/lib/utils/permission-helpers';

/**
 * POST /api/cancellation-requests/[id]/reject
 * Admin / Super Admin rejects a cancellation request, keeping ticket active.
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
      return errorResponse('FORBIDDEN', 'Access denied: You do not have permission to reject cancellation requests', 403);
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parseResult = rejectCancellationRequestSchema.safeParse(body);
    const rejectionReason = parseResult.success ? parseResult.data.rejectionReason : undefined;

    const userAgent = req.headers.get('user-agent') || 'unknown';
    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';

    const result = await CancellationRequestService.rejectRequest(id, user, rejectionReason, { ipAddress, userAgent });

    return successResponse({
      message: 'Cancellation request rejected. Transaction remains active.',
      cancellationRequest: result.request.toJSON(),
      sale: result.sale.toJSON(),
    });
  } catch (error: any) {
    logger.error('Error in POST /api/cancellation-requests/[id]/reject:', error);
    return errorResponse('BAD_REQUEST', safeErrorMessage(error, 'Failed to reject cancellation request'), 400);
  }
}
