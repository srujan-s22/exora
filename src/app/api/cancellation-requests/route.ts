import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { AuthService } from '@/lib/services/auth.service';
import { CancellationRequestService } from '@/lib/services/cancellation-request.service';
import { createCancellationRequestSchema, listCancellationRequestsSchema } from '@/lib/validators/cancellation-request.schema';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';
import { safeErrorMessage } from '@/lib/utils/sanitize';
import { hasCounterPermission, hasAdminPermission } from '@/lib/utils/permission-helpers';

/**
 * GET /api/cancellation-requests
 * Lists cancellation requests for Admin / Super Admin queue.
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
      return errorResponse('FORBIDDEN', 'Access denied: Admin role required', 403);
    }

    const canApprove =
      hasAdminPermission(user, 'canApproveTicketCancellation') ||
      hasAdminPermission(user, 'canApproveEntryTicketCancellation') ||
      hasAdminPermission(user, 'canApproveRideTicketCancellation');

    if (!canApprove) {
      return errorResponse('FORBIDDEN', 'Access denied: You do not have permission to view or approve cancellation requests', 403);
    }

    const { searchParams } = new URL(req.url);
    const parseResult = listCancellationRequestsSchema.safeParse({
      status: searchParams.get('status') || 'PENDING',
      saleType: searchParams.get('saleType') || 'all',
      exhibitionId: searchParams.get('exhibitionId') || undefined,
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 20,
    });

    if (!parseResult.success) {
      return errorResponse('VALIDATION_ERROR', parseResult.error.issues[0]?.message || 'Invalid parameters', 400);
    }

    const result = await CancellationRequestService.listRequests(parseResult.data, user);

    return successResponse(result);
  } catch (error: any) {
    logger.error('Error in GET /api/cancellation-requests:', error);
    return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to fetch cancellation requests'), 500);
  }
}

/**
 * POST /api/cancellation-requests
 * Creates a new cancellation request (Counter staff / Admin).
 */
export async function POST(req: NextRequest) {
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

    if (user.role !== 'counter' && user.role !== 'admin' && user.role !== 'super_admin') {
      return errorResponse('FORBIDDEN', 'Access denied', 403);
    }

    const body = await req.json();
    const parseResult = createCancellationRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse('VALIDATION_ERROR', parseResult.error.issues[0]?.message || 'Invalid input data', 400);
    }

    const { saleId, saleType, cancellationReason, note } = parseResult.data;

    // Verify counter permission based on saleType
    if (saleType === 'ride') {
      if (!hasCounterPermission(user, 'canCancelRideTickets')) {
        return errorResponse('FORBIDDEN', 'Access denied: You do not have permission to request ride ticket cancellation', 403);
      }
    } else {
      if (!hasCounterPermission(user, 'canCancelEntryTickets')) {
        return errorResponse('FORBIDDEN', 'Access denied: You do not have permission to request entry ticket cancellation', 403);
      }
    }

    const userAgent = req.headers.get('user-agent') || 'unknown';
    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';

    const requestDoc = await CancellationRequestService.createRequest(
      { saleId, saleType, cancellationReason, note },
      user,
      { ipAddress, userAgent }
    );

    return successResponse({
      message: 'Cancellation request submitted to Admin for approval',
      cancellationRequest: requestDoc.toJSON(),
    });
  } catch (error: any) {
    logger.error('Error in POST /api/cancellation-requests:', error);
    return errorResponse('BAD_REQUEST', safeErrorMessage(error, 'Failed to submit cancellation request'), 400);
  }
}
