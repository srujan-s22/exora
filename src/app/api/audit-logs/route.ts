import { logger } from '@/lib/utils/logger';
import { type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { AuthService } from '@/lib/services/auth.service';
import { AuditService } from '@/lib/services/audit.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { AUTH_COOKIE_NAME } from '@/lib/utils/constants';
import { safeErrorMessage } from '@/lib/utils/sanitize';

/**
 * GET /api/audit-logs
 * Paginated query list of administrative system audit logs.
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

    if (user.role !== 'super_admin' && user.role !== 'admin') {
      return errorResponse('FORBIDDEN', 'Access denied: Administrators only.', 403);
    }

    if (user.role === 'admin' && !user.permissions?.canViewAuditLogs) {
      return errorResponse('FORBIDDEN', 'Access denied: You do not have permission to view audit logs.', 403);
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const action = searchParams.get('action') || undefined;
    const performedBy = searchParams.get('performedBy') || undefined;
    const targetType = searchParams.get('targetType') || undefined;
    const exhibitionId = searchParams.get('exhibitionId') || undefined;

    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    const result = await AuditService.list({
      page,
      limit,
      action,
      performedBy,
      targetType,
      exhibitionId,
      startDate,
      endDate,
    });

    return successResponse(result);
  } catch (error: any) {
    logger.error('Error in GET /api/audit-logs:', error);
    return errorResponse('INTERNAL_ERROR', safeErrorMessage(error, 'Failed to list audit logs'), 500);
  }
}


